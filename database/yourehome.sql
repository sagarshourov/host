--
-- PostgreSQL database dump
--

-- Dumped from database version 17.6 (Debian 17.6-1.pgdg12+1)
-- Dumped by pg_dump version 17.5

-- Started on 2025-08-28 21:24:14 +06

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

--
-- TOC entry 5 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: sagarroy
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO sagarroy;

--
-- TOC entry 242 (class 1255 OID 16571)
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: sagarroy
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO sagarroy;

--
-- TOC entry 229 (class 1259 OID 16561)
-- Name: active_listings; Type: VIEW; Schema: public; Owner: sagarroy
--

CREATE VIEW public.active_listings AS
SELECT
    NULL::integer AS id,
    NULL::integer AS seller_id,
    NULL::character varying(255) AS street_address,
    NULL::character varying(100) AS city,
    NULL::character varying(2) AS state,
    NULL::character varying(10) AS zip_code,
    NULL::character varying(50) AS property_type,
    NULL::integer AS bedrooms,
    NULL::numeric(3,1) AS bathrooms,
    NULL::integer AS square_feet,
    NULL::numeric(10,2) AS lot_size,
    NULL::integer AS year_built,
    NULL::numeric(12,2) AS list_price,
    NULL::numeric(12,2) AS minimum_offer,
    NULL::numeric(10,2) AS property_tax_annual,
    NULL::numeric(8,2) AS hoa_fees_monthly,
    NULL::numeric(12,2) AS assessment_value,
    NULL::integer AS roof_year,
    NULL::character varying(100) AS roof_material,
    NULL::integer AS hvac_install_year,
    NULL::character varying(100) AS hvac_type,
    NULL::date AS hvac_last_service,
    NULL::integer AS water_heater_year,
    NULL::character varying(50) AS water_heater_type,
    NULL::boolean AS has_septic,
    NULL::character varying(100) AS septic_type,
    NULL::date AS septic_last_pumped,
    NULL::boolean AS has_solar,
    NULL::character varying(50) AS solar_type,
    NULL::integer AS solar_install_year,
    NULL::numeric(10,2) AS solar_monthly_savings,
    NULL::character varying(50) AS property_condition,
    NULL::text AS major_repairs_needed,
    NULL::text AS recent_renovations,
    NULL::integer AS electrical_panel_year,
    NULL::integer AS plumbing_updated_year,
    NULL::integer AS windows_replaced_year,
    NULL::integer AS garage_spaces,
    NULL::boolean AS has_pool,
    NULL::boolean AS has_fireplace,
    NULL::boolean AS has_deck,
    NULL::boolean AS has_basement,
    NULL::boolean AS basement_finished,
    NULL::boolean AS home_warranty_included,
    NULL::text AS warranties_transferable,
    NULL::text AS description,
    NULL::character varying(500) AS virtual_tour_url,
    NULL::boolean AS allow_messages,
    NULL::integer AS minimum_offer_percent,
    NULL::character varying(20) AS status,
    NULL::timestamp without time zone AS listed_date,
    NULL::timestamp without time zone AS sold_date,
    NULL::numeric(12,2) AS sold_price,
    NULL::integer AS view_count,
    NULL::integer AS save_count,
    NULL::timestamp without time zone AS created_at,
    NULL::timestamp without time zone AS updated_at,
    NULL::character varying(100) AS seller_first_name,
    NULL::character varying(100) AS seller_last_name,
    NULL::character varying(255) AS seller_email,
    NULL::character varying(20) AS seller_phone,
    NULL::bigint AS offer_count,
    NULL::numeric AS highest_offer;


ALTER VIEW public.active_listings OWNER TO sagarroy;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 224 (class 1259 OID 16478)
-- Name: messages; Type: TABLE; Schema: public; Owner: sagarroy
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    sender_id integer,
    recipient_id integer,
    property_id integer,
    offer_id integer,
    subject character varying(255),
    message_body text NOT NULL,
    is_read boolean DEFAULT false,
    read_at timestamp without time zone,
    parent_message_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.messages OWNER TO sagarroy;

--
-- TOC entry 223 (class 1259 OID 16477)
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: sagarroy
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.messages_id_seq OWNER TO sagarroy;

--
-- TOC entry 3501 (class 0 OID 0)
-- Dependencies: 223
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sagarroy
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- TOC entry 222 (class 1259 OID 16450)
-- Name: offers; Type: TABLE; Schema: public; Owner: sagarroy
--

CREATE TABLE public.offers (
    id integer NOT NULL,
    property_id integer,
    buyer_id integer,
    offer_amount numeric(12,2) NOT NULL,
    offer_type character varying(50) DEFAULT 'standard'::character varying,
    financing_type character varying(50),
    down_payment_percent numeric(5,2),
    inspection_contingency boolean DEFAULT true,
    financing_contingency boolean DEFAULT true,
    appraisal_contingency boolean DEFAULT true,
    sale_contingency boolean DEFAULT false,
    contingency_details text,
    proposed_closing_date date,
    offer_expires timestamp without time zone,
    buyer_message text,
    status character varying(20) DEFAULT 'pending'::character varying,
    counter_amount numeric(12,2),
    counter_message text,
    counter_date timestamp without time zone,
    accepted_date timestamp without time zone,
    rejected_date timestamp without time zone,
    rejection_reason text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT offers_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'rejected'::character varying, 'countered'::character varying, 'withdrawn'::character varying, 'expired'::character varying])::text[])))
);


ALTER TABLE public.offers OWNER TO sagarroy;

--
-- TOC entry 221 (class 1259 OID 16449)
-- Name: offers_id_seq; Type: SEQUENCE; Schema: public; Owner: sagarroy
--

CREATE SEQUENCE public.offers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.offers_id_seq OWNER TO sagarroy;

--
-- TOC entry 3502 (class 0 OID 0)
-- Dependencies: 221
-- Name: offers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sagarroy
--

ALTER SEQUENCE public.offers_id_seq OWNED BY public.offers.id;


--
-- TOC entry 220 (class 1259 OID 16417)
-- Name: properties; Type: TABLE; Schema: public; Owner: sagarroy
--

