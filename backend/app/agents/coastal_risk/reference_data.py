"""
Verified reference coastal dataset and provenance metadata for the entire Karnataka coastal zone
spanning all 3 coastal districts: Dakshina Kannada, Udupi, and Uttara Kannada (320 km Arabian Sea coastline).

Sources:
- OpenStreetMap Contributors (ODbL 1.0)
- Census of India (Directorate of Census Operations Karnataka, 2011)
- Karnataka State Coastal Zone Management Authority (KSCZMA)
- Ramsar Convention on Wetlands (Site #2509 - Aghanashini Estuary)
All spatial coordinates are in WGS84 (EPSG:4326).
"""

from typing import Any, Dict, List

DATA_SOURCE_METADATA = {
    "source_id": "src_karnataka_coastal_register",
    "name": "Karnataka Statewide Coastal Settlements, Ports and Critical Infrastructure Register",
    "provider": "OpenStreetMap Contributors, Census of India & KSCZMA",
    "url": "https://www.openstreetmap.org",
    "license": "ODbL 1.0 / Open Government Data License (OGDL) India",
    "update_frequency": "annual",
    "study_area": {
        "region": "Karnataka Statewide Coastal Zone (Dakshina Kannada, Udupi & Uttara Kannada)",
        "bounding_box_wgs84": [12.7, 74.0, 15.0, 75.1],
        "crs": "EPSG:4326",
        "coastline_length_km": 320,
    }
}

