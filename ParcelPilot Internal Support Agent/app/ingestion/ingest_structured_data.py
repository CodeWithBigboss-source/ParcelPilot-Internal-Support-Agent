"""
Structured Data Ingestion Module.

Reads ParcelPilot_Assessment_Data.xlsx (accounts, orders, tickets sheets)
and populates local SQLite database storage/app.db.
"""

from __future__ import annotations

import sqlite3
from pathlib import Path
import pandas as pd

from app.core.config import DATA_DIR, SQLITE_PATH


def _normalize_datetime(val) -> str | None:
    if pd.isna(val) or val is None or str(val).strip() == "" or str(val).lower() == "nat":
        return None
    if isinstance(val, pd.Timestamp):
        return val.isoformat()
    try:
        return pd.to_datetime(val).isoformat()
    except Exception:
        return str(val)


def ingest_structured_data() -> dict[str, int]:
    """
    Parses Excel sheets into SQLite database storage/app.db.
    Idempotent: replaces tables.
    """
    excel_path = DATA_DIR / "ParcelPilot_Assessment_Data.xlsx"
    if not excel_path.exists():
        raise FileNotFoundError(f"Excel file not found: {excel_path}")

    conn = sqlite3.connect(SQLITE_PATH)

    # 1. Accounts Table
    df_accounts = pd.read_excel(excel_path, sheet_name="accounts")
    df_accounts["premium_support"] = df_accounts["premium_support"].apply(
        lambda x: 1 if str(x).lower() in ("true", "1", "yes") else 0
    )

    conn.execute("DROP TABLE IF EXISTS accounts")
    conn.execute(
        """
        CREATE TABLE accounts (
            account_id TEXT PRIMARY KEY,
            account_name TEXT,
            plan TEXT,
            status TEXT,
            csm TEXT,
            contract_file TEXT,
            premium_support INTEGER,
            notes TEXT
        )
        """
    )
    df_accounts.to_sql("accounts", conn, if_exists="append", index=False)

    # 2. Orders Table
    df_orders = pd.read_excel(excel_path, sheet_name="orders")
    datetime_cols_orders = [
        "booked_at",
        "pickup_window_start",
        "pickup_window_end",
        "pickup_actual_at",
        "cancellation_requested_at",
    ]
    for col in datetime_cols_orders:
        if col in df_orders.columns:
            df_orders[col] = df_orders[col].apply(_normalize_datetime)

    df_orders["carrier_fault"] = df_orders["carrier_fault"].apply(
        lambda x: 1 if str(x).lower() in ("true", "1", "yes") else 0
    )
    df_orders["customer_fault"] = df_orders["customer_fault"].apply(
        lambda x: 1 if str(x).lower() in ("true", "1", "yes") else 0
    )

    conn.execute("DROP TABLE IF EXISTS orders")
    conn.execute(
        """
        CREATE TABLE orders (
            order_id TEXT PRIMARY KEY,
            account_id TEXT,
            carrier TEXT,
            status TEXT,
            booked_at TEXT,
            pickup_window_start TEXT,
            pickup_window_end TEXT,
            pickup_actual_at TEXT,
            shipment_fee_inr REAL,
            carrier_fault INTEGER,
            customer_fault INTEGER,
            cancellation_requested_at TEXT,
            notes TEXT,
            FOREIGN KEY (account_id) REFERENCES accounts(account_id)
        )
        """
    )
    df_orders.to_sql("orders", conn, if_exists="append", index=False)

    # 3. Tickets Table
    df_tickets = pd.read_excel(excel_path, sheet_name="tickets")
    datetime_cols_tickets = ["created_at", "last_customer_message_at"]
    for col in datetime_cols_tickets:
        if col in df_tickets.columns:
            df_tickets[col] = df_tickets[col].apply(_normalize_datetime)

    conn.execute("DROP TABLE IF EXISTS tickets")
    conn.execute(
        """
        CREATE TABLE tickets (
            ticket_id TEXT PRIMARY KEY,
            account_id TEXT,
            created_at TEXT,
            status TEXT,
            subject TEXT,
            description TEXT,
            channel TEXT,
            assigned_to TEXT,
            last_customer_message_at TEXT,
            historical_resolution TEXT,
            FOREIGN KEY (account_id) REFERENCES accounts(account_id)
        )
        """
    )
    df_tickets.to_sql("tickets", conn, if_exists="append", index=False)

    # 4. Actions Audit Table (State-changing actions log)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS actions (
            action_id TEXT PRIMARY KEY,
            action_type TEXT,
            target_entity_id TEXT,
            priority TEXT,
            reason TEXT,
            details TEXT,
            status TEXT,
            executed_by TEXT,
            executed_at TEXT,
            result_id TEXT
        )
        """
    )

    conn.commit()
    conn.close()

    counts = {
        "accounts": len(df_accounts),
        "orders": len(df_orders),
        "tickets": len(df_tickets),
    }
    print(f"Ingested structured data: {counts}")
    return counts


if __name__ == "__main__":
    ingest_structured_data()
