# ORCA External Data Sources & Datasets Catalog

> Note: For the full unabridged catalog of all live operational streams, reanalysis models, geospatial infrastructure, and demographic census registers, see [DATASETS.md](file:///c:/Users/chira/Desktop/ORCA_Agent/person3/DATASETS.md).

---

## 1. Primary Live Operational Data Feeds

| Source | Domain | Variables / Products | Access Method | Licensing / Constraints |
|---|---|---|---|---|
| **Open-Meteo Marine API** | Live Physical Oceanography & Waves | Significant wave height ($H_s$), wave period ($T_p$), direction, swell spectra, SST, ocean current velocity & direction | REST API (JSON) `https://marine-api.open-meteo.com/v1/marine` | CC BY 4.0 (Non-commercial attribution) |
| **Open-Meteo Weather API** | Live Marine Surface Meteorology | 10m wind speed, gusts, direction, surface air temperature, mean sea level pressure | REST API (JSON) `https://api.open-meteo.com/v1/forecast` | CC BY 4.0 |
| **GDACS (Global Disaster Alert & Coordination System)** | Real-Time Disaster Alerts & Events | Active cyclone, flood, tsunami alert feeds, severity ratings (Red/Orange/Green), spatial disaster polygons | GeoJSON / REST `https://www.gdacs.org/datareport/resources/` | UN OCHA & European Commission JRC |
| **NOAA NHC (National Hurricane Center)** | Active Tropical Cyclone Forecasts | Official 5-day predictive cyclone track waypoints, forecast cones, wind speed envelopes | JSON / GIS Shapefiles `https://www.nhc.noaa.gov/CurrentStorms.json` | Public Domain (US Government) |

---

## 2. Historical Archives & Physical Baselines

| Source | Domain | Coverage & Variables | Access Method | Licensing |
|---|---|---|---|---|
| **NOAA IBTrACS (v04r01)** | Historical Cyclone Registry | 1848–2026 global historical storm tracks, 3h/6h fixes, wind speeds, minimum pressure, SSHS/IMD category | CSV / NetCDF / Local DB (`data/processed/ibtracs_arabian_sea_sample.csv`) | Public Domain (NOAA NCEI) |
| **INCOIS Moored Wave Buoy Network** | Ground-Truth In-Situ Ocean Observations | Coastal wave rider buoys (Karwar, Tadadi, Honnavar, Bhatkal, Malpe, Kaup, Mangaluru, Arabian Deep); wave spectra, swell surge (*Kallakkadal*) alerts | INCOIS MoES Web Portal / Moored Buoys Registry | Open Government Data (OGD) India |
| **ECMWF ERA5 / Copernicus Marine (C3S / CMEMS)** | Oceanographic Climatology Baselines | 30-year baseline sea surface temperature (29.20°C Karnataka coast), seasonal cycles, anomaly calculation baselines | Processed JSON fixture (`data/processed/arabian_sea_historical_2025_2026.json`) | Copernicus Open Licence |
| **India Meteorological Department (IMD)** | Regional Cyclone Reports | RSMC New Delhi cyclone landfall bulletins, storm surge return tables, historical hazard impact assessments | Official IMD Post-Cyclone Reports | Open Government Data (OGD) India |

---

## 3. Geospatial, Maritime & Ecological Datasets

| Source | Domain | Features Ingested | Coordinate System | Licensing |
|---|---|---|---|---|
| **OpenStreetMap (OSM) / Overpass QL** | Coastal Infrastructure & Seaports | Seaports (NMPT, Old Mangalore Bunder, Karwar, Malpe, Tadadi, Honnavar), hospitals (Wenlock, Goschen), bridges, NH-66 | WGS84 (`EPSG:4326`) | ODbL 1.0 (OSM Contributors) |
| **KSCZMA (Karnataka State Coastal Zone Management Authority)** | Coastal Regulation Zone & Cadastre | 320 km Karnataka coastline, CRZ-I/II/III/IV boundaries, mangrove intertidal flats, hazard lines, erosion buffer lines | WGS84 (`EPSG:4326`) | Open Government Data (OGD) India |
| **Ramsar Convention on Wetlands** | Internationally Protected Wetlands | Aghanashini Estuary Ramsar Site (Site #2509, 4,801 hectares), mangrove conservation polygons | WGS84 (`EPSG:4326`) | Ramsar Open Repository |
| **Protected Planet (WDPA / UNEP-WCMC)** | Marine Protected Areas (MPAs) | Netrani Island Coral Sanctuary, St. Mary's Island National Monument, coastal conservation reserves | GeoJSON Polygons | UNEP-WCMC / IUCN (Research) |

---

## 4. Demographic & Population Vulnerability Datasets

| Source | Domain | Attributes & Resolution | Application | Licensing |
|---|---|---|---|---|
| **Census of India 2011 (Directorate of Census Operations Karnataka)** | Official Population Census | Ward & settlement-level resident counts: Mangaluru (399,565), Ullal (108,614), Surathkal (86,798), Udupi/Malpe (125,306), Karwar (63,705); 1,075,668 3-district coastal total | Deterministic arithmetic population exposure evaluation | Open Government Data License (OGDL) India |
| **WorldPop Research Group** | High-Resolution Population Distribution | 100-meter gridded population density surface | Dynamic circular hazard buffer ($30km, 50km, 160km$) zonal population estimation | CC BY 4.0 |

---

## 5. Ingestion & Deterministic Verification Rules

1. **Real Data First**: Raw historical observations and numerical forecasts are explicitly demarcated; missing observations are never concealed or hallucinated.
2. **Deterministic Arithmetic**: Large Language Models (LLMs) are strictly forbidden from performing mathematical calculations or statistics. Pure Python handles all arithmetic, spatial distances (Haversine formula), and unit conversions.
3. **Cryptographic SHA-256 Hashing**: Every ingested record is hashed with SHA-256 into immutable `evidence_records` in PostgreSQL for tamper-evident verification.
4. **WGS84 & UTC Compliance**: All coordinates are standardized to WGS84 (`EPSG:4326`) and timestamps normalized to timezone-aware UTC.
