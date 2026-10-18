--
-- PostgreSQL database dump
--

\restrict yuligkD7aLGFrXpg9Lk97nsbjh5bsdLzfCs8AKd0jTHc4S8F3CCmhfdyl1Wulpo

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.marine_observations DROP CONSTRAINT IF EXISTS marine_observations_source_id_fkey;
ALTER TABLE IF EXISTS ONLY public.investigation_findings DROP CONSTRAINT IF EXISTS investigation_findings_investigation_id_fkey;
ALTER TABLE IF EXISTS ONLY public.investigation_events DROP CONSTRAINT IF EXISTS investigation_events_investigation_id_fkey;
ALTER TABLE IF EXISTS ONLY public.hazard_tracks DROP CONSTRAINT IF EXISTS hazard_tracks_hazard_event_id_fkey;
ALTER TABLE IF EXISTS ONLY public.hazard_events DROP CONSTRAINT IF EXISTS hazard_events_source_id_fkey;
ALTER TABLE IF EXISTS ONLY public.evidence_records DROP CONSTRAINT IF EXISTS evidence_records_source_id_fkey;
ALTER TABLE IF EXISTS ONLY public.coastal_features DROP CONSTRAINT IF EXISTS coastal_features_source_id_fkey;
DROP INDEX IF EXISTS public.ix_marine_observations_variable;
DROP INDEX IF EXISTS public.ix_marine_observations_source_id;
DROP INDEX IF EXISTS public.ix_marine_observations_observation_time;
DROP INDEX IF EXISTS public.ix_investigations_workspace;
DROP INDEX IF EXISTS public.ix_investigations_status;
DROP INDEX IF EXISTS public.ix_investigation_findings_investigation_id;
DROP INDEX IF EXISTS public.ix_investigation_findings_agent_id;
DROP INDEX IF EXISTS public.ix_investigation_events_investigation_id;
DROP INDEX IF EXISTS public.ix_investigation_events_event_type;
DROP INDEX IF EXISTS public.ix_hazard_tracks_timestamp;
DROP INDEX IF EXISTS public.ix_hazard_tracks_hazard_event_id;
DROP INDEX IF EXISTS public.ix_hazard_events_source_id;
DROP INDEX IF EXISTS public.ix_hazard_events_hazard_type;
DROP INDEX IF EXISTS public.ix_hazard_events_external_id;
DROP INDEX IF EXISTS public.ix_data_sources_name;
DROP INDEX IF EXISTS public.ix_coastal_features_feature_type;
DROP INDEX IF EXISTS public.idx_marine_obs_var_time;
DROP INDEX IF EXISTS public.idx_marine_obs_loc_time;
DROP INDEX IF EXISTS public.idx_investigation_events_order;
DROP INDEX IF EXISTS public.idx_hazard_track_event_time;
ALTER TABLE IF EXISTS ONLY public.marine_observations DROP CONSTRAINT IF EXISTS uq_marine_obs_source_time_lat_lon;
ALTER TABLE IF EXISTS ONLY public.marine_observations DROP CONSTRAINT IF EXISTS marine_observations_pkey;
ALTER TABLE IF EXISTS ONLY public.investigations DROP CONSTRAINT IF EXISTS investigations_pkey;
ALTER TABLE IF EXISTS ONLY public.investigation_findings DROP CONSTRAINT IF EXISTS investigation_findings_pkey;
ALTER TABLE IF EXISTS ONLY public.investigation_events DROP CONSTRAINT IF EXISTS investigation_events_pkey;
ALTER TABLE IF EXISTS ONLY public.hazard_tracks DROP CONSTRAINT IF EXISTS hazard_tracks_pkey;
ALTER TABLE IF EXISTS ONLY public.hazard_events DROP CONSTRAINT IF EXISTS hazard_events_pkey;
ALTER TABLE IF EXISTS ONLY public.evidence_records DROP CONSTRAINT IF EXISTS evidence_records_pkey;
ALTER TABLE IF EXISTS ONLY public.data_sources DROP CONSTRAINT IF EXISTS data_sources_pkey;
ALTER TABLE IF EXISTS ONLY public.coastal_features DROP CONSTRAINT IF EXISTS coastal_features_pkey;
ALTER TABLE IF EXISTS ONLY public.alembic_version DROP CONSTRAINT IF EXISTS alembic_version_pkc;
DROP TABLE IF EXISTS public.marine_observations;
DROP TABLE IF EXISTS public.investigations;
DROP TABLE IF EXISTS public.investigation_findings;
DROP TABLE IF EXISTS public.investigation_events;
DROP TABLE IF EXISTS public.hazard_tracks;
DROP TABLE IF EXISTS public.hazard_events;
DROP TABLE IF EXISTS public.evidence_records;
DROP TABLE IF EXISTS public.data_sources;
DROP TABLE IF EXISTS public.coastal_features;
DROP TABLE IF EXISTS public.alembic_version;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