CREATE TABLE public.properties (
    id integer NOT NULL,
    seller_id integer,
    street_address character varying(255) NOT NULL,
    city character varying(100) NOT NULL,
    state character varying(2) NOT NULL,
    zip_code character varying(10) NOT NULL,
    property_type character varying(50) NOT NULL,
    bedrooms integer NOT NULL,
    bathrooms numeric(3,1) NOT NULL,
    square_feet integer NOT NULL,
    lot_size numeric(10,2),
    year_built integer,
    list_price numeric(12,2) NOT NULL,
    minimum_offer numeric(12,2),
    property_tax_annual numeric(10,2),
    hoa_fees_monthly numeric(8,2),
    assessment_value numeric(12,2),
    roof_year integer,
    roof_material character varying(100),
    hvac_install_year integer,
    hvac_type character varying(100),
    hvac_last_service date,
    water_heater_year integer,
    water_heater_type character varying(50),
    has_septic boolean DEFAULT false,
    septic_type character varying(100),
    septic_last_pumped date,
    has_solar boolean DEFAULT false,
    solar_type character varying(50),
    solar_install_year integer,
    solar_monthly_savings numeric(10,2),
    property_condition character varying(50) DEFAULT 'move-in-ready'::character varying,
    major_repairs_needed text,
    recent_renovations text,
    electrical_panel_year integer,
    plumbing_updated_year integer,
    windows_replaced_year integer,
    garage_spaces integer DEFAULT 0,
    has_pool boolean DEFAULT false,
    has_fireplace boolean DEFAULT false,
    has_deck boolean DEFAULT false,
    has_basement boolean DEFAULT false,
    basement_finished boolean DEFAULT false,
    home_warranty_included boolean DEFAULT false,
    warranties_transferable text,
    description text,
    virtual_tour_url character varying(500),
    allow_messages boolean DEFAULT true,
    minimum_offer_percent integer DEFAULT 50,
    status character varying(20) DEFAULT 'active'::character varying,
    listed_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    sold_date timestamp without time zone,
    sold_price numeric(12,2),
    view_count integer DEFAULT 0,
    save_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT properties_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'active'::character varying, 'pending'::character varying, 'sold'::character varying, 'paused'::character varying, 'expired'::character varying])::text[])))
);


ALTER TABLE public.properties OWNER TO sagarroy;

--
-- TOC entry 219 (class 1259 OID 16416)
-- Name: properties_id_seq; Type: SEQUENCE; Schema: public; Owner: sagarroy
--

CREATE SEQUENCE public.properties_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.properties_id_seq OWNER TO sagarroy;

--
-- TOC entry 3503 (class 0 OID 0)
-- Dependencies: 219
-- Name: properties_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sagarroy
--

ALTER SEQUENCE public.properties_id_seq OWNED BY public.properties.id;


--
-- TOC entry 230 (class 1259 OID 16566)
-- Name: properties_with_system_status; Type: VIEW; Schema: public; Owner: sagarroy
--

CREATE VIEW public.properties_with_system_status AS
 SELECT id,
    seller_id,
    street_address,
    city,
    state,
    zip_code,
    property_type,
    bedrooms,
    bathrooms,
    square_feet,
    lot_size,
    year_built,
    list_price,
    minimum_offer,
    property_tax_annual,
    hoa_fees_monthly,
    assessment_value,
    roof_year,
    roof_material,
    hvac_install_year,
    hvac_type,
    hvac_last_service,
    water_heater_year,
    water_heater_type,
    has_septic,
    septic_type,
    septic_last_pumped,
    has_solar,
    solar_type,
    solar_install_year,
    solar_monthly_savings,
    property_condition,
    major_repairs_needed,
    recent_renovations,
    electrical_panel_year,
    plumbing_updated_year,
    windows_replaced_year,
    garage_spaces,
    has_pool,
    has_fireplace,
    has_deck,
    has_basement,
    basement_finished,
    home_warranty_included,
    warranties_transferable,
    description,
    virtual_tour_url,
    allow_messages,
    minimum_offer_percent,
    status,
    listed_date,
    sold_date,
    sold_price,
    view_count,
    save_count,
    created_at,
    updated_at,
    (EXTRACT(year FROM CURRENT_DATE) - (roof_year)::numeric) AS roof_age,
    (EXTRACT(year FROM CURRENT_DATE) - (hvac_install_year)::numeric) AS hvac_age,
    (EXTRACT(year FROM CURRENT_DATE) - (water_heater_year)::numeric) AS water_heater_age,
    (EXTRACT(year FROM CURRENT_DATE) - (solar_install_year)::numeric) AS solar_age,
        CASE
            WHEN ((roof_year)::numeric < (EXTRACT(year FROM CURRENT_DATE) - (20)::numeric)) THEN 'needs_replacement'::text
            WHEN ((roof_year)::numeric < (EXTRACT(year FROM CURRENT_DATE) - (15)::numeric)) THEN 'aging'::text
            ELSE 'good'::text
        END AS roof_status,
        CASE
            WHEN ((hvac_install_year)::numeric < (EXTRACT(year FROM CURRENT_DATE) - (15)::numeric)) THEN 'needs_replacement'::text
            WHEN ((hvac_install_year)::numeric < (EXTRACT(year FROM CURRENT_DATE) - (10)::numeric)) THEN 'aging'::text
            ELSE 'good'::text
        END AS hvac_status,
        CASE
            WHEN ((water_heater_year)::numeric < (EXTRACT(year FROM CURRENT_DATE) - (12)::numeric)) THEN 'needs_replacement'::text
            WHEN ((water_heater_year)::numeric < (EXTRACT(year FROM CURRENT_DATE) - (8)::numeric)) THEN 'aging'::text
            ELSE 'good'::text
        END AS water_heater_status
   FROM public.properties p;


ALTER VIEW public.properties_with_system_status OWNER TO sagarroy;

--
-- TOC entry 226 (class 1259 OID 16514)
-- Name: property_photos; Type: TABLE; Schema: public; Owner: sagarroy
--

