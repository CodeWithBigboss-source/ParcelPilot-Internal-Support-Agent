"""
Source authority / priority / conflict-resolution logic.

This is the single most important module in the system. The assessment
data pack is deliberately imperfect: a deprecated policy sits alongside a
current one, customer agreements override (or partially override) default
policy, and historical ticket resolutions sometimes contain incorrect
guidance. This module encodes, in real code, how those sources should be
ranked and reconciled — the agent and tools consult this module rather
than re-deriving the hierarchy from scratch on every query.

Priority order (highest authority first):
    1. Signed customer agreement (if the account has one AND it addresses
       the topic in question)
    2. Current policy / current SOP documents (status == "current")
    3. Current product documentation
    4. Deprecated policy documents (never authoritative — citable only if
       explicitly asked about history)
    5. Historical ticket resolutions (context only — never authoritative,
       must always be flagged when surfaced)
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import IntEnum


class SourceTier(IntEnum):
    """Lower value = higher authority."""

    CUSTOMER_AGREEMENT = 0
    CURRENT_POLICY_OR_SOP = 1
    CURRENT_PRODUCT_DOC = 2
    DEPRECATED_POLICY = 3
    HISTORICAL_TICKET = 4
    UNKNOWN = 9


DOC_TYPE_TO_TIER = {
    "agreement": SourceTier.CUSTOMER_AGREEMENT,
    "policy": SourceTier.CURRENT_POLICY_OR_SOP,  # tier refined by `status` below
    "sop": SourceTier.CURRENT_POLICY_OR_SOP,
    "product_guide": SourceTier.CURRENT_PRODUCT_DOC,
    "historical_ticket": SourceTier.HISTORICAL_TICKET,
}


@dataclass
class RankedChunk:
    """A document chunk annotated with its resolved authority tier."""

    text: str
    source_file: str
    doc_type: str
    status: str  # "current" | "deprecated"
    account_scope: str | None
    section_title: str
    tier: SourceTier
    is_deprecated: bool = False
    is_account_specific: bool = False
    authority_note: str = ""


def resolve_tier(doc_type: str, status: str, account_scope: str | None) -> SourceTier:
    """
    Determine the authority tier of a document chunk based on its
    doc_type/status metadata. Agreement docs are always top-tier because
    they are inherently account-specific and override defaults. A
    "current" policy/SOP/product doc sits below agreements; a
    "deprecated" one is always demoted regardless of doc_type.
    """
    if status == "deprecated":
        return SourceTier.DEPRECATED_POLICY

    if doc_type == "agreement" and account_scope:
        return SourceTier.CUSTOMER_AGREEMENT

    if doc_type in ("policy", "sop"):
        return SourceTier.CURRENT_POLICY_OR_SOP

    if doc_type == "product_guide":
        return SourceTier.CURRENT_PRODUCT_DOC

    if doc_type == "historical_ticket":
        return SourceTier.HISTORICAL_TICKET

    return SourceTier.UNKNOWN


def rank_chunks(
    raw_chunks: list[dict],
    query_account_id: str | None = None,
) -> list[RankedChunk]:
    """
    Take raw retrieval results (each a dict with text + metadata) and
    return them ranked by authority tier, with account-specific documents
    for the account in question boosted above general documents of the
    same nominal tier.

    `query_account_id`: the account the current query concerns (if known),
    used to prioritise that account's own agreement above agreements or
    general docs unrelated to it.
    """
    ranked: list[RankedChunk] = []

    for chunk in raw_chunks:
        doc_type = chunk.get("doc_type", "unknown")
        status = chunk.get("status", "current")
        account_scope = chunk.get("account_scope")
        tier = resolve_tier(doc_type, status, account_scope)

        is_account_specific = bool(account_scope)
        # Demote an agreement chunk that belongs to a DIFFERENT account
        # than the one the query concerns -- it should not outrank the
        # general policy for someone else's question.
        if (
            tier == SourceTier.CUSTOMER_AGREEMENT
            and query_account_id
            and account_scope != query_account_id
        ):
            tier = SourceTier.CURRENT_PRODUCT_DOC  # demote, still visible, not authoritative here

        note = ""
        if status == "deprecated":
            note = "This document is deprecated and must not be used as current policy."
        elif tier == SourceTier.CUSTOMER_AGREEMENT:
            note = "This is a signed customer agreement and overrides default policy on topics it addresses."
        elif tier == SourceTier.HISTORICAL_TICKET:
            note = "This is a historical ticket resolution — context only, may be outdated or incorrect."

        ranked.append(
            RankedChunk(
                text=chunk.get("text", ""),
                source_file=chunk.get("source_file", "unknown"),
                doc_type=doc_type,
                status=status,
                account_scope=account_scope,
                section_title=chunk.get("section_title", ""),
                tier=tier,
                is_deprecated=(status == "deprecated"),
                is_account_specific=is_account_specific,
                authority_note=note,
            )
        )

    ranked.sort(key=lambda c: (c.tier.value, 0 if c.is_account_specific else 1))
    return ranked


@dataclass
class ConflictReport:
    conflict_detected: bool
    explanation: str = ""
    resolution: str = ""


def detect_conflict(ranked: list[RankedChunk]) -> ConflictReport:
    """
    Inspect a ranked chunk list for the presence of a lower-authority
    source (deprecated policy or historical ticket) that could plausibly
    contradict the top-ranked source, and produce a human-readable
    explanation of how the conflict was resolved.

    This is intentionally conservative/heuristic: it flags *possible*
    conflicts whenever multiple tiers are present in the retrieved set,
    since the point is to make the reasoning visible to the user, not to
    silently resolve everything.
    """
    if not ranked:
        return ConflictReport(conflict_detected=False)

    top = ranked[0]
    lower_tier_sources = [c for c in ranked[1:] if c.tier > top.tier]

    if not lower_tier_sources:
        return ConflictReport(conflict_detected=False)

    flagged = [c for c in lower_tier_sources if c.is_deprecated or c.tier == SourceTier.HISTORICAL_TICKET]
    if not flagged:
        return ConflictReport(conflict_detected=False)

    names = ", ".join(sorted({c.source_file for c in flagged}))
    explanation = (
        f"Lower-authority source(s) were retrieved alongside the top authoritative "
        f"source: {names}. These may disagree with the current, higher-authority "
        f"source and should not be treated as current guidance."
    )
    resolution = (
        f"Answer is grounded in the highest-authority source retrieved "
        f"({top.source_file}, tier={top.tier.name}); lower-authority sources are "
        f"surfaced only as flagged context."
    )
    return ConflictReport(conflict_detected=True, explanation=explanation, resolution=resolution)


def confidence_from_ranked_chunks(
    ranked: list[RankedChunk],
    conflict: ConflictReport,
    missing_required_fields: bool = False,
) -> tuple[str, bool]:
    """
    Derive a (confidence_level, is_historical) pair from concrete signals:
      - top source tier
      - presence of an unresolved conflict
      - whether required calculation inputs were missing

    Returns confidence in {"high", "moderate", "low"}.
    """
    if not ranked:
        return "low", False

    top = ranked[0]
    is_historical = top.tier == SourceTier.HISTORICAL_TICKET

    if missing_required_fields:
        return "low", is_historical

    if top.tier in (SourceTier.CUSTOMER_AGREEMENT, SourceTier.CURRENT_POLICY_OR_SOP):
        if conflict.conflict_detected:
            return "moderate", is_historical
        return "high", is_historical

    if top.tier == SourceTier.CURRENT_PRODUCT_DOC:
        return "moderate", is_historical

    # deprecated or historical as the *top* source is inherently low confidence
    return "low", is_historical
