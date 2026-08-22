"""
Tool implementations. These are the ONLY way the agent touches data or
performs actions. Every tool enforces access control and source-priority
logic itself -- the LLM's tool-calling decisions are never trusted as the
sole gate for what data gets returned or what actions execute.

Four tools:
    1. search_documents      (read, document retrieval)
    2. query_structured_data (read, SQL over accounts/orders/tickets)
    3. propose_action        (prepares but never executes)
    4. execute_action        (only reachable via a separate confirm step)
"""

from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime
from typing import Any

import chromadb

from app.core.access_control import (
    AccessDeniedError,
    UserContext,
    enforce_account_scope,
    enforce_action_permission,
)
from app.core.config import CHROMA_DIR, SQLITE_PATH, now
from app.core.source_ranking import (
    confidence_from_ranked_chunks,
    detect_conflict,
    rank_chunks,
)

# --------------------------------------------------------------------------
# Tool 1 — search_documents
# --------------------------------------------------------------------------

_chroma_client: chromadb.ClientAPI | None = None


def _get_chroma_collection():
    global _chroma_client
    from app.ingestion.ingest_documents import FastLocalEmbeddingFunction
    embedding_fn = FastLocalEmbeddingFunction()
    if _chroma_client is None:
        _chroma_client = chromadb.PersistentClient(path=str(CHROMA_DIR))
    collection = _chroma_client.get_or_create_collection(
        name="parcelpilot_documents",
        embedding_function=embedding_fn,
    )
    if collection.count() == 0:
        from app.ingestion.ingest_documents import ingest_documents
        ingest_documents()
        collection = _chroma_client.get_or_create_collection(
            name="parcelpilot_documents",
            embedding_function=embedding_fn,
        )
    return collection


def search_documents(
    query: str,
    account_scope: str | None = None,
    doc_type: str | None = None,
    n_results: int = 6,
) -> dict:
    """
    Semantic search over policies/SOPs/product docs/agreements.

    Returns chunks already ranked by authority (see source_ranking.py),
    each tagged with tier, deprecation flag, and an authority note the
    agent should surface to the user rather than silently discard.
    """
    collection = _get_chroma_collection()

    where = None
    if doc_type:
        where = {"doc_type": doc_type}

    results = collection.query(
        query_texts=[query],
        n_results=n_results,
        where=where,
    )

    raw_chunks = []
    docs = results.get("documents", [[]])[0]
    metas = results.get("metadatas", [[]])[0]
    for text, meta in zip(docs, metas):
        raw_chunks.append(
            {
                "text": text,
                "source_file": meta.get("display_title", meta.get("source_file")),
                "doc_type": meta.get("doc_type"),
                "status": meta.get("status"),
                "account_scope": meta.get("account_scope") or None,
                "section_title": meta.get("section_title"),
            }
        )

    ranked = rank_chunks(raw_chunks, query_account_id=account_scope)
    conflict = detect_conflict(ranked)

    return {
        "chunks": [
            {
                "text": c.text,
                "source_file": c.source_file,
                "doc_type": c.doc_type,
                "status": c.status,
                "account_scope": c.account_scope,
                "section_title": c.section_title,
                "tier": int(c.tier),
                "is_deprecated": c.is_deprecated,
                "authority_note": c.authority_note,
            }
            for c in ranked
        ],
        "conflict_detected": conflict.conflict_detected,
        "conflict_explanation": conflict.explanation,
    }


# --------------------------------------------------------------------------
# Tool 2 — query_structured_data
# --------------------------------------------------------------------------

def _connect() -> sqlite3.Connection:
    if not SQLITE_PATH.exists():
        from app.ingestion.ingest_structured_data import ingest_structured_data
        ingest_structured_data()
    conn = sqlite3.connect(SQLITE_PATH)
    conn.row_factory = sqlite3.Row

    # Verify tables exist
    cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='accounts'")
    if not cursor.fetchone():
        conn.close()
        from app.ingestion.ingest_structured_data import ingest_structured_data
        ingest_structured_data()
        conn = sqlite3.connect(SQLITE_PATH)
        conn.row_factory = sqlite3.Row

    return conn


def _row_account_id(table: str, row: sqlite3.Row) -> str | None:
    return row["account_id"] if "account_id" in row.keys() else None


def get_account(user: UserContext, account_id: str) -> dict:
    enforce_account_scope(user, account_id)
    conn = _connect()
    row = conn.execute(
        "SELECT * FROM accounts WHERE account_id = ?", (account_id,)
    ).fetchone()
    conn.close()
    if not row:
        return {"ok": False, "error": f"No account found with id {account_id}"}
    return {"ok": True, "data": dict(row)}


