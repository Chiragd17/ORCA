import psycopg

conn = psycopg.connect('postgresql://orca_user:orca_password@localhost:5432/orca_db')
cur = conn.cursor()

# Get all tables
cur.execute('''
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
''')
tables = [r[0] for r in cur.fetchall()]
print('=== POSTGRESQL TABLES IN ORCA_DB ===')
for t in tables:
    cur.execute(f'SELECT count(*) FROM "{t}";')
    cnt = cur.fetchone()[0]
    print(f'  • {t}: {cnt} rows')

print('\n=== 1. DATA SOURCES CATALOG (data_sources) ===')
cur.execute('SELECT id, name, provider, update_frequency FROM data_sources;')
for r in cur.fetchall():
    print(f'  [{r[0]}] {r[1]} | Provider: {r[2]} | Freq: {r[3]}')

print('\n=== 2. HISTORICAL HAZARD EVENTS (hazard_events) ===')
cur.execute('SELECT id, external_id, name, hazard_type, basin, status, started_at, ended_at FROM hazard_events;')
for r in cur.fetchall():
    print(f'  [{r[0]}] {r[2]} ({r[3]}) | Basin: {r[4]} | Dates: {r[6]} to {r[7]}')

print('\n=== 3. HAZARD TRACK WAYPOINTS (hazard_tracks) ===')
cur.execute('SELECT hazard_event_id, timestamp, latitude, longitude, wind_speed_kts, central_pressure_mb FROM hazard_tracks ORDER BY timestamp ASC;')
for r in cur.fetchall():
    print(f'  Event: {r[0]} | Time: {r[1]} | Lat/Lon: ({r[2]}, {r[3]}) | Wind: {r[4]} kts | Pres: {r[5]} mb')

print('\n=== 4. COASTAL FEATURES & POPULATION (coastal_features) ===')
cur.execute('SELECT name, feature_type, latitude, longitude, estimated_population FROM coastal_features ORDER BY estimated_population DESC NULLS LAST;')
for r in cur.fetchall():
    pop = f'{r[4]:,}' if r[4] else 'N/A'
    print(f'  • {r[0]} ({r[1]}) | Coords: ({r[2]}, {r[3]}) | Population: {pop}')

print('\n=== 5. MARINE OBSERVATIONS (marine_observations) ===')
cur.execute('SELECT id, variable, value, unit, observation_time, is_forecast FROM marine_observations;')
for r in cur.fetchall():
    print(f'  • {r[1]}: {r[2]} {r[3]} | Obs Time: {r[4]} | Forecast: {r[5]}')

print('\n=== 6. EVIDENCE AUDIT TRAIL (evidence_records) ===')
cur.execute('SELECT id, source_identifier, data_type, hash FROM evidence_records;')
for r in cur.fetchall():
    print(f'  • [{r[0]}] {r[1]} ({r[2]}) | Hash: {r[3][:16]}...')

print('\n=== 7. INVESTIGATIONS LIFECYCLE ===')
for tbl in ['investigations', 'investigation_findings', 'investigation_events']:
    cur.execute(f'SELECT count(*) FROM "{tbl}";')
    print(f'  • {tbl}: {cur.fetchone()[0]} rows')

conn.close()
