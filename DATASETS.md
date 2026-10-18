# ORCA Platform — Complete Data Sources & Datasets Catalog

This document provides a comprehensive inventory of all **live operational data feeds**, **open-source datasets**, **scientific numerical models**, **geospatial registers**, and **demographic sources** utilized across the **ORCA Marine & Coastal Intelligence Platform**.

All data ingested into ORCA adheres to the platform's strict **"Real Data First"** and **"Deterministic Verification"** policies: every numerical assertion resolves to an immutable evidence record with authentic provenance, UTC timestamps, WGS84 geographic coordinates, standard physical units, and cryptographic SHA-256 integrity checksums.

---

## Table of Contents

1. [Live Operational Real-Time Feeds (REST APIs & Streaming)](#1-live-operational-real-time-feeds-rest-apis--streaming)
2. [Meteorological, Oceanographic & Historical Cyclone Archives](#2-meteorological-oceanographic--historical-cyclone-archives)
3. [Geospatial, Maritime & Critical Infrastructure Datasets](#3-geospatial-maritime--critical-infrastructure-datasets)
4. [Ecological Reserves & Marine Protected Areas](#4-ecological-reserves--marine-protected-areas)
5. [Demographic & Coastal Population Exposure Datasets](#5-demographic--coastal-population-exposure-datasets)
6. [Agent & Workspace Consumption Matrix](#6-agent--workspace-consumption-matrix)
7. [Cryptographic Provenance & Evidence Verification Architecture](#7-cryptographic-provenance--evidence-verification-architecture)

---

## 1. Live Operational Real-Time Feeds (REST APIs & Streaming)

### 1.1 Open-Meteo Marine API (Physical Oceanography & Wave Dynamics)
- **Provider**: Open-Meteo GmbH & Copernicus Marine Environment Monitoring Service (CMEMS).
- **Endpoint**: `https://marine-api.open-meteo.com/v1/marine`
- **Access Protocol**: HTTP REST (JSON, GeoJSON)
- **Authentication**: None required (Open data for scientific & non-commercial use).
- **Update Frequency**: Hourly operational forecast cycles; refreshed every 15–30 minutes in ORCA.
- **Underlying Scientific Models**:
  - **ECMWF WAM (Wave Action Model)**: Third-generation spectral ocean wave model run by the European Centre for Medium-Range Weather Forecasts on a 0.25° (~28 km) oceanic mesh.
  - **Copernicus Marine (CMEMS) Global Ocean Physics Analysis & Forecasting Model**: 1/12° resolution global hydrodynamic simulation assimilating satellite altimetry and ARGO profiling floats.
  - **Mercator Ocean Global Physics Engine**: High-resolution multi-depth current velocities.
  - **NOAA GFS Wave (WaveWatch III)**: Global ocean wave model coupling.
- **Key Variables Extracted**:
  - `wave_height`: Significant wave height ($H_s$) in meters ($m$).
  - `wave_period`: Peak wave period ($T_p$) in seconds ($s$).
  - `wave_direction`: Mean wave direction in degrees ($0^\circ–360^\circ$).
  - `swell_wave_height` & `swell_wave_period`: Long-period swell wave component.
  - `ocean_current_velocity`: Sea water current velocity in meters per second ($m/s$).
  - `ocean_current_direction`: Current vector heading in degrees ($^\circ$).
  - `sea_surface_temperature`: Live sea surface temperature (SST) in degrees Celsius ($^\circ\text{C}$).
- **License**: Creative Commons Attribution 4.0 International (CC BY 4.0).

---

### 1.2 Open-Meteo Surface Weather & Wind Forecast API
- **Provider**: Open-Meteo GmbH / ECMWF IFS / DWD ICON.
- **Endpoint**: `https://api.open-meteo.com/v1/forecast`
- **Access Protocol**: HTTP REST (JSON)
- **Update Frequency**: Hourly forward simulation up to 168 hours (7 days).
- **Key Variables Extracted**:
  - `wind_speed_10m`: 10-meter surface wind speed (converted deterministically to knots, $1\text{ m/s} = 1.94384\text{ kts}$).
  - `wind_gusts_10m`: Peak instantaneous wind gusts in knots and $km/h$.
  - `wind_direction_10m`: Wind vector orientation.
  - `surface_pressure`: Atmospheric barometric pressure in hectopascals ($hPa$).
  - `temperature_2m`: Ambient 2m air temperature ($^\circ\text{C}$).
- **License**: CC BY 4.0 / Open Government Data.

---

### 1.3 GDACS (Global Disaster Alert and Coordination System)
- **Provider**: Joint initiative of the United Nations Office for the Coordination of Humanitarian Affairs (UN OCHA) and the European Commission Joint Research Centre (EC JRC).
- **Endpoint**: `https://www.gdacs.org/datareport/resources/` (GeoJSON / GeoRSS Feeds)
- **Access Protocol**: HTTP REST / Near-Realtime GeoJSON Polling.
- **Update Frequency**: Continuous 15-minute telemetry sync.
- **Coverage**: Global ocean basins (Arabian Sea, Bay of Bengal, North Indian Ocean, Pacific, Atlantic).
- **Key Variables Extracted**:
  - Active tropical cyclone, tsunami, and flood disaster alerts.
  - Alert Level Classification: `Green` (Low/Informational), `Orange` (Moderate/Preparedness), `Red` (Severe/Humanitarian Emergency).
  - Disaster coordinates (centroid lat/lon), radial storm cones, and geographic impact polygons.
  - Official hazard identifiers (e.g., `TC1000982`) and event timestamps.
- **License**: Public Sector Information / Open Data for humanitarian operations.

---

### 1.4 NOAA National Hurricane Center (NHC) GIS Data Feeds
- **Provider**: National Oceanic and Atmospheric Administration (NOAA) / National Weather Service (NWS).
- **Endpoint**: `https://www.nhc.noaa.gov/CurrentStorms.json` & Automated Shapefile/KML Archives.
- **Access Protocol**: HTTP REST / Streaming GIS Shapefile packages.
- **Update Frequency**: 6-hourly official advisory issuances during active tropical cyclogenesis.
- **Key Variables Extracted**:
  - Storm forecast track positions ($12h, 24h, 36h, 48h, 72h, 96h, 120h$ lead times).
  - Maximum sustained wind speeds (knots) and wind gust envelope.
  - Minimum central barometric pressure ($hPa$).
  - Saffir-Simpson Hurricane Scale classification.
- **License**: Public Domain (United States Government Work).

---

## 2. Meteorological, Oceanographic & Historical Cyclone Archives

### 2.1 NOAA IBTrACS (International Best Track Archive for Climate Stewardship - v04r01)
- **Provider**: NOAA National Centers for Environmental Information (NCEI) & World Meteorological Organization (WMO).
- **Dataset in ORCA**: `data/processed/ibtracs_arabian_sea_sample.csv` & live NCEI API sync.
- **Temporal Span**: 1848 to 2026 (over 175 years of historical cyclone fixes).
- **Coverage**: Global oceanic basins; specialized subset for North Indian Ocean (Basin: `NI` / `arabian_sea` & `bay_of_bengal`).
- **Key Variables Extracted**:
  - Unique cyclone identifiers (e.g., `hz-ibtracs-2021133n10071` for Cyclone Tauktae).
  - 3-hourly and 6-hourly best-track geographic waypoints (`latitude`, `longitude`).
  - Maximum sustained wind speeds (`wind_speed_knots`).
  - Central barometric pressure (`min_pressure_hpa`).
  - IMD Classification: *Depression (D)*, *Deep Depression (DD)*, *Cyclonic Storm (CS)*, *Severe Cyclonic Storm (SCS)*, *Very Severe Cyclonic Storm (VSCS)*, *Extremely Severe Cyclonic Storm (ESCS)*, *Super Cyclonic Storm (SuCS)*.
- **Canonical Precedent Events in ORCA**:
  - **Cyclone Tauktae (2021)**: Category 4 ESCS (100 kts sustained, 120 kts peak), passed along Karnataka shelf.
  - **Cyclone Kyarr (2019)**: Category 5 SuCS (135 kts peak), record-intensity Arabian Sea storm.
  - **Cyclone Biparjoy (2023)**: ESCS (90 kts sustained, 14-day record endurance in Arabian Sea).
  - **Cyclone Mekunu (2018)** & **Cyclone Gonu (2007)**: Severe offshore Arabian Sea precedents.
  - **Cyclone Amphan (2020)** & **Cyclone Ditwah**: Bay of Bengal benchmark events.
- **License**: Public Domain (NOAA / WMO).

---

### 2.2 INCOIS Moored Wave Buoy & Observatory Network (Ground Truth Verification)
- **Provider**: Indian National Centre for Ocean Information Services (INCOIS), Ministry of Earth Sciences (MoES), Government of India.
- **Access Method**: In-situ moored oceanographic wave-rider buoys, coastal tide gauge networks, and port acoustic current profilers.
- **Operational Stations Integrated in ORCA**:
  1. **Karwar Port Wave Buoy** (`14.80°N, 74.12°E`) — Northern Karnataka Shelf.
  2. **Tadadi Estuary Wave Station** (`14.53°N, 74.32°E`) — Aghanashini Estuarine mouth.
  3. **Honnavar Bar Marine Observatory** (`14.28°N, 74.44°E`) — Sharavathi Estuarine bar.
  4. **Bhatkal Coastal Observatory** (`13.98°N, 74.53°E`) — Uttara Kannada / Udupi boundary.
  5. **Malpe Port Deep Wave Buoy** (`13.35°N, 74.55°E`) — Central Karnataka Coastal Shelf.
  6. **Kaup Lighthouse Marine Station** (`13.22°N, 74.68°E`) — Udupi Southern Reef & shoals.
  7. **New Mangalore Port Wave Buoy** (`12.87°N, 74.80°E`) — Deep commercial shipping fairway.
  8. **Arabian Deep Moored Swell Buoy** (`14.00°N, 70.00°E`) — Open-ocean deep basin monitoring.
  9. **Visakhapatnam Deep Ocean Buoy** (`17.65°N, 83.35°E`) — Bay of Bengal swell monitoring.
  10. **Chennai Port Offshore Buoy** (`13.10°N, 80.35°E`) — Coromandel coastal current sensor.
- **Key Variables**: In-situ significant wave height, sea state Douglas Code ($0–9$), peak swell periods, swell-surge (*Kallakkadal*) warnings, and fishing craft operational safety thresholds.
- **License**: Open Government Data (OGD) India / Ministry of Earth Sciences.

---

### 2.3 IMD (India Meteorological Department) RSMC Cyclone Bulletins
- **Provider**: Regional Specialized Meteorological Centre (RSMC) for Tropical Cyclones Over the North Indian Ocean, IMD New Delhi.
- **Access Method**: Official RSMC Tropical Cyclone Bulletins, Post-Event Track Survey Reports, and Coastal Threat Bulletins.
- **Key Variables**: Coastal storm surge height above astronomical tide, track cone coordinates, landfall sector warnings, and statutory alert bulletins.
- **License**: Open Government Data License (OGDL) India.

---

### 2.4 ECMWF Copernicus Climate Change Service (ERA5 Ocean Reanalysis)
- **Provider**: European Centre for Medium-Range Weather Forecasts (ECMWF) / Copernicus Climate Change Service (C3S).
- **Dataset in ORCA**: `data/processed/arabian_sea_historical_2025_2026.json`
- **Spatial Resolution**: 0.25° atmosphere, 0.5° ocean waves.
- **Key Variables**:
  - 30-year climatological monthly baseline sea surface temperature (e.g. Karnataka coastal shelf baseline: $29.20^\circ\text{C}$).
  - Long-term marine heatwave anomaly baselines ($\Delta \text{SST} = \text{Observed SST} - \text{Baseline SST}$).
  - 30-year mean significant wave height and 95th-percentile storm surge return periods.
- **License**: Copernicus Open Licence (Free and open access with attribution).

---

## 3. Geospatial, Maritime & Critical Infrastructure Datasets

### 3.1 OpenStreetMap (OSM) Coastal & Infrastructure Register
- **Provider**: OpenStreetMap Contributors via Overpass QL API.
- **Database Table**: `coastal_features` (PostgreSQL 18 `orca_db`).
- **Coordinate Reference System**: WGS84 (`EPSG:4326`).
- **Extracted Coastal Categories**:
  - **Major Commercial Seaports**:
    - New Mangalore Port (NMPT) (`12.9288°N, 74.8197°E`) — Panambur, Dakshina Kannada.
    - Karwar Port (`14.8050°N, 74.1180°E`) — Baithkol Harbour, Uttara Kannada.
  - **Intermediate & Fishing Ports**:
    - Old Mangalore Port (Bunder) (`12.8580°N, 74.8322°E`) — Netravati-Gurupura confluence.
    - Malpe Fishing Harbour (`13.3512°N, 74.6980°E`) — Premier deep-sea trawler hub.
    - Tadadi Fishing Harbour (`14.5310°N, 74.3210°E`) — Aghanashini Estuarine landing centre.
    - Honnavar Fishing Port (`14.2820°N, 74.4410°E`) — Sharavathi Estuary mouth.
    - Bhatkal Port (`13.9780°N, 74.5420°E`) — Southern Uttara Kannada coastal craft jetty.
  - **Critical Healthcare Facilities**:
    - District Wenlock Hospital, Mangaluru (`12.8680°N, 74.8450°E`) — 1000-bed regional tertiary referral center.
    - Government Lady Goschen Hospital (`12.8655°N, 74.8420°E`) — Maternity & pediatric emergency center.
    - District Hospital Udupi (`13.3410°N, 74.7480°E`).
    - Karwar Civil & Maritime Hospital (`14.8120°N, 74.1310°E`).
  - **Key Coastal Transportation Infrastructure**:
    - National Highway 66 (NH-66) estuarine bridges (Netravati, Sharavathi, Gangavali, Kali bridges).
    - Konkan Railway Coastal Alignment and coastal causeways.
- **License**: Open Database License (ODbL 1.0).

---

### 3.2 KSCZMA Coastal Regulation Zone (CRZ-I) & Wetland Cadastre
- **Provider**: Karnataka State Coastal Zone Management Authority (KSCZMA), Department of Forest, Ecology & Environment, Government of Karnataka.
- **Coverage**: 320 km Karnataka coastline across 3 coastal districts (Dakshina Kannada, Udupi, Uttara Kannada).
- **Key Spatial Layers**:
  - High Tide Line (HTL) & Low Tide Line (LTL) demarcation.
  - Hazard Line & 100-year coastal erosion buffer line.
  - CRZ-I Ecologically Sensitive Areas (mangrove swamps, estuarine mudflats, sand dunes, turtle nesting beaches).
  - CRZ-II Developed Municipal Areas (Mangaluru City, Ullal, Udupi, Karwar).
  - CRZ-III Rural Coastal Buffer Zones ($200m$ No Development Zone).
  - CRZ-IV Water Body Component (territorial waters up to 12 nautical miles).
- **License**: Open Government Data License (OGDL) India.

---

## 4. Ecological Reserves & Marine Protected Areas

### 4.1 Ramsar Convention on Wetlands (Site #2509)
- **Designation**: Aghanashini Estuary Ramsar Site (`14.5167°N, 74.3667°E`).
- **Extent**: 4,801 hectares across Uttara Kannada coastal shelf.
- **Significance**: Internationally protected estuarine wetland nursery supporting 80+ fish species, mangrove forests, bivalve shellfish grounds, and 6,000+ traditional fishing families.
- **License**: Ramsar Convention Open Knowledge Repository.

---

### 4.2 Protected Planet / WDPA (World Database on Protected Areas)
- **Provider**: UN Environment Programme World Conservation Monitoring Centre (UNEP-WCMC) and IUCN.
- **Format**: GeoJSON & Shapefile polygons in WGS84.
- **Features in ORCA**:
  - **Netrani Island Marine Reserve** (`14.0180°N, 74.3290°E`) — Coral reef sanctuary off Murudeshwar.
  - **St. Mary's Islands National Geological Monument** (`13.3780°N, 74.6730°E`) — Columnar basaltic marine reserve.
  - **Anshi-Dandeli / Kali Coastal Buffer Reserve** (`14.8500°N, 74.1500°E`).
- **License**: Non-commercial scientific research license / UNEP-WCMC terms.

---

## 5. Demographic & Coastal Population Exposure Datasets

### 5.1 Census of India (Directorate of Census Operations Karnataka)
- **Provider**: Office of the Registrar General & Census Commissioner, Ministry of Home Affairs, Government of India.
- **Coverage**: Full administrative hierarchy (District, Taluk, Municipal Corporation, Ward, Village).
- **Study Area Settlements & Resident Population Counts (Verified Baseline)**:
  - **Mangaluru City Corporation (MCC)**: 499,487 residents (Ward-level coastal core: 399,565).
  - **Ullal Coastal Municipality**: 53,856 residents (Ward-level vulnerable coastal margin: 108,614 inclusive of peri-urban wards).
  - **Surathkal Coastal Settlement**: 86,798 residents (Heavy industrial and port-adjacent population).
  - **Udupi City Municipality & Malpe**: 125,306 residents.
  - **Kundapura Coastal Sub-District**: 84,200 residents.
  - **Bhatkal Municipal Council**: 31,785 residents.
  - **Honnavar Coastal Taluk**: 48,900 residents.
  - **Kumta Coastal Settlement**: 32,500 residents.
  - **Ankola Estuarine Zone**: 21,300 residents.
  - **Karwar Municipal Council**: 63,705 residents.
  - **Combined 3-District Coastal Exposure Register**: **1,075,668 coastal residents** across Dakshina Kannada, Udupi, and Uttara Kannada.
- **License**: Open Government Data License (OGDL) India.

---

### 5.2 WorldPop Spatial Population Distribution Rasters
- **Provider**: WorldPop Research Group, University of Southampton.
- **Resolution**: 100-meter ($~3\text{ arc-second}$) gridded population density surface.
- **Methodology**: Random Forest dasymetric redistribution of census counts constrained by satellite building footprints and road networks.
- **Use in ORCA**: Deterministic zonal overlay computing precise resident counts inside arbitrary dynamic circular hazard footprints ($30km, 50km, 160km$).
- **License**: Creative Commons Attribution 4.0 International (CC BY 4.0).

---

## 6. Agent & Workspace Consumption Matrix

| Dataset / Source | Type | Primary Owning Agent | Workspaces Utilizing Data | Primary Operational Use Case |
|---|---|---|---|---|
| **Open-Meteo Marine API** | Live REST | `ocean_research` & `marine_hazard` | Fisherman, Marine Monitoring, Disaster Management | Real-time wave spectra, SST, Douglas sea state, operational craft navigation limits. |
| **Open-Meteo Weather API** | Live REST | `marine_hazard` | Fisherman, Disaster Management | 10m surface winds, gale gust thresholds, barometric pressure drops. |
| **GDACS Live Alerts** | Live GeoJSON | `marine_hazard` | Disaster Management, Coastal Authority | Active international cyclone, flood, and tsunami emergency polygons. |
| **NOAA NHC Trajectory Runs** | Live REST / GIS | `marine_hazard` | Disaster Management | 5-day predictive cyclone track waypoints, intensity classifications. |
| **NOAA IBTrACS v04** | Archive CSV / DB | `marine_hazard` | Disaster Management, Marine Monitoring | 175-year historical cyclone tracks, benchmark analog runs (Tauktae, Kyarr, Biparjoy). |
| **INCOIS Buoy Network** | Observational DB | `ocean_research` & `marine_hazard` | Fisherman, Marine Monitoring | Ground-truth in-situ wave heights, Kallakkadal swell alerts, tide gauge records. |
| **ECMWF ERA5 Climatology** | Reanalysis DB | `ocean_research` | Marine Monitoring, Protected Areas | 30-year SST baselines, marine heatwave anomalies, seasonal cycle breakdowns. |
| **OpenStreetMap Infrastructure** | Geospatial GeoJSON | `coastal_risk` | Coastal Authority, Disaster Management | Port boundaries, critical hospital coordinates, road/rail flood vulnerability. |
| **KSCZMA & Ramsar Wet-lands** | Geospatial GeoJSON | `coastal_risk` | Protected Areas, Coastal Authority | CRZ-I sensitive zones, mangrove ecosystems, setback regulations, Ramsar Site #2509. |
| **Protected Planet (WDPA)** | Geospatial GeoJSON | `coastal_risk` | Protected Areas | Coral reef reserve boundaries (Netrani Island), marine sanctuary buffers. |
| **Census of India 2011** | Tabular / Spatial | `coastal_risk` | Coastal Authority, Disaster Management | Deterministic resident population exposure calculations across coastal wards. |
| **WorldPop High-Res Grids** | Spatial Raster | `coastal_risk` | Coastal Authority, Disaster Management | Radial buffer zonal population estimation and vulnerable evacuation counts. |

---

## 7. Cryptographic Provenance & Evidence Verification Architecture

Every piece of data that enters ORCA is processed by the **Evidence & Scientific Verification Agent (Agent 4)** to enforce complete scientific integrity:

```
Raw Provider Ingestion (API / CSV / GeoJSON)
                 │
                 ▼
Deterministic Parsing & WGS84 / UTC Coordinate Normalization
                 │
                 ▼
SHA-256 Cryptographic Payload Checksum Generated
                 │
                 ▼
Persisted into PostgreSQL `evidence_records` Table
 (id, source_name, source_url, observation_time, lat, lon, value, unit, raw_data, hash)
                 │
                 ▼
Deterministic 9-Suite Scientific Verification Audit
 ├── 1. Provenance & Hash Check (Checksum re-computation against raw byte store)
 ├── 2. Schema Quality Check (Required metadata, variable naming standards)
 ├── 3. Temporal Scope Check (Observation window alignment, no stale date confusion)
 ├── 4. Physical Units Check (Dimensional validation, automated conversion checks)
 ├── 5. Calculation Recomputation (Pure Python re-execution of all arithmetic & sums)
 ├── 6. Spatial Alignment Check (Haversine geodesic distance calculation on WGS84 sphere)
 ├── 7. Cross-Source Discordance (Multi-provider anomaly & conflict detection)
 ├── 8. Causal Reasoning Check (Chronological precedence in cause-effect claims)
 └── 9. Uncertainty Bounds Check (Confidence intervals, documented error margins)
                 │
                 ▼
Zero-Hallucination Status Emitted: `verified` (corroborated) or `conflicting` (flagged)
```

### Verification Guarantees
- **No LLM Mathematics**: Large Language Models are completely prohibited from performing arithmetic or calculating statistics. All calculations are executed by pure Python math routines (`numpy`, `math`, `statistics`).
- **Tamper Evidence**: Any modification to a raw JSON record changes its SHA-256 hash, immediately invalidating the evidence and alerting the Orchestrator.
- **Traceable URLs**: Every evidence record includes the direct HTTP query URL or provider archive URI so human auditors can independently reproduce any query.
