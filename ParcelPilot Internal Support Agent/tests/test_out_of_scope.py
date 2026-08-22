"""
Out of Scope & Coverage Gap Evaluation Test Suite.

Evaluates system behavior on 10 plausible-but-uncovered support & ops questions.
Asserts that the system responds with honest gap detection (confidence='low',
escalation_recommended=True, or clear refusal) without hallucinating ungrounded answers.
"""

import pytest
from app.agent.schemas import ChatMessageIn, ChatRequest, UserContextIn
from app.agent.orchestrator import run_agent

OUT_OF_SCOPE_TEST_QUESTIONS = [
    "What is the physical warehouse access badge policy for third-party drivers?",
    "How do we process international customs duty refunds for shipments to Europe?",
    "What are the operational support hours and emergency coverage during national holidays?",
    "How to request a corporate tax ID update and VAT invoice re-issuance?",
    "What is the SLA and process for claims on lost parcels shipped via FedEx International?",
    "Can a customer request cash-on-delivery payment processing for bulk orders?",
    "What is the procedure for updating customer bank account routing numbers for direct wire transfers?",
    "Does ParcelPilot offer temperature-controlled cold chain logistics for pharmaceuticals?",
    "How do we issue a credit card chargeback dispute response for an unlisted merchant?",
    "What is the compensation policy for damaged fragile items shipped via Air Cargo?",
]


@pytest.mark.parametrize("question", OUT_OF_SCOPE_TEST_QUESTIONS)
def test_uncovered_topic_honest_gap_detection(question):
    request = ChatRequest(
        message=question,
        history=[],
        user_context=UserContextIn(
            role="support_agent",
            account_scope="ACCT-001",
            user_name="test_agent",
        ),
    )
    res = run_agent(request)

    # Must detect gap / out of scope and recommend escalation with low confidence
    assert res.confidence.value == "low", f"Expected confidence 'low' for uncovered query: {question}"
    assert res.escalation_recommended is True, f"Expected escalation_recommended=True for uncovered query: {question}"
    assert res.escalation_reason is not None, f"Expected escalation_reason for uncovered query: {question}"
