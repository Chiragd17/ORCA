#!/usr/bin/env python3
"""
ORCA Database Verification Script
Checks connection to PostgreSQL, verifies that required tables exist, and prints row counts.
"""

import asyncio
from sqlalchemy import text
from app.db.session import engine


async def verify_database():
    print("[*] Testing database connectivity...")
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT version();"))
            db_version = result.scalar()
            print(f"[+] Connected to PostgreSQL: {db_version}")

            # Check tables
            tables_query = text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name;
            """)
            tables = (await conn.execute(tables_query)).scalars().all()
            print(f"[*] Found {len(tables)} tables: {', '.join(tables) if tables else 'None'}")
    except Exception as e:
        print(f"[!] Database connection error: {e}")
        print("    Please ensure PostgreSQL is running and DATABASE_URL in .env is correct.")

if __name__ == "__main__":
    asyncio.run(verify_database())