VERIFIED_COASTAL_FEATURES: List[Dict[str, Any]] = [
    # =========================================================================
    # DAKSHINA KANNADA DISTRICT (SOUTHERN SECTOR)
    # =========================================================================
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
        "id": "cf_kar_settlement_mulki",
        "name": "Mulki Coastal Town",
        "feature_type": "settlement",
        "latitude": 13.0903,
        "longitude": 74.7872,
        "estimated_population": 18124,
        "geojson_geometry": {
            "type": "Point",
            "coordinates": [74.7872, 13.0903]
        },
        "description": "Estuarine coastal town on the Shambhavi-Nandini river confluence.",
        "census_year": 2011,
        "source_identifier": "census2011:mulki_tp"
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

    # =========================================================================
    # UDUPI DISTRICT (CENTRAL SECTOR)
    # =========================================================================
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
        "id": "cf_kar_settlement_brahmavar",
        "name": "Brahmavar-Barkur Coastal Node",
        "feature_type": "settlement",
        "latitude": 13.4862,
        "longitude": 74.7471,
        "estimated_population": 22500,
        "geojson_geometry": {
            "type": "Point",
            "coordinates": [74.7471, 13.4862]
        },
        "description": "Agricultural and estuarine trade center along the Sita River basin.",
        "census_year": 2011,
        "source_identifier": "census2011:brahmavar"
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
        "id": "cf_kar_settlement_maravanthe",
        "name": "Maravanthe Coastal Spit",
        "feature_type": "settlement",
        "latitude": 13.7126,
        "longitude": 74.6394,
        "estimated_population": 6800,
        "geojson_geometry": {
            "type": "Point",
            "coordinates": [74.6394, 13.7126]
        },
        "description": "Unique narrow coastal barrier spit separated by the Arabian Sea on west and Souparnika River on east.",
        "census_year": 2011,
        "source_identifier": "census2011:maravanthe"
    },
    {
        "id": "cf_kar_settlement_byndoor",
        "name": "Baindur (Byndoor) Coastal Municipality",
        "feature_type": "settlement",
        "latitude": 13.8732,
        "longitude": 74.6288,
        "estimated_population": 24700,
        "geojson_geometry": {
            "type": "Point",
            "coordinates": [74.6288, 13.8732]
        },
        "description": "Northernmost coastal municipality of Udupi District bordering Uttara Kannada.",
        "census_year": 2011,
        "source_identifier": "census2011:byndoor"
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
    },

    # =========================================================================
    # UTTARA KANNADA DISTRICT (NORTHERN SECTOR)
    # =========================================================================
    {
        "id": "cf_kar_port_bhatkal",
        "name": "Bhatkal Fishing Port",
        "feature_type": "port",
        "latitude": 13.9740,
        "longitude": 74.5420,
        "estimated_population": None,
        "geojson_geometry": {
            "type": "Point",
            "coordinates": [74.5420, 13.9740]
        },
        "description": "Active fishing harbour on the Sharabi River mouth in southern Uttara Kannada.",
        "census_year": None,
        "source_identifier": "osm:node:bhatkal_port"
    },
    {
        "id": "cf_kar_settlement_bhatkal",
        "name": "Bhatkal Coastal Municipality",
        "feature_type": "settlement",
        "latitude": 13.9850,
        "longitude": 74.5519,
        "estimated_population": 50007,
        "geojson_geometry": {
            "type": "Point",
            "coordinates": [74.5519, 13.9850]
        },
        "description": "Major commercial and port municipality in southern Uttara Kannada.",
        "census_year": 2011,
        "source_identifier": "census2011:bhatkal_cmc"
    },
    {
        "id": "cf_kar_settlement_murudeshwar",
        "name": "Murudeshwar Coastal Town",
        "feature_type": "settlement",
        "latitude": 14.0942,
        "longitude": 74.4849,
        "estimated_population": 14200,
        "geojson_geometry": {
            "type": "Point",
            "coordinates": [74.4849, 14.0942]
        },
        "description": "Prominent coastal promontory with ancient temple, Shiva statue, and exposed sand spit beach.",
        "census_year": 2011,
        "source_identifier": "census2011:murudeshwar"
    },
    {
        "id": "cf_kar_port_honnavar",
        "name": "Honnavar Port & Estuary Terminal",
        "feature_type": "port",
        "latitude": 14.2801,
        "longitude": 74.4443,
        "estimated_population": None,
        "geojson_geometry": {
            "type": "Point",
            "coordinates": [74.4443, 14.2801]
        },
        "description": "Historic seaport on the Sharavati River estuary where the river meets the Arabian Sea.",
        "census_year": None,
        "source_identifier": "osm:way:honnavar_port"
    },
    {
        "id": "cf_kar_settlement_honnavar",
        "name": "Honnavar Town Municipality",
        "feature_type": "settlement",
        "latitude": 14.2835,
        "longitude": 74.4520,
        "estimated_population": 19109,
        "geojson_geometry": {
            "type": "Point",
            "coordinates": [74.4520, 14.2835]
        },
        "description": "Port town and taluk headquarters located along the north bank of Sharavati estuary.",
        "census_year": 2011,
        "source_identifier": "census2011:honnavar_tmc"
    },
    {
        "id": "cf_kar_eco_sharavati_mangroves",
        "name": "Sharavati Estuary Mangrove Reserve",
        "feature_type": "mangrove",
        "latitude": 14.2865,
        "longitude": 74.4350,
        "estimated_population": None,
        "geojson_geometry": {
            "type": "Point",
            "coordinates": [74.4350, 14.2865]
        },
        "description": "Rich intertidal estuarine mangrove belt and mudflats classified under CRZ-I ecological protection.",
        "census_year": None,
        "source_identifier": "ksczma:mangrove:sharavati_01"
    },
    {
        "id": "cf_kar_settlement_kumta",
        "name": "Kumta Coastal Municipality",
        "feature_type": "settlement",
        "latitude": 14.4258,
        "longitude": 74.4173,
        "estimated_population": 32596,
        "geojson_geometry": {
            "type": "Point",
            "coordinates": [74.4173, 14.4258]
        },
        "description": "Major commercial and maritime town in central Uttara Kannada situated between hills and sea.",
        "census_year": 2011,
        "source_identifier": "census2011:kumta_tmc"
    },
    {
        "id": "cf_kar_port_tadadi",
        "name": "Tadadi Commercial Fishing Port",
        "feature_type": "port",
        "latitude": 14.5244,
        "longitude": 74.3644,
        "estimated_population": None,
        "geojson_geometry": {
            "type": "Point",
            "coordinates": [74.3644, 14.5244]
        },
        "description": "All-weather fishing terminal in the Aghanashini River estuary near Gokarna.",
        "census_year": None,
        "source_identifier": "osm:node:tadadi_port"
    },
    {
        "id": "cf_kar_eco_aghanashini_estuary",
        "name": "Aghanashini Estuary (Ramsar Wetland Site)",
        "feature_type": "protected_area",
        "latitude": 14.5180,
        "longitude": 74.3800,
        "estimated_population": None,
        "geojson_geometry": {
            "type": "Point",
            "coordinates": [74.3800, 14.5180]
        },
        "description": "Designated Ramsar Wetland of International Importance (#2509) supporting 80+ fish and 100+ bird species.",
        "census_year": None,
        "source_identifier": "ramsar:wetland:2509_aghanashini"
    },
    {
        "id": "cf_kar_settlement_gokarna",
        "name": "Gokarna Coastal Heritage Town",
        "feature_type": "settlement",
        "latitude": 14.5426,
        "longitude": 74.3168,
        "estimated_population": 13557,
        "geojson_geometry": {
            "type": "Point",
            "coordinates": [74.3168, 14.5426]
        },
        "description": "Ancient coastal temple town with crescent beaches (Om Beach, Kudle Beach) facing the Arabian Sea.",
        "census_year": 2011,
        "source_identifier": "census2011:gokarna"
    },
    {
        "id": "cf_kar_port_belekeri",
        "name": "Belekeri Natural Port",
        "feature_type": "port",
        "latitude": 14.7135,
        "longitude": 74.2750,
        "estimated_population": None,
        "geojson_geometry": {
            "type": "Point",
            "coordinates": [74.2750, 14.7135]
        },
        "description": "Natural anchorage port in Ankola taluk sheltered from southwest monsoon gales.",
        "census_year": None,
        "source_identifier": "osm:way:belekeri_port"
    },
    {
        "id": "cf_kar_settlement_ankola",
        "name": "Ankola Coastal Municipality",
        "feature_type": "settlement",
        "latitude": 14.6617,
        "longitude": 74.3014,
        "estimated_population": 14309,
        "geojson_geometry": {
            "type": "Point",
            "coordinates": [74.3014, 14.6617]
        },
        "description": "Coastal taluk municipality known for coastal agriculture, fisheries, and Belekeri bay.",
        "census_year": 2011,
        "source_identifier": "census2011:ankola_tmc"
    },
    {
        "id": "cf_kar_infra_kadamba_naval_base",
        "name": "INS Kadamba / Karwar Naval Base (Project Seabird)",
        "feature_type": "port",
        "latitude": 14.7725,
        "longitude": 74.1560,
        "estimated_population": None,
        "geojson_geometry": {
            "type": "Point",
            "coordinates": [74.1560, 14.7725]
        },
        "description": "Strategic deep-water naval base of the Indian Navy featuring extensive breakwater works and deep draft.",
        "census_year": None,
        "source_identifier": "osm:way:ins_kadamba"
    },
    {
        "id": "cf_kar_port_karwar",
        "name": "Karwar Commercial Port (Baithkol)",
        "feature_type": "port",
        "latitude": 14.8050,
        "longitude": 74.1200,
        "estimated_population": None,
        "geojson_geometry": {
            "type": "Point",
            "coordinates": [74.1200, 14.8050]
        },
        "description": "Major intermediate all-weather natural seaport in Baithkol cove, sheltered by Karwar headland.",
        "census_year": None,
        "source_identifier": "osm:node:karwar_port"
    },
    {
        "id": "cf_kar_settlement_karwar",
        "name": "Karwar City Municipal Corporation",
        "feature_type": "settlement",
        "latitude": 14.8140,
        "longitude": 74.1298,
        "estimated_population": 77139,
        "geojson_geometry": {
            "type": "Polygon",
            "coordinates": [[
                [74.1000, 14.7800],
                [74.1600, 14.7800],
                [74.1600, 14.8500],
                [74.1000, 14.8500],
                [74.1000, 14.7800]
            ]]
        },
        "description": "District administrative headquarters of Uttara Kannada on the Kali River mouth and Rabindranath Tagore beach.",
        "census_year": 2011,
        "source_identifier": "census2011:karwar_cmc"
    },
    {
        "id": "cf_kar_infra_karwar_hospital",
        "name": "District Civil Hospital, Karwar",
        "feature_type": "hospital",
        "latitude": 14.8160,
        "longitude": 74.1332,
        "estimated_population": None,
        "geojson_geometry": {
            "type": "Point",
            "coordinates": [74.1332, 14.8160]
        },
        "description": "400-bed apex government teaching hospital and healthcare facility for Uttara Kannada district.",
        "census_year": None,
        "source_identifier": "osm:way:karwar_dist_hospital"
    },
    {
        "id": "cf_kar_eco_kali_estuary",
        "name": "Kali River Estuary & Mangrove Reserve",
        "feature_type": "mangrove",
        "latitude": 14.8450,
        "longitude": 74.1280,
        "estimated_population": None,
        "geojson_geometry": {
            "type": "Point",
            "coordinates": [74.1280, 14.8450]
        },
        "description": "Expansive brackish estuarine delta and mangrove vegetation protected under CRZ-I guidelines.",
        "census_year": None,
        "source_identifier": "ksczma:mangrove:kali_01"
    },
    {
        "id": "cf_kar_settlement_majali",
        "name": "Majali Coastal Village",
        "feature_type": "settlement",
        "latitude": 14.9080,
        "longitude": 74.1050,
        "estimated_population": 5600,
        "geojson_geometry": {
            "type": "Point",
            "coordinates": [74.1050, 14.9080]
        },
        "description": "Northernmost coastal village of Karnataka on the Arabian Sea, immediately adjacent to the Goa state border.",
        "census_year": 2011,
        "source_identifier": "census2011:majali"
    },
]
