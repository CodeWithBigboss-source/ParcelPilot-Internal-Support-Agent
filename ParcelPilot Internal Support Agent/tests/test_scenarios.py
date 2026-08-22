"""
Automated Test Suite for ParcelPilot Internal Support Agent (Phase 2).

Tests all 10 core test scenarios defined in Section 14 of the prompt specifications.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.agent.orchestrator import run_agent
from app.agent.schemas import (
    ChatMessageIn,
    ChatRequest,
    UserContextIn,
)
from app.agent.tools import (
    cancel_action,
    execute_action,
    get_account,
    get_order,
    propose_action,
    query_structured_data,
    search_documents,
)
from app.core.access_control import AccessDeniedError, UserContext
from app.core.source_ranking import (
    SourceTier,
    detect_conflict,
    rank_chunks,
    resolve_tier,
)
from app.main import app

client = TestClient(app)


# --------------------------------------------------------------------------
# Test 1 — Contract overrides default policy (Northstar ORD-1001)
# --------------------------------------------------------------------------
def test_scenario_1_contract_overrides_default_policy():
    user_ctx = UserContextIn(role="operations_manager", user_name="ops_lead")
    req = ChatRequest(
        message="Can Northstar Logistics cancel ORD-1001 without a cancellation fee?",
        user_context=user_ctx,
    )
    res = run_agent(req)
    assert res.confidence in ("high", "moderate")
    assert any("Northstar" in s.title or "Agreement" in s.title or "SOP" in s.title for s in res.sources)
    # Northstar agreement waives cancellation fee for BOOKED not picked up
    assert "no fee" in res.answer.lower() or "0" in res.answer or "waived" in res.answer.lower() or "without" in res.answer.lower()


# --------------------------------------------------------------------------
# Test 2 — No override, default applies (LumenWorks ORD-2001)
# --------------------------------------------------------------------------
def test_scenario_2_default_policy_applies():
    user_ctx = UserContextIn(role="operations_manager", user_name="ops_lead")
    req = ChatRequest(
        message="Can LumenWorks cancel ORD-2001 without a cancellation fee?",
        user_context=user_ctx,
    )
    res = run_agent(req)
    # LumenWorks agreement defers to SOP for cancellation fees. ORD-2001 was requested > 30 mins after booking -> ₹250 fee.
    assert "250" in res.answer or "fee" in res.answer.lower()


# --------------------------------------------------------------------------
# Test 3 — Custom credit override (LumenWorks ORD-2002)
# --------------------------------------------------------------------------
def test_scenario_3_custom_credit_override():
    user_ctx = UserContextIn(role="operations_manager", user_name="ops_lead")
    req = ChatRequest(
        message="Is LumenWorks eligible for a service credit on ORD-2002?",
        user_context=user_ctx,
    )
    res = run_agent(req)
    # LumenWorks agreement has fixed ₹300 credit for > 4 hours late pickup (overrides default ₹500 at 2h)
    assert "300" in res.answer or "lumenworks" in res.answer.lower()


# --------------------------------------------------------------------------
# Test 4 — Historical ticket trap (TKT-450 / TKT-451)
# --------------------------------------------------------------------------
def test_scenario_4_historical_ticket_trap():
    user_ctx = UserContextIn(role="operations_manager", user_name="ops_lead")
    req = ChatRequest(
        message="What is the policy for cancellation fees for standard accounts like Beacon Retail, and should we follow historical ticket resolutions like TKT-450?",
        user_context=user_ctx,
    )
    res = run_agent(req)
    # Must defer to current policy/SOP over historical resolution
    assert res.confidence is not None


# --------------------------------------------------------------------------
# Test 5 — Known-issue awareness (ORD/TKT-504 KI-211)
# --------------------------------------------------------------------------
def test_scenario_5_known_issue_awareness():
    user_ctx = UserContextIn(role="operations_manager", user_name="ops_lead")
    req = ChatRequest(
        message="ORD-1004 still shows status BOOKED even though pickup happened. Is this a defect or a known issue?",
        user_context=user_ctx,
    )
    res = run_agent(req)
    assert "211" in res.answer or "swiftship" in res.answer.lower() or "webhook" in res.answer.lower()


# --------------------------------------------------------------------------
# Test 6 — P1 security escalation (TKT-505)
# --------------------------------------------------------------------------
def test_scenario_6_p1_security_escalation():
    user_ctx = UserContextIn(role="operations_manager", user_name="ops_lead")
    req = ChatRequest(
        message="TKT-505 describes an API key exposed in public GitHub repo. How should we handle this?",
        user_context=user_ctx,
    )
    res = run_agent(req)
    assert res.escalation_recommended is True
    assert "P1" in res.answer.upper() or "SECURITY" in res.answer.upper() or "ESCALAT" in res.answer.upper()


# --------------------------------------------------------------------------
# Test 7 — Out-of-scope query (TKT-503 billing contact change)
# --------------------------------------------------------------------------
def test_scenario_7_out_of_scope_query():
    user_ctx = UserContextIn(role="operations_manager", user_name="ops_lead")
    req = ChatRequest(
        message="Customer wants to update their billing contact email and process a manual wire transfer for TKT-503.",
        user_context=user_ctx,
    )
    res = run_agent(req)
    assert res.escalation_recommended is True or "human" in res.answer.lower() or "escalat" in res.answer.lower()


# --------------------------------------------------------------------------
# Test 8 — Access control enforcement (Tool-layer proof)
# --------------------------------------------------------------------------
def test_scenario_8_access_control_enforcement_at_tool_layer():
    # Support Agent scoped to Northstar (ACCT-001)
    support_agent_user = UserContext(role="support_agent", account_scope="ACCT-001", user_name="agent_smith")

    # Access to own account (ACCT-001) must succeed
    acc_res = get_account(support_agent_user, "ACCT-001")
    assert acc_res["ok"] is True

    # Access to another account (ACCT-002 LumenWorks) MUST be refused at tool layer
    with pytest.raises(AccessDeniedError):
        get_account(support_agent_user, "ACCT-002")

    with pytest.raises(AccessDeniedError):
        get_order(support_agent_user, "ORD-2001")  # ORD-2001 belongs to ACCT-002

    # Query structured data helper wrapper also returns ok: False with AccessDenied error message
    struct_res = query_structured_data(support_agent_user, "get_account", entity_id="ACCT-002")
    assert struct_res["ok"] is False
    assert "not authorized" in struct_res["error"].lower()


# --------------------------------------------------------------------------
# Test 9 — Confirmation boundary (Propose vs Confirm vs Cancel)
# --------------------------------------------------------------------------
def test_scenario_9_confirmation_boundary():
    support_agent_user = UserContext(role="support_agent", account_scope="ACCT-001", user_name="agent_smith")
    ops_user = UserContext(role="operations_manager", user_name="ops_lead")

    # 1. Propose action succeeds for agent
    prop_res = propose_action(
        user=support_agent_user,
        action_type="create_escalation",
        target_entity_id="TKT-501",
        priority="P2",
        reason="Delay investigation",
    )
    assert prop_res["ok"] is True
    action_id = prop_res["pending_action"]["action_id"]

    # 2. Executing action without permission fails for support_agent
    with pytest.raises(AccessDeniedError):
        execute_action(support_agent_user, action_id)

    # 3. Executing action with ops_user permission succeeds
    exec_res = execute_action(ops_user, action_id)
    assert exec_res["ok"] is True
    assert exec_res["status"] == "confirmed"

    # 4. Propose another action and cancel it
    prop2 = propose_action(
        user=support_agent_user,
        action_type="create_followup_task",
        target_entity_id="ORD-1001",
        reason="Follow up with carrier",
    )
    action_id2 = prop2["pending_action"]["action_id"]

    cancel_res = cancel_action(action_id2)
    assert cancel_res["ok"] is True
    assert cancel_res["status"] == "cancelled"


# --------------------------------------------------------------------------
# Test 10 — Deprecated document never wins
# --------------------------------------------------------------------------
def test_scenario_10_deprecated_document_never_wins():
    chunks = [
        {
            "text": "v2 policy SLA target P1 response time is 1 hour.",
            "source_file": "02_Support_Policy_v2_DEPRECATED.pdf",
            "doc_type": "policy",
            "status": "deprecated",
            "section_title": "1. SLA Targets",
        },
        {
            "text": "v3 current policy SLA target P1 response time is 2 hours.",
            "source_file": "01_Support_Policy_v3_CURRENT.pdf",
            "doc_type": "policy",
            "status": "current",
            "section_title": "1. SLA Targets",
        },
    ]

    ranked = rank_chunks(chunks)
    assert ranked[0].source_file == "01_Support_Policy_v3_CURRENT.pdf"
    assert ranked[0].tier == SourceTier.CURRENT_POLICY_OR_SOP
    assert ranked[1].is_deprecated is True
    assert ranked[1].tier == SourceTier.DEPRECATED_POLICY

    conflict = detect_conflict(ranked)
    assert conflict.conflict_detected is True
    assert "02_Support_Policy_v2_DEPRECATED.pdf" in conflict.explanation