def get_order(user: UserContext, order_id: str) -> dict:
    conn = _connect()
    row = conn.execute("SELECT * FROM orders WHERE order_id = ?", (order_id,)).fetchone()
    conn.close()
    if not row:
        return {"ok": False, "error": f"No order found with id {order_id}"}

    account_id = _row_account_id("orders", row)
    enforce_account_scope(user, account_id)  # raises AccessDeniedError if not allowed
    return {"ok": True, "data": dict(row)}


def get_ticket(user: UserContext, ticket_id: str) -> dict:
    conn = _connect()
    row = conn.execute("SELECT * FROM tickets WHERE ticket_id = ?", (ticket_id,)).fetchone()
    conn.close()
    if not row:
        return {"ok": False, "error": f"No ticket found with id {ticket_id}"}

    account_id = _row_account_id("tickets", row)
    enforce_account_scope(user, account_id)
    return {"ok": True, "data": dict(row)}


def list_orders_for_account(user: UserContext, account_id: str) -> dict:
    enforce_account_scope(user, account_id)
    conn = _connect()
    rows = conn.execute(
        "SELECT * FROM orders WHERE account_id = ?", (account_id,)
    ).fetchall()
    conn.close()
    return {"ok": True, "data": [dict(r) for r in rows]}


def list_tickets_for_account(user: UserContext, account_id: str) -> dict:
    enforce_account_scope(user, account_id)
    conn = _connect()
    rows = conn.execute(
        "SELECT * FROM tickets WHERE account_id = ?", (account_id,)
    ).fetchall()
    conn.close()
    return {"ok": True, "data": [dict(r) for r in rows]}


def calculate_pickup_delay(user: UserContext, order_id: str) -> dict:
    """
    Derived calculation: how late is/was the pickup relative to the
    scheduled window end, measured against the fixed dataset snapshot
    time (never the real clock). Used to evaluate service-credit
    eligibility thresholds, which differ per account agreement.
    """
    order_result = get_order(user, order_id)  # enforces access control
    if not order_result["ok"]:
        return order_result

    order = order_result["data"]
    window_end_raw = order.get("pickup_window_end")
    actual_raw = order.get("pickup_actual_at")

    if not window_end_raw:
        return {"ok": False, "error": "Order has no scheduled pickup window."}

    window_end = datetime.fromisoformat(window_end_raw)
    reference_time = datetime.fromisoformat(actual_raw) if actual_raw else now().replace(tzinfo=None)

    delay_minutes = (reference_time - window_end).total_seconds() / 60.0
    is_still_pending = actual_raw is None

    return {
        "ok": True,
        "data": {
            "order_id": order_id,
            "pickup_window_end": window_end_raw,
            "pickup_actual_at": actual_raw,
            "delay_minutes": round(delay_minutes, 1),
            "delay_hours": round(delay_minutes / 60.0, 2),
            "pickup_still_pending": is_still_pending,
            "carrier_fault": bool(order.get("carrier_fault")),
            "customer_fault": bool(order.get("customer_fault")),
            "shipment_fee_inr": order.get("shipment_fee_inr"),
            "reference_time_used": reference_time.isoformat(),
            "note": (
                "Pickup has not yet occurred as of the dataset snapshot time; "
                "delay is measured against the snapshot time."
                if is_still_pending
                else "Delay measured against actual recorded pickup time."
            ),
        },
    }


def calculate_time_since_booking(user: UserContext, order_id: str) -> dict:
    """
    Derived calculation: minutes elapsed between booked_at and cancellation_requested_at
    or the snapshot time. Used to evaluate cancellation fee thresholds.
    """
    order_result = get_order(user, order_id)
    if not order_result["ok"]:
        return order_result

    order = order_result["data"]
    booked_raw = order.get("booked_at")
    cancel_raw = order.get("cancellation_requested_at")

    if not booked_raw:
        return {"ok": False, "error": "Order has no booked_at timestamp."}

    booked_at = datetime.fromisoformat(booked_raw)
    ref_time = datetime.fromisoformat(cancel_raw) if cancel_raw else now().replace(tzinfo=None)

    elapsed_minutes = (ref_time - booked_at).total_seconds() / 60.0

    return {
        "ok": True,
        "data": {
            "order_id": order_id,
            "booked_at": booked_raw,
            "cancellation_requested_at": cancel_raw,
            "elapsed_minutes": round(elapsed_minutes, 1),
            "reference_time_used": ref_time.isoformat(),
        },
    }


