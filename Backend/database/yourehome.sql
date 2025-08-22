--
-- PostgreSQL database dump
--

-- Dumped from database version 17.6 (Homebrew)
-- Dumped by pg_dump version 17.5

-- Started on 2025-08-22 21:53:59 +06

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
-- TOC entry 233 (class 1255 OID 17840)
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
-- TOC entry 229 (class 1259 OID 17830)
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
-- TOC entry 224 (class 1259 OID 17747)
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
-- TOC entry 223 (class 1259 OID 17746)
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
-- TOC entry 3956 (class 0 OID 0)
-- Dependencies: 223
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sagarroy
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- TOC entry 222 (class 1259 OID 17719)
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
-- TOC entry 221 (class 1259 OID 17718)
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
-- TOC entry 3957 (class 0 OID 0)
-- Dependencies: 221
-- Name: offers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sagarroy
--

ALTER SEQUENCE public.offers_id_seq OWNED BY public.offers.id;


--
-- TOC entry 220 (class 1259 OID 17686)
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
    hvac_install_date date,
    water_heater_date date,
    roof_replacement_date date,
    roof_type character varying(100),
    septic_last_serviced date,
    septic_notes text,
    solar_ownership character varying(20),
    solar_monthly_payment numeric(10,2),
    is_as_is boolean DEFAULT false,
    property_disclosures text,
    CONSTRAINT properties_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'active'::character varying, 'pending'::character varying, 'sold'::character varying, 'paused'::character varying, 'expired'::character varying])::text[])))
);


ALTER TABLE public.properties OWNER TO sagarroy;

--
-- TOC entry 219 (class 1259 OID 17685)
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
-- TOC entry 3958 (class 0 OID 0)
-- Dependencies: 219
-- Name: properties_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sagarroy
--

ALTER SEQUENCE public.properties_id_seq OWNED BY public.properties.id;


--
-- TOC entry 230 (class 1259 OID 17835)
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
-- TOC entry 232 (class 1259 OID 17847)
-- Name: property_improvements; Type: TABLE; Schema: public; Owner: sagarroy
--

