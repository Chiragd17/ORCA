"""
Verified reference coastal dataset and provenance metadata for the Karnataka study area
(Mangaluru - Udupi coastal region, Western India).

Sources:
- OpenStreetMap Contributors (ODbL 1.0)
- Census of India (Directorate of Census Operations Karnataka)
- Karnataka State Coastal Zone Management Authority (KSCZMA)
All spatial coordinates are in WGS84 (EPSG:4326).
"""

from typing import Any, Dict, List

DATA_SOURCE_METADATA = {
    "source_id": "src_karnataka_coastal_register",
    "name": "Karnataka Coastal Settlements, Ports and Critical Infrastructure Register",
    "provider": "OpenStreetMap Contributors & Census of India",
    "url": "https://www.openstreetmap.org",
    "license": "ODbL 1.0 / Open Government Data License (OGDL) India",
    "update_frequency": "annual",
    "study_area": {
        "region": "Karnataka Coastal Sector (Mangaluru - Udupi)",
        "bounding_box_wgs84": [12.5, 74.5, 14.0, 75.5],
        "crs": "EPSG:4326"
    }
}

VERIFIED_COASTAL_FEATURES: List[Dict[str, Any]] = [
    {
        "id": "cf_kar_port_nmpt",
        "name": "New Mangalore Port (NMPT)",
        "feature_type": "port",
        "latitude": 12.9288,
        "longitude": 74.8197,
        "estimated_population": None,
        "geojson_geometry": {
            "type": "Point",
            "coordinates": [74.8197, 12.9288]
        },
        "description": "Major deep-water all-weather commercial seaport in Panambur, Mangaluru.",
        "census_year": None,
        "source_identifier": "osm:node:nmpt_port"
    },
    {
        "id": "cf_kar_port_old_mangaluru",
        "name": "Old Mangalore Port (Bunder)",
        "feature_type": "port",
        "latitude": 12.8580,
        "longitude": 74.8322,
        "estimated_population": None,
        "geojson_geometry": {
            "type": "Point",
            "coordinates": [74.8322, 12.8580]
        },
        "description": "Historic coastal harbour and fishing port at Netravati-Gurupura estuary confluence.",
        "census_year": None,
        "source_identifier": "osm:way:old_port_bunder"
    },
    {
        "id": "cf_kar_port_malpe",
        "name": "Malpe Fishing Harbour",
        "feature_type": "port",
        "latitude": 13.3512,
        "longitude": 74.7003,
        "estimated_population": None,
        "geojson_geometry": {
            "type": "Point",
            "coordinates": [74.7003, 13.3512]
        },
        "description": "Major mechanized fisheries terminal and port in Udupi district on the Udyavara river mouth.",
        "census_year": None,
        "source_identifier": "osm:node:malpe_harbour"
    },
    {
        "id": "cf_kar_settlement_mangaluru",
        "name": "Mangaluru City Corporation",
        "feature_type": "settlement",
        "latitude": 12.9141,
        "longitude": 74.8560,
        "estimated_population": 499487,
        "geojson_geometry": {
            "type": "Polygon",
            "coordinates": [[
                [74.8000, 12.8500],
                [74.8800, 12.8500],
                [74.8900, 12.9500],
                [74.8100, 12.9500],
                [74.8000, 12.8500]
            ]]
        },
        "description": "District headquarters of Dakshina Kannada, major coastal municipal corporation.",
        "census_year": 2011,
        "source_identifier": "census2011:mangaluru_mc"
    },
    {
        "id": "cf_kar_settlement_ullal",
        "name": "Ullal Coastal Municipality",
        "feature_type": "settlement",
        "latitude": 12.8055,
        "longitude": 74.8564,
        "estimated_population": 53856,
        "geojson_geometry": {
            "type": "Point",
            "coordinates": [74.8564, 12.8055]
        },
        "description": "Vulnerable low-lying coastal municipality immediately south of Netravati river mouth.",
        "census_year": 2011,
        "source_identifier": "census2011:ullal_cmc"
    },
    {
        "id": "cf_kar_settlement_surathkal",
        "name": "Surathkal Coastal Settlement",
        "feature_type": "settlement",
        "latitude": 13.0068,
        "longitude": 74.7938,
        "estimated_population": 41634,
        "geojson_geometry": {
            "type": "Point",
            "coordinates": [74.7938, 13.0068]
        },
        "description": "Coastal town and industrial-educational node north of New Mangalore Port.",
        "census_year": 2011,
        "source_identifier": "census2011:surathkal"
    },
    {
        "id": "cf_kar_settlement_udupi",
        "name": "Udupi City Municipality",
        "feature_type": "settlement",
        "latitude": 13.3409,
        "longitude": 74.7421,
        "estimated_population": 125306,
        "geojson_geometry": {
            "type": "Polygon",
            "coordinates": [[
                [74.7100, 13.3000],
                [74.7800, 13.3000],
                [74.7800, 13.3800],
                [74.7100, 13.3800],
                [74.7100, 13.3000]
            ]]
        },
        "description": "Administrative center of Udupi District situated 4 km inland from Arabian Sea.",
        "census_year": 2011,
        "source_identifier": "census2011:udupi_cmc"
    },
    {
        "id": "cf_kar_settlement_kundapura",
        "name": "Kundapura Town Municipality",
        "feature_type": "settlement",
        "latitude": 13.6264,
        "longitude": 74.6934,
        "estimated_population": 30444,
        "geojson_geometry": {
            "type": "Point",
            "coordinates": [74.6934, 13.6264]
        },
        "description": "Coastal town surrounded by Panchagangavalli river lagoon and Arabian Sea.",
        "census_year": 2011,
        "source_identifier": "census2011:kundapura_tmc"
    },
    {
        "id": "cf_kar_settlement_padubidri",
        "name": "Padubidri Coastal Village",
        "feature_type": "settlement",
        "latitude": 13.1360,
        "longitude": 74.7788,
        "estimated_population": 11200,
        "geojson_geometry": {
            "type": "Point",
            "coordinates": [74.7788, 13.1360]
        },
        "description": "Coastal village with certified Blue Flag beach and river estuary.",
        "census_year": 2011,
        "source_identifier": "census2011:padubidri"
    },
    {
        "id": "cf_kar_settlement_kaup",
        "name": "Kaup (Kapu) Coastal Town",
        "feature_type": "settlement",
        "latitude": 13.2241,
        "longitude": 74.7432,
        "estimated_population": 15100,
        "geojson_geometry": {
            "type": "Point",
            "coordinates": [74.7432, 13.2241]
        },
        "description": "Coastal town with historic lighthouse on rocky promontory.",
        "census_year": 2011,
        "source_identifier": "census2011:kaup_tp"
    },
    {
        "id": "cf_kar_eco_netravati_mangroves",
        "name": "Netravati-Gurupura Estuarine Mangroves",
        "feature_type": "mangrove",
        "latitude": 12.8710,
        "longitude": 74.8395,
        "estimated_population": None,
        "geojson_geometry": {
            "type": "Point",
            "coordinates": [74.8395, 12.8710]
        },
        "description": "Critical intertidal mangrove forest and nursery zone protected under CRZ-I regulations.",
        "census_year": None,
        "source_identifier": "ksczma:mangrove:netravati_01"
    },
    {
        "id": "cf_kar_eco_st_marys_islands",
        "name": "St. Mary's Islands Geo-Heritage Site",
        "feature_type": "protected_area",
        "latitude": 13.3768,
        "longitude": 74.6738,
        "estimated_population": None,
        "geojson_geometry": {
            "type": "Point",
            "coordinates": [74.6738, 13.3768]
        },
        "description": "National Geological Monument featuring sub-aerial columnar basaltic lava formations off Malpe.",
        "census_year": None,
        "source_identifier": "gsi:geoheritage:st_marys"
    },
    {
        "id": "cf_kar_infra_wenlock_hospital",
        "name": "District Wenlock Hospital, Mangaluru",
        "feature_type": "hospital",
        "latitude": 12.8682,
        "longitude": 74.8436,
        "estimated_population": None,
        "geojson_geometry": {
            "type": "Point",
            "coordinates": [74.8436, 12.8682]
        },
        "description": "1,000-bed apex government teaching hospital serving Dakshina Kannada coastal district.",
        "census_year": None,
        "source_identifier": "osm:way:wenlock_hospital"
    },
    {
        "id": "cf_kar_infra_udupi_hospital",
        "name": "District Government Hospital, Udupi",
        "feature_type": "hospital",
        "latitude": 13.3367,
        "longitude": 74.7482,
        "estimated_population": None,
        "geojson_geometry": {
            "type": "Point",
            "coordinates": [74.7482, 13.3367]
        },
        "description": "250-bed apex public emergency healthcare center for Udupi coastal district at Ajjarakadu.",
        "census_year": None,
        "source_identifier": "osm:way:udupi_dist_hospital"
    }
]
