# ORCA Data Directory

This directory stores raw and processed data assets for local development.

- `raw/`: Unprocessed downloads (e.g. IBTrACS CSV extracts, GeoTIFF population tiles, NetCDF marine files).
- `processed/`: Normalized GeoJSON, Parquet, or pre-indexed SQLite/cache files.

**Important**: Large raw files (>10MB) must NEVER be committed to Git. Files in `data/raw/` and `data/processed/` are ignored by `.gitignore` (except `.gitkeep`).
