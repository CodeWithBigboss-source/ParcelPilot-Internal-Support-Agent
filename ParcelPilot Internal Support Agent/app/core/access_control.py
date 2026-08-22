"""
Access control enforcement.

IMPORTANT: This logic is enforced in the tool/data layer, not as an LLM
instruction. Tools call `enforce_account_scope` (or the narrower
`is_account_allowed`) BEFORE returning any structured data, regardless of
what the model asked for. A prompt injection or a model mistake cannot
bypass this because the check happens in plain Python, independent of the
model's behavior.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.core.config import (
    ALL_ROLES,
    ROLE_ACCOUNT_SCOPED,
    ROLES_WITH_ACTION_PERMISSION,
    ROLES_WITH_GLOBAL_READ,
)


class AccessDeniedError(Exception):
    """Raised when a tool call would violate the caller's access scope."""


@dataclass(frozen=True)
class UserContext:
    """
    Mocked authenticated caller context. In a real system this would come
    from a verified session/JWT; here it is supplied directly by the API
    caller (frontend) and trusted as the caller's asserted identity, but
    the *permissions* derived from it are still enforced server-side.
    """

    role: str
    account_scope: str | None = None  # required if role == support_agent
    user_name: str = "internal_user"

    def __post_init__(self):
        if self.role not in ALL_ROLES:
            raise ValueError(f"Unknown role: {self.role}")
        if self.role == ROLE_ACCOUNT_SCOPED and not self.account_scope:
            raise ValueError("support_agent role requires an account_scope")


def is_account_allowed(user: UserContext, account_id: str | None) -> bool:
    """
    Return True if `user` is permitted to read data belonging to
    `account_id`. `account_id` of None means "not account-specific data"
    (e.g. general policy docs) and is always allowed.
    """
    if account_id is None:
        return True
    if user.role in ROLES_WITH_GLOBAL_READ:
        return True
    # support_agent: only their own scoped account
    return user.account_scope == account_id


def enforce_account_scope(user: UserContext, account_id: str | None) -> None:
    """
    Raise AccessDeniedError if `user` may not read data for `account_id`.
    Call this at the top of every structured-data tool function before
    touching the database.
    """
    if not is_account_allowed(user, account_id):
        raise AccessDeniedError(
            f"User '{user.user_name}' (role={user.role}, scope={user.account_scope}) "
            f"is not authorized to access data for account '{account_id}'."
        )


def filter_allowed_account_ids(user: UserContext, account_ids: list[str]) -> list[str]:
    """Filter a list of account ids down to only those the user may read."""
    return [aid for aid in account_ids if is_account_allowed(user, aid)]


def can_execute_actions(user: UserContext) -> bool:
    """Whether this role is permitted to execute (not just propose) actions at all."""
    return user.role in ROLES_WITH_ACTION_PERMISSION


def enforce_action_permission(user: UserContext) -> None:
    if not can_execute_actions(user):
        raise AccessDeniedError(
            f"Role '{user.role}' does not have permission to execute actions. "
            f"Contact an Operations Manager for access."
        )
