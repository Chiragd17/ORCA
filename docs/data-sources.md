# ORCA External Data Sources Catalog

ORCA adheres to a strict "Real Data First" policy. The candidate sources below are used to obtain genuine marine observations, cyclone tracks, and coastal features.

---

## 1. Candidate Data Sources

| Source | Domain | Variables / Products | Access Method | Licensing / Constraints |
|---|---|---|---|---|
| **Open-Meteo Marine API** | Marine Forecast & Observations | Wave height, period, direction, swell, SST, wind speed | REST API (No key required for non-commercial) | Attribution required |
| **NOAA IBTrACS** | Tropical Cyclone History | Historical cyclone tracks, central pressure, max sustained wind speed | CSV / NetCDF / HTTP | Public Domain (US Gov) |
| **GDACS** (Global Disaster Alert and Coordination System) | Disaster Alerts & Events | Real-time cyclone, flood, tsunami alert feeds | GeoRSS / REST API | UN / OCHA & European Commission |
| **NOAA ERDDAP / Copernicus Marine** | Oceanographic Observations | Sea surface temperature (SST), chlorophyll-a, ocean currents | ERDDAP REST / STAC / OGC | Open access with attribution |
| **OpenStreetMap / Overpass API** | Coastal Geography | Coastal outlines, ports, settlements, emergency infrastructure | Overpass QL / GeoJSON | ODbL (Open Database License) |
| **WorldPop** | Population Distribution | High-resolution spatial population counts | GeoTIFF / CSV extracts | Creative Commons Attribution 4.0 |
| **Protected Planet (WDPA)** | Marine Protected Areas | Marine sanctuary boundaries and conservation status | GeoJSON / Shapefile extracts | Non-commercial / WDPA Terms |

---

## 2. Ingestion Principles

1. **Local Study Area**: Focus prototype imports primarily on the **Arabian Sea & Karnataka/Western India Coast** (Latitude: 10°N – 16°N, Longitude: 70°E – 76°E) to keep dataset sizes lightweight and fast for development.
2. **Idempotence**: All import scripts must check for existing records using unique identifiers (e.g., source URI + timestamp) before inserting new rows.
3. **No Large Binaries in Git**: Raw NetCDF, GRIB, and GeoTIFF files must reside in `data/raw/` (ignored by git).