CREATE TABLE public.property_improvements (
    id integer NOT NULL,
    property_id integer,
    improvement_type character varying(100),
    improvement_date date,
    improvement_cost numeric(10,2),
    improvement_description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.property_improvements OWNER TO sagarroy;

--
-- TOC entry 231 (class 1259 OID 17846)
-- Name: property_improvements_id_seq; Type: SEQUENCE; Schema: public; Owner: sagarroy
--

CREATE SEQUENCE public.property_improvements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.property_improvements_id_seq OWNER TO sagarroy;

--
-- TOC entry 3959 (class 0 OID 0)
-- Dependencies: 231
-- Name: property_improvements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sagarroy
--

ALTER SEQUENCE public.property_improvements_id_seq OWNED BY public.property_improvements.id;


--
-- TOC entry 226 (class 1259 OID 17783)
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
-- TOC entry 225 (class 1259 OID 17782)
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
-- TOC entry 3960 (class 0 OID 0)
-- Dependencies: 225
-- Name: property_photos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sagarroy
--

ALTER SEQUENCE public.property_photos_id_seq OWNED BY public.property_photos.id;


--
-- TOC entry 228 (class 1259 OID 17800)
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
-- TOC entry 227 (class 1259 OID 17799)
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
-- TOC entry 3961 (class 0 OID 0)
-- Dependencies: 227
-- Name: user_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sagarroy
--

ALTER SEQUENCE public.user_sessions_id_seq OWNED BY public.user_sessions.id;


--
-- TOC entry 218 (class 1259 OID 17669)
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
-- TOC entry 217 (class 1259 OID 17668)
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
-- TOC entry 3962 (class 0 OID 0)
-- Dependencies: 217
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sagarroy
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 3729 (class 2604 OID 17750)
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- TOC entry 3720 (class 2604 OID 17722)
-- Name: offers id; Type: DEFAULT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.offers ALTER COLUMN id SET DEFAULT nextval('public.offers_id_seq'::regclass);


--
-- TOC entry 3700 (class 2604 OID 17689)
-- Name: properties id; Type: DEFAULT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.properties ALTER COLUMN id SET DEFAULT nextval('public.properties_id_seq'::regclass);


--
-- TOC entry 3739 (class 2604 OID 17850)
-- Name: property_improvements id; Type: DEFAULT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.property_improvements ALTER COLUMN id SET DEFAULT nextval('public.property_improvements_id_seq'::regclass);


--
-- TOC entry 3732 (class 2604 OID 17786)
-- Name: property_photos id; Type: DEFAULT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.property_photos ALTER COLUMN id SET DEFAULT nextval('public.property_photos_id_seq'::regclass);


--
-- TOC entry 3736 (class 2604 OID 17803)
-- Name: user_sessions id; Type: DEFAULT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.user_sessions ALTER COLUMN id SET DEFAULT nextval('public.user_sessions_id_seq'::regclass);


--
-- TOC entry 3694 (class 2604 OID 17672)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 3944 (class 0 OID 17747)
-- Dependencies: 224
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: sagarroy
--

COPY public.messages (id, sender_id, recipient_id, property_id, offer_id, subject, message_body, is_read, read_at, parent_message_id, created_at) FROM stdin;
\.


--
-- TOC entry 3942 (class 0 OID 17719)
-- Dependencies: 222
-- Data for Name: offers; Type: TABLE DATA; Schema: public; Owner: sagarroy
--

COPY public.offers (id, property_id, buyer_id, offer_amount, offer_type, financing_type, down_payment_percent, inspection_contingency, financing_contingency, appraisal_contingency, sale_contingency, contingency_details, proposed_closing_date, offer_expires, buyer_message, status, counter_amount, counter_message, counter_date, accepted_date, rejected_date, rejection_reason, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3940 (class 0 OID 17686)
-- Dependencies: 220
-- Data for Name: properties; Type: TABLE DATA; Schema: public; Owner: sagarroy
--

COPY public.properties (id, seller_id, street_address, city, state, zip_code, property_type, bedrooms, bathrooms, square_feet, lot_size, year_built, list_price, minimum_offer, property_tax_annual, hoa_fees_monthly, assessment_value, roof_year, roof_material, hvac_install_year, hvac_type, hvac_last_service, water_heater_year, water_heater_type, has_septic, septic_type, septic_last_pumped, has_solar, solar_type, solar_install_year, solar_monthly_savings, property_condition, major_repairs_needed, recent_renovations, electrical_panel_year, plumbing_updated_year, windows_replaced_year, garage_spaces, has_pool, has_fireplace, has_deck, has_basement, basement_finished, home_warranty_included, warranties_transferable, description, virtual_tour_url, allow_messages, minimum_offer_percent, status, listed_date, sold_date, sold_price, view_count, save_count, created_at, updated_at, hvac_install_date, water_heater_date, roof_replacement_date, roof_type, septic_last_serviced, septic_notes, solar_ownership, solar_monthly_payment, is_as_is, property_disclosures) FROM stdin;
1	1	123	sagar	PA	9280	townhouse	4	3.0	1850	0.25	2020	48000.00	200.00	1200.00	\N	\N	2025	Tile	2025	Heat Pump	\N	2025	Tankless	t	\N	\N	t	\N	\N	\N	as-is	asdfsdf	\N	\N	\N	\N	0	f	f	f	f	f	f	\N	Experience the perfect blend of privacy and convenience in this spacious 4-bedroom, 3-bathroom townhouse with 1850 square feet. Convenient parking and storage are provided with the attached garage. This property offers an exceptional opportunity for comfortable living in a desirable location. Schedule your private tour today to experience all this home has to offer.	\N	t	50	active	2025-08-21 23:05:49.988699	\N	\N	0	0	2025-08-21 23:05:49.988699	2025-08-21 23:05:49.988699	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
2	1	123	khulna	NJ	9280	condo	2	3.5	1850	0.25	2020	485000.00	485000.00	122.00	3.00	\N	2025	\N	2025	Heat Pump	\N	2025	Electric	t	\N	\N	t	\N	\N	\N	move-in-ready	\N	\N	\N	\N	\N	0	f	f	f	f	f	f	\N	asd	\N	t	50	active	2025-08-21 23:09:37.723666	\N	\N	0	0	2025-08-21 23:09:37.723666	2025-08-21 23:09:37.723666	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
3	1	123	asd	NJ	3233	townhouse	3	2.0	1850	0.25	2222	48500.00	46000.00	12333.00	\N	\N	2025	Flat/Rubber	2025	Heat Pump	\N	2025	Heat Pump	t	\N	\N	t	\N	\N	\N	needs-work	asd	\N	\N	\N	\N	0	f	f	f	f	f	f	\N	asd	\N	t	50	active	2025-08-21 23:15:51.528287	\N	\N	0	0	2025-08-21 23:15:51.528287	2025-08-21 23:15:51.528287	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
4	1	123	lkhi	NJ	9280	condo	2	1.0	1850	0.25	2020	48500.00	46000.00	1223.00	3.00	\N	2025	Tile	2025	Baseboard	\N	2025	Tankless	t	\N	\N	t	\N	\N	\N	needs-work	assdf	\N	\N	\N	\N	0	f	f	f	f	f	f	\N	Discover urban living at its finest in this elegant 2-bedroom, 1-bathroom condominium spanning 1850 square feet. Convenient parking and storage are provided with the attached garage. This property offers an exceptional opportunity for comfortable living in a desirable location. Schedule your private tour today to experience all this home has to offer.	\N	t	50	active	2025-08-21 23:21:02.232956	\N	\N	0	0	2025-08-21 23:21:02.232956	2025-08-21 23:21:02.232956	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
5	1	asd	sdf	PA	234	multi-family	3	2.0	1850	0.25	202	48500.00	46000.00	12400.00	\N	\N	2025	Tile	2025	Baseboard	\N	2025	Solar	f	\N	\N	f	\N	\N	\N	as-is	\N	\N	\N	\N	\N	0	f	f	f	f	f	f	\N	sdf	\N	t	50	active	2025-08-21 23:24:56.135268	\N	\N	0	0	2025-08-21 23:24:56.135268	2025-08-21 23:24:56.135268	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
6	1	2342	123	NJ	123	multi-family	3	3.0	1850	0.25	2020	485000.00	460000.00	21.00	2.00	\N	2025	Slate	5555	Heat Pump	\N	2025	Electric	t	\N	\N	t	\N	\N	\N	move-in-ready	asd	\N	\N	\N	\N	0	f	f	f	f	f	f	\N	Welcome to this stunning 3-bedroom, 3-bathroom home featuring 1850 square feet of beautifully designed living space. Convenient parking and storage are provided with the attached garage. This property offers an exceptional opportunity for comfortable living in a desirable location. Schedule your private tour today to experience all this home has to offer.	\N	t	50	active	2025-08-21 23:42:22.582934	\N	\N	0	0	2025-08-21 23:42:22.582934	2025-08-21 23:42:22.582934	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
\.


--
-- TOC entry 3950 (class 0 OID 17847)
-- Dependencies: 232
-- Data for Name: property_improvements; Type: TABLE DATA; Schema: public; Owner: sagarroy
--

COPY public.property_improvements (id, property_id, improvement_type, improvement_date, improvement_cost, improvement_description, created_at) FROM stdin;
\.


--
-- TOC entry 3946 (class 0 OID 17783)
-- Dependencies: 226
-- Data for Name: property_photos; Type: TABLE DATA; Schema: public; Owner: sagarroy
--

COPY public.property_photos (id, property_id, photo_url, photo_order, is_main, caption, uploaded_at) FROM stdin;
\.


--
-- TOC entry 3948 (class 0 OID 17800)
-- Dependencies: 228
-- Data for Name: user_sessions; Type: TABLE DATA; Schema: public; Owner: sagarroy
--

COPY public.user_sessions (id, user_id, session_token, ip_address, user_agent, created_at, expires_at, is_valid) FROM stdin;
12	2	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIsInRpbWVzdGFtcCI6MTc1NTg2NzAwMjY0OSwiaWF0IjoxNzU1ODY3MDAyLCJleHAiOjE3NTg0NTkwMDJ9.sopgt7-gd7mh_5LeslGKlcytLEgzUo8ARX9mCtwr17A	\N	\N	2025-08-22 18:50:02.649662	2025-09-21 18:50:02.649	t
14	4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjQsInRpbWVzdGFtcCI6MTc1NTg3MDk2ODg2MiwiaWF0IjoxNzU1ODcwOTY4LCJleHAiOjE3NTg0NjI5Njh9.rPsCI2s5-FDfyv3sLFN85ZTSsz6_7ct4-GBwiqeoG5I	\N	\N	2025-08-22 19:56:08.863046	2025-09-21 19:56:08.862	t
16	5	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjUsInRpbWVzdGFtcCI6MTc1NTg3MjEwODU0MiwiaWF0IjoxNzU1ODcyMTA4LCJleHAiOjE3NTg0NjQxMDh9.RtamcOlTp_DG-x_X0hGovApRAnx0OYonikSAArEBjSQ	\N	\N	2025-08-22 20:15:08.54295	2025-09-21 20:15:08.542	t
18	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInRpbWVzdGFtcCI6MTc1NTg3MzI4MjE1MCwiaWF0IjoxNzU1ODczMjgyLCJleHAiOjE3NTg0NjUyODJ9.2NPT9UVvQatByuC4im6iE_HKDq8fKybFCDA1Ji_GeuM	\N	\N	2025-08-22 20:34:42.153553	2025-09-21 20:34:42.153	t
19	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInRpbWVzdGFtcCI6MTc1NTg3MzI4MjE1MSwiaWF0IjoxNzU1ODczMjgyLCJleHAiOjE3NTg0NjUyODJ9.VbdN-CurG8LVTadMPMZE5IKn0_wglYWVoRRQhHlB4xA	\N	\N	2025-08-22 20:34:42.153608	2025-09-21 20:34:42.153	t
20	7	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjcsInRpbWVzdGFtcCI6MTc1NTg3NTA4NTgxMiwiaWF0IjoxNzU1ODc1MDg1LCJleHAiOjE3NTg0NjcwODV9.dt28kIZkeET0jZM0K8S9yxsTa8JVGg4JUJejYheL1dM	\N	\N	2025-08-22 21:04:45.812456	2025-09-21 21:04:45.812	t
21	3	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjMsInRpbWVzdGFtcCI6MTc1NTg3NTk2NzM2MCwiaWF0IjoxNzU1ODc1OTY3LCJleHAiOjE3NTg0Njc5Njd9.s0HEVvTu2pE1_lgLEZrOuyMc2F-okivgvqr2GhroDrA	\N	\N	2025-08-22 21:19:27.363787	2025-09-21 21:19:27.363	t
\.


--
-- TOC entry 3938 (class 0 OID 17669)
-- Dependencies: 218
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: sagarroy
--

COPY public.users (id, email, password_hash, first_name, last_name, phone, user_type, is_pre_approved, pre_approval_amount, pre_approval_expires, credit_score_range, email_verified, verification_token, created_at, updated_at, last_login, is_active) FROM stdin;
1	sagarbd2@gmail.com	$2a$12$ZkxFlPBe5TYIhmrcWdIJ4.xWJOd6VJKG5.bt4lQL12g0NWcRDAnxK	sagar	roy	01917177562	seller	f	\N	\N	\N	t	\N	2025-08-21 23:02:56.716531	2025-08-21 23:02:56.716531	\N	t
2	sagar@gmail.com	$2a$12$Le4X/ggFGNqroNaPunP3PuzOlh/t2qhTMVuAzmIBctLkZqMeVGdAO	asd	asd	01917177562	seller	f	\N	\N	\N	t	\N	2025-08-22 18:50:02.644627	2025-08-22 18:50:02.644627	\N	t
3	sagar2@gmail.com	$2a$12$F/LeI2p1YBTsUUF7lBHqU.Bgq311EBeo1gKXLeL7Hv6woNr4.6B9O	new 	user	01917177562	seller	f	\N	\N	\N	t	\N	2025-08-22 18:51:31.909875	2025-08-22 18:51:31.909875	\N	t
4	onyroy1@gmail.com	$2a$12$DpIeDG/HZYGJZ/vihbi9fuqfc7JKrykRDPDIKEFRkY7VM9mjX7fLa	sagar	roy	01917177562	seller	f	\N	\N	\N	t	\N	2025-08-22 19:56:08.858342	2025-08-22 19:56:08.858342	\N	t
5	sagarbd3@gmail.com	$2a$12$UyljzZAp5xEoKpTFjL3HcOkz.BB7lP9P5f7Cbdu7wnAQoGplKZ61i	sagar	roy	0191717756207	buyer	f	\N	\N	\N	t	\N	2025-08-22 20:15:08.539714	2025-08-22 20:15:08.539714	\N	t
6	sagarbss2ltd@gmail.com	$2a$12$GDaeAmOF3XL17kd1yb4qpej3zAys1mofgrInfxGGm1NTPIDq69L/m	seller and 	buyer	01917177562	both	f	\N	\N	\N	t	\N	2025-08-22 20:16:05.228587	2025-08-22 20:16:05.228587	\N	t
7	sagar3@gmail.com	$2a$12$05.Z7W0dF7P4X9fi4gMN1eWNbLFiy9vdMAiIs46EOD9rSU2zr.pXu	sagar	roy	01917177562	buyer	f	\N	\N	\N	t	\N	2025-08-22 21:04:45.808957	2025-08-22 21:04:45.808957	\N	t
\.


--
-- TOC entry 3963 (class 0 OID 0)
-- Dependencies: 223
-- Name: messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sagarroy
--

SELECT pg_catalog.setval('public.messages_id_seq', 1, false);


--
-- TOC entry 3964 (class 0 OID 0)
-- Dependencies: 221
-- Name: offers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sagarroy
--

SELECT pg_catalog.setval('public.offers_id_seq', 1, false);


--
-- TOC entry 3965 (class 0 OID 0)
-- Dependencies: 219
-- Name: properties_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sagarroy
--

SELECT pg_catalog.setval('public.properties_id_seq', 6, true);


--
-- TOC entry 3966 (class 0 OID 0)
-- Dependencies: 231
-- Name: property_improvements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sagarroy
--

SELECT pg_catalog.setval('public.property_improvements_id_seq', 1, false);


--
-- TOC entry 3967 (class 0 OID 0)
-- Dependencies: 225
-- Name: property_photos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sagarroy
--

SELECT pg_catalog.setval('public.property_photos_id_seq', 1, false);


--
-- TOC entry 3968 (class 0 OID 0)
-- Dependencies: 227
-- Name: user_sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sagarroy
--

SELECT pg_catalog.setval('public.user_sessions_id_seq', 21, true);


--
-- TOC entry 3969 (class 0 OID 0)
-- Dependencies: 217
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sagarroy
--

SELECT pg_catalog.setval('public.users_id_seq', 7, true);


--
-- TOC entry 3765 (class 2606 OID 17756)
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- TOC entry 3761 (class 2606 OID 17735)
-- Name: offers offers_pkey; Type: CONSTRAINT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT offers_pkey PRIMARY KEY (id);


--
-- TOC entry 3756 (class 2606 OID 17712)
-- Name: properties properties_pkey; Type: CONSTRAINT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_pkey PRIMARY KEY (id);


--
-- TOC entry 3775 (class 2606 OID 17855)
-- Name: property_improvements property_improvements_pkey; Type: CONSTRAINT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.property_improvements
    ADD CONSTRAINT property_improvements_pkey PRIMARY KEY (id);


--
-- TOC entry 3768 (class 2606 OID 17793)
-- Name: property_photos property_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.property_photos
    ADD CONSTRAINT property_photos_pkey PRIMARY KEY (id);


--
-- TOC entry 3770 (class 2606 OID 17809)
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 3772 (class 2606 OID 17811)
-- Name: user_sessions user_sessions_session_token_key; Type: CONSTRAINT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_session_token_key UNIQUE (session_token);


--
-- TOC entry 3745 (class 2606 OID 17684)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 3747 (class 2606 OID 17682)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 3762 (class 1259 OID 17828)
-- Name: idx_messages_property; Type: INDEX; Schema: public; Owner: sagarroy
--

CREATE INDEX idx_messages_property ON public.messages USING btree (property_id);


--
-- TOC entry 3763 (class 1259 OID 17827)
-- Name: idx_messages_recipient; Type: INDEX; Schema: public; Owner: sagarroy
--

CREATE INDEX idx_messages_recipient ON public.messages USING btree (recipient_id);


--
-- TOC entry 3757 (class 1259 OID 17825)
-- Name: idx_offers_buyer; Type: INDEX; Schema: public; Owner: sagarroy
--

CREATE INDEX idx_offers_buyer ON public.offers USING btree (buyer_id);


--
-- TOC entry 3758 (class 1259 OID 17824)
-- Name: idx_offers_property; Type: INDEX; Schema: public; Owner: sagarroy
--

CREATE INDEX idx_offers_property ON public.offers USING btree (property_id);


--
-- TOC entry 3759 (class 1259 OID 17826)
-- Name: idx_offers_status; Type: INDEX; Schema: public; Owner: sagarroy
--

CREATE INDEX idx_offers_status ON public.offers USING btree (status);


--
-- TOC entry 3766 (class 1259 OID 17829)
-- Name: idx_photos_property; Type: INDEX; Schema: public; Owner: sagarroy
--

CREATE INDEX idx_photos_property ON public.property_photos USING btree (property_id);


--
-- TOC entry 3748 (class 1259 OID 17822)
-- Name: idx_properties_bedrooms; Type: INDEX; Schema: public; Owner: sagarroy
--

CREATE INDEX idx_properties_bedrooms ON public.properties USING btree (bedrooms);


--
-- TOC entry 3749 (class 1259 OID 17819)
-- Name: idx_properties_city_state; Type: INDEX; Schema: public; Owner: sagarroy
--

CREATE INDEX idx_properties_city_state ON public.properties USING btree (city, state);


--
-- TOC entry 3750 (class 1259 OID 17823)
-- Name: idx_properties_condition; Type: INDEX; Schema: public; Owner: sagarroy
--

CREATE INDEX idx_properties_condition ON public.properties USING btree (property_condition);


--
-- TOC entry 3751 (class 1259 OID 17820)
-- Name: idx_properties_price; Type: INDEX; Schema: public; Owner: sagarroy
--

CREATE INDEX idx_properties_price ON public.properties USING btree (list_price);


--
-- TOC entry 3752 (class 1259 OID 17817)
-- Name: idx_properties_seller; Type: INDEX; Schema: public; Owner: sagarroy
--

CREATE INDEX idx_properties_seller ON public.properties USING btree (seller_id);


--
-- TOC entry 3753 (class 1259 OID 17818)
-- Name: idx_properties_status; Type: INDEX; Schema: public; Owner: sagarroy
--

CREATE INDEX idx_properties_status ON public.properties USING btree (status);


--
-- TOC entry 3754 (class 1259 OID 17821)
-- Name: idx_properties_type; Type: INDEX; Schema: public; Owner: sagarroy
--

CREATE INDEX idx_properties_type ON public.properties USING btree (property_type);


--
-- TOC entry 3773 (class 1259 OID 17861)
-- Name: idx_property_improvements_property_id; Type: INDEX; Schema: public; Owner: sagarroy
--

CREATE INDEX idx_property_improvements_property_id ON public.property_improvements USING btree (property_id);


--
-- TOC entry 3935 (class 2618 OID 17833)
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
-- TOC entry 3789 (class 2620 OID 17843)
-- Name: offers update_offers_updated_at; Type: TRIGGER; Schema: public; Owner: sagarroy
--

CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON public.offers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 3788 (class 2620 OID 17842)
-- Name: properties update_properties_updated_at; Type: TRIGGER; Schema: public; Owner: sagarroy
--

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 3787 (class 2620 OID 17841)
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: sagarroy
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 3779 (class 2606 OID 17772)
-- Name: messages messages_offer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON DELETE CASCADE;


--
-- TOC entry 3780 (class 2606 OID 17777)
-- Name: messages messages_parent_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_parent_message_id_fkey FOREIGN KEY (parent_message_id) REFERENCES public.messages(id);


--
-- TOC entry 3781 (class 2606 OID 17767)
-- Name: messages messages_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- TOC entry 3782 (class 2606 OID 17762)
-- Name: messages messages_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3783 (class 2606 OID 17757)
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3777 (class 2606 OID 17741)
-- Name: offers offers_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT offers_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3778 (class 2606 OID 17736)
-- Name: offers offers_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT offers_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- TOC entry 3776 (class 2606 OID 17713)
-- Name: properties properties_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3786 (class 2606 OID 17856)
-- Name: property_improvements property_improvements_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.property_improvements
    ADD CONSTRAINT property_improvements_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- TOC entry 3784 (class 2606 OID 17794)
-- Name: property_photos property_photos_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.property_photos
    ADD CONSTRAINT property_photos_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- TOC entry 3785 (class 2606 OID 17812)
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sagarroy
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


-- Completed on 2025-08-22 21:53:59 +06

--
-- PostgreSQL database dump complete
--

