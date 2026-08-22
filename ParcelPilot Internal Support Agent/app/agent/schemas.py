"""
Pydantic models shared across the API layer, the agent orchestrator, and
the tools. Field names here are chosen to map cleanly onto what the
existing frontend's mock API client already expects (tool trace steps
with name/status/duration, source objects with type/title/section/excerpt,
a confidence enum, and a pending-action shape) so that swapping the
frontend's mock layer for this real backend later is close to a drop-in
replacement.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field


# --------------------------------------------------------------------------
# User / role context
# --------------------------------------------------------------------------

class UserContextIn(BaseModel):
    role: Literal["support_agent", "senior_support", "operations_manager", "admin"]
    account_scope: str | None = Field(
        default=None, description="Required if role == support_agent"
    )
    user_name: str = "internal_user"


# --------------------------------------------------------------------------
# Chat
# --------------------------------------------------------------------------

class ChatMessageIn(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessageIn] = Field(default_factory=list)
    user_context: UserContextIn


class ToolStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class ToolTraceStep(BaseModel):
    tool_name: str
    status: ToolStatus
    duration_ms: int | None = None
    description: str | None = None
    error: str | None = None


class SourceType(str, Enum):
    DOCUMENT = "document"
    ORDER = "order"
    TICKET = "ticket"
    ACCOUNT = "account"


class SourceRef(BaseModel):
    type: SourceType
    title: str
    section: str | None = None
    excerpt: str | None = None
    is_deprecated: bool = False
    is_historical: bool = False
    authority_note: str | None = None


class ConfidenceLevel(str, Enum):
    HIGH = "high"
    MODERATE = "moderate"
    LOW = "low"


class PendingAction(BaseModel):
    action_id: str
    action_type: Literal["create_escalation", "update_ticket", "create_followup_task"]
    target_entity_id: str
    priority: str | None = None
    reason: str | None = None
    details: dict[str, Any] = Field(default_factory=dict)
    status: Literal["pending", "confirmed", "cancelled", "failed"] = "pending"


class ChatResponse(BaseModel):
    answer: str
    sources: list[SourceRef] = Field(default_factory=list)
    confidence: ConfidenceLevel
    is_historical: bool = False
    conflict_detected: bool = False
    conflict_explanation: str | None = None
    tool_trace: list[ToolTraceStep] = Field(default_factory=list)
    pending_action: PendingAction | None = None
    escalation_recommended: bool = False
    escalation_reason: str | None = None


# --------------------------------------------------------------------------
# Actions confirm/cancel
# --------------------------------------------------------------------------

class ActionResult(BaseModel):
    action_id: str
    status: Literal["confirmed", "cancelled", "failed"]
    result_id: str | None = None
    message: str


# --------------------------------------------------------------------------
# Internal tool I/O (not exposed directly via API, used by orchestrator)
# --------------------------------------------------------------------------

class DocumentSearchResult(BaseModel):
    text: str
    source_file: str
    doc_type: str
    status: str
    account_scope: str | None
    section_title: str
    tier: int
    is_deprecated: bool
    authority_note: str


class StructuredQueryResult(BaseModel):
    ok: bool
    data: dict[str, Any] | list[dict[str, Any]] | None = None
    error: str | None = None
