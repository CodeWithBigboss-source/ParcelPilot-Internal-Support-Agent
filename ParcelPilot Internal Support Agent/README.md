# ParcelPilot Internal Support Agent — Backend Core Engine (Phase 2)

Production core engine powering ParcelPilot's internal AI Support & Operations chatbot used by authorized ParcelPilot staff to investigate accounts, orders, tickets, contracts, and policies, and to propose state-changing actions with mandatory human confirmation.

---

## Key Features

1. **Explicit Source Authority & Ranking**:
   - **Tier 0**: Signed Customer Agreements (overrides default policy for scoped account).
   - **Tier 1**: Current Support Policy & SOPs (`status == 'current'`).
   - **Tier 2**: Product Operations Guide & Known Issues.
   - **Tier 3**: Deprecated Policy Documents (`status == 'deprecated'`, never authoritative).
   - **Tier 4**: Historical Ticket Resolutions (context only, never authoritative).
2. **Tool-Level Access Control**:
   - Enforced in Python code (`app/core/access_control.py` & `app/agent/tools.py`) before SQL queries run.
   - Role-based permissions (`support_agent`, `senior_support`, `operations_manager`, `admin`).
   - Scoped `support_agent` accounts cannot access data belonging to other accounts.
3. **Two-Phase Action Boundary**:
   - `propose_action` creates a server-side unconfirmed pending action object.
   - `execute_action` requires a separate explicit API call (`POST /actions/{action_id}/confirm`) and role permissions.
4. **Reliability & Trust Layer**:
   - Explicit confidence levels (`high`, `moderate`, `low`).
   - Conflict detection between current vs deprecated/historical sources.
   - Fixed dataset snapshot time (`2026-08-16 11:00 Asia/Kolkata`) used for all business-logic calculations.

---

## Project Structure

```
.
├── app/
│   ├── main.py                     # FastAPI application & routes
│   ├── core/
│   │   ├── config.py               # Env vars, snapshot time, role permissions
│   │   ├── source_ranking.py       # Source authority tier ranking & conflict detection
│   │   └── access_control.py       # Role and account scoping enforcement
│   ├── agent/
│   │   ├── orchestrator.py         # Groq tool-calling agent loop
│   │   ├── tools.py                # Document search, SQL queries, propose & execute actions
│   │   └── schemas.py              # Pydantic v2 API & internal schemas
│   └── ingestion/
│       ├── ingest.py               # Unified ingestion script
│       ├── ingest_documents.py     # PDF section extractor & ChromaDB populator
│       └── ingest_structured_data.py # Excel workbook parser & SQLite builder
├── data/                           # Source PDFs & Excel workbook (read-only)
├── storage/                        # Persistent local databases (ChromaDB + SQLite app.db)
├── tests/
│   └── test_scenarios.py           # Automated test suite for 10 core scenarios
├── .env.example
├── requirements.txt
└── README.md
```

---

## Setup & Running

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and set your `GROQ_API_KEY`:
```bash
cp .env.example .env
```
Example `.env`:
```env
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
DATASET_SNAPSHOT_TIME=2026-08-16T11:00:00+05:30
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,*
```

### 3. Run Data Ingestion
Ingest PDFs into ChromaDB and Excel sheets into SQLite:
```bash
python -m app.ingestion.ingest
```

### 4. Launch API Server
Start the Uvicorn ASGI server:
```bash
uvicorn app.main:app --reload --port 8000
```
Interactive OpenAPI documentation will be available at `http://localhost:8000/docs`.

---

## Running Automated Tests

Execute pytest to run unit and scenario tests:
```bash
pytest tests/ -v
```

---

## API Endpoints Summary

- `POST /chat`: Receives user message, history, and context (`role`, `account_scope`); returns structured agent response (`answer`, `sources`, `confidence`, `tool_trace`, `pending_action`).
- `POST /actions/{action_id}/confirm`: Confirms and executes a proposed pending action.
- `POST /actions/{action_id}/cancel`: Cancels a proposed pending action.
- `GET /health`: Health check and dataset snapshot time info.
