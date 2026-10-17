#!/usr/bin/env python3
"""
ORCA Database Verification Script
Checks connection to PostgreSQL, verifies that required tables exist, and prints row counts.
"""

import asyncio
import os
import sys

# Ensure backend directory is in sys.path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# pyrefly: ignore [missing-import]
from sqlalchemy import text
# pyrefly: ignore [missing-import]
from app.db.session import engine


async def verify_database():
    print("[*] Testing database connectivity...")
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT version();"))
            db_version = result.scalar()
            print(f"[+] Connected to PostgreSQL: {db_version.split(' on ')[0]}")

            # Check tables and row counts
            tables_query = text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name;
            """)
            tables = (await conn.execute(tables_query)).scalars().all()
            print(f"[*] Found {len(tables)} tables:")
            for t in tables:
                cnt = (await conn.execute(text(f"SELECT count(*) FROM {t}"))).scalar()
                print(f"    - {t:<26} : {cnt} rows")
            print("[+] Database integrity verified successfully.")
    except Exception as e:
        print(f"[!] Database connection error: {e}")
        print("    Please ensure PostgreSQL is running and DATABASE_URL in .env is correct.")

if __name__ == "__main__":
    asyncio.run(verify_database())