CREATE TABLE public.property_photos (
    id integer NOT NULL,
    property_id integer,
    photo_url character varying(500) NOT NULL,
    photo_order integer DEFAULT 0,
    is_main boolean DEFAULT false,
    caption character varying(255),
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.property_photos OWNER TO sagarroy;

--
-- TOC entry 225 (class 1259 OID 16513)
-- Name: property_photos_id_seq; Type: SEQUENCE; Schema: public; Owner: sagarroy
--

CREATE SEQUENCE public.property_photos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.property_photos_id_seq OWNER TO sagarroy;

--
-- TOC entry 3504 (class 0 OID 0)
-- Dependencies: 225
-- Name: property_photos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sagarroy
--

ALTER SEQUENCE public.property_photos_id_seq OWNED BY public.property_photos.id;


--
-- TOC entry 228 (class 1259 OID 16531)
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: sagarroy
--

CREATE TABLE public.user_sessions (
    id integer NOT NULL,
    user_id integer,
    session_token character varying(255) NOT NULL,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone NOT NULL,
    is_valid boolean DEFAULT true
);


ALTER TABLE public.user_sessions OWNER TO sagarroy;

--
-- TOC entry 227 (class 1259 OID 16530)
-- Name: user_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: sagarroy
--

CREATE SEQUENCE public.user_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_sessions_id_seq OWNER TO sagarroy;

--
-- TOC entry 3505 (class 0 OID 0)
-- Dependencies: 227
-- Name: user_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sagarroy
--

ALTER SEQUENCE public.user_sessions_id_seq OWNED BY public.user_sessions.id;


--
-- TOC entry 218 (class 1259 OID 16400)
-- Name: users; Type: TABLE; Schema: public; Owner: sagarroy
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    phone character varying(20),
    user_type character varying(20) NOT NULL,
    is_pre_approved boolean DEFAULT false,
    pre_approval_amount numeric(12,2),
    pre_approval_expires date,
    credit_score_range character varying(20),
    email_verified boolean DEFAULT false,
    verification_token character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_login timestamp without time zone,
    is_active boolean DEFAULT true,
    CONSTRAINT users_user_type_check CHECK (((user_type)::text = ANY ((ARRAY['buyer'::character varying, 'seller'::character varying, 'both'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO sagarroy;

--
-- TOC entry 217 (class 1259 OID 16399)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: sagarroy
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO sagarroy;

--
-- TOC entry 3506 (class 0 OID 0)
-- Dependencies: 217
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sagarroy
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 3282 (class 2604 OID 16481)
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- TOC entry 3273 (class 2604 OID 16453)
-- Name: offers id; Type: DEFAULT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.offers ALTER COLUMN id SET DEFAULT nextval('public.offers_id_seq'::regclass);


--
-- TOC entry 3254 (class 2604 OID 16420)
-- Name: properties id; Type: DEFAULT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.properties ALTER COLUMN id SET DEFAULT nextval('public.properties_id_seq'::regclass);


--
-- TOC entry 3285 (class 2604 OID 16517)
-- Name: property_photos id; Type: DEFAULT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.property_photos ALTER COLUMN id SET DEFAULT nextval('public.property_photos_id_seq'::regclass);


--
-- TOC entry 3289 (class 2604 OID 16534)
-- Name: user_sessions id; Type: DEFAULT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.user_sessions ALTER COLUMN id SET DEFAULT nextval('public.user_sessions_id_seq'::regclass);


--
-- TOC entry 3248 (class 2604 OID 16403)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 3491 (class 0 OID 16478)
-- Dependencies: 224
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: sagarroy
--

COPY public.messages (id, sender_id, recipient_id, property_id, offer_id, subject, message_body, is_read, read_at, parent_message_id, created_at) FROM stdin;
\.


--
-- TOC entry 3489 (class 0 OID 16450)
-- Dependencies: 222
-- Data for Name: offers; Type: TABLE DATA; Schema: public; Owner: sagarroy
--

COPY public.offers (id, property_id, buyer_id, offer_amount, offer_type, financing_type, down_payment_percent, inspection_contingency, financing_contingency, appraisal_contingency, sale_contingency, contingency_details, proposed_closing_date, offer_expires, buyer_message, status, counter_amount, counter_message, counter_date, accepted_date, rejected_date, rejection_reason, created_at, updated_at) FROM stdin;
1	7	9	250000.00	standard	conventional	20.00	t	t	t	f	Buyer requests minor repairs before closing.	2025-09-30	2025-09-01 17:00:00	We are very interested in this property and can close quickly.	pending	\N	\N	\N	\N	\N	\N	2025-08-24 05:08:42.440325	2025-08-24 05:08:42.440325
2	7	9	250000.00	standard	conventional	20.00	t	t	t	f	Buyer requests minor repairs before closing.	2025-09-30	2025-09-01 17:00:00	We are very interested in this property and can close quickly.	pending	\N	\N	\N	\N	\N	\N	2025-08-24 05:16:57.315881	2025-08-24 05:16:57.315881
3	7	9	250000.00	standard	conventional	20.00	t	t	t	f	Buyer requests minor repairs before closing.	2025-09-30	2025-09-01 17:00:00	We are very interested in this property and can close quickly.	pending	\N	\N	\N	\N	\N	\N	2025-08-24 05:17:32.933802	2025-08-24 05:17:32.933802
\.


--
-- TOC entry 3487 (class 0 OID 16417)
-- Dependencies: 220
-- Data for Name: properties; Type: TABLE DATA; Schema: public; Owner: sagarroy
--

COPY public.properties (id, seller_id, street_address, city, state, zip_code, property_type, bedrooms, bathrooms, square_feet, lot_size, year_built, list_price, minimum_offer, property_tax_annual, hoa_fees_monthly, assessment_value, roof_year, roof_material, hvac_install_year, hvac_type, hvac_last_service, water_heater_year, water_heater_type, has_septic, septic_type, septic_last_pumped, has_solar, solar_type, solar_install_year, solar_monthly_savings, property_condition, major_repairs_needed, recent_renovations, electrical_panel_year, plumbing_updated_year, windows_replaced_year, garage_spaces, has_pool, has_fireplace, has_deck, has_basement, basement_finished, home_warranty_included, warranties_transferable, description, virtual_tour_url, allow_messages, minimum_offer_percent, status, listed_date, sold_date, sold_price, view_count, save_count, created_at, updated_at) FROM stdin;
1	3	1080 Winslow Ave	khulna	NJ	0484	house	1	1.0	1850	0.25	2020	254545.00	4500.00	12400.00	\N	\N	2025	Slate	2025	Central Air	\N	2025	\N	t	\N	\N	t	\N	\N	\N	move-in-ready	asda	\N	\N	\N	\N	0	f	f	f	f	f	f	\N	Welcome to this stunning 1-bedroom, 1-bathroom home featuring 1850 square feet of beautifully designed living space. Enjoy breathtaking ocean views from multiple rooms throughout the home. The private pool and outdoor space create the perfect setting for entertaining and relaxation. Convenient parking and storage are provided with the attached garage. This property offers an exceptional opportunity for comfortable living in a desirable location. Schedule your private tour today to experience all this home has to offer.	\N	f	50	active	2025-08-24 03:48:44.483173	\N	\N	0	0	2025-08-24 03:48:44.483173	2025-08-24 03:48:44.483173
2	3	1080 Winslow Ave	asd	NJ	084	house	3	2.5	1850	0.25	2020	323750.00	307563.00	12400.00	\N	\N	2025	Tile	2025	Heat Pump	\N	2025	Tankless	t	\N	\N	t	\N	\N	\N	move-in-ready	jgu g	\N	\N	\N	\N	0	f	f	f	f	f	f	\N	Welcome to this stunning 3-bedroom, 2.5-bathroom home featuring 1850 square feet of beautifully designed living space. Enjoy breathtaking ocean views from multiple rooms throughout the home. The private pool and outdoor space create the perfect setting for entertaining and relaxation. Convenient parking and storage are provided with the attached garage. This property offers an exceptional opportunity for comfortable living in a desirable location. Schedule your private tour today to experience all this home has to offer.	\N	f	50	active	2025-08-24 04:02:31.540957	\N	\N	0	0	2025-08-24 04:02:31.540957	2025-08-24 04:02:31.540957
3	3	1080 Winslow Ave	asd	NJ	084	house	3	2.5	1850	0.25	2020	323750.00	307563.00	12400.00	\N	\N	2025	Tile	2025	Heat Pump	\N	2025	Tankless	t	\N	\N	t	\N	\N	\N	move-in-ready	jgu g	\N	\N	\N	\N	0	f	f	f	f	f	f	\N	Welcome to this stunning 3-bedroom, 2.5-bathroom home featuring 1850 square feet of beautifully designed living space. Enjoy breathtaking ocean views from multiple rooms throughout the home. The private pool and outdoor space create the perfect setting for entertaining and relaxation. Convenient parking and storage are provided with the attached garage. This property offers an exceptional opportunity for comfortable living in a desirable location. Schedule your private tour today to experience all this home has to offer.	\N	f	50	active	2025-08-24 04:05:18.521226	\N	\N	0	0	2025-08-24 04:05:18.521226	2025-08-24 04:05:18.521226
4	3	1080 Winslow Ave	asd	NJ	084	house	3	2.5	1850	0.25	2020	323750.00	307563.00	12400.00	\N	\N	2025	Tile	2025	Heat Pump	\N	2025	Tankless	t	\N	\N	t	\N	\N	\N	move-in-ready	jgu g	\N	\N	\N	\N	0	f	f	f	f	f	f	\N	Welcome to this stunning 3-bedroom, 2.5-bathroom home featuring 1850 square feet of beautifully designed living space. Enjoy breathtaking ocean views from multiple rooms throughout the home. The private pool and outdoor space create the perfect setting for entertaining and relaxation. Convenient parking and storage are provided with the attached garage. This property offers an exceptional opportunity for comfortable living in a desirable location. Schedule your private tour today to experience all this home has to offer.	\N	f	50	active	2025-08-24 04:05:26.404752	\N	\N	0	0	2025-08-24 04:05:26.404752	2025-08-24 04:05:26.404752
5	3	1080 Winslow Ave	asd	NJ	084	house	3	2.5	1850	0.25	2020	323750.00	307563.00	12400.00	\N	\N	2025	Tile	2025	Heat Pump	\N	2025	Tankless	t	\N	\N	t	\N	\N	\N	move-in-ready	jgu g	\N	\N	\N	\N	0	f	f	f	f	f	f	\N	Welcome to this stunning 3-bedroom, 2.5-bathroom home featuring 1850 square feet of beautifully designed living space. Enjoy breathtaking ocean views from multiple rooms throughout the home. The private pool and outdoor space create the perfect setting for entertaining and relaxation. Convenient parking and storage are provided with the attached garage. This property offers an exceptional opportunity for comfortable living in a desirable location. Schedule your private tour today to experience all this home has to offer.	\N	f	50	active	2025-08-24 04:08:09.221393	\N	\N	0	0	2025-08-24 04:08:09.221393	2025-08-24 04:08:09.221393
6	3	1080 Winslow Ave	asd	NJ	0841	condo	1	2.0	1850	0.25	2020	247669.00	235286.00	12400.00	\N	\N	2025	Tile	2025	Window Units	\N	2025	\N	t	\N	\N	t	\N	\N	\N	move-in-ready	asd	\N	\N	\N	\N	0	f	f	f	f	f	f	\N	Discover urban living at its finest in this elegant 1-bedroom, 2-bathroom condominium spanning 1850 square feet. Enjoy breathtaking ocean views from multiple rooms throughout the home. The private pool and outdoor space create the perfect setting for entertaining and relaxation. Convenient parking and storage are provided with the attached garage. Cozy up by the fireplace during cooler evenings. This property offers an exceptional opportunity for comfortable living in a desirable location. Schedule your private tour today to experience all this home has to offer.	\N	f	50	active	2025-08-24 04:25:10.445555	\N	\N	0	0	2025-08-24 04:25:10.445555	2025-08-24 04:25:10.445555
7	9	1080 Winslow Ave	city	NJ	0484	house	1	1.5	1850	0.25	2020	281663.00	267580.00	12400.00	25.00	\N	2025	Tile	2025	Forced Air	\N	2025	Tankless	t	\N	\N	t	\N	\N	\N	as-is	asda	\N	\N	\N	\N	0	f	f	f	f	f	f	\N	Welcome to this stunning 1-bedroom, 1.5-bathroom home featuring 1850 square feet of beautifully designed living space. Enjoy breathtaking ocean views from multiple rooms throughout the home. The private pool and outdoor space create the perfect setting for entertaining and relaxation. Convenient parking and storage are provided with the attached garage. Cozy up by the fireplace during cooler evenings. This property offers an exceptional opportunity for comfortable living in a desirable location. Schedule your private tour today to experience all this home has to offer.	\N	f	50	active	2025-08-24 05:00:47.108293	\N	\N	0	0	2025-08-24 05:00:47.108293	2025-08-24 05:00:47.108293
8	11	516 North Victoria Avenue	Ventnor City	NJ	08406	house	2	1.5	18550	\N	2020	2986550.00	2837223.00	12000.00	\N	\N	2025	Asphalt Shingle	2025	Central Air	\N	2025	Tankless	f	\N	\N	f	\N	\N	\N	move-in-ready	\N	\N	\N	\N	\N	0	f	f	f	f	f	f	\N	Welcome to this stunning 2-bedroom, 1.5-bathroom home featuring 18550 square feet of beautifully designed living space. This property offers an exceptional opportunity for comfortable living in a desirable location. Schedule your private tour today to experience all this home has to offer.	\N	f	50	active	2025-08-25 15:23:06.216462	\N	\N	0	0	2025-08-25 15:23:06.216462	2025-08-25 15:23:06.216462
9	10	123	khulna	PA	08401	condo	2	1.5	1850	0.25	2020	253173.00	240514.00	12400.00	\N	\N	2025	Tile	2025	Heat Pump	\N	2025	Tankless	t	\N	\N	t	\N	\N	\N	move-in-ready	asd	\N	\N	\N	\N	0	f	f	f	f	f	f	\N	Discover urban living at its finest in this elegant 2-bedroom, 1.5-bathroom condominium spanning 1850 square feet. The private pool and outdoor space create the perfect setting for entertaining and relaxation. Convenient parking and storage are provided with the attached garage. Cozy up by the fireplace during cooler evenings. This property offers an exceptional opportunity for comfortable living in a desirable location. Schedule your private tour today to experience all this home has to offer.	\N	f	50	active	2025-08-25 15:55:03.359605	\N	\N	0	0	2025-08-25 15:55:03.359605	2025-08-25 15:55:03.359605
10	3	1080 Winslow Ave	khulna	NJ	9280	condo	3	2.0	1850	0.25	2020	275188.00	261429.00	12400.00	12.00	\N	2025	Tile	2025	Forced Air	\N	2025	Tankless	t	\N	\N	t	\N	\N	\N	move-in-ready	sfs	\N	\N	\N	\N	0	f	f	f	f	f	f	\N	Discover urban living at its finest in this elegant 3-bedroom, 2-bathroom condominium spanning 1850 square feet. Enjoy breathtaking ocean views from multiple rooms throughout the home. The private pool and outdoor space create the perfect setting for entertaining and relaxation. Convenient parking and storage are provided with the attached garage. Cozy up by the fireplace during cooler evenings. This property offers an exceptional opportunity for comfortable living in a desirable location. Schedule your private tour today to experience all this home has to offer.	\N	f	50	active	2025-08-26 15:03:47.789726	\N	\N	0	0	2025-08-26 15:03:47.789726	2025-08-26 15:03:47.789726
11	3	1080 Winslow Ave	khulna	NJ	9280	multi-family	4	2.0	1850	0.25	2020	339938.00	322941.00	12400.00	150.00	\N	2025	Slate	2025	Baseboard	\N	2025	Tankless	t	\N	\N	t	\N	\N	\N	as-is	asdaa	\N	\N	\N	\N	0	f	f	f	f	f	f	\N	Welcome to this stunning 4-bedroom, 2-bathroom home featuring 1850 square feet of beautifully designed living space. Enjoy breathtaking ocean views from multiple rooms throughout the home. The private pool and outdoor space create the perfect setting for entertaining and relaxation. Convenient parking and storage are provided with the attached garage. Cozy up by the fireplace during cooler evenings. This property offers an exceptional opportunity for comfortable living in a desirable location. Schedule your private tour today to experience all this home has to offer.	\N	f	50	active	2025-08-26 17:42:54.270611	\N	\N	0	0	2025-08-26 17:42:54.270611	2025-08-26 17:42:54.270611
\.


--
-- TOC entry 3493 (class 0 OID 16514)
-- Dependencies: 226
-- Data for Name: property_photos; Type: TABLE DATA; Schema: public; Owner: sagarroy
--

COPY public.property_photos (id, property_id, photo_url, photo_order, is_main, caption, uploaded_at) FROM stdin;
1	10	uploads/photos-1756220596334-127141153.jpg	1	t	\N	2025-08-26 15:03:47.798445
2	11	uploads/photos-1756230137305-792796470.jpg	1	t	\N	2025-08-26 17:42:54.284817
3	11	uploads/photos-1756230137367-491106665.jpg	2	f	\N	2025-08-26 17:42:54.293425
4	11	uploads/photos-1756230137363-840737511.jpeg	3	f	\N	2025-08-26 17:42:54.295652
5	11	uploads/photos-1756230137358-457978280.jpg	4	f	\N	2025-08-26 17:42:54.298568
6	11	uploads/photos-1756230137369-330778338.jpg	5	f	\N	2025-08-26 17:42:54.300767
7	11	uploads/photos-1756230137364-898455055.jpg	6	f	\N	2025-08-26 17:42:54.303222
8	11	uploads/photos-1756230137300-988737681.jpg	7	f	\N	2025-08-26 17:42:54.307896
9	11	uploads/photos-1756230137825-772791138.jpg	8	f	\N	2025-08-26 17:42:54.310085
\.


--
-- TOC entry 3495 (class 0 OID 16531)
-- Dependencies: 228
-- Data for Name: user_sessions; Type: TABLE DATA; Schema: public; Owner: sagarroy
--

COPY public.user_sessions (id, user_id, session_token, ip_address, user_agent, created_at, expires_at, is_valid) FROM stdin;
1	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInRpbWVzdGFtcCI6MTc1NTg4NDM4NTAwNCwiaWF0IjoxNzU1ODg0Mzg1LCJleHAiOjE3NTg0NzYzODV9.1EltdI5sX_7TeqzdHdBOo1eqVvK9MtKoeb_DENsd_MU	\N	\N	2025-08-22 17:39:45.008787	2025-09-21 17:39:45.008	t
10	5	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjUsInRpbWVzdGFtcCI6MTc1NTk2OTk4MDMwMSwiaWF0IjoxNzU1OTY5OTgwLCJleHAiOjE3NTg1NjE5ODB9.D_nAk3qnRWGV8Ssl5NwUmRkK3QBSrMSudByqzLifxMg	\N	\N	2025-08-23 17:26:20.305219	2025-09-22 17:26:20.302	t
20	2	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIsInRpbWVzdGFtcCI6MTc1NjAwNTU1OTE0OSwiaWF0IjoxNzU2MDA1NTU5LCJleHAiOjE3NTg1OTc1NTl9._S9jMkPBbwBGC9Mwqkd7DMKxRbAQMKv5-33RA-UOSsw	\N	\N	2025-08-24 03:19:19.153341	2025-09-23 03:19:19.152	t
29	6	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjYsInRpbWVzdGFtcCI6MTc1NjAxMDc3NzE3MywiaWF0IjoxNzU2MDEwNzc3LCJleHAiOjE3NTg2MDI3Nzd9.1YEmo-Bkg56eW0tPBme-mlYmx6QiQiJ8KIOT2kq8r4A	\N	\N	2025-08-24 04:46:17.173784	2025-09-23 04:46:17.174	t
30	7	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjcsInRpbWVzdGFtcCI6MTc1NjAxMDk0MjM1NCwiaWF0IjoxNzU2MDEwOTQyLCJleHAiOjE3NTg2MDI5NDJ9.ftVzVEX1XibksyXy44MXMrShkZ0lIm2tz74YIyc9f6A	\N	\N	2025-08-24 04:49:02.354092	2025-09-23 04:49:02.356	t
31	8	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjgsInRpbWVzdGFtcCI6MTc1NjAxMTI3NDg1OCwiaWF0IjoxNzU2MDExMjc0LCJleHAiOjE3NTg2MDMyNzR9.KyzbFejcO_GX9h0-m7BkQE1hgh-O-5faEMbLetBuKDY	\N	\N	2025-08-24 04:54:34.856559	2025-09-23 04:54:34.858	t
33	9	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjksInRpbWVzdGFtcCI6MTc1NjAxMTU2Njg4MCwiaWF0IjoxNzU2MDExNTY2LCJleHAiOjE3NTg2MDM1NjZ9.SVD20ZiZ7SfQc3pvc9amxXOG130QJ8QDYMKaH61WOaM	\N	\N	2025-08-24 04:59:26.963934	2025-09-23 04:59:26.88	t
39	4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjQsInRpbWVzdGFtcCI6MTc1NjAyODA0MDUxMSwiaWF0IjoxNzU2MDI4MDQwLCJleHAiOjE3NTg2MjAwNDB9.rTfVdaPNhvTdxdxvY9rZ4hTHKy5OuP6PYPNg8_Kz16E	\N	\N	2025-08-24 09:34:00.595764	2025-09-23 09:34:00.596	t
51	10	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEwLCJ0aW1lc3RhbXAiOjE3NTYwNTM3MDE5MzYsImlhdCI6MTc1NjA1MzcwMSwiZXhwIjoxNzU4NjQ1NzAxfQ.z_2EJzKlEVpMhV8aroA2qxbp9lbl1wK78KfEwW--Xvw	\N	\N	2025-08-24 16:41:41.95009	2025-09-23 16:41:41.943	t
53	11	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjExLCJ0aW1lc3RhbXAiOjE3NTYxMzUyNzA3NzAsImlhdCI6MTc1NjEzNTI3MCwiZXhwIjoxNzU4NzI3MjcwfQ.De2x5j9DBT1SzET4eEfIvApdL3y0kt36F3cDJB9IH3k	\N	\N	2025-08-25 15:21:10.777908	2025-09-24 15:21:10.776	t
56	3	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjMsInRpbWVzdGFtcCI6MTc1NjIyMDQzNzE3NCwiaWF0IjoxNzU2MjIwNDM3LCJleHAiOjE3NTg4MTI0Mzd9.kOfwW94O8RHyDdqZSxBS4JWnUlCdlEIDGHkkDqyoImI	\N	\N	2025-08-26 15:00:37.268081	2025-09-25 15:00:37.265	t
\.


--
-- TOC entry 3485 (class 0 OID 16400)
-- Dependencies: 218
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: sagarroy
--

COPY public.users (id, email, password_hash, first_name, last_name, phone, user_type, is_pre_approved, pre_approval_amount, pre_approval_expires, credit_score_range, email_verified, verification_token, created_at, updated_at, last_login, is_active) FROM stdin;
1	sagar@gmail.com	$2a$12$pZkeasewoqPLEJcJOEJqDeZ.xbQEygUU1tMcztnT7wESzgslOW5AK	sagar	roy	01917177562	both	f	\N	\N	\N	t	\N	2025-08-22 17:39:45.001242	2025-08-22 17:39:45.001242	\N	t
2	sagarbd2@gmail.com	$2a$12$7qHHJZccc8OwRdUn3ohHI.9YMp7pMOwLdvwn6NNLivzw.nEQ9bdqS	sagar	roy	01917177562	both	f	\N	\N	\N	t	\N	2025-08-23 01:24:11.581119	2025-08-23 01:24:11.581119	\N	t
3	sagarbd28@gmail.com	$2a$12$WshGBNaz7x35jySHJpzx3e4s9a1lmjCVUlB6k.6b6171JEaFTSIgi	sagar	roy	01750055946	seller	f	\N	\N	\N	t	\N	2025-08-23 16:48:59.227648	2025-08-23 16:48:59.227648	\N	t
4	sagar2@gmail.com	$2a$12$3XcReHUfiqXZW0s/rOk/SeeYBwsX76astOJOCWJzV4BW3leVyrulu	sagar	roy	01917177562	both	f	\N	\N	\N	t	\N	2025-08-23 17:24:17.792946	2025-08-23 17:24:17.792946	\N	t
5	sagar21@gmail.com	$2a$12$mKx5UhLhkdLaPjkAvgIhS.OxFtMAfzdunlISvV/jCcJkDFPL4ZjvW	sagar	roy	01917177562	both	f	\N	\N	\N	t	\N	2025-08-23 17:26:20.30037	2025-08-23 17:26:20.30037	\N	t
6	onyroy@gmail.com	$2a$12$6y2v/hw2SbClhBzqDENo1OGvD5UA5aePlSiD/34hjm.MiZQU/5oWS	ony	roy	01917177562	both	f	\N	\N	\N	t	\N	2025-08-24 04:46:17.163411	2025-08-24 04:46:17.163411	\N	t
7	sagarbssltd@gmail.com	$2a$12$J/FxAPVMJcd0lbWLwqUb0OxMjfThAoS2TejyAeTowq0/e3912kUMC	sagar3	roy	0191717756207	both	f	\N	\N	\N	t	\N	2025-08-24 04:49:02.349155	2025-08-24 04:49:02.349155	\N	t
8	sagarbd30@gmail.com	$2a$12$TXr9eErSytdHBUJIcjbpDuTRuR69JzAQuGRP8Eox7LJB14etb9ndW	sagar	roy	01917177562	both	f	\N	\N	\N	t	\N	2025-08-24 04:54:34.849915	2025-08-24 04:54:34.849915	\N	t
9	sagarbd32@gmail.com	$2a$12$Izhij/pfwIAWY0qPJvIcwO9RJXvDfYmBr9f1I9RG8EL8qwEgAvJUu	sagar	roy	01917177562	both	f	\N	\N	\N	t	\N	2025-08-24 04:59:26.877594	2025-08-24 04:59:26.877594	\N	t
10	sagarshourov@gmail.com	$2a$12$xVdBGaPzXJFsllI046gpNOtCT/u2puNZ98ZYn1Z5FfBuwIQTzL2ii	sagar	roy	01917177562	both	f	\N	\N	\N	t	\N	2025-08-24 16:19:20.948444	2025-08-24 16:19:20.948444	\N	t
11	dicerbomatt@gmail.com	$2a$12$094Pmlpr79UvUE00diLlS.9RxWD2QyrggUw.Y.XdnVq.0zapwllVa	Matthew	DiCerbo	6095138654	both	f	\N	\N	\N	t	\N	2025-08-24 16:45:51.453783	2025-08-24 16:45:51.453783	\N	t
\.


--
-- TOC entry 3507 (class 0 OID 0)
-- Dependencies: 223
-- Name: messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sagarroy
--

SELECT pg_catalog.setval('public.messages_id_seq', 1, false);


--
-- TOC entry 3508 (class 0 OID 0)
-- Dependencies: 221
-- Name: offers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sagarroy
--

SELECT pg_catalog.setval('public.offers_id_seq', 3, true);


--
-- TOC entry 3509 (class 0 OID 0)
-- Dependencies: 219
-- Name: properties_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sagarroy
--

SELECT pg_catalog.setval('public.properties_id_seq', 11, true);


--
-- TOC entry 3510 (class 0 OID 0)
-- Dependencies: 225
-- Name: property_photos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sagarroy
--

SELECT pg_catalog.setval('public.property_photos_id_seq', 9, true);


--
-- TOC entry 3511 (class 0 OID 0)
-- Dependencies: 227
-- Name: user_sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sagarroy
--

SELECT pg_catalog.setval('public.user_sessions_id_seq', 56, true);


--
-- TOC entry 3512 (class 0 OID 0)
-- Dependencies: 217
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sagarroy
--

SELECT pg_catalog.setval('public.users_id_seq', 11, true);


--
-- TOC entry 3316 (class 2606 OID 16487)
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- TOC entry 3312 (class 2606 OID 16466)
-- Name: offers offers_pkey; Type: CONSTRAINT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT offers_pkey PRIMARY KEY (id);


--
-- TOC entry 3307 (class 2606 OID 16443)
-- Name: properties properties_pkey; Type: CONSTRAINT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_pkey PRIMARY KEY (id);


--
-- TOC entry 3319 (class 2606 OID 16524)
-- Name: property_photos property_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.property_photos
    ADD CONSTRAINT property_photos_pkey PRIMARY KEY (id);


--
-- TOC entry 3321 (class 2606 OID 16540)
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 3323 (class 2606 OID 16542)
-- Name: user_sessions user_sessions_session_token_key; Type: CONSTRAINT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_session_token_key UNIQUE (session_token);


--
-- TOC entry 3296 (class 2606 OID 16415)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 3298 (class 2606 OID 16413)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 3313 (class 1259 OID 16559)
-- Name: idx_messages_property; Type: INDEX; Schema: public; Owner: sagarroy
--

CREATE INDEX idx_messages_property ON public.messages USING btree (property_id);


--
-- TOC entry 3314 (class 1259 OID 16558)
-- Name: idx_messages_recipient; Type: INDEX; Schema: public; Owner: sagarroy
--

CREATE INDEX idx_messages_recipient ON public.messages USING btree (recipient_id);


--
-- TOC entry 3308 (class 1259 OID 16556)
-- Name: idx_offers_buyer; Type: INDEX; Schema: public; Owner: sagarroy
--

CREATE INDEX idx_offers_buyer ON public.offers USING btree (buyer_id);


--
-- TOC entry 3309 (class 1259 OID 16555)
-- Name: idx_offers_property; Type: INDEX; Schema: public; Owner: sagarroy
--

CREATE INDEX idx_offers_property ON public.offers USING btree (property_id);


--
-- TOC entry 3310 (class 1259 OID 16557)
-- Name: idx_offers_status; Type: INDEX; Schema: public; Owner: sagarroy
--

CREATE INDEX idx_offers_status ON public.offers USING btree (status);


--
-- TOC entry 3317 (class 1259 OID 16560)
-- Name: idx_photos_property; Type: INDEX; Schema: public; Owner: sagarroy
--

CREATE INDEX idx_photos_property ON public.property_photos USING btree (property_id);


--
-- TOC entry 3299 (class 1259 OID 16553)
-- Name: idx_properties_bedrooms; Type: INDEX; Schema: public; Owner: sagarroy
--

CREATE INDEX idx_properties_bedrooms ON public.properties USING btree (bedrooms);


--
-- TOC entry 3300 (class 1259 OID 16550)
-- Name: idx_properties_city_state; Type: INDEX; Schema: public; Owner: sagarroy
--

CREATE INDEX idx_properties_city_state ON public.properties USING btree (city, state);


--
-- TOC entry 3301 (class 1259 OID 16554)
-- Name: idx_properties_condition; Type: INDEX; Schema: public; Owner: sagarroy
--

CREATE INDEX idx_properties_condition ON public.properties USING btree (property_condition);


--
-- TOC entry 3302 (class 1259 OID 16551)
-- Name: idx_properties_price; Type: INDEX; Schema: public; Owner: sagarroy
--

CREATE INDEX idx_properties_price ON public.properties USING btree (list_price);


--
-- TOC entry 3303 (class 1259 OID 16548)
-- Name: idx_properties_seller; Type: INDEX; Schema: public; Owner: sagarroy
--

CREATE INDEX idx_properties_seller ON public.properties USING btree (seller_id);


--
-- TOC entry 3304 (class 1259 OID 16549)
-- Name: idx_properties_status; Type: INDEX; Schema: public; Owner: sagarroy
--

CREATE INDEX idx_properties_status ON public.properties USING btree (status);


--
-- TOC entry 3305 (class 1259 OID 16552)
-- Name: idx_properties_type; Type: INDEX; Schema: public; Owner: sagarroy
--

CREATE INDEX idx_properties_type ON public.properties USING btree (property_type);


--
-- TOC entry 3482 (class 2618 OID 16564)
-- Name: active_listings _RETURN; Type: RULE; Schema: public; Owner: sagarroy
--

CREATE OR REPLACE VIEW public.active_listings AS
 SELECT p.id,
    p.seller_id,
    p.street_address,
    p.city,
    p.state,
    p.zip_code,
    p.property_type,
    p.bedrooms,
    p.bathrooms,
    p.square_feet,
    p.lot_size,
    p.year_built,
    p.list_price,
    p.minimum_offer,
    p.property_tax_annual,
    p.hoa_fees_monthly,
    p.assessment_value,
    p.roof_year,
    p.roof_material,
    p.hvac_install_year,
    p.hvac_type,
    p.hvac_last_service,
    p.water_heater_year,
    p.water_heater_type,
    p.has_septic,
    p.septic_type,
    p.septic_last_pumped,
    p.has_solar,
    p.solar_type,
    p.solar_install_year,
    p.solar_monthly_savings,
    p.property_condition,
    p.major_repairs_needed,
    p.recent_renovations,
    p.electrical_panel_year,
    p.plumbing_updated_year,
    p.windows_replaced_year,
    p.garage_spaces,
    p.has_pool,
    p.has_fireplace,
    p.has_deck,
    p.has_basement,
    p.basement_finished,
    p.home_warranty_included,
    p.warranties_transferable,
    p.description,
    p.virtual_tour_url,
    p.allow_messages,
    p.minimum_offer_percent,
    p.status,
    p.listed_date,
    p.sold_date,
    p.sold_price,
    p.view_count,
    p.save_count,
    p.created_at,
    p.updated_at,
    u.first_name AS seller_first_name,
    u.last_name AS seller_last_name,
    u.email AS seller_email,
    u.phone AS seller_phone,
    count(DISTINCT o.id) AS offer_count,
    max(o.offer_amount) AS highest_offer
   FROM ((public.properties p
     JOIN public.users u ON ((p.seller_id = u.id)))
     LEFT JOIN public.offers o ON (((p.id = o.property_id) AND ((o.status)::text = 'pending'::text))))
  WHERE ((p.status)::text = 'active'::text)
  GROUP BY p.id, u.id;


--
-- TOC entry 3336 (class 2620 OID 16574)
-- Name: offers update_offers_updated_at; Type: TRIGGER; Schema: public; Owner: sagarroy
--

CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON public.offers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 3335 (class 2620 OID 16573)
-- Name: properties update_properties_updated_at; Type: TRIGGER; Schema: public; Owner: sagarroy
--

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 3334 (class 2620 OID 16572)
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: sagarroy
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 3327 (class 2606 OID 16503)
-- Name: messages messages_offer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON DELETE CASCADE;


--
-- TOC entry 3328 (class 2606 OID 16508)
-- Name: messages messages_parent_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_parent_message_id_fkey FOREIGN KEY (parent_message_id) REFERENCES public.messages(id);


--
-- TOC entry 3329 (class 2606 OID 16498)
-- Name: messages messages_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- TOC entry 3330 (class 2606 OID 16493)
-- Name: messages messages_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3331 (class 2606 OID 16488)
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3325 (class 2606 OID 16472)
-- Name: offers offers_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT offers_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3326 (class 2606 OID 16467)
-- Name: offers offers_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT offers_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- TOC entry 3324 (class 2606 OID 16444)
-- Name: properties properties_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3332 (class 2606 OID 16525)
-- Name: property_photos property_photos_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.property_photos
    ADD CONSTRAINT property_photos_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- TOC entry 3333 (class 2606 OID 16543)
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 2079 (class 826 OID 16391)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON SEQUENCES TO sagarroy;


--
-- TOC entry 2081 (class 826 OID 16393)
-- Name: DEFAULT PRIVILEGES FOR TYPES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON TYPES TO sagarroy;


--
-- TOC entry 2080 (class 826 OID 16392)
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON FUNCTIONS TO sagarroy;


--
-- TOC entry 2078 (class 826 OID 16390)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON TABLES TO sagarroy;


-- Completed on 2025-08-28 21:24:47 +06

--
-- PostgreSQL database dump complete
--