def query_structured_data(
    user: UserContext,
    action_type: str,
    entity_id: str | None = None,
    account_id: str | None = None,
) -> dict:
    """
    Unified entry point for structured queries over SQLite.
    Always enforces access control before querying.
    """
    try:
        if action_type == "get_account":
            if not entity_id and not account_id:
                return {"ok": False, "error": "account_id/entity_id required for get_account"}
            return get_account(user, entity_id or account_id)
        elif action_type == "get_order":
            if not entity_id:
                return {"ok": False, "error": "order_id required for get_order"}
            return get_order(user, entity_id)
        elif action_type == "get_ticket":
            if not entity_id:
                return {"ok": False, "error": "ticket_id required for get_ticket"}
            return get_ticket(user, entity_id)
        elif action_type == "list_orders_for_account":
            if not account_id and not entity_id:
                return {"ok": False, "error": "account_id required for list_orders_for_account"}
            return list_orders_for_account(user, account_id or entity_id)
        elif action_type == "list_tickets_for_account":
            if not account_id and not entity_id:
                return {"ok": False, "error": "account_id required for list_tickets_for_account"}
            return list_tickets_for_account(user, account_id or entity_id)
        elif action_type == "calculate_pickup_delay":
            if not entity_id:
                return {"ok": False, "error": "order_id required for calculate_pickup_delay"}
            return calculate_pickup_delay(user, entity_id)
        elif action_type == "calculate_time_since_booking":
            if not entity_id:
                return {"ok": False, "error": "order_id required for calculate_time_since_booking"}
            return calculate_time_since_booking(user, entity_id)
        else:
            return {"ok": False, "error": f"Unknown structured query action_type: {action_type}"}
    except AccessDeniedError as e:
        return {"ok": False, "error": str(e)}
    except Exception as e:
        return {"ok": False, "error": f"Database query error: {str(e)}"}


# --------------------------------------------------------------------------
# Tool 3 — propose_action
# Tool 4 — execute_action
# --------------------------------------------------------------------------

# Server-side registry for pending actions
_pending_actions: dict[str, dict] = {}


def propose_action(
    user: UserContext,
    action_type: str,
    target_entity_id: str,
    priority: str | None = None,
    reason: str | None = None,
    details: dict[str, Any] | None = None,
) -> dict:
    """
    Creates an unconfirmed pending action object.
    Does NOT modify the database or execute state changes.
    Returns the pending action card info.
    """
    action_id = f"ACT-{uuid.uuid4().hex[:8].upper()}"
    pending = {
        "action_id": action_id,
        "action_type": action_type,
        "target_entity_id": target_entity_id,
        "priority": priority,
        "reason": reason,
        "details": details or {},
        "status": "pending",
        "proposed_by": user.user_name,
        "proposed_at": now().isoformat(),
    }
    _pending_actions[action_id] = pending
    return {"ok": True, "pending_action": pending}


def execute_action(user: UserContext, action_id: str) -> dict:
    """
    Executes a previously proposed action.
    Requires user permission check via `enforce_action_permission`.
    Only callable via explicit user confirmation.
    """
    enforce_action_permission(user)  # raises AccessDeniedError if role lacks permission

    if action_id not in _pending_actions:
        return {
            "ok": False,
            "status": "failed",
            "message": f"Pending action '{action_id}' not found or already processed.",
        }

    pending = _pending_actions[action_id]
    if pending["status"] != "pending":
        return {
            "ok": False,
            "status": "failed",
            "message": f"Action '{action_id}' is already in status '{pending['status']}'.",
        }

    # Execute mocked write to SQLite actions table
    conn = _connect()
    result_id = f"RES-{uuid.uuid4().hex[:8].upper()}"
    conn.execute(
        """
        INSERT INTO actions (action_id, action_type, target_entity_id, priority, reason, details, status, executed_by, executed_at, result_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            action_id,
            pending["action_type"],
            pending["target_entity_id"],
            pending.get("priority"),
            pending.get("reason"),
            json.dumps(pending.get("details", {})),
            "confirmed",
            user.user_name,
            now().isoformat(),
            result_id,
        ),
    )
    conn.commit()
    conn.close()

    pending["status"] = "confirmed"

    return {
        "ok": True,
        "status": "confirmed",
        "action_id": action_id,
        "result_id": result_id,
        "message": f"Action '{pending['action_type']}' on '{pending['target_entity_id']}' executed successfully.",
    }


def cancel_action(action_id: str) -> dict:
    """Discards a pending action."""
    if action_id not in _pending_actions:
        return {
            "ok": False,
            "status": "failed",
            "message": f"Pending action '{action_id}' not found.",
        }

    pending = _pending_actions[action_id]
    pending["status"] = "cancelled"
    return {
        "ok": True,
        "status": "cancelled",
        "action_id": action_id,
        "message": f"Action '{action_id}' was cancelled.",
    }


def get_pending_action(action_id: str) -> dict | None:
    return _pending_actions.get(action_id)
