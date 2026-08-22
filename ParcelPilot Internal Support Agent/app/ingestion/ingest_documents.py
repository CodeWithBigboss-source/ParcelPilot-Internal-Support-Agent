"""
Document Ingestion Module.

Extracts text section-by-section from the six data PDFs, attaches rich metadata,
and persists embeddings into local ChromaDB store using a fast, deterministic,
offline embedding function.
"""

from __future__ import annotations

import re
from pathlib import Path

import chromadb
import numpy as np
import pypdf
from sklearn.feature_extraction.text import HashingVectorizer

from app.core.config import CHROMA_DIR, DATA_DIR


class FastLocalEmbeddingFunction:
    """Fast, offline, deterministic embedding function for ChromaDB."""

    def __init__(self, n_features: int = 384):
        self.n_features = n_features
        self.vectorizer = HashingVectorizer(
            n_features=n_features,
            alternate_sign=False,
            token_pattern=r"(?u)\b\w+\b",
        )

    def __call__(self, input: list[str]) -> list[list[float]]:
        return self.embed_documents(input)

    def embed_documents(self, input: list[str]) -> list[list[float]]:
        if not input:
            return []
        vecs = self.vectorizer.transform(input).toarray()
        norms = np.linalg.norm(vecs, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        normalized = vecs / norms
        return normalized.tolist()

    def embed_query(self, input: list[str] | str) -> list[list[float]]:
        if isinstance(input, str):
            input = [input]
        return self.embed_documents(input)

    def name(self) -> str:
        return "FastLocalEmbeddingFunction"


# Document metadata definitions based on data pack ground truth
DOC_METADATA_CONFIG = {
    "01_Support_Policy_v3_CURRENT.pdf": {
        "display_title": "Support Policy v3 (CURRENT)",
        "doc_type": "policy",
        "status": "current",
        "effective_date": "2025-01-01",
        "account_scope": None,
    },
    "02_Support_Policy_v2_DEPRECATED.pdf": {
        "display_title": "Support Policy v2 (DEPRECATED)",
        "doc_type": "policy",
        "status": "deprecated",
        "effective_date": "2023-01-01",
        "account_scope": None,
    },
    "03_Cancellation_and_Service_Credit_SOP_v4.pdf": {
        "display_title": "Cancellation and Service Credit SOP v4",
        "doc_type": "sop",
        "status": "current",
        "effective_date": "2025-03-01",
        "account_scope": None,
    },
    "04_Product_Operations_Guide_and_Known_Issues.pdf": {
        "display_title": "Product Operations Guide and Known Issues",
        "doc_type": "product_guide",
        "status": "current",
        "effective_date": "2025-06-01",
        "account_scope": None,
    },
    "05_Northstar_Logistics_Enterprise_Agreement.pdf": {
        "display_title": "Northstar Logistics Enterprise Agreement",
        "doc_type": "agreement",
        "status": "current",
        "effective_date": "2024-01-01",
        "account_scope": "ACCT-001",
    },
    "06_LumenWorks_Service_Agreement.pdf": {
        "display_title": "LumenWorks Service Agreement",
        "doc_type": "agreement",
        "status": "current",
        "effective_date": "2024-06-01",
        "account_scope": "ACCT-002",
    },
}


def _split_into_sections(text: str) -> list[tuple[str, str]]:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    sections: list[tuple[str, str]] = []
    current_title = "General"
    current_lines: list[str] = []

    for line in lines:
        is_heading = bool(
            re.match(r"^(\d+\.|\d+\)|\bSection\b|\bPART\b|\bKI-\d+\b)", line, re.IGNORECASE)
            or (len(line) < 60 and line.isupper())
        )

        if is_heading and current_lines:
            sections.append((current_title, "\n".join(current_lines)))
            current_title = line
            current_lines = [line]
        else:
            if not current_lines and is_heading:
                current_title = line
            current_lines.append(line)

    if current_lines:
        sections.append((current_title, "\n".join(current_lines)))

    return sections


def ingest_documents() -> int:
    chroma_client = chromadb.PersistentClient(path=str(CHROMA_DIR))
    embedding_fn = FastLocalEmbeddingFunction()

    try:
        chroma_client.delete_collection("parcelpilot_documents")
    except Exception:
        pass

    collection = chroma_client.create_collection(
        name="parcelpilot_documents",
        embedding_function=embedding_fn,
        metadata={"hnsw:space": "cosine"},
    )

    documents: list[str] = []
    metadatas: list[dict] = []
    ids: list[str] = []

    for filename, config in DOC_METADATA_CONFIG.items():
        pdf_path = DATA_DIR / filename
        if not pdf_path.exists():
            print(f"Warning: PDF file not found: {pdf_path}")
            continue

        reader = pypdf.PdfReader(str(pdf_path))
        full_text = ""
        for page in reader.pages:
            full_text += (page.extract_text() or "") + "\n"

        sections = _split_into_sections(full_text)

        for idx, (title, section_text) in enumerate(sections):
            chunk_id = f"{filename}_{idx}"
            metadata = {
                "source_file": filename,
                "display_title": config["display_title"],
                "doc_type": config["doc_type"],
                "status": config["status"],
                "effective_date": config["effective_date"],
                "account_scope": config["account_scope"] or "",
                "section_title": title,
            }

            documents.append(section_text)
            metadatas.append(metadata)
            ids.append(chunk_id)

    if documents:
        collection.add(
            documents=documents,
            metadatas=metadatas,
            ids=ids,
        )
        print(f"Ingested {len(documents)} document sections into ChromaDB collection 'parcelpilot_documents'.")

    return len(documents)


if __name__ == "__main__":
    ingest_documents()
