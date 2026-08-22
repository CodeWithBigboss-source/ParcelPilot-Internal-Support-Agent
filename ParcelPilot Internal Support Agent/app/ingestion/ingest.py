"""
Unified ingestion entrypoint.
Run using: python -m app.ingestion.ingest
"""

from __future__ import annotations

from app.ingestion.ingest_documents import ingest_documents
from app.ingestion.ingest_structured_data import ingest_structured_data


def run_full_ingestion():
    print("=== STARTING PARCELPILOT DATA INGESTION ===")
    doc_count = ingest_documents()
    struct_counts = ingest_structured_data()
    print("=== INGESTION COMPLETED SUCCESSFULLY ===")
    print(f"Document Sections: {doc_count}")
    print(f"Accounts: {struct_counts['accounts']}, Orders: {struct_counts['orders']}, Tickets: {struct_counts['tickets']}")


if __name__ == "__main__":
    run_full_ingestion()
