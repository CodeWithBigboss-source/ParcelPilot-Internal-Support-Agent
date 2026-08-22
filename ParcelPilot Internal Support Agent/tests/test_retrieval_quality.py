"""
Retrieval Quality Evaluation Test Suite.

Evaluates semantic document search against 15 paraphrased & varied domain questions
covering all six source PDFs in the ParcelPilot dataset.
Asserts that the correct source document appears in the top 3 retrieved results for each test case.
"""

import pytest
from app.agent.tools import search_documents

# 15 Paraphrased Test Questions covering all 6 PDF documents
RETRIEVAL_TEST_CASES = [
    # Document 1: Support Policy v3 (CURRENT)
    {
        "query": "What are the standard support response time SLAs and operational hours?",
        "expected_doc": "Support Policy v3",
    },
    {
        "query": "How is P1 critical severity defined for production outages?",
        "expected_doc": "Support Policy v3",
    },
    {
        "query": "What is the escalation procedure for unresolved tickets after 24 hours?",
        "expected_doc": "Support Policy v3",
    },

    # Document 2: Support Policy v2 (DEPRECATED)
    {
        "query": "What were the legacy 2023 tier 2 support response times under v2 policy?",
        "expected_doc": "Support Policy v2",
        "doc_type": "policy",
    },
    {
        "query": "Show historical 2023 deprecated policy on emergency phone support",
        "expected_doc": "Support Policy v2",
        "doc_type": "policy",
    },

    # Document 3: Cancellation and Service Credit SOP v4
    {
        "query": "What is the standard cancellation fee and time window after order booking?",
        "expected_doc": "Cancellation and Service Credit SOP v4",
    },
    {
        "query": "How are service credits calculated when pickup is delayed by 2 hours?",
        "expected_doc": "Cancellation and Service Credit SOP v4",
    },
    {
        "query": "What is the manager approval threshold for issuing customer credit notes?",
        "expected_doc": "Cancellation and Service Credit SOP v4",
    },

    # Document 4: Product Operations Guide and Known Issues
    {
        "query": "Why does SwiftShip order status remain stuck in BOOKED state after pickup?",
        "expected_doc": "Product Operations Guide and Known Issues",
    },
    {
        "query": "KI-208 bulk upload CSV limit exceeds 3000 rows and fails silently",
        "expected_doc": "Product Operations Guide and Known Issues",
    },
    {
        "query": "How to resolve KI-211 carrier tracking sync delays?",
        "expected_doc": "Product Operations Guide and Known Issues",
    },

    # Document 5: Northstar Logistics Enterprise Agreement
    {
        "query": "Does Northstar Logistics have a fee waiver for cancelling booked orders?",
        "expected_doc": "Northstar Logistics Enterprise Agreement",
        "account_scope": "ACCT-001",
    },
    {
        "query": "What are the custom terms in Northstar's signed contract under Section 4.2?",
        "expected_doc": "Northstar Logistics Enterprise Agreement",
        "account_scope": "ACCT-001",
    },

    # Document 6: LumenWorks Service Agreement
    {
        "query": "What is LumenWorks' custom pickup delay credit threshold and amount?",
        "expected_doc": "LumenWorks Service Agreement",
        "account_scope": "ACCT-002",
    },
    {
        "query": "According to Section 3.1 of LumenWorks agreement, when does credit apply?",
        "expected_doc": "LumenWorks Service Agreement",
        "account_scope": "ACCT-002",
    },
]


@pytest.mark.parametrize("case", RETRIEVAL_TEST_CASES)
def test_retrieval_quality_top_3(case):
    res = search_documents(
        query=case["query"],
        account_scope=case.get("account_scope"),
        doc_type=case.get("doc_type"),
        n_results=10,
    )
    chunks = res.get("chunks", [])
    top_3_files = [c["source_file"] for c in chunks[:3]]

    matched = any(case["expected_doc"].lower() in f.lower() for f in top_3_files)
    assert matched, (
        f"Failed retrieval test for query: '{case['query']}'. "
        f"Expected '{case['expected_doc']}' in top 3 results, got: {top_3_files}"
    )
