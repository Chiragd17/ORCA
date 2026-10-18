# Database Restore Instructions for ORCA

This folder contains the PostgreSQL database dumps for the ORCA project:
- **`orca_db.sql`** (~117 KB): Primary project database (coastal features, data sources, evidence records, marine observations, hazard events).
- **`orca_db_person2.sql`** (~15.6 MB): Hazard tracks, investigations, findings, and forecast database.

---

## Quick Setup (Windows / macOS / Linux)

### Option 1: Using Command Line (`psql`)

1. Open your terminal or Command Prompt / PowerShell.
2. Create the databases and user in PostgreSQL:
   ```sql
   psql -U postgres -c "CREATE USER orca_user WITH PASSWORD 'orca_password';"
   psql -U postgres -c "CREATE DATABASE orca_db OWNER orca_user;"
   psql -U postgres -c "CREATE DATABASE orca_db_person2 OWNER orca_user;"
   ```
3. Import the SQL dump files:
   ```bash
   # Import primary database:
   psql -U postgres -d orca_db -f orca_db.sql

   # Import secondary hazard/investigations database (if needed):
   psql -U postgres -d orca_db_person2 -f orca_db_person2.sql
   ```
4. Grant full schema permissions to `orca_user`:
   ```bash
   psql -U postgres -d orca_db -c "GRANT ALL ON SCHEMA public TO orca_user; GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO orca_user; GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO orca_user;"
   psql -U postgres -d orca_db_person2 -c "GRANT ALL ON SCHEMA public TO orca_user; GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO orca_user; GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO orca_user;"
   ```

---

### Option 2: Using pgAdmin 4 GUI

1. Open **pgAdmin 4** and connect to your local PostgreSQL server.
2. Under **Databases**, right-click and select **Create > Database...**
   - Name: `orca_db`
3. Right-click the newly created `orca_db` database and select **Query Tool**.
4. Open `orca_db.sql` in the Query Tool (or paste its contents) and click **Execute (F5)**.
5. (Optional) Repeat the steps to create `orca_db_person2` and execute `orca_db_person2.sql`.

---

## Corresponding `.env` Configuration in Backend

Ensure the backend `.env` file has matching credentials:

```env
DATABASE_URL=postgresql+psycopg://orca_user:orca_password@localhost:5432/orca_db
HAZARD_DATABASE_URL=postgresql+psycopg://orca_user:orca_password@localhost:5432/orca_db_person2
```