--
-- Name: coastal_features; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coastal_features (
    id character varying(64) NOT NULL,
    name character varying(256) NOT NULL,
    feature_type character varying(64) NOT NULL,
    latitude double precision,
    longitude double precision,
    geojson_geometry json,
    estimated_population integer,
    source_id character varying(64),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: data_sources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_sources (
    id character varying(64) NOT NULL,
    name character varying(128) NOT NULL,
    provider character varying(128) DEFAULT 'Open-Meteo'::character varying,
    url character varying(512),
    license character varying(128),
    update_frequency character varying(64),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    description text,
    base_url character varying(256),
    license_info character varying(128)
);


--
-- Name: evidence_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.evidence_records (
    id character varying(128) NOT NULL,
    source_id character varying(64),
    source_identifier character varying(256) NOT NULL,
    source_url character varying(1024),
    observation_time timestamp with time zone,
    retrieval_time timestamp with time zone NOT NULL,
    latitude double precision,
    longitude double precision,
    data_type character varying(64) NOT NULL,
    raw_payload json NOT NULL,
    hash character varying(64) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: hazard_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hazard_events (
    id character varying(64) NOT NULL,
    source_id character varying(64) NOT NULL,
    external_id character varying(128) NOT NULL,
    name character varying(128) NOT NULL,
    hazard_type character varying(64) NOT NULL,
    basin character varying(64),
    status character varying(32) NOT NULL,
    started_at timestamp with time zone,
    ended_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: hazard_tracks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hazard_tracks (
    id character varying(64) NOT NULL,
    hazard_event_id character varying(64) NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    wind_speed_kts double precision,
    central_pressure_mb double precision,
    is_forecast boolean NOT NULL
);


--
-- Name: investigation_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.investigation_events (
    id character varying(64) NOT NULL,
    investigation_id character varying(64) NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    event_type character varying(64) NOT NULL,
    agent_id character varying(64),
    details json NOT NULL
);


--
-- Name: investigation_findings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.investigation_findings (
    id character varying(64) NOT NULL,
    investigation_id character varying(64) NOT NULL,
    agent_id character varying(64) NOT NULL,
    claim text NOT NULL,
    value double precision,
    unit character varying(32),
    evidence_ids json NOT NULL,
    verification_state character varying(32) NOT NULL,
    uncertainty_notes text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: investigations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.investigations (
    id character varying(64) NOT NULL,
    workspace character varying(64) NOT NULL,
    query text NOT NULL,
    status character varying(32) NOT NULL,
    plan json,
    completed_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: marine_observations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marine_observations (
    id character varying(64) NOT NULL,
    source_id character varying(64) NOT NULL,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    observation_time timestamp with time zone NOT NULL,
    retrieval_time timestamp with time zone,
    variable character varying(64),
    value double precision,
    unit character varying(32),
    quality_flag character varying(32),
    is_forecast boolean,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone,
    sea_surface_temperature_celsius double precision,
    wave_height_meters double precision,
    wave_period_seconds double precision,
    wave_direction_degrees double precision,
    ocean_current_velocity_mps double precision,
    ocean_current_direction_degrees double precision,
    wind_speed_knots double precision,
    wind_direction_degrees double precision,
    chlorophyll_mg_m3 double precision,
    metadata_json json DEFAULT '{}'::json
);


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.alembic_version (version_num) FROM stdin;
0001_initial_schema
\.


--
-- Data for Name: coastal_features; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.coastal_features (id, name, feature_type, latitude, longitude, geojson_geometry, estimated_population, source_id, created_at, updated_at) FROM stdin;
cf_kar_port_nmpt	New Mangalore Port (NMPT)	port	12.9288	74.8197	{"type": "Point", "coordinates": [74.8197, 12.9288]}	\N	src_karnataka_coastal_register	2026-10-15 22:53:16.347878+05:30	2026-10-15 22:53:16.347878+05:30
cf_kar_port_old_mangaluru	Old Mangalore Port (Bunder)	port	12.858	74.8322	{"type": "Point", "coordinates": [74.8322, 12.858]}	\N	src_karnataka_coastal_register	2026-10-15 22:53:16.347878+05:30	2026-10-15 22:53:16.347878+05:30
cf_kar_port_malpe	Malpe Fishing Harbour	port	13.3512	74.7003	{"type": "Point", "coordinates": [74.7003, 13.3512]}	\N	src_karnataka_coastal_register	2026-10-15 22:53:16.347878+05:30	2026-10-15 22:53:16.347878+05:30
cf_kar_settlement_mangaluru	Mangaluru City Corporation	settlement	12.9141	74.856	{"type": "Polygon", "coordinates": [[[74.8, 12.85], [74.88, 12.85], [74.89, 12.95], [74.81, 12.95], [74.8, 12.85]]]}	499487	src_karnataka_coastal_register	2026-10-15 22:53:16.347878+05:30	2026-10-15 22:53:16.347878+05:30
cf_kar_settlement_ullal	Ullal Coastal Municipality	settlement	12.8055	74.8564	{"type": "Point", "coordinates": [74.8564, 12.8055]}	53856	src_karnataka_coastal_register	2026-10-15 22:53:16.347878+05:30	2026-10-15 22:53:16.347878+05:30
cf_kar_settlement_surathkal	Surathkal Coastal Settlement	settlement	13.0068	74.7938	{"type": "Point", "coordinates": [74.7938, 13.0068]}	41634	src_karnataka_coastal_register	2026-10-15 22:53:16.347878+05:30	2026-10-15 22:53:16.347878+05:30
cf_kar_settlement_udupi	Udupi City Municipality	settlement	13.3409	74.7421	{"type": "Polygon", "coordinates": [[[74.71, 13.3], [74.78, 13.3], [74.78, 13.38], [74.71, 13.38], [74.71, 13.3]]]}	125306	src_karnataka_coastal_register	2026-10-15 22:53:16.347878+05:30	2026-10-15 22:53:16.347878+05:30
cf_kar_settlement_kundapura	Kundapura Town Municipality	settlement	13.6264	74.6934	{"type": "Point", "coordinates": [74.6934, 13.6264]}	30444	src_karnataka_coastal_register	2026-10-15 22:53:16.347878+05:30	2026-10-15 22:53:16.347878+05:30
cf_kar_settlement_padubidri	Padubidri Coastal Village	settlement	13.136	74.7788	{"type": "Point", "coordinates": [74.7788, 13.136]}	11200	src_karnataka_coastal_register	2026-10-15 22:53:16.347878+05:30	2026-10-15 22:53:16.347878+05:30
cf_kar_settlement_kaup	Kaup (Kapu) Coastal Town	settlement	13.2241	74.7432	{"type": "Point", "coordinates": [74.7432, 13.2241]}	15100	src_karnataka_coastal_register	2026-10-15 22:53:16.347878+05:30	2026-10-15 22:53:16.347878+05:30
cf_kar_eco_netravati_mangroves	Netravati-Gurupura Estuarine Mangroves	mangrove	12.871	74.8395	{"type": "Point", "coordinates": [74.8395, 12.871]}	\N	src_karnataka_coastal_register	2026-10-15 22:53:16.347878+05:30	2026-10-15 22:53:16.347878+05:30
cf_kar_eco_st_marys_islands	St. Mary's Islands Geo-Heritage Site	protected_area	13.3768	74.6738	{"type": "Point", "coordinates": [74.6738, 13.3768]}	\N	src_karnataka_coastal_register	2026-10-15 22:53:16.347878+05:30	2026-10-15 22:53:16.347878+05:30
cf_kar_infra_wenlock_hospital	District Wenlock Hospital, Mangaluru	hospital	12.8682	74.8436	{"type": "Point", "coordinates": [74.8436, 12.8682]}	\N	src_karnataka_coastal_register	2026-10-15 22:53:16.347878+05:30	2026-10-15 22:53:16.347878+05:30
cf_kar_infra_udupi_hospital	District Government Hospital, Udupi	hospital	13.3367	74.7482	{"type": "Point", "coordinates": [74.7482, 13.3367]}	\N	src_karnataka_coastal_register	2026-10-15 22:53:16.347878+05:30	2026-10-15 22:53:16.347878+05:30
cf_kar_settlement_mulki	Mulki Coastal Town	settlement	13.0903	74.7872	{"type": "Point", "coordinates": [74.7872, 13.0903]}	18124	src_karnataka_coastal_register	2026-10-17 10:27:02.284378+05:30	2026-10-17 10:27:02.284378+05:30
cf_kar_settlement_brahmavar	Brahmavar-Barkur Coastal Node	settlement	13.4862	74.7471	{"type": "Point", "coordinates": [74.7471, 13.4862]}	22500	src_karnataka_coastal_register	2026-10-17 10:27:02.284378+05:30	2026-10-17 10:27:02.284378+05:30
cf_kar_settlement_maravanthe	Maravanthe Coastal Spit	settlement	13.7126	74.6394	{"type": "Point", "coordinates": [74.6394, 13.7126]}	6800	src_karnataka_coastal_register	2026-10-17 10:27:02.284378+05:30	2026-10-17 10:27:02.284378+05:30
cf_kar_settlement_byndoor	Baindur (Byndoor) Coastal Municipality	settlement	13.8732	74.6288	{"type": "Point", "coordinates": [74.6288, 13.8732]}	24700	src_karnataka_coastal_register	2026-10-17 10:27:02.284378+05:30	2026-10-17 10:27:02.284378+05:30
cf_kar_port_bhatkal	Bhatkal Fishing Port	port	13.974	74.542	{"type": "Point", "coordinates": [74.542, 13.974]}	\N	src_karnataka_coastal_register	2026-10-17 10:27:02.284378+05:30	2026-10-17 10:27:02.284378+05:30
cf_kar_settlement_bhatkal	Bhatkal Coastal Municipality	settlement	13.985	74.5519	{"type": "Point", "coordinates": [74.5519, 13.985]}	50007	src_karnataka_coastal_register	2026-10-17 10:27:02.284378+05:30	2026-10-17 10:27:02.284378+05:30
cf_kar_settlement_murudeshwar	Murudeshwar Coastal Town	settlement	14.0942	74.4849	{"type": "Point", "coordinates": [74.4849, 14.0942]}	14200	src_karnataka_coastal_register	2026-10-17 10:27:02.284378+05:30	2026-10-17 10:27:02.284378+05:30
cf_kar_port_honnavar	Honnavar Port & Estuary Terminal	port	14.2801	74.4443	{"type": "Point", "coordinates": [74.4443, 14.2801]}	\N	src_karnataka_coastal_register	2026-10-17 10:27:02.284378+05:30	2026-10-17 10:27:02.284378+05:30
cf_kar_settlement_honnavar	Honnavar Town Municipality	settlement	14.2835	74.452	{"type": "Point", "coordinates": [74.452, 14.2835]}	19109	src_karnataka_coastal_register	2026-10-17 10:27:02.284378+05:30	2026-10-17 10:27:02.284378+05:30
cf_kar_eco_sharavati_mangroves	Sharavati Estuary Mangrove Reserve	mangrove	14.2865	74.435	{"type": "Point", "coordinates": [74.435, 14.2865]}	\N	src_karnataka_coastal_register	2026-10-17 10:27:02.284378+05:30	2026-10-17 10:27:02.284378+05:30
cf_kar_settlement_kumta	Kumta Coastal Municipality	settlement	14.4258	74.4173	{"type": "Point", "coordinates": [74.4173, 14.4258]}	32596	src_karnataka_coastal_register	2026-10-17 10:27:02.284378+05:30	2026-10-17 10:27:02.284378+05:30
cf_kar_port_tadadi	Tadadi Commercial Fishing Port	port	14.5244	74.3644	{"type": "Point", "coordinates": [74.3644, 14.5244]}	\N	src_karnataka_coastal_register	2026-10-17 10:27:02.284378+05:30	2026-10-17 10:27:02.284378+05:30
cf_kar_eco_aghanashini_estuary	Aghanashini Estuary (Ramsar Wetland Site)	protected_area	14.518	74.38	{"type": "Point", "coordinates": [74.38, 14.518]}	\N	src_karnataka_coastal_register	2026-10-17 10:27:02.284378+05:30	2026-10-17 10:27:02.284378+05:30
cf_kar_settlement_gokarna	Gokarna Coastal Heritage Town	settlement	14.5426	74.3168	{"type": "Point", "coordinates": [74.3168, 14.5426]}	13557	src_karnataka_coastal_register	2026-10-17 10:27:02.284378+05:30	2026-10-17 10:27:02.284378+05:30
cf_kar_port_belekeri	Belekeri Natural Port	port	14.7135	74.275	{"type": "Point", "coordinates": [74.275, 14.7135]}	\N	src_karnataka_coastal_register	2026-10-17 10:27:02.284378+05:30	2026-10-17 10:27:02.284378+05:30
cf_kar_settlement_ankola	Ankola Coastal Municipality	settlement	14.6617	74.3014	{"type": "Point", "coordinates": [74.3014, 14.6617]}	14309	src_karnataka_coastal_register	2026-10-17 10:27:02.284378+05:30	2026-10-17 10:27:02.284378+05:30
cf_kar_infra_kadamba_naval_base	INS Kadamba / Karwar Naval Base (Project Seabird)	port	14.7725	74.156	{"type": "Point", "coordinates": [74.156, 14.7725]}	\N	src_karnataka_coastal_register	2026-10-17 10:27:02.284378+05:30	2026-10-17 10:27:02.284378+05:30
cf_kar_port_karwar	Karwar Commercial Port (Baithkol)	port	14.805	74.12	{"type": "Point", "coordinates": [74.12, 14.805]}	\N	src_karnataka_coastal_register	2026-10-17 10:27:02.284378+05:30	2026-10-17 10:27:02.284378+05:30
cf_kar_settlement_karwar	Karwar City Municipal Corporation	settlement	14.814	74.1298	{"type": "Polygon", "coordinates": [[[74.1, 14.78], [74.16, 14.78], [74.16, 14.85], [74.1, 14.85], [74.1, 14.78]]]}	77139	src_karnataka_coastal_register	2026-10-17 10:27:02.284378+05:30	2026-10-17 10:27:02.284378+05:30
cf_kar_infra_karwar_hospital	District Civil Hospital, Karwar	hospital	14.816	74.1332	{"type": "Point", "coordinates": [74.1332, 14.816]}	\N	src_karnataka_coastal_register	2026-10-17 10:27:02.284378+05:30	2026-10-17 10:27:02.284378+05:30
cf_kar_eco_kali_estuary	Kali River Estuary & Mangrove Reserve	mangrove	14.845	74.128	{"type": "Point", "coordinates": [74.128, 14.845]}	\N	src_karnataka_coastal_register	2026-10-17 10:27:02.284378+05:30	2026-10-17 10:27:02.284378+05:30
cf_kar_settlement_majali	Majali Coastal Village	settlement	14.908	74.105	{"type": "Point", "coordinates": [74.105, 14.908]}	5600	src_karnataka_coastal_register	2026-10-17 10:27:02.284378+05:30	2026-10-17 10:27:02.284378+05:30
\.


--
-- Data for Name: data_sources; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.data_sources (id, name, provider, url, license, update_frequency, created_at, updated_at, description, base_url, license_info) FROM stdin;
src_karnataka_coastal_register	Karnataka Coastal Settlements, Ports and Critical Infrastructure Register	OpenStreetMap Contributors & Census of India	https://www.openstreetmap.org	ODbL 1.0 / Open Government Data License (OGDL) India	annual	2026-10-15 22:53:16.303304+05:30	2026-10-15 22:53:16.303304+05:30	\N	\N	\N
src_imd_incois_hazard_register	IMD & INCOIS Historical Cyclone and Hazard Register	India Meteorological Department (IMD) & INCOIS	https://mausam.imd.gov.in	Open Government Data License (OGDL) India	event-driven	2026-10-15 22:53:16.351866+05:30	2026-10-15 22:53:16.351866+05:30	\N	\N	\N
src_open_meteo_marine	Open-Meteo Global Marine Weather Service	Open-Meteo	https://marine-api.open-meteo.com/v1/marine	CC-BY 4.0 / Open Data	hourly	2026-10-15 22:53:17.692284+05:30	2026-10-15 22:53:17.692284+05:30	\N	\N	\N
real_pg_verified_source	Real PostgreSQL Verified Source	Open-Meteo	\N	\N	\N	2026-10-17 13:35:25.249886+05:30	2026-10-17 13:35:25.240026+05:30	\N	\N	\N
historical_archive	[SAMPLE FIXTURE / DEMO DATA] Arabian Sea Regional Reference Sample Fixture (Curated Benchmark / ERA5 Representative Baseline)	Open-Meteo	\N	\N	\N	2026-10-17 13:36:04.518386+05:30	2026-10-17 13:36:04.503938+05:30	Marine physical oceanographic observations.	https://marine-api.open-meteo.com/v1/marine	Open Data / CC BY 4.0
open_meteo	Open-Meteo Marine API	Open-Meteo	\N	\N	\N	2026-10-17 13:36:34.24353+05:30	2026-10-17 13:36:34.230026+05:30	Marine physical oceanographic observations.	https://marine-api.open-meteo.com/v1/marine	Open Data / CC BY 4.0
\.


--
-- Data for Name: evidence_records; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.evidence_records (id, source_id, source_identifier, source_url, observation_time, retrieval_time, latitude, longitude, data_type, raw_payload, hash, created_at, updated_at) FROM stdin;
evi_cf_cf_kar_port_nmpt	src_karnataka_coastal_register	osm:node:nmpt_port	https://www.openstreetmap.org	2024-01-01 05:30:00+05:30	2026-10-15 22:53:16.316324+05:30	12.9288	74.8197	coastal_feature	{"id": "cf_kar_port_nmpt", "name": "New Mangalore Port (NMPT)", "feature_type": "port", "latitude": 12.9288, "longitude": 74.8197, "estimated_population": null, "geojson_geometry": {"type": "Point", "coordinates": [74.8197, 12.9288]}, "description": "Major deep-water all-weather commercial seaport in Panambur, Mangaluru.", "census_year": null, "source_identifier": "osm:node:nmpt_port"}	1b3496771931b8d0f04d0f289b3c9c81d730237bead73bbe3f4fa3fc2b00c81b	2026-10-15 22:53:16.353869+05:30	2026-10-15 22:53:16.353869+05:30
evi_cf_cf_kar_port_old_mangaluru	src_karnataka_coastal_register	osm:way:old_port_bunder	https://www.openstreetmap.org	2024-01-01 05:30:00+05:30	2026-10-15 22:53:16.319311+05:30	12.858	74.8322	coastal_feature	{"id": "cf_kar_port_old_mangaluru", "name": "Old Mangalore Port (Bunder)", "feature_type": "port", "latitude": 12.858, "longitude": 74.8322, "estimated_population": null, "geojson_geometry": {"type": "Point", "coordinates": [74.8322, 12.858]}, "description": "Historic coastal harbour and fishing port at Netravati-Gurupura estuary confluence.", "census_year": null, "source_identifier": "osm:way:old_port_bunder"}	f73ee57e0e9ce66b9c437ead70155c8e5808bf192c50f4469114859f3e9e4be1	2026-10-15 22:53:16.353869+05:30	2026-10-15 22:53:16.353869+05:30
evi_cf_cf_kar_port_malpe	src_karnataka_coastal_register	osm:node:malpe_harbour	https://www.openstreetmap.org	2024-01-01 05:30:00+05:30	2026-10-15 22:53:16.322309+05:30	13.3512	74.7003	coastal_feature	{"id": "cf_kar_port_malpe", "name": "Malpe Fishing Harbour", "feature_type": "port", "latitude": 13.3512, "longitude": 74.7003, "estimated_population": null, "geojson_geometry": {"type": "Point", "coordinates": [74.7003, 13.3512]}, "description": "Major mechanized fisheries terminal and port in Udupi district on the Udyavara river mouth.", "census_year": null, "source_identifier": "osm:node:malpe_harbour"}	c9ddc99773e04c2ade182287228439bbf40ff42aae0958b2ac1157beb736e8a7	2026-10-15 22:53:16.353869+05:30	2026-10-15 22:53:16.353869+05:30
evi_cf_cf_kar_settlement_mangaluru	src_karnataka_coastal_register	census2011:mangaluru_mc	https://www.openstreetmap.org	2011-01-01 05:30:00+05:30	2026-10-15 22:53:16.323319+05:30	12.9141	74.856	coastal_feature	{"id": "cf_kar_settlement_mangaluru", "name": "Mangaluru City Corporation", "feature_type": "settlement", "latitude": 12.9141, "longitude": 74.856, "estimated_population": 499487, "geojson_geometry": {"type": "Polygon", "coordinates": [[[74.8, 12.85], [74.88, 12.85], [74.89, 12.95], [74.81, 12.95], [74.8, 12.85]]]}, "description": "District headquarters of Dakshina Kannada, major coastal municipal corporation.", "census_year": 2011, "source_identifier": "census2011:mangaluru_mc"}	c75b372a3688eafb5b8490f31c098d722abd1f776d9f3f3103eb838b81a46e3b	2026-10-15 22:53:16.353869+05:30	2026-10-15 22:53:16.353869+05:30
evi_cf_cf_kar_settlement_ullal	src_karnataka_coastal_register	census2011:ullal_cmc	https://www.openstreetmap.org	2011-01-01 05:30:00+05:30	2026-10-15 22:53:16.32532+05:30	12.8055	74.8564	coastal_feature	{"id": "cf_kar_settlement_ullal", "name": "Ullal Coastal Municipality", "feature_type": "settlement", "latitude": 12.8055, "longitude": 74.8564, "estimated_population": 53856, "geojson_geometry": {"type": "Point", "coordinates": [74.8564, 12.8055]}, "description": "Vulnerable low-lying coastal municipality immediately south of Netravati river mouth.", "census_year": 2011, "source_identifier": "census2011:ullal_cmc"}	c07ca466ab63eb0305bb3a8878e08decba76af982a48623753a562f2b54b2298	2026-10-15 22:53:16.353869+05:30	2026-10-15 22:53:16.353869+05:30
evi_cf_cf_kar_settlement_surathkal	src_karnataka_coastal_register	census2011:surathkal	https://www.openstreetmap.org	2011-01-01 05:30:00+05:30	2026-10-15 22:53:16.327319+05:30	13.0068	74.7938	coastal_feature	{"id": "cf_kar_settlement_surathkal", "name": "Surathkal Coastal Settlement", "feature_type": "settlement", "latitude": 13.0068, "longitude": 74.7938, "estimated_population": 41634, "geojson_geometry": {"type": "Point", "coordinates": [74.7938, 13.0068]}, "description": "Coastal town and industrial-educational node north of New Mangalore Port.", "census_year": 2011, "source_identifier": "census2011:surathkal"}	2379b607070f6e889636a2ec9d2f0ed61a8891cb76007786caf3404ddfd642d4	2026-10-15 22:53:16.353869+05:30	2026-10-15 22:53:16.353869+05:30
evi_cf_cf_kar_settlement_udupi	src_karnataka_coastal_register	census2011:udupi_cmc	https://www.openstreetmap.org	2011-01-01 05:30:00+05:30	2026-10-15 22:53:16.330318+05:30	13.3409	74.7421	coastal_feature	{"id": "cf_kar_settlement_udupi", "name": "Udupi City Municipality", "feature_type": "settlement", "latitude": 13.3409, "longitude": 74.7421, "estimated_population": 125306, "geojson_geometry": {"type": "Polygon", "coordinates": [[[74.71, 13.3], [74.78, 13.3], [74.78, 13.38], [74.71, 13.38], [74.71, 13.3]]]}, "description": "Administrative center of Udupi District situated 4 km inland from Arabian Sea.", "census_year": 2011, "source_identifier": "census2011:udupi_cmc"}	09341d044fd40b61d9f4a48fa2a7fe0c3462d7fbdaeb268ee474d8a8065eeac0	2026-10-15 22:53:16.353869+05:30	2026-10-15 22:53:16.353869+05:30
evi_cf_cf_kar_settlement_kundapura	src_karnataka_coastal_register	census2011:kundapura_tmc	https://www.openstreetmap.org	2011-01-01 05:30:00+05:30	2026-10-15 22:53:16.331879+05:30	13.6264	74.6934	coastal_feature	{"id": "cf_kar_settlement_kundapura", "name": "Kundapura Town Municipality", "feature_type": "settlement", "latitude": 13.6264, "longitude": 74.6934, "estimated_population": 30444, "geojson_geometry": {"type": "Point", "coordinates": [74.6934, 13.6264]}, "description": "Coastal town surrounded by Panchagangavalli river lagoon and Arabian Sea.", "census_year": 2011, "source_identifier": "census2011:kundapura_tmc"}	48ef6e3a35cc50b1e33c5f1badddbb4bc2f37bd0deea2d8bc018b908f8f5d28f	2026-10-15 22:53:16.353869+05:30	2026-10-15 22:53:16.353869+05:30
evi_cf_cf_kar_settlement_padubidri	src_karnataka_coastal_register	census2011:padubidri	https://www.openstreetmap.org	2011-01-01 05:30:00+05:30	2026-10-15 22:53:16.333878+05:30	13.136	74.7788	coastal_feature	{"id": "cf_kar_settlement_padubidri", "name": "Padubidri Coastal Village", "feature_type": "settlement", "latitude": 13.136, "longitude": 74.7788, "estimated_population": 11200, "geojson_geometry": {"type": "Point", "coordinates": [74.7788, 13.136]}, "description": "Coastal village with certified Blue Flag beach and river estuary.", "census_year": 2011, "source_identifier": "census2011:padubidri"}	a75cd661191ac2b32ae005e982e1e9d6ba9583902624a25d9a0e6e26693d3754	2026-10-15 22:53:16.353869+05:30	2026-10-15 22:53:16.353869+05:30
evi_cf_cf_kar_settlement_kaup	src_karnataka_coastal_register	census2011:kaup_tp	https://www.openstreetmap.org	2011-01-01 05:30:00+05:30	2026-10-15 22:53:16.33587+05:30	13.2241	74.7432	coastal_feature	{"id": "cf_kar_settlement_kaup", "name": "Kaup (Kapu) Coastal Town", "feature_type": "settlement", "latitude": 13.2241, "longitude": 74.7432, "estimated_population": 15100, "geojson_geometry": {"type": "Point", "coordinates": [74.7432, 13.2241]}, "description": "Coastal town with historic lighthouse on rocky promontory.", "census_year": 2011, "source_identifier": "census2011:kaup_tp"}	aee4d2f6691cf284ff94eee4d0a19c4b9194d27fb4c614adf32b9d5a44b6dc88	2026-10-15 22:53:16.353869+05:30	2026-10-15 22:53:16.353869+05:30
evi_cf_cf_kar_eco_netravati_mangroves	src_karnataka_coastal_register	ksczma:mangrove:netravati_01	https://www.openstreetmap.org	2024-01-01 05:30:00+05:30	2026-10-15 22:53:16.338881+05:30	12.871	74.8395	coastal_feature	{"id": "cf_kar_eco_netravati_mangroves", "name": "Netravati-Gurupura Estuarine Mangroves", "feature_type": "mangrove", "latitude": 12.871, "longitude": 74.8395, "estimated_population": null, "geojson_geometry": {"type": "Point", "coordinates": [74.8395, 12.871]}, "description": "Critical intertidal mangrove forest and nursery zone protected under CRZ-I regulations.", "census_year": null, "source_identifier": "ksczma:mangrove:netravati_01"}	3500740cf83b459692a10f10d57088ee520ec908a8f55ea09b3f8af7cd1577ab	2026-10-15 22:53:16.353869+05:30	2026-10-15 22:53:16.353869+05:30
evi_cf_cf_kar_eco_st_marys_islands	src_karnataka_coastal_register	gsi:geoheritage:st_marys	https://www.openstreetmap.org	2024-01-01 05:30:00+05:30	2026-10-15 22:53:16.3409+05:30	13.3768	74.6738	coastal_feature	{"id": "cf_kar_eco_st_marys_islands", "name": "St. Mary's Islands Geo-Heritage Site", "feature_type": "protected_area", "latitude": 13.3768, "longitude": 74.6738, "estimated_population": null, "geojson_geometry": {"type": "Point", "coordinates": [74.6738, 13.3768]}, "description": "National Geological Monument featuring sub-aerial columnar basaltic lava formations off Malpe.", "census_year": null, "source_identifier": "gsi:geoheritage:st_marys"}	c4b1c240ce47100510293701b3c094181646bc3b573660fbb82f8501e40fa6d6	2026-10-15 22:53:16.353869+05:30	2026-10-15 22:53:16.353869+05:30
evi_cf_cf_kar_infra_wenlock_hospital	src_karnataka_coastal_register	osm:way:wenlock_hospital	https://www.openstreetmap.org	2024-01-01 05:30:00+05:30	2026-10-15 22:53:16.342879+05:30	12.8682	74.8436	coastal_feature	{"id": "cf_kar_infra_wenlock_hospital", "name": "District Wenlock Hospital, Mangaluru", "feature_type": "hospital", "latitude": 12.8682, "longitude": 74.8436, "estimated_population": null, "geojson_geometry": {"type": "Point", "coordinates": [74.8436, 12.8682]}, "description": "1,000-bed apex government teaching hospital serving Dakshina Kannada coastal district.", "census_year": null, "source_identifier": "osm:way:wenlock_hospital"}	40e531c9a49ff4aadda9bb96b17228ce78c2591c37142f87eb39a050684a0b95	2026-10-15 22:53:16.353869+05:30	2026-10-15 22:53:16.353869+05:30
evi_cf_cf_kar_infra_udupi_hospital	src_karnataka_coastal_register	osm:way:udupi_dist_hospital	https://www.openstreetmap.org	2024-01-01 05:30:00+05:30	2026-10-15 22:53:16.343878+05:30	13.3367	74.7482	coastal_feature	{"id": "cf_kar_infra_udupi_hospital", "name": "District Government Hospital, Udupi", "feature_type": "hospital", "latitude": 13.3367, "longitude": 74.7482, "estimated_population": null, "geojson_geometry": {"type": "Point", "coordinates": [74.7482, 13.3367]}, "description": "250-bed apex public emergency healthcare center for Udupi coastal district at Ajjarakadu.", "census_year": null, "source_identifier": "osm:way:udupi_dist_hospital"}	79b1b1f0e862b2789fb3b275590abe6753c7880261ac4dd75ebd466d36880e77	2026-10-15 22:53:16.353869+05:30	2026-10-15 22:53:16.353869+05:30
evi_hist_hist_hazard_tauktae_2021	src_imd_incois_hazard_register	IMD RSMC Tropical Cyclones Report 2021; INCOIS Wave Rider Buoy 23001 & CB02	https://mausam.imd.gov.in	2021-05-15 23:30:00+05:30	2026-10-15 22:53:16.367561+05:30	13.1	73.2	historical_hazard_observation	{"event_id": "hist_hazard_tauktae_2021", "name": "Extremely Severe Cyclonic Storm Tauktae", "hazard_type": "cyclone_storm_surge", "agency": "India Meteorological Department (IMD) & INCOIS", "official_reference": "IMD RSMC Tropical Cyclones Report 2021; INCOIS Wave Rider Buoy 23001 & CB02", "provenance_url": "https://mausam.imd.gov.in", "start_time": "2021-05-14T03:00:00+00:00", "end_time": "2021-05-19T12:00:00+00:00", "peak_time": "2021-05-15T18:00:00+00:00", "peak_wave_height_m": 5.8, "peak_wind_gust_kmh": 85.0, "latitude": 13.1, "longitude": 73.2, "affected_sectors": ["Ullal", "Mangaluru Bengre Spit", "Malpe", "Padubidri", "Kundapura"], "observed_impacts": "Severe coastal erosion along Ullal shoreline, sea wall collapse over 200m stretch, seawater ingress into 120+ fishing settlements, and suspension of fishing operations at NMPT and Malpe.", "data_category": "observed_historical_hazard", "crs": "EPSG:4326", "limitations": "Historical observation derived from moored ocean buoys and post-event survey data. Represents observed conditions during past meteorological events; not a real-time observation.", "hash": "a6d21d2ed749a813726054a258546ec5583cab9810b7b468ac983504914d5f1d"}	a6d21d2ed749a813726054a258546ec5583cab9810b7b468ac983504914d5f1d	2026-10-15 22:53:16.370527+05:30	2026-10-15 22:53:16.370527+05:30
evi_hist_hist_hazard_ockhi_2017	src_imd_incois_hazard_register	IMD Report on Cyclonic Disturbances over North Indian Ocean 2017; INCOIS High Wave Bulletin	https://mausam.imd.gov.in	2017-12-02 17:30:00+05:30	2026-10-15 22:53:16.381422+05:30	12.8	73	historical_hazard_observation	{"event_id": "hist_hazard_ockhi_2017", "name": "Very Severe Cyclonic Storm Ockhi", "hazard_type": "cyclone_storm_surge", "agency": "India Meteorological Department (IMD) & INCOIS", "official_reference": "IMD Report on Cyclonic Disturbances over North Indian Ocean 2017; INCOIS High Wave Bulletin", "provenance_url": "https://mausam.imd.gov.in", "start_time": "2017-11-29T00:00:00+00:00", "end_time": "2017-12-06T00:00:00+00:00", "peak_time": "2017-12-02T12:00:00+00:00", "peak_wave_height_m": 4.5, "peak_wind_gust_kmh": 65.0, "latitude": 12.8, "longitude": 73.0, "affected_sectors": ["Mangaluru Bunder", "Ullal", "Someshwara"], "observed_impacts": "High swell surges leading to sea water ingress into coastal residential hamlets at Ullal and Someshwara; beach erosion and temporary grounding of traditional fishing crafts.", "data_category": "observed_historical_hazard", "crs": "EPSG:4326", "limitations": "Historical observation derived from moored ocean buoys and post-event survey data. Represents observed conditions during past meteorological events; not a real-time observation.", "hash": "627d918a49f601f2b3b890d9d5226cff10d9422354e2e83a5a5f8d73d7babb12"}	627d918a49f601f2b3b890d9d5226cff10d9422354e2e83a5a5f8d73d7babb12	2026-10-15 22:53:16.383433+05:30	2026-10-15 22:53:16.383433+05:30
evi_hist_hist_hazard_nisarga_2020	src_imd_incois_hazard_register	IMD RSMC Report No. Cyclone/2020/02; INCOIS Wave Forecast Verification	https://mausam.imd.gov.in	2020-06-02 17:30:00+05:30	2026-10-15 22:53:16.387452+05:30	13.5	72.8	historical_hazard_observation	{"event_id": "hist_hazard_nisarga_2020", "name": "Severe Cyclonic Storm Nisarga", "hazard_type": "cyclone_storm_surge", "agency": "India Meteorological Department (IMD) & INCOIS", "official_reference": "IMD RSMC Report No. Cyclone/2020/02; INCOIS Wave Forecast Verification", "provenance_url": "https://mausam.imd.gov.in", "start_time": "2020-06-01T06:00:00+00:00", "end_time": "2020-06-04T12:00:00+00:00", "peak_time": "2020-06-02T12:00:00+00:00", "peak_wave_height_m": 4.2, "peak_wind_gust_kmh": 60.0, "latitude": 13.5, "longitude": 72.8, "affected_sectors": ["Udupi", "Malpe", "Kaup"], "observed_impacts": "Rough to very rough sea conditions, coastal overtopping in low-lying pockets, 150mm heavy rainfall recorded across coastal Udupi taluks.", "data_category": "observed_historical_hazard", "crs": "EPSG:4326", "limitations": "Historical observation derived from moored ocean buoys and post-event survey data. Represents observed conditions during past meteorological events; not a real-time observation.", "hash": "a8c57d497f4f8784073192df248132e3a2890db0bcc016976c3a180a57e262a0"}	a8c57d497f4f8784073192df248132e3a2890db0bcc016976c3a180a57e262a0	2026-10-15 22:53:16.390451+05:30	2026-10-15 22:53:16.390451+05:30
evi_cf_cf_kar_eco_sharavati_mangroves	src_karnataka_coastal_register	ksczma:mangrove:sharavati_01	https://www.openstreetmap.org	2024-01-01 05:30:00+05:30	2026-10-17 10:27:00.912391+05:30	14.2865	74.435	coastal_feature	{"id": "cf_kar_eco_sharavati_mangroves", "name": "Sharavati Estuary Mangrove Reserve", "feature_type": "mangrove", "latitude": 14.2865, "longitude": 74.435, "estimated_population": null, "geojson_geometry": {"type": "Point", "coordinates": [74.435, 14.2865]}, "description": "Rich intertidal estuarine mangrove belt and mudflats classified under CRZ-I ecological protection.", "census_year": null, "source_identifier": "ksczma:mangrove:sharavati_01"}	bc2b6feddb4f3cf404792b4da58a351c613faf7d8c7fd50fa5239a8b65443476	2026-10-17 10:27:02.32582+05:30	2026-10-17 10:27:02.32582+05:30
evi_cf_cf_kar_settlement_kumta	src_karnataka_coastal_register	census2011:kumta_tmc	https://www.openstreetmap.org	2011-01-01 05:30:00+05:30	2026-10-17 10:27:00.913391+05:30	14.4258	74.4173	coastal_feature	{"id": "cf_kar_settlement_kumta", "name": "Kumta Coastal Municipality", "feature_type": "settlement", "latitude": 14.4258, "longitude": 74.4173, "estimated_population": 32596, "geojson_geometry": {"type": "Point", "coordinates": [74.4173, 14.4258]}, "description": "Major commercial and maritime town in central Uttara Kannada situated between hills and sea.", "census_year": 2011, "source_identifier": "census2011:kumta_tmc"}	8a160ad86c08549f967749245bafb5742bb9b91938bf3e492ec052ecbea38090	2026-10-17 10:27:02.32582+05:30	2026-10-17 10:27:02.32582+05:30
evi_hist_hist_hazard_kallakkadal_2024	src_imd_incois_hazard_register	INCOIS Ocean State Forecast Special Bulletin / Kallakkadal Warning (May 2024)	https://incois.gov.in	2024-05-05 19:30:00+05:30	2026-10-15 22:53:16.393457+05:30	12.91	74.85	historical_hazard_observation	{"event_id": "hist_hazard_kallakkadal_2024", "name": "Kallakkadal High Swell Surge Event", "hazard_type": "swell_surge_kallakkadal", "agency": "Indian National Centre for Ocean Information Services (INCOIS)", "official_reference": "INCOIS Ocean State Forecast Special Bulletin / Kallakkadal Warning (May 2024)", "provenance_url": "https://incois.gov.in", "start_time": "2024-05-04T00:00:00+00:00", "end_time": "2024-05-06T23:59:00+00:00", "peak_time": "2024-05-05T14:00:00+00:00", "peak_wave_height_m": 2.8, "peak_wind_gust_kmh": 35.0, "latitude": 12.91, "longitude": 74.85, "affected_sectors": ["Ullal", "Panambur", "Malpe", "Padubidri"], "observed_impacts": "Sudden high swell surge without local atmospheric depression, sea water overtopping coastal road at Ullal, flooding shore-side fish landing zones with 16-18s period waves.", "data_category": "observed_historical_hazard", "crs": "EPSG:4326", "limitations": "Historical observation derived from moored ocean buoys and post-event survey data. Represents observed conditions during past meteorological events; not a real-time observation.", "hash": "f17da75051b28691dce0447b1feb10cee691f39eaddca6105d5479ea50b6b9f0"}	f17da75051b28691dce0447b1feb10cee691f39eaddca6105d5479ea50b6b9f0	2026-10-15 22:53:17.695284+05:30	2026-10-15 22:53:17.695284+05:30
evi_cf_cf_kar_settlement_mulki	src_karnataka_coastal_register	census2011:mulki_tp	https://www.openstreetmap.org	2011-01-01 05:30:00+05:30	2026-10-17 10:27:00.875021+05:30	13.0903	74.7872	coastal_feature	{"id": "cf_kar_settlement_mulki", "name": "Mulki Coastal Town", "feature_type": "settlement", "latitude": 13.0903, "longitude": 74.7872, "estimated_population": 18124, "geojson_geometry": {"type": "Point", "coordinates": [74.7872, 13.0903]}, "description": "Estuarine coastal town on the Shambhavi-Nandini river confluence.", "census_year": 2011, "source_identifier": "census2011:mulki_tp"}	8ead620349236389a4e5904a2a90a281552e0228b28a0219e1222b42011b8d1a	2026-10-17 10:27:02.32582+05:30	2026-10-17 10:27:02.32582+05:30
evi_cf_cf_kar_settlement_brahmavar	src_karnataka_coastal_register	census2011:brahmavar	https://www.openstreetmap.org	2011-01-01 05:30:00+05:30	2026-10-17 10:27:00.892399+05:30	13.4862	74.7471	coastal_feature	{"id": "cf_kar_settlement_brahmavar", "name": "Brahmavar-Barkur Coastal Node", "feature_type": "settlement", "latitude": 13.4862, "longitude": 74.7471, "estimated_population": 22500, "geojson_geometry": {"type": "Point", "coordinates": [74.7471, 13.4862]}, "description": "Agricultural and estuarine trade center along the Sita River basin.", "census_year": 2011, "source_identifier": "census2011:brahmavar"}	0f31f75814e5399eb98858a5e8598bb5bf2719e685f8cddb805461a595ddbea6	2026-10-17 10:27:02.32582+05:30	2026-10-17 10:27:02.32582+05:30
evi_cf_cf_kar_settlement_maravanthe	src_karnataka_coastal_register	census2011:maravanthe	https://www.openstreetmap.org	2011-01-01 05:30:00+05:30	2026-10-17 10:27:00.896392+05:30	13.7126	74.6394	coastal_feature	{"id": "cf_kar_settlement_maravanthe", "name": "Maravanthe Coastal Spit", "feature_type": "settlement", "latitude": 13.7126, "longitude": 74.6394, "estimated_population": 6800, "geojson_geometry": {"type": "Point", "coordinates": [74.6394, 13.7126]}, "description": "Unique narrow coastal barrier spit separated by the Arabian Sea on west and Souparnika River on east.", "census_year": 2011, "source_identifier": "census2011:maravanthe"}	db2d32c77f62d23c9d899171ea342b5749b87861d4e1ed87651b9e213af4df0f	2026-10-17 10:27:02.32582+05:30	2026-10-17 10:27:02.32582+05:30
evi_cf_cf_kar_settlement_byndoor	src_karnataka_coastal_register	census2011:byndoor	https://www.openstreetmap.org	2011-01-01 05:30:00+05:30	2026-10-17 10:27:00.898391+05:30	13.8732	74.6288	coastal_feature	{"id": "cf_kar_settlement_byndoor", "name": "Baindur (Byndoor) Coastal Municipality", "feature_type": "settlement", "latitude": 13.8732, "longitude": 74.6288, "estimated_population": 24700, "geojson_geometry": {"type": "Point", "coordinates": [74.6288, 13.8732]}, "description": "Northernmost coastal municipality of Udupi District bordering Uttara Kannada.", "census_year": 2011, "source_identifier": "census2011:byndoor"}	53cf46df2fad1813f1697bd4dc256448d3462f5898a2524285bb1be89f01b528	2026-10-17 10:27:02.32582+05:30	2026-10-17 10:27:02.32582+05:30
evi_cf_cf_kar_port_bhatkal	src_karnataka_coastal_register	osm:node:bhatkal_port	https://www.openstreetmap.org	2024-01-01 05:30:00+05:30	2026-10-17 10:27:00.902394+05:30	13.974	74.542	coastal_feature	{"id": "cf_kar_port_bhatkal", "name": "Bhatkal Fishing Port", "feature_type": "port", "latitude": 13.974, "longitude": 74.542, "estimated_population": null, "geojson_geometry": {"type": "Point", "coordinates": [74.542, 13.974]}, "description": "Active fishing harbour on the Sharabi River mouth in southern Uttara Kannada.", "census_year": null, "source_identifier": "osm:node:bhatkal_port"}	022f1b23db4f51ad326c05512dac63aa3b697395335c2e8aaecbf88185d25e6b	2026-10-17 10:27:02.32582+05:30	2026-10-17 10:27:02.32582+05:30
evi_cf_cf_kar_settlement_bhatkal	src_karnataka_coastal_register	census2011:bhatkal_cmc	https://www.openstreetmap.org	2011-01-01 05:30:00+05:30	2026-10-17 10:27:00.90539+05:30	13.985	74.5519	coastal_feature	{"id": "cf_kar_settlement_bhatkal", "name": "Bhatkal Coastal Municipality", "feature_type": "settlement", "latitude": 13.985, "longitude": 74.5519, "estimated_population": 50007, "geojson_geometry": {"type": "Point", "coordinates": [74.5519, 13.985]}, "description": "Major commercial and port municipality in southern Uttara Kannada.", "census_year": 2011, "source_identifier": "census2011:bhatkal_cmc"}	b2c8a0c568584bcaccc2a651fdaad2ae7ddf56ca421820761471fca875d98d99	2026-10-17 10:27:02.32582+05:30	2026-10-17 10:27:02.32582+05:30
evi_cf_cf_kar_settlement_murudeshwar	src_karnataka_coastal_register	census2011:murudeshwar	https://www.openstreetmap.org	2011-01-01 05:30:00+05:30	2026-10-17 10:27:00.907394+05:30	14.0942	74.4849	coastal_feature	{"id": "cf_kar_settlement_murudeshwar", "name": "Murudeshwar Coastal Town", "feature_type": "settlement", "latitude": 14.0942, "longitude": 74.4849, "estimated_population": 14200, "geojson_geometry": {"type": "Point", "coordinates": [74.4849, 14.0942]}, "description": "Prominent coastal promontory with ancient temple, Shiva statue, and exposed sand spit beach.", "census_year": 2011, "source_identifier": "census2011:murudeshwar"}	969087bc6802ae5455f1543e4524a7556933636c0932ae591c8ca114f8ad6c4b	2026-10-17 10:27:02.32582+05:30	2026-10-17 10:27:02.32582+05:30
evi_cf_cf_kar_port_honnavar	src_karnataka_coastal_register	osm:way:honnavar_port	https://www.openstreetmap.org	2024-01-01 05:30:00+05:30	2026-10-17 10:27:00.908395+05:30	14.2801	74.4443	coastal_feature	{"id": "cf_kar_port_honnavar", "name": "Honnavar Port & Estuary Terminal", "feature_type": "port", "latitude": 14.2801, "longitude": 74.4443, "estimated_population": null, "geojson_geometry": {"type": "Point", "coordinates": [74.4443, 14.2801]}, "description": "Historic seaport on the Sharavati River estuary where the river meets the Arabian Sea.", "census_year": null, "source_identifier": "osm:way:honnavar_port"}	4aaf7fc9795944c7a911335c1dc60e9448c5948ea0c248c99462d20fa84c6f88	2026-10-17 10:27:02.32582+05:30	2026-10-17 10:27:02.32582+05:30
evi_cf_cf_kar_settlement_honnavar	src_karnataka_coastal_register	census2011:honnavar_tmc	https://www.openstreetmap.org	2011-01-01 05:30:00+05:30	2026-10-17 10:27:00.910394+05:30	14.2835	74.452	coastal_feature	{"id": "cf_kar_settlement_honnavar", "name": "Honnavar Town Municipality", "feature_type": "settlement", "latitude": 14.2835, "longitude": 74.452, "estimated_population": 19109, "geojson_geometry": {"type": "Point", "coordinates": [74.452, 14.2835]}, "description": "Port town and taluk headquarters located along the north bank of Sharavati estuary.", "census_year": 2011, "source_identifier": "census2011:honnavar_tmc"}	75565b9fad07864904268dedcbdd445debfb956f1b8efaf3367d29432220790b	2026-10-17 10:27:02.32582+05:30	2026-10-17 10:27:02.32582+05:30
evi_cf_cf_kar_port_tadadi	src_karnataka_coastal_register	osm:node:tadadi_port	https://www.openstreetmap.org	2024-01-01 05:30:00+05:30	2026-10-17 10:27:00.91539+05:30	14.5244	74.3644	coastal_feature	{"id": "cf_kar_port_tadadi", "name": "Tadadi Commercial Fishing Port", "feature_type": "port", "latitude": 14.5244, "longitude": 74.3644, "estimated_population": null, "geojson_geometry": {"type": "Point", "coordinates": [74.3644, 14.5244]}, "description": "All-weather fishing terminal in the Aghanashini River estuary near Gokarna.", "census_year": null, "source_identifier": "osm:node:tadadi_port"}	f3ca94859ca9d2b5138459525c910d1af8c1aa14544c1afc69d2b7c7b0f6c2b0	2026-10-17 10:27:02.32582+05:30	2026-10-17 10:27:02.32582+05:30
evi_cf_cf_kar_eco_aghanashini_estuary	src_karnataka_coastal_register	ramsar:wetland:2509_aghanashini	https://www.openstreetmap.org	2024-01-01 05:30:00+05:30	2026-10-17 10:27:00.9164+05:30	14.518	74.38	coastal_feature	{"id": "cf_kar_eco_aghanashini_estuary", "name": "Aghanashini Estuary (Ramsar Wetland Site)", "feature_type": "protected_area", "latitude": 14.518, "longitude": 74.38, "estimated_population": null, "geojson_geometry": {"type": "Point", "coordinates": [74.38, 14.518]}, "description": "Designated Ramsar Wetland of International Importance (#2509) supporting 80+ fish and 100+ bird species.", "census_year": null, "source_identifier": "ramsar:wetland:2509_aghanashini"}	293a53982f305aeefdef6177e18d4efa5673a7ccd83f416da407450702510521	2026-10-17 10:27:02.32582+05:30	2026-10-17 10:27:02.32582+05:30
evi_cf_cf_kar_settlement_gokarna	src_karnataka_coastal_register	census2011:gokarna	https://www.openstreetmap.org	2011-01-01 05:30:00+05:30	2026-10-17 10:27:00.918402+05:30	14.5426	74.3168	coastal_feature	{"id": "cf_kar_settlement_gokarna", "name": "Gokarna Coastal Heritage Town", "feature_type": "settlement", "latitude": 14.5426, "longitude": 74.3168, "estimated_population": 13557, "geojson_geometry": {"type": "Point", "coordinates": [74.3168, 14.5426]}, "description": "Ancient coastal temple town with crescent beaches (Om Beach, Kudle Beach) facing the Arabian Sea.", "census_year": 2011, "source_identifier": "census2011:gokarna"}	9a314bbb6b2c0f8ff7ab65f9563d73923cbcec4e1ff097fe54c6d8f4793cd02b	2026-10-17 10:27:02.32582+05:30	2026-10-17 10:27:02.32582+05:30
evi_cf_cf_kar_port_belekeri	src_karnataka_coastal_register	osm:way:belekeri_port	https://www.openstreetmap.org	2024-01-01 05:30:00+05:30	2026-10-17 10:27:00.920399+05:30	14.7135	74.275	coastal_feature	{"id": "cf_kar_port_belekeri", "name": "Belekeri Natural Port", "feature_type": "port", "latitude": 14.7135, "longitude": 74.275, "estimated_population": null, "geojson_geometry": {"type": "Point", "coordinates": [74.275, 14.7135]}, "description": "Natural anchorage port in Ankola taluk sheltered from southwest monsoon gales.", "census_year": null, "source_identifier": "osm:way:belekeri_port"}	466605219b028bc20c36ced190ad6ad82dab5776424fe340caef43db2d8fd81b	2026-10-17 10:27:02.32582+05:30	2026-10-17 10:27:02.32582+05:30
evi_cf_cf_kar_settlement_ankola	src_karnataka_coastal_register	census2011:ankola_tmc	https://www.openstreetmap.org	2011-01-01 05:30:00+05:30	2026-10-17 10:27:00.9224+05:30	14.6617	74.3014	coastal_feature	{"id": "cf_kar_settlement_ankola", "name": "Ankola Coastal Municipality", "feature_type": "settlement", "latitude": 14.6617, "longitude": 74.3014, "estimated_population": 14309, "geojson_geometry": {"type": "Point", "coordinates": [74.3014, 14.6617]}, "description": "Coastal taluk municipality known for coastal agriculture, fisheries, and Belekeri bay.", "census_year": 2011, "source_identifier": "census2011:ankola_tmc"}	78dbdd37245a42ad58819ac7a3bfb42d76fbec67ddf71bd638a18f8d1b5bf72b	2026-10-17 10:27:02.32582+05:30	2026-10-17 10:27:02.32582+05:30
evi_cf_cf_kar_infra_kadamba_naval_base	src_karnataka_coastal_register	osm:way:ins_kadamba	https://www.openstreetmap.org	2024-01-01 05:30:00+05:30	2026-10-17 10:27:00.924406+05:30	14.7725	74.156	coastal_feature	{"id": "cf_kar_infra_kadamba_naval_base", "name": "INS Kadamba / Karwar Naval Base (Project Seabird)", "feature_type": "port", "latitude": 14.7725, "longitude": 74.156, "estimated_population": null, "geojson_geometry": {"type": "Point", "coordinates": [74.156, 14.7725]}, "description": "Strategic deep-water naval base of the Indian Navy featuring extensive breakwater works and deep draft.", "census_year": null, "source_identifier": "osm:way:ins_kadamba"}	1fe213ce4f620ed4545a55bad357c6118a9dadba207764b09645ab59c14307e1	2026-10-17 10:27:02.32582+05:30	2026-10-17 10:27:02.32582+05:30
evi_cf_cf_kar_port_karwar	src_karnataka_coastal_register	osm:node:karwar_port	https://www.openstreetmap.org	2024-01-01 05:30:00+05:30	2026-10-17 10:27:00.926399+05:30	14.805	74.12	coastal_feature	{"id": "cf_kar_port_karwar", "name": "Karwar Commercial Port (Baithkol)", "feature_type": "port", "latitude": 14.805, "longitude": 74.12, "estimated_population": null, "geojson_geometry": {"type": "Point", "coordinates": [74.12, 14.805]}, "description": "Major intermediate all-weather natural seaport in Baithkol cove, sheltered by Karwar headland.", "census_year": null, "source_identifier": "osm:node:karwar_port"}	4f82d38bf8ceddec3445502a46cb3317aabb73bbfd054f542dfd208d64854f2b	2026-10-17 10:27:02.32582+05:30	2026-10-17 10:27:02.32582+05:30
evi_cf_cf_kar_settlement_karwar	src_karnataka_coastal_register	census2011:karwar_cmc	https://www.openstreetmap.org	2011-01-01 05:30:00+05:30	2026-10-17 10:27:00.927399+05:30	14.814	74.1298	coastal_feature	{"id": "cf_kar_settlement_karwar", "name": "Karwar City Municipal Corporation", "feature_type": "settlement", "latitude": 14.814, "longitude": 74.1298, "estimated_population": 77139, "geojson_geometry": {"type": "Polygon", "coordinates": [[[74.1, 14.78], [74.16, 14.78], [74.16, 14.85], [74.1, 14.85], [74.1, 14.78]]]}, "description": "District administrative headquarters of Uttara Kannada on the Kali River mouth and Rabindranath Tagore beach.", "census_year": 2011, "source_identifier": "census2011:karwar_cmc"}	a2e8addae75886948dfea547e101adc7f5b47cd66713efabb09be612880736c6	2026-10-17 10:27:02.32582+05:30	2026-10-17 10:27:02.32582+05:30
evi_cf_cf_kar_infra_karwar_hospital	src_karnataka_coastal_register	osm:way:karwar_dist_hospital	https://www.openstreetmap.org	2024-01-01 05:30:00+05:30	2026-10-17 10:27:00.929398+05:30	14.816	74.1332	coastal_feature	{"id": "cf_kar_infra_karwar_hospital", "name": "District Civil Hospital, Karwar", "feature_type": "hospital", "latitude": 14.816, "longitude": 74.1332, "estimated_population": null, "geojson_geometry": {"type": "Point", "coordinates": [74.1332, 14.816]}, "description": "400-bed apex government teaching hospital and healthcare facility for Uttara Kannada district.", "census_year": null, "source_identifier": "osm:way:karwar_dist_hospital"}	6532370afe195160d9f94ac98b0ea61772052148d2a4169397f6ac9c997aef34	2026-10-17 10:27:02.32582+05:30	2026-10-17 10:27:02.32582+05:30
evi_cf_cf_kar_eco_kali_estuary	src_karnataka_coastal_register	ksczma:mangrove:kali_01	https://www.openstreetmap.org	2024-01-01 05:30:00+05:30	2026-10-17 10:27:00.930399+05:30	14.845	74.128	coastal_feature	{"id": "cf_kar_eco_kali_estuary", "name": "Kali River Estuary & Mangrove Reserve", "feature_type": "mangrove", "latitude": 14.845, "longitude": 74.128, "estimated_population": null, "geojson_geometry": {"type": "Point", "coordinates": [74.128, 14.845]}, "description": "Expansive brackish estuarine delta and mangrove vegetation protected under CRZ-I guidelines.", "census_year": null, "source_identifier": "ksczma:mangrove:kali_01"}	910bd41934c3e0c740180afda7400512c56ea548aed965230c9d3ccf63208a93	2026-10-17 10:27:02.32582+05:30	2026-10-17 10:27:02.32582+05:30
evi_cf_cf_kar_settlement_majali	src_karnataka_coastal_register	census2011:majali	https://www.openstreetmap.org	2011-01-01 05:30:00+05:30	2026-10-17 10:27:00.931918+05:30	14.908	74.105	coastal_feature	{"id": "cf_kar_settlement_majali", "name": "Majali Coastal Village", "feature_type": "settlement", "latitude": 14.908, "longitude": 74.105, "estimated_population": 5600, "geojson_geometry": {"type": "Point", "coordinates": [74.105, 14.908]}, "description": "Northernmost coastal village of Karnataka on the Arabian Sea, immediately adjacent to the Goa state border.", "census_year": 2011, "source_identifier": "census2011:majali"}	b10deeb6b17fa3d7379d96affeffd484629dbf4a37ccf592b4e21f28614534f3	2026-10-17 10:27:02.32582+05:30	2026-10-17 10:27:02.32582+05:30
\.


--
-- Data for Name: hazard_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.hazard_events (id, source_id, external_id, name, hazard_type, basin, status, started_at, ended_at, created_at, updated_at) FROM stdin;
hist_hazard_tauktae_2021	src_imd_incois_hazard_register	hist_hazard_tauktae_2021	Extremely Severe Cyclonic Storm Tauktae	cyclone_storm_surge	North Indian Ocean (Arabian Sea)	historical	2021-05-14 08:30:00+05:30	2021-05-19 17:30:00+05:30	2026-10-15 22:53:16.365512+05:30	2026-10-15 22:53:16.365512+05:30
hist_hazard_ockhi_2017	src_imd_incois_hazard_register	hist_hazard_ockhi_2017	Very Severe Cyclonic Storm Ockhi	cyclone_storm_surge	North Indian Ocean (Arabian Sea)	historical	2017-11-29 05:30:00+05:30	2017-12-06 05:30:00+05:30	2026-10-15 22:53:16.371525+05:30	2026-10-15 22:53:16.371525+05:30
hist_hazard_nisarga_2020	src_imd_incois_hazard_register	hist_hazard_nisarga_2020	Severe Cyclonic Storm Nisarga	cyclone_storm_surge	North Indian Ocean (Arabian Sea)	historical	2020-06-01 11:30:00+05:30	2020-06-04 17:30:00+05:30	2026-10-15 22:53:16.384452+05:30	2026-10-15 22:53:16.384452+05:30
hist_hazard_kallakkadal_2024	src_imd_incois_hazard_register	hist_hazard_kallakkadal_2024	Kallakkadal High Swell Surge Event	swell_surge_kallakkadal	North Indian Ocean (Arabian Sea)	historical	2024-05-04 05:30:00+05:30	2024-05-07 05:29:00+05:30	2026-10-15 22:53:16.39145+05:30	2026-10-15 22:53:16.39145+05:30
\.


--
-- Data for Name: hazard_tracks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.hazard_tracks (id, hazard_event_id, "timestamp", latitude, longitude, wind_speed_kts, central_pressure_mb, is_forecast) FROM stdin;
trk_hist_hazard_tauktae_2021_peak	hist_hazard_tauktae_2021	2021-05-15 23:30:00+05:30	13.1	73.2	45.9	\N	f
trk_hist_hazard_ockhi_2017_peak	hist_hazard_ockhi_2017	2017-12-02 17:30:00+05:30	12.8	73	35.1	\N	f
trk_hist_hazard_nisarga_2020_peak	hist_hazard_nisarga_2020	2020-06-02 17:30:00+05:30	13.5	72.8	32.4	\N	f
trk_hist_hazard_kallakkadal_2024_peak	hist_hazard_kallakkadal_2024	2024-05-05 19:30:00+05:30	12.91	74.85	18.9	\N	f
\.


--
-- Data for Name: investigation_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.investigation_events (id, investigation_id, "timestamp", event_type, agent_id, details) FROM stdin;
\.


--
-- Data for Name: investigation_findings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.investigation_findings (id, investigation_id, agent_id, claim, value, unit, evidence_ids, verification_state, uncertainty_notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: investigations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.investigations (id, workspace, query, status, plan, completed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: marine_observations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.marine_observations (id, source_id, latitude, longitude, observation_time, retrieval_time, variable, value, unit, quality_flag, is_forecast, created_at, updated_at, sea_surface_temperature_celsius, wave_height_meters, wave_period_seconds, wave_direction_degrees, ocean_current_velocity_mps, ocean_current_direction_degrees, wind_speed_knots, wind_direction_degrees, chlorophyll_mg_m3, metadata_json) FROM stdin;
obs_live_1792084500	src_open_meteo_marine	12.9141	74.856	2026-10-15 22:45:00+05:30	2026-10-15 22:53:17.687122+05:30	significant_wave_height	0.62	m	\N	f	2026-10-15 22:53:17.71145+05:30	2026-10-15 22:53:17.71145+05:30	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}
obs_live_1792212300	src_open_meteo_marine	12.9141	74.856	2026-10-17 10:15:00+05:30	2026-10-17 10:27:02.262471+05:30	significant_wave_height	0.62	m	\N	f	2026-10-17 10:27:02.352952+05:30	2026-10-17 10:27:02.352952+05:30	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}
obs-c5c555094d1e	historical_archive	12.87	74.88	2025-07-15 05:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:04.532592+05:30	\N	27.8	3.4	9.2	250	\N	\N	24.5	\N	\N	{"is_historical": true, "is_sample_fixture": true, "season": "Southwest Monsoon", "evidence_id": "ev-hist-28747c3ed2"}
obs-0f9bc33aefae	historical_archive	12.87	74.88	2025-07-16 05:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:04.539205+05:30	\N	27.6	3.6	9.5	255	\N	\N	26	\N	\N	{"is_historical": true, "is_sample_fixture": true, "season": "Southwest Monsoon", "evidence_id": "ev-hist-28747c3ed2"}
obs-2b482e86744d	historical_archive	12.87	74.88	2025-08-10 05:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:04.555147+05:30	\N	27.9	3.1	8.8	245	\N	\N	22	\N	\N	{"is_historical": true, "is_sample_fixture": true, "season": "Southwest Monsoon", "evidence_id": "ev-hist-28747c3ed2"}
obs-a0aa09b2306e	historical_archive	12.87	74.88	2025-08-11 05:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:04.559371+05:30	\N	28.1	2.9	8.4	248	\N	\N	20.5	\N	\N	{"is_historical": true, "is_sample_fixture": true, "season": "Southwest Monsoon", "evidence_id": "ev-hist-28747c3ed2"}
obs-11bd0ca77dbc	historical_archive	12.87	74.88	2025-10-15 05:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:04.563964+05:30	\N	29.2	1.2	6.8	260	\N	\N	11	\N	\N	{"is_historical": true, "is_sample_fixture": true, "season": "Post-Monsoon", "evidence_id": "ev-hist-28747c3ed2"}
obs-91162189a42d	historical_archive	12.87	74.88	2025-10-16 05:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:04.568076+05:30	\N	29.4	1.1	6.5	262	\N	\N	9.5	\N	\N	{"is_historical": true, "is_sample_fixture": true, "season": "Post-Monsoon", "evidence_id": "ev-hist-28747c3ed2"}
obs-906a7c282762	historical_archive	12.87	74.88	2025-11-10 05:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:04.573024+05:30	\N	29	1	6.2	265	\N	\N	8.5	\N	\N	{"is_historical": true, "is_sample_fixture": true, "season": "Post-Monsoon", "evidence_id": "ev-hist-28747c3ed2"}
obs-f11293937411	historical_archive	12.87	74.88	2025-11-11 05:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:04.576367+05:30	\N	28.9	0.9	6	260	\N	\N	8	\N	\N	{"is_historical": true, "is_sample_fixture": true, "season": "Post-Monsoon", "evidence_id": "ev-hist-28747c3ed2"}
obs-0a9a0e421aba	historical_archive	12.87	74.88	2026-01-15 05:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:04.580255+05:30	\N	28.2	0.8	5.8	270	\N	\N	7	\N	\N	{"is_historical": true, "is_sample_fixture": true, "season": "Winter", "evidence_id": "ev-hist-28747c3ed2"}
obs-d999da3608b0	historical_archive	12.87	74.88	2026-01-16 05:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:04.584071+05:30	\N	28.1	0.8	5.6	268	\N	\N	7.5	\N	\N	{"is_historical": true, "is_sample_fixture": true, "season": "Winter", "evidence_id": "ev-hist-28747c3ed2"}
obs-d5ebf0788102	historical_archive	12.87	74.88	2026-02-10 05:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:04.587911+05:30	\N	28.4	0.9	6	272	\N	\N	8	\N	\N	{"is_historical": true, "is_sample_fixture": true, "season": "Winter", "evidence_id": "ev-hist-28747c3ed2"}
obs-d25000a2ecbc	historical_archive	12.87	74.88	2026-04-10 05:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:04.591366+05:30	\N	30.1	1.2	6.4	260	\N	\N	10	\N	\N	{"is_historical": true, "is_sample_fixture": true, "season": "Pre-Monsoon", "evidence_id": "ev-hist-28747c3ed2"}
obs-692729402a1b	historical_archive	12.87	74.88	2026-04-11 05:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:04.595132+05:30	\N	30.3	1.3	6.5	258	\N	\N	11.5	\N	\N	{"is_historical": true, "is_sample_fixture": true, "season": "Pre-Monsoon", "evidence_id": "ev-hist-28747c3ed2"}
obs-3911d67305be	historical_archive	12.87	74.88	2026-05-15 05:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:04.599242+05:30	\N	30.5	1.8	7.2	252	\N	\N	14	\N	\N	{"is_historical": true, "is_sample_fixture": true, "season": "Pre-Monsoon", "evidence_id": "ev-hist-28747c3ed2"}
obs-80a211cb4fc5	historical_archive	12.87	74.88	2026-05-16 05:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:04.603094+05:30	\N	30.4	2	7.5	250	\N	\N	16	\N	\N	{"is_historical": true, "is_sample_fixture": true, "season": "Pre-Monsoon", "evidence_id": "ev-hist-28747c3ed2"}
obs-2858faf52dda	historical_archive	14.8	74.12	2025-07-15 05:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:04.606947+05:30	\N	28.1	3.5	9.4	252	\N	\N	25	\N	\N	{"is_historical": true, "is_sample_fixture": true, "season": "Southwest Monsoon", "evidence_id": "ev-hist-28747c3ed2"}
obs-590dab095097	historical_archive	14.8	74.12	2025-07-16 05:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:04.610046+05:30	\N	27.9	3.7	9.6	256	\N	\N	26.5	\N	\N	{"is_historical": true, "is_sample_fixture": true, "season": "Southwest Monsoon", "evidence_id": "ev-hist-28747c3ed2"}
obs-3732e0d41c43	historical_archive	14.8	74.12	2025-08-10 05:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:04.614231+05:30	\N	28.3	3.2	9	248	\N	\N	23	\N	\N	{"is_historical": true, "is_sample_fixture": true, "season": "Southwest Monsoon", "evidence_id": "ev-hist-28747c3ed2"}
obs-d2ebc16a97a1	historical_archive	14.8	74.12	2025-10-15 05:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:04.617206+05:30	\N	29.5	1.3	6.9	262	\N	\N	11.5	\N	\N	{"is_historical": true, "is_sample_fixture": true, "season": "Post-Monsoon", "evidence_id": "ev-hist-28747c3ed2"}
obs-8617a8d291b7	historical_archive	14.8	74.12	2025-11-10 05:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:04.623005+05:30	\N	29.2	1.1	6.3	266	\N	\N	9	\N	\N	{"is_historical": true, "is_sample_fixture": true, "season": "Post-Monsoon", "evidence_id": "ev-hist-28747c3ed2"}
obs-d4f70d6cc846	historical_archive	14.8	74.12	2026-01-15 05:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:04.62777+05:30	\N	28.4	0.9	5.9	272	\N	\N	7.5	\N	\N	{"is_historical": true, "is_sample_fixture": true, "season": "Winter", "evidence_id": "ev-hist-28747c3ed2"}
obs-6919350a7b07	historical_archive	14.8	74.12	2026-04-10 05:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:04.632502+05:30	\N	30.3	1.3	6.5	262	\N	\N	10.5	\N	\N	{"is_historical": true, "is_sample_fixture": true, "season": "Pre-Monsoon", "evidence_id": "ev-hist-28747c3ed2"}
obs-31f2ac7c2cbc	historical_archive	14.8	74.12	2026-05-15 05:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:04.637579+05:30	\N	30.7	1.9	7.3	254	\N	\N	14.5	\N	\N	{"is_historical": true, "is_sample_fixture": true, "season": "Pre-Monsoon", "evidence_id": "ev-hist-28747c3ed2"}
obs-0e1d6d24725a	open_meteo	12.87	74.88	2026-10-17 05:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.266401+05:30	\N	30.8	0.58	8.95	192	0.111	297	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-4a081cc2d28e	open_meteo	12.87	74.88	2026-10-17 06:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.283691+05:30	\N	30.8	0.58	9.1	193	0.111	297	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-28d5dff0b862	open_meteo	12.87	74.88	2026-10-17 07:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.299621+05:30	\N	30.8	0.6	9.35	195	0.139	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-4c52a3dedd6f	open_meteo	12.87	74.88	2026-10-17 08:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.305096+05:30	\N	30.9	0.6	9.6	196	0.139	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-91c4443d06f4	open_meteo	12.87	74.88	2026-10-17 09:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.309455+05:30	\N	30.9	0.62	9.7	197	0.139	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-1a000268f213	open_meteo	12.87	74.88	2026-10-17 10:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.313273+05:30	\N	30.9	0.62	9.75	198	0.139	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-734f9034c85e	open_meteo	12.87	74.88	2026-10-17 11:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.316942+05:30	\N	30.9	0.64	9.8	199	0.139	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-7fe1b8cc131f	open_meteo	12.87	74.88	2026-10-17 12:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.320612+05:30	\N	30.9	0.64	9.8	200	0.111	297	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-48700c9ffa7c	open_meteo	12.87	74.88	2026-10-17 13:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.324573+05:30	\N	31	0.66	9.8	201	0.083	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-f6cdb6608bd0	open_meteo	12.87	74.88	2026-10-17 14:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.328767+05:30	\N	31	0.66	9.75	202	0.083	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-701400e46605	open_meteo	12.87	74.88	2026-10-17 15:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.332324+05:30	\N	31	0.68	9.7	203	0.083	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-277863c7a5cb	open_meteo	12.87	74.88	2026-10-17 16:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.335524+05:30	\N	31	0.68	9.6	204	0.083	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-b25b48e92620	open_meteo	12.87	74.88	2026-10-17 17:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.33903+05:30	\N	31	0.7	9.55	205	0.083	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-968299d878ee	open_meteo	12.87	74.88	2026-10-17 18:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.343045+05:30	\N	31	0.7	9.5	205	0.083	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-e0b59afbcb0a	open_meteo	12.87	74.88	2026-10-17 19:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.347042+05:30	\N	30.9	0.72	9.4	206	0.139	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-dfdf44e89f96	open_meteo	12.87	74.88	2026-10-17 20:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.350105+05:30	\N	30.9	0.72	9.35	206	0.139	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-f5be3fd23cbe	open_meteo	12.87	74.88	2026-10-17 21:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.353411+05:30	\N	30.9	0.72	9.3	206	0.139	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-647ecf3082e7	open_meteo	12.87	74.88	2026-10-17 22:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.356585+05:30	\N	30.9	0.72	9.3	206	0.139	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-5d4fe0228dc0	open_meteo	12.87	74.88	2026-10-17 23:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.360355+05:30	\N	30.8	0.72	9.25	206	0.139	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-e4232663dfca	open_meteo	12.87	74.88	2026-10-18 00:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.365213+05:30	\N	30.8	0.72	9.2	206	0.139	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-37ad8f00635b	open_meteo	12.87	74.88	2026-10-18 01:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.369224+05:30	\N	30.8	0.72	9.15	206	0.083	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-25953655f1fc	open_meteo	12.87	74.88	2026-10-18 02:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.373212+05:30	\N	30.7	0.72	9.1	206	0.083	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-a3e844462b1d	open_meteo	12.87	74.88	2026-10-18 03:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.377104+05:30	\N	30.7	0.72	9.05	206	0.083	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-45934a568ea4	open_meteo	12.87	74.88	2026-10-18 04:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.380406+05:30	\N	30.7	0.72	9.05	206	0.083	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-5c3b8e266615	open_meteo	12.87	74.88	2026-10-18 05:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.388739+05:30	\N	30.7	0.72	9	206	0.083	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-40483e90690e	open_meteo	12.87	74.88	2026-10-18 06:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.391814+05:30	\N	30.7	0.72	9	206	0.083	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-e435764a6e50	open_meteo	12.87	74.88	2026-10-18 07:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.394572+05:30	\N	30.7	0.72	8.95	206	0.083	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-c6ae9ca4910d	open_meteo	12.87	74.88	2026-10-18 08:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.397814+05:30	\N	30.8	0.72	8.95	206	0.111	297	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-88315c68444f	open_meteo	12.87	74.88	2026-10-18 09:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.400619+05:30	\N	30.8	0.72	8.9	206	0.111	297	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-5d74e5bad5cb	open_meteo	12.87	74.88	2026-10-18 10:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.403924+05:30	\N	30.9	0.72	8.9	205	0.111	297	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-d6c613273687	open_meteo	12.87	74.88	2026-10-18 11:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.407154+05:30	\N	30.9	0.72	8.85	205	0.111	297	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-23e1dc9c564b	open_meteo	12.87	74.88	2026-10-18 12:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.409894+05:30	\N	30.9	0.72	8.85	205	0.083	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-4255e515c54a	open_meteo	12.87	74.88	2026-10-18 13:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.412612+05:30	\N	31	0.7	8.8	205	0.083	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-5ea0237a0850	open_meteo	12.87	74.88	2026-10-18 14:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.415986+05:30	\N	31	0.7	8.8	205	0.083	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-e29d5eccafac	open_meteo	12.87	74.88	2026-10-18 15:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.421044+05:30	\N	31	0.7	8.8	204	0.083	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-d950d0bea98f	open_meteo	12.87	74.88	2026-10-18 16:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.424694+05:30	\N	31	0.72	8.8	204	0.083	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-a2edf532feb1	open_meteo	12.87	74.88	2026-10-18 17:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.42922+05:30	\N	31	0.72	8.8	203	0.083	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-90b906235018	open_meteo	12.87	74.88	2026-10-18 18:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.43455+05:30	\N	31	0.72	8.8	203	0.083	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-92e020883f72	open_meteo	12.87	74.88	2026-10-18 19:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.438549+05:30	\N	30.9	0.72	8.8	202	0.111	297	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-65ad46d4394c	open_meteo	12.87	74.88	2026-10-18 20:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.442551+05:30	\N	30.9	0.72	8.8	202	0.111	297	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-85d8106ba446	open_meteo	12.87	74.88	2026-10-18 21:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.447391+05:30	\N	30.9	0.72	8.8	202	0.139	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-c23558dc9526	open_meteo	12.87	74.88	2026-10-18 22:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.451945+05:30	\N	30.9	0.72	8.85	201	0.139	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-691d970affff	open_meteo	12.87	74.88	2026-10-18 23:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.455464+05:30	\N	30.8	0.72	8.85	201	0.139	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-7d17b2616ce9	open_meteo	12.87	74.88	2026-10-19 00:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.459465+05:30	\N	30.8	0.72	8.85	201	0.139	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-3a1bf42bbb2a	open_meteo	12.87	74.88	2026-10-19 01:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.463467+05:30	\N	30.8	0.72	8.85	200	0.083	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-f57d52cb7056	open_meteo	12.87	74.88	2026-10-19 02:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.468986+05:30	\N	30.7	0.72	8.85	200	0.083	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-124eafb58f8e	open_meteo	12.87	74.88	2026-10-19 03:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.472988+05:30	\N	30.7	0.72	8.85	200	0.083	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-7905580392b6	open_meteo	12.87	74.88	2026-10-19 04:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.477029+05:30	\N	30.7	0.72	8.9	200	0.083	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-31820fba91bc	open_meteo	12.87	74.88	2026-10-19 05:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.482023+05:30	\N	30.7	0.72	8.9	200	0.056	270	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-a7f251d04a87	open_meteo	12.87	74.88	2026-10-19 06:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.486583+05:30	\N	30.7	0.72	8.9	200	0.056	270	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-d4ec4a91ce0e	open_meteo	12.87	74.88	2026-10-19 07:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.490921+05:30	\N	30.7	0.72	8.9	200	0.056	270	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-7c9aada6d65f	open_meteo	12.87	74.88	2026-10-19 08:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.495276+05:30	\N	30.7	0.72	8.9	200	0.056	270	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-04586a178ad8	open_meteo	12.87	74.88	2026-10-19 09:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.50316+05:30	\N	30.8	0.72	8.9	200	0.056	270	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-fc9b047d0f2d	open_meteo	12.87	74.88	2026-10-19 10:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.50692+05:30	\N	30.8	0.72	8.85	200	0.056	270	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-529146d18b45	open_meteo	12.87	74.88	2026-10-19 11:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.510689+05:30	\N	30.8	0.72	8.85	200	0.056	270	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-60d51675c672	open_meteo	12.87	74.88	2026-10-19 12:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.514484+05:30	\N	30.8	0.72	8.85	200	0	90	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-7d6b45399f30	open_meteo	12.87	74.88	2026-10-19 13:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.518272+05:30	\N	30.9	0.72	8.9	200	0	90	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-f23735251758	open_meteo	12.87	74.88	2026-10-19 14:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.521422+05:30	\N	30.9	0.72	8.9	200	0	90	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-d70d5ee32e6a	open_meteo	12.87	74.88	2026-10-19 15:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.52527+05:30	\N	30.9	0.72	8.9	200	0	90	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-cdee83a539b7	open_meteo	12.87	74.88	2026-10-19 16:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.528375+05:30	\N	30.9	0.7	8.95	199	0.056	180	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-ff73b5e38104	open_meteo	12.87	74.88	2026-10-19 17:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.531016+05:30	\N	30.9	0.7	8.95	199	0.056	180	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-f047f78cf6da	open_meteo	12.87	74.88	2026-10-19 18:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.534563+05:30	\N	30.9	0.7	8.95	199	0.056	180	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-82e188951b4b	open_meteo	12.87	74.88	2026-10-19 19:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.539259+05:30	\N	30.9	0.7	9	199	0	90	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-ef7219a000a0	open_meteo	12.87	74.88	2026-10-19 20:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.543495+05:30	\N	30.9	0.7	9	199	0.056	270	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-435259497bd1	open_meteo	12.87	74.88	2026-10-19 21:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.547184+05:30	\N	30.9	0.7	9.05	199	0.056	270	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-96d00a5c92f4	open_meteo	12.87	74.88	2026-10-19 22:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.551485+05:30	\N	30.8	0.7	9.05	198	0.083	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-17685e7eb82c	open_meteo	12.87	74.88	2026-10-19 23:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.555272+05:30	\N	30.8	0.7	9.1	198	0.083	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-62f87fb53394	open_meteo	12.87	74.88	2026-10-20 00:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.558996+05:30	\N	30.8	0.7	9.15	198	0.083	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-ce907b78eb8b	open_meteo	12.87	74.88	2026-10-20 01:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.562205+05:30	\N	30.8	0.68	9.15	198	0.083	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-4997a3c7f772	open_meteo	12.87	74.88	2026-10-20 02:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.565922+05:30	\N	30.7	0.68	9.2	198	0.083	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-c26d1ae3d7f6	open_meteo	12.87	74.88	2026-10-20 03:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.568967+05:30	\N	30.7	0.68	9.25	198	0.083	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-971cc4f8f17f	open_meteo	12.87	74.88	2026-10-20 04:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.573488+05:30	\N	30.7	0.66	9.25	197	0.056	270	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-96fd60296e1a	open_meteo	12.87	74.88	2026-10-20 05:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.575487+05:30	\N	30.7	0.66	9.3	197	0.056	270	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-6d6d6d2e550a	open_meteo	12.87	74.88	2026-10-20 06:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.580024+05:30	\N	30.7	0.66	9.35	197	0.056	270	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-f16c6b06e9e6	open_meteo	12.87	74.88	2026-10-20 07:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.584003+05:30	\N	30.7	0.66	9.35	197	0	90	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-e23dd96f3431	open_meteo	12.87	74.88	2026-10-20 08:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.587509+05:30	\N	30.7	0.66	9.4	197	0.056	180	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-6fe22e220eaf	open_meteo	12.87	74.88	2026-10-20 09:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.591516+05:30	\N	30.7	0.66	9.4	197	0.056	180	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-40b87a5504a6	open_meteo	12.87	74.88	2026-10-20 10:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.595747+05:30	\N	30.8	0.66	9.45	197	0.056	180	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-9fb6d2296799	open_meteo	12.87	74.88	2026-10-20 11:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.599269+05:30	\N	30.8	0.66	9.45	197	0.056	180	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-3d3552f2acd7	open_meteo	12.87	74.88	2026-10-20 12:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.603269+05:30	\N	30.8	0.66	9.45	197	0.083	135	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-f427ce317dab	open_meteo	12.87	74.88	2026-10-20 13:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.607267+05:30	\N	30.8	0.66	9.5	197	0.111	153	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-a6d1b720da35	open_meteo	12.87	74.88	2026-10-20 14:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.612796+05:30	\N	30.9	0.66	9.45	197	0.111	153	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-0d18b1587a22	open_meteo	12.87	74.88	2026-10-20 15:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.617791+05:30	\N	30.9	0.66	9.3	198	0.111	153	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-a6a8961c5dff	open_meteo	12.87	74.88	2026-10-20 16:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.621332+05:30	\N	30.9	0.68	9.1	199	0.111	153	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-bf940be18dad	open_meteo	12.87	74.88	2026-10-20 17:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.625334+05:30	\N	30.9	0.68	8.95	200	0.167	162	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-b4ea7cfbe069	open_meteo	12.87	74.88	2026-10-20 18:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.629844+05:30	\N	30.9	0.68	9	200	0.167	162	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-fd8e5e9dd976	open_meteo	12.87	74.88	2026-10-20 19:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.633856+05:30	\N	30.9	0.66	9.1	200	0.167	162	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-a28721248437	open_meteo	12.87	74.88	2026-10-20 20:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.636853+05:30	\N	30.9	0.66	9.25	200	0.167	162	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-c0ef8ae76c11	open_meteo	12.87	74.88	2026-10-20 21:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.640882+05:30	\N	30.8	0.66	9.35	199	0.111	153	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-f5bef5037f7e	open_meteo	12.87	74.88	2026-10-20 22:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.643881+05:30	\N	30.8	0.66	9.45	199	0.111	180	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-12a7273deeb1	open_meteo	12.87	74.88	2026-10-20 23:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.651394+05:30	\N	30.8	0.66	9.5	198	0.111	180	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-4977d69307a5	open_meteo	12.87	74.88	2026-10-21 00:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.654395+05:30	\N	30.8	0.66	9.55	198	0.056	180	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-9ffa36920745	open_meteo	12.87	74.88	2026-10-21 01:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.658395+05:30	\N	30.7	0.64	9.6	198	0.056	180	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-3618917f2f1e	open_meteo	12.87	74.88	2026-10-21 02:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.661466+05:30	\N	30.7	0.64	9.65	198	0.056	180	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-c47e8a2fbbd2	open_meteo	12.87	74.88	2026-10-21 03:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.664682+05:30	\N	30.7	0.64	9.7	198	0.056	180	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-0ec14e4ab68f	open_meteo	12.87	74.88	2026-10-21 04:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.668279+05:30	\N	30.7	0.64	9.7	198	0.056	180	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-8888978f4ad0	open_meteo	12.87	74.88	2026-10-21 05:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.672578+05:30	\N	30.7	0.64	9.75	198	0.056	180	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-4291b6d05a3d	open_meteo	12.87	74.88	2026-10-21 06:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.676321+05:30	\N	30.7	0.64	9.75	198	0.111	180	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-63fc555bcd57	open_meteo	12.87	74.88	2026-10-21 07:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.680129+05:30	\N	30.7	0.64	9.8	199	0.111	153	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-f10814d190e9	open_meteo	12.87	74.88	2026-10-21 08:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.683987+05:30	\N	30.7	0.64	9.8	199	0.111	153	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-b8954a1d168e	open_meteo	12.87	74.88	2026-10-21 09:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.687744+05:30	\N	30.7	0.64	9.8	200	0.167	162	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-04cfca345876	open_meteo	12.87	74.88	2026-10-21 10:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.690932+05:30	\N	30.8	0.64	9.8	200	0.167	162	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-aee67af29b5e	open_meteo	12.87	74.88	2026-10-21 11:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.693448+05:30	\N	30.8	0.64	9.8	201	0.167	162	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-85a859189b1a	open_meteo	12.87	74.88	2026-10-21 12:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.696454+05:30	\N	30.8	0.64	9.75	202	0.167	162	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-e39b7e6b3bbd	open_meteo	12.87	74.88	2026-10-21 13:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.698522+05:30	\N	30.8	0.66	9.65	203	0.111	180	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-d9f800e4da5a	open_meteo	12.87	74.88	2026-10-21 14:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.702028+05:30	\N	30.8	0.66	9.55	204	0.111	180	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-88e42689d68c	open_meteo	12.87	74.88	2026-10-21 15:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.705067+05:30	\N	30.8	0.68	9.5	206	0.111	180	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-0e7b492f0857	open_meteo	12.87	74.88	2026-10-21 16:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.708035+05:30	\N	30.8	0.68	9.4	207	0.111	180	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-a6d1e92d2249	open_meteo	12.87	74.88	2026-10-21 17:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.711036+05:30	\N	30.8	0.7	9.35	209	0.111	180	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-c067d1e5df1c	open_meteo	12.87	74.88	2026-10-21 18:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.715451+05:30	\N	30.8	0.7	9.3	209	0.111	180	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-dcba1b224d63	open_meteo	12.87	74.88	2026-10-21 19:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.718632+05:30	\N	30.8	0.72	9.3	210	0.111	180	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-fb8c0f74eb3a	open_meteo	12.87	74.88	2026-10-21 20:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.721294+05:30	\N	30.8	0.72	9.25	210	0.111	180	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-828b7e821c63	open_meteo	12.87	74.88	2026-10-21 21:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.723904+05:30	\N	30.8	0.72	9.25	210	0.111	180	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-3b2b1230d75d	open_meteo	12.87	74.88	2026-10-21 22:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.727119+05:30	\N	30.8	0.74	9.2	211	0.111	180	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-2284c2d63302	open_meteo	12.87	74.88	2026-10-21 23:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.730291+05:30	\N	30.8	0.74	9.2	211	0.056	180	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-510928153786	open_meteo	12.87	74.88	2026-10-22 00:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.733507+05:30	\N	30.8	0.74	9.2	211	0.056	180	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-76dabfaa7829	open_meteo	12.87	74.88	2026-10-22 01:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.736763+05:30	\N	30.7	0.72	9.25	210	0	90	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-df53425028d0	open_meteo	12.87	74.88	2026-10-22 02:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.7407+05:30	\N	30.7	0.72	9.25	210	0	90	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-dbcb7c1cf63c	open_meteo	12.87	74.88	2026-10-22 03:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.743799+05:30	\N	30.7	0.72	9.25	210	0	90	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-defeebca32e2	open_meteo	12.87	74.88	2026-10-22 04:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.746817+05:30	\N	30.6	0.72	9.3	209	0	90	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-a0b8a3c73c36	open_meteo	12.87	74.88	2026-10-22 05:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.749349+05:30	\N	30.6	0.72	9.3	209	0	90	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-250dc023f793	open_meteo	12.87	74.88	2026-10-22 06:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.752351+05:30	\N	30.6	0.72	9.3	209	0	90	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-f5deb1df790d	open_meteo	12.87	74.88	2026-10-22 07:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.755861+05:30	\N	30.6	0.72	9.35	208	0.056	180	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-6ac72769915b	open_meteo	12.87	74.88	2026-10-22 08:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.75886+05:30	\N	30.7	0.72	9.35	208	0.056	180	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-3a4b8c211502	open_meteo	12.87	74.88	2026-10-22 09:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.761367+05:30	\N	30.7	0.72	9.35	207	0.056	180	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-09b0cfc06063	open_meteo	12.87	74.88	2026-10-22 10:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.764887+05:30	\N	30.7	0.72	9.35	207	0.056	180	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-9bc5742f2a2c	open_meteo	12.87	74.88	2026-10-22 11:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.767888+05:30	\N	30.7	0.72	9.3	206	0.056	180	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-cee13820c809	open_meteo	12.87	74.88	2026-10-22 12:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.770886+05:30	\N	30.8	0.72	9.15	205	0	90	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-3dd7cde9a78c	open_meteo	12.87	74.88	2026-10-22 13:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.772888+05:30	\N	30.8	0.74	8.95	203	0.056	0	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-aebb7bc1ba80	open_meteo	12.87	74.88	2026-10-22 14:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.777411+05:30	\N	30.8	0.74	8.8	202	0.083	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-68b56492ef33	open_meteo	12.87	74.88	2026-10-22 15:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.78141+05:30	\N	30.8	0.74	8.75	202	0.111	333	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-33515e622c64	open_meteo	12.87	74.88	2026-10-22 16:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.786448+05:30	\N	30.9	0.74	8.7	201	0.111	333	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-f2d34c7d9d30	open_meteo	12.87	74.88	2026-10-22 17:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.791448+05:30	\N	30.9	0.74	8.7	201	0.111	333	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-4efb06f68ff2	open_meteo	12.87	74.88	2026-10-22 18:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.795448+05:30	\N	30.9	0.74	8.7	200	0.056	0	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-6c46bab16ac5	open_meteo	12.87	74.88	2026-10-22 19:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.798521+05:30	\N	30.8	0.74	8.7	200	0.056	0	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-d107a5edf811	open_meteo	12.87	74.88	2026-10-22 20:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.80304+05:30	\N	30.8	0.74	8.7	199	0	90	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-be3ecf7e2be9	open_meteo	12.87	74.88	2026-10-22 21:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.805546+05:30	\N	30.8	0.74	8.7	199	0	90	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-141513818d7f	open_meteo	12.87	74.88	2026-10-22 22:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.808568+05:30	\N	30.8	0.72	8.7	198	0.056	180	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-da95eb76070b	open_meteo	12.87	74.88	2026-10-22 23:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.816081+05:30	\N	30.7	0.72	8.7	198	0.056	180	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-6d4a0b91ec85	open_meteo	12.87	74.88	2026-10-23 00:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.82009+05:30	\N	30.7	0.72	8.75	198	0	90	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-0ff6dc2b46f1	open_meteo	12.87	74.88	2026-10-23 01:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.82309+05:30	\N	30.7	0.72	8.75	197	0	90	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-266c86f4d9e3	open_meteo	12.87	74.88	2026-10-23 02:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.826601+05:30	\N	30.6	0.72	8.8	197	0.056	0	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-a621a657af10	open_meteo	12.87	74.88	2026-10-23 03:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.829611+05:30	\N	30.6	0.72	8.85	197	0.056	0	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-afc633c6c8a7	open_meteo	12.87	74.88	2026-10-23 04:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.83361+05:30	\N	30.6	0.7	8.85	196	0.056	0	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-976a784866e6	open_meteo	12.87	74.88	2026-10-23 05:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.835612+05:30	\N	30.6	0.7	8.9	196	0.056	0	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-7007c62baf07	open_meteo	12.87	74.88	2026-10-23 06:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.839658+05:30	\N	30.6	0.68	8.95	196	0	90	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-2992b09691ff	open_meteo	12.87	74.88	2026-10-23 07:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.843659+05:30	\N	30.6	0.68	8.95	196	0.056	180	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-8b4412c136e8	open_meteo	12.87	74.88	2026-10-23 08:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.845655+05:30	\N	30.6	0.66	8.95	196	0.056	180	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-dc2581b9fbfc	open_meteo	12.87	74.88	2026-10-23 09:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.849175+05:30	\N	30.6	0.66	8.9	196	0.056	180	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-d225ecf4ada9	open_meteo	12.87	74.88	2026-10-23 10:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.853173+05:30	\N	30.7	0.66	8.85	195	0.083	135	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-28727479b4cb	open_meteo	12.87	74.88	2026-10-23 11:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.856173+05:30	\N	30.7	0.66	8.8	195	0.083	135	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-c4ebad1653d4	open_meteo	12.87	74.88	2026-10-23 12:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.859689+05:30	\N	30.7	0.66	8.7	194	0.056	180	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-c8377dee20ca	open_meteo	12.87	74.88	2026-10-23 13:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.863199+05:30	\N	30.7	0.66	8.6	194	0	90	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-92c6362d7b83	open_meteo	12.87	74.88	2026-10-23 14:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.866208+05:30	\N	30.8	0.66	8.55	193	0.056	0	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-fcfdb14ec610	open_meteo	12.87	74.88	2026-10-23 15:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.869723+05:30	\N	30.8	0.66	8.5	193	0.056	0	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-82c7de67e198	open_meteo	12.87	74.88	2026-10-23 16:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.872725+05:30	\N	30.8	0.66	8.5	193	0.111	0	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-aa0bd2b9d29e	open_meteo	12.87	74.88	2026-10-23 17:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.875726+05:30	\N	30.8	0.66	8.5	193	0.111	0	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-83f8930381b5	open_meteo	12.87	74.88	2026-10-23 18:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.879233+05:30	\N	30.8	0.66	8.55	193	0.056	0	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-80edb227f127	open_meteo	12.87	74.88	2026-10-23 19:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.882242+05:30	\N	30.8	0.64	8.65	193	0	90	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-7cae636991b0	open_meteo	12.87	74.88	2026-10-23 20:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.88624+05:30	\N	30.8	0.64	8.75	193	0	90	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-f2f57ae9a715	open_meteo	12.87	74.88	2026-10-23 21:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.88924+05:30	\N	30.7	0.64	8.85	193	0.056	180	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-967728ab9434	open_meteo	12.87	74.88	2026-10-23 22:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.892569+05:30	\N	30.7	0.62	8.9	194	0.056	180	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-787aa4284af1	open_meteo	12.87	74.88	2026-10-23 23:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.895802+05:30	\N	30.7	0.62	9	194	0.056	180	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-d0c40218ccae	open_meteo	12.87	74.88	2026-10-24 00:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.899121+05:30	\N	30.6	0.6	9.05	194	0	90	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-23f364085ee5	open_meteo	12.87	74.88	2026-10-24 01:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.902329+05:30	\N	30.6	0.6	9.15	194	0.056	270	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-e71c7b30f664	open_meteo	12.87	74.88	2026-10-24 02:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.905548+05:30	\N	30.6	0.58	9.2	194	0.083	315	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-973f3a00cdfa	open_meteo	12.87	74.88	2026-10-24 03:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.91912+05:30	\N	30.5	0.58	9.25	194	0.111	333	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-d7f59faa8ae9	open_meteo	12.87	74.88	2026-10-24 04:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:36:34.922685+05:30	\N	30.5	0.58	9.3	193	0.111	333	\N	\N	\N	{"data_nature": "numerical_model_forecast", "status": "live_query", "evidence_id": "ev-om-live-1388eab6b5"}
obs-400e48010a51	real_pg_verified_source	13	74.5	2026-10-15 13:30:00+05:30	\N	\N	\N	\N	\N	\N	2026-10-17 13:39:05.666767+05:30	\N	29.4	1.85	\N	\N	\N	\N	\N	\N	\N	{"forecast_run_time": "2026-10-15T06:00:00+00:00"}
\.


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: coastal_features coastal_features_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coastal_features
    ADD CONSTRAINT coastal_features_pkey PRIMARY KEY (id);


--
-- Name: data_sources data_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_sources
    ADD CONSTRAINT data_sources_pkey PRIMARY KEY (id);


--
-- Name: evidence_records evidence_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_records
    ADD CONSTRAINT evidence_records_pkey PRIMARY KEY (id);


--
-- Name: hazard_events hazard_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hazard_events
    ADD CONSTRAINT hazard_events_pkey PRIMARY KEY (id);


--
-- Name: hazard_tracks hazard_tracks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hazard_tracks
    ADD CONSTRAINT hazard_tracks_pkey PRIMARY KEY (id);


--
-- Name: investigation_events investigation_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investigation_events
    ADD CONSTRAINT investigation_events_pkey PRIMARY KEY (id);


--
-- Name: investigation_findings investigation_findings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investigation_findings
    ADD CONSTRAINT investigation_findings_pkey PRIMARY KEY (id);


--
-- Name: investigations investigations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investigations
    ADD CONSTRAINT investigations_pkey PRIMARY KEY (id);


--
-- Name: marine_observations marine_observations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marine_observations
    ADD CONSTRAINT marine_observations_pkey PRIMARY KEY (id);


--
-- Name: marine_observations uq_marine_obs_source_time_lat_lon; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marine_observations
    ADD CONSTRAINT uq_marine_obs_source_time_lat_lon UNIQUE (source_id, observation_time, latitude, longitude);


--
-- Name: idx_hazard_track_event_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hazard_track_event_time ON public.hazard_tracks USING btree (hazard_event_id, "timestamp");


--
-- Name: idx_investigation_events_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_investigation_events_order ON public.investigation_events USING btree (investigation_id, "timestamp");


--
-- Name: idx_marine_obs_loc_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marine_obs_loc_time ON public.marine_observations USING btree (latitude, longitude, observation_time);


--
-- Name: idx_marine_obs_var_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marine_obs_var_time ON public.marine_observations USING btree (variable, observation_time);


--
-- Name: ix_coastal_features_feature_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_coastal_features_feature_type ON public.coastal_features USING btree (feature_type);


--
-- Name: ix_data_sources_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_data_sources_name ON public.data_sources USING btree (name);


--
-- Name: ix_hazard_events_external_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_hazard_events_external_id ON public.hazard_events USING btree (external_id);


--
-- Name: ix_hazard_events_hazard_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_hazard_events_hazard_type ON public.hazard_events USING btree (hazard_type);


--
-- Name: ix_hazard_events_source_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_hazard_events_source_id ON public.hazard_events USING btree (source_id);


--
-- Name: ix_hazard_tracks_hazard_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_hazard_tracks_hazard_event_id ON public.hazard_tracks USING btree (hazard_event_id);


--
-- Name: ix_hazard_tracks_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_hazard_tracks_timestamp ON public.hazard_tracks USING btree ("timestamp");


--
-- Name: ix_investigation_events_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_investigation_events_event_type ON public.investigation_events USING btree (event_type);


--
-- Name: ix_investigation_events_investigation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_investigation_events_investigation_id ON public.investigation_events USING btree (investigation_id);


--
-- Name: ix_investigation_findings_agent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_investigation_findings_agent_id ON public.investigation_findings USING btree (agent_id);


--
-- Name: ix_investigation_findings_investigation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_investigation_findings_investigation_id ON public.investigation_findings USING btree (investigation_id);


--
-- Name: ix_investigations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_investigations_status ON public.investigations USING btree (status);


--
-- Name: ix_investigations_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_investigations_workspace ON public.investigations USING btree (workspace);


--
-- Name: ix_marine_observations_observation_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_marine_observations_observation_time ON public.marine_observations USING btree (observation_time);


--
-- Name: ix_marine_observations_source_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_marine_observations_source_id ON public.marine_observations USING btree (source_id);


--
-- Name: ix_marine_observations_variable; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_marine_observations_variable ON public.marine_observations USING btree (variable);


--
-- Name: coastal_features coastal_features_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coastal_features
    ADD CONSTRAINT coastal_features_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.data_sources(id);


--
-- Name: evidence_records evidence_records_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_records
    ADD CONSTRAINT evidence_records_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.data_sources(id);


--
-- Name: hazard_events hazard_events_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hazard_events
    ADD CONSTRAINT hazard_events_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.data_sources(id);


--
-- Name: hazard_tracks hazard_tracks_hazard_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hazard_tracks
    ADD CONSTRAINT hazard_tracks_hazard_event_id_fkey FOREIGN KEY (hazard_event_id) REFERENCES public.hazard_events(id);


--
-- Name: investigation_events investigation_events_investigation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investigation_events
    ADD CONSTRAINT investigation_events_investigation_id_fkey FOREIGN KEY (investigation_id) REFERENCES public.investigations(id);


--
-- Name: investigation_findings investigation_findings_investigation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investigation_findings
    ADD CONSTRAINT investigation_findings_investigation_id_fkey FOREIGN KEY (investigation_id) REFERENCES public.investigations(id);


--
-- Name: marine_observations marine_observations_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marine_observations
    ADD CONSTRAINT marine_observations_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.data_sources(id);


--
-- PostgreSQL database dump complete
--

\unrestrict yuligkD7aLGFrXpg9Lk97nsbjh5bsdLzfCs8AKd0jTHc4S8F3CCmhfdyl1Wulpo

