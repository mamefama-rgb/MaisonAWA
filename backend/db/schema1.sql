--
-- PostgreSQL database dump
--

\restrict ggUTeh26Mwjgq0nm5d00NODgexYPdg1kuGEpe7mCr7OwfDtNy3nVIchT7UHWkWk

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

-- Started on 2026-05-16 20:14:20

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
-- TOC entry 2 (class 3079 OID 16743)
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- TOC entry 5127 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 230 (class 1259 OID 16978)
-- Name: banners; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.banners (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    title character varying(255),
    subtitle text,
    image_url text NOT NULL,
    link_url text,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.banners OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 16832)
-- Name: cart_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cart_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    session_id uuid,
    product_id uuid,
    quantity integer DEFAULT 1 NOT NULL,
    added_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.cart_items OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16815)
-- Name: cart_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cart_sessions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    session_token character varying(255) NOT NULL,
    user_id uuid,
    created_at timestamp without time zone DEFAULT now(),
    expires_at timestamp without time zone DEFAULT (now() + '30 days'::interval)
);


ALTER TABLE public.cart_sessions OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16773)
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    description text,
    icon character varying(50),
    image_url text,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 16912)
-- Name: order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_id uuid,
    product_id uuid,
    product_name character varying(255) NOT NULL,
    product_image text,
    price numeric(10,2) NOT NULL,
    quantity integer NOT NULL,
    subtotal numeric(10,2) NOT NULL
);


ALTER TABLE public.order_items OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 16935)
-- Name: order_status_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_status_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_id uuid,
    status character varying(30) NOT NULL,
    note text,
    created_by uuid,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.order_status_history OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 16872)
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_number character varying(20) NOT NULL,
    user_id uuid,
    session_id uuid,
    customer_name character varying(255) NOT NULL,
    customer_email character varying(255),
    customer_phone character varying(50) NOT NULL,
    delivery_address text NOT NULL,
    delivery_city character varying(100),
    delivery_notes text,
    subtotal numeric(10,2) NOT NULL,
    discount_amount numeric(10,2) DEFAULT 0,
    delivery_fee numeric(10,2) DEFAULT 0,
    total numeric(10,2) NOT NULL,
    promo_code_id uuid,
    promo_code character varying(50),
    status character varying(30) DEFAULT 'pending'::character varying,
    payment_method character varying(30) DEFAULT 'cash_on_delivery'::character varying,
    tracking_code character varying(50),
    estimated_delivery date,
    whatsapp_sent boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT orders_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'confirmed'::character varying, 'processing'::character varying, 'shipped'::character varying, 'delivered'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 16956)
-- Name: product_reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_reviews (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    product_id uuid,
    user_id uuid,
    reviewer_name character varying(255),
    rating integer,
    comment text,
    is_approved boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT product_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.product_reviews OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 16789)
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    category_id uuid,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    original_price numeric(10,2),
    stock integer DEFAULT 0,
    images jsonb DEFAULT '[]'::jsonb,
    attributes jsonb DEFAULT '{}'::jsonb,
    tags text[],
    is_featured boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.products OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 16854)
-- Name: promo_codes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.promo_codes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(50) NOT NULL,
    description text,
    discount_type character varying(20),
    discount_value numeric(10,2) NOT NULL,
    min_order_amount numeric(10,2) DEFAULT 0,
    max_uses integer,
    used_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT promo_codes_discount_type_check CHECK (((discount_type)::text = ANY ((ARRAY['percentage'::character varying, 'fixed'::character varying])::text[])))
);


ALTER TABLE public.promo_codes OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 16754)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    full_name character varying(255) NOT NULL,
    phone character varying(50),
    role character varying(20) DEFAULT 'client'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['client'::character varying, 'admin'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 5121 (class 0 OID 16978)
-- Dependencies: 230
-- Data for Name: banners; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.banners (id, title, subtitle, image_url, link_url, is_active, sort_order, created_at) FROM stdin;
\.


--
-- TOC entry 5115 (class 0 OID 16832)
-- Dependencies: 224
-- Data for Name: cart_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cart_items (id, session_id, product_id, quantity, added_at) FROM stdin;
\.


--
-- TOC entry 5114 (class 0 OID 16815)
-- Dependencies: 223
-- Data for Name: cart_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cart_sessions (id, session_token, user_id, created_at, expires_at) FROM stdin;
349b0bac-1538-4879-adf3-7dea87af7de3	86d3ea88-367c-4919-b841-737c8e9783f5	\N	2026-05-16 13:13:50.113636	2026-06-15 13:13:50.113636
de822947-6926-4870-ad30-ef0e09d7c60f	f58cf45b-db57-46db-8b53-4776c8fc6a23	f385e387-74c5-4cb2-ac0c-b3cd35d4261c	2026-05-16 13:13:50.168387	2026-06-15 13:13:50.168387
\.


--
-- TOC entry 5112 (class 0 OID 16773)
-- Dependencies: 221
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (id, name, slug, description, icon, image_url, is_active, sort_order, created_at) FROM stdin;
e1f3b02b-225e-4002-98b3-8d7deb9fcc81	Parfums	parfums	Parfums de luxe et eaux de toilette	🌸	\N	t	2	2026-05-16 13:12:03.459224
437e9edb-fa3a-425d-adc2-4898fecaa90a	Habits	habits	Vêtements homme et femme	👗	\N	t	3	2026-05-16 13:12:03.459224
271ed5c7-cb86-4b0f-b8d8-cec253f199f9	Chaussures	chaussures	Chaussures élégantes et sportives	👟	\N	t	4	2026-05-16 13:12:03.459224
5e64b6f9-8c4c-4aac-b3f4-0062e54d7ee5	Accessoires	accessoires	Bijoux, montres et accessoires de mode	💍	\N	t	5	2026-05-16 13:12:03.459224
fb7630f7-3c02-49bb-9c86-3069125e89d4	Sacs	sacs	Sacs à main, sacs de voyage, sacs de sport	👜		t	1	2026-05-16 13:12:03.459224
\.


--
-- TOC entry 5118 (class 0 OID 16912)
-- Dependencies: 227
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_items (id, order_id, product_id, product_name, product_image, price, quantity, subtotal) FROM stdin;
a99add83-3dc5-4530-86fb-59f43a8a3cf2	83f67c99-7f38-4d50-b4bc-618eef391e90	3881b07c-476e-4ff6-b0ae-f45d17627294	Sac Bandoulière Tendance	https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=500	18000.00	1	18000.00
8353be45-3013-450e-8bd6-0a4b0255e908	481de6db-f99e-47f9-a7b8-38df28ddd06f	7ba791e9-973e-49ff-9bd9-a7f85f9b644b	Parfum Floral Élégance	http://localhost:5000/uploads/product_1778940389746.webp	28000.00	1	28000.00
\.


--
-- TOC entry 5119 (class 0 OID 16935)
-- Dependencies: 228
-- Data for Name: order_status_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_status_history (id, order_id, status, note, created_by, created_at) FROM stdin;
88dea502-7ce8-462a-94f3-28721ef5a4ab	83f67c99-7f38-4d50-b4bc-618eef391e90	pending	Commande créée	\N	2026-05-16 13:40:14.345567
0d05323d-c91d-4392-8d37-c2da3d4e1b2d	83f67c99-7f38-4d50-b4bc-618eef391e90	delivered		8e708e32-5dfe-40b2-bb43-3f774061175b	2026-05-16 14:43:12.680034
82066204-5299-4afe-991f-ce7a62f3f467	481de6db-f99e-47f9-a7b8-38df28ddd06f	pending	Commande créée	\N	2026-05-16 16:52:52.093572
68b01c49-ad96-464d-8c73-eed964a83877	481de6db-f99e-47f9-a7b8-38df28ddd06f	delivered		8e708e32-5dfe-40b2-bb43-3f774061175b	2026-05-16 16:55:03.474821
cf4035c5-b4c7-4505-9ad2-b4cedbc6fe13	481de6db-f99e-47f9-a7b8-38df28ddd06f	shipped		8e708e32-5dfe-40b2-bb43-3f774061175b	2026-05-16 16:55:13.046657
\.


--
-- TOC entry 5117 (class 0 OID 16872)
-- Dependencies: 226
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, order_number, user_id, session_id, customer_name, customer_email, customer_phone, delivery_address, delivery_city, delivery_notes, subtotal, discount_amount, delivery_fee, total, promo_code_id, promo_code, status, payment_method, tracking_code, estimated_delivery, whatsapp_sent, created_at, updated_at) FROM stdin;
83f67c99-7f38-4d50-b4bc-618eef391e90	CMD-MP8E8M1C2QNM	f385e387-74c5-4cb2-ac0c-b3cd35d4261c	de822947-6926-4870-ad30-ef0e09d7c60f	Fatou	fabintou@esp.sn	771234567	1418 NIARY TALLY	Dakar		18000.00	0.00	0.00	18000.00	\N	\N	delivered	cash_on_delivery	TRKMP8E8M1D	\N	f	2026-05-16 13:40:14.345567	2026-05-16 14:43:12.6759
481de6db-f99e-47f9-a7b8-38df28ddd06f	CMD-MP8L4C2DAUQ7	\N	de822947-6926-4870-ad30-ef0e09d7c60f	AMY LY	amy@esp.sn	781234567	Malika Plage	Dakar		28000.00	0.00	0.00	28000.00	\N	\N	shipped	cash_on_delivery	TRKMP8L4C2D	\N	f	2026-05-16 16:52:52.093572	2026-05-16 16:55:13.043925
\.


--
-- TOC entry 5120 (class 0 OID 16956)
-- Dependencies: 229
-- Data for Name: product_reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_reviews (id, product_id, user_id, reviewer_name, rating, comment, is_approved, created_at) FROM stdin;
\.


--
-- TOC entry 5113 (class 0 OID 16789)
-- Dependencies: 222
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, category_id, name, slug, description, price, original_price, stock, images, attributes, tags, is_featured, is_active, created_at, updated_at) FROM stdin;
877f1a88-4470-4ef1-81b5-759d8dcff5dc	fb7630f7-3c02-49bb-9c86-3069125e89d4	Sac à Main Cuir Premium	sac-main-cuir-premium	Sac en cuir véritable, élégant et spacieux, idéal pour toutes occasions.	35000.00	45000.00	15	["https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=500", "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500"]	{"couleur": "Noir", "matière": "Cuir véritable", "dimensions": "30x20x10 cm"}	\N	t	t	2026-05-16 13:12:03.492193	2026-05-16 13:12:03.492193
ebbbde40-44ff-4d33-b226-866ade7c23e9	437e9edb-fa3a-425d-adc2-4898fecaa90a	Robe d'Été Légère	robe-ete-legere	Robe légère et colorée, parfaite pour les journées ensoleillées.	12000.00	16000.00	30	["https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500"]	{"tailles": "XS,S,M,L,XL", "matière": "100% Coton"}	\N	f	t	2026-05-16 13:12:03.492193	2026-05-16 13:12:03.492193
f7ba19c3-7602-463f-aeab-e8cbb5cf9769	271ed5c7-cb86-4b0f-b8d8-cec253f199f9	Escarpins Femme Luxe	escarpins-femme-luxe	Escarpins élégants à talon, parfaits pour les grandes occasions.	22000.00	28000.00	18	["https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=500"]	{"talon": "8cm", "pointures": "36,37,38,39,40,41"}	\N	t	t	2026-05-16 13:12:03.492193	2026-05-16 13:12:03.492193
07b892d8-1ce2-4752-bcdf-2aaafb484c83	271ed5c7-cb86-4b0f-b8d8-cec253f199f9	Sneakers Sport Premium	sneakers-sport-premium	Chaussures de sport confortables et stylées pour le quotidien.	19000.00	25000.00	25	["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500"]	{"pointures": "38,39,40,41,42,43,44,45"}	\N	f	t	2026-05-16 13:12:03.492193	2026-05-16 13:12:03.492193
8766433b-22e7-429e-903c-f27e8b6b60fa	5e64b6f9-8c4c-4aac-b3f4-0062e54d7ee5	Montre Femme Dorée	montre-femme-doree	Montre élégante dorée avec bracelet en acier inoxydable.	45000.00	60000.00	10	["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500"]	{"cadran": "Analogique", "matière": "Acier inoxydable"}	\N	t	t	2026-05-16 13:12:03.492193	2026-05-16 13:12:03.492193
84afc3f1-812b-4942-90ff-25d2a7e528eb	5e64b6f9-8c4c-4aac-b3f4-0062e54d7ee5	Collier Perles Naturelles	collier-perles-naturelles	Collier en perles naturelles, fait main, pour une touche d'élégance.	8500.00	12000.00	35	["https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500"]	{"longueur": "45cm", "matière": "Perles naturelles"}	\N	f	t	2026-05-16 13:12:03.492193	2026-05-16 13:12:03.492193
3881b07c-476e-4ff6-b0ae-f45d17627294	fb7630f7-3c02-49bb-9c86-3069125e89d4	Sac Bandoulière Tendance	sac-bandouliere-tendance	Sac bandoulière moderne et polyvalent pour un style urbain.	18000.00	22000.00	19	["https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=500"]	{"couleur": "Marron", "matière": "Similicuir"}	\N	f	t	2026-05-16 13:12:03.492193	2026-05-16 13:12:03.492193
0ef49a53-9897-46c9-94d4-2102ffe72942	e1f3b02b-225e-4002-98b3-8d7deb9fcc81	Parfum Oriental Mystère	parfum-oriental-mystere	Fragrance envoûtante aux notes d'oud et de vanille.	42000.00	55000.00	12	["https://images.unsplash.com/photo-1592945403407-9caf930b50c0?w=500"]	{"volume": "75ml", "famille": "Oriental", "intensité": "Parfum"}	\N	t	f	2026-05-16 13:12:03.492193	2026-05-16 13:12:03.492193
87d9fdf9-aed7-40f6-915f-2a9fb425b12c	437e9edb-fa3a-425d-adc2-4898fecaa90a	Costume Homme Classique	costume-homme-classique	Costume 2 pièces pour homme, coupe moderne et élégante.	65000.00	80000.00	8	["http://localhost:5000/uploads/product_1778940497371.jpg"]	{}	{}	t	t	2026-05-16 13:12:03.492193	2026-05-16 14:08:20.94193
7ba791e9-973e-49ff-9bd9-a7f85f9b644b	e1f3b02b-225e-4002-98b3-8d7deb9fcc81	Parfum Floral Élégance	parfum-floral-elegance	Eau de parfum aux notes florales de rose et de jasmin, longue tenue 8-10h.	28000.00	35000.00	24	["http://localhost:5000/uploads/product_1778940389746.webp"]	{}	{}	t	t	2026-05-16 13:12:03.492193	2026-05-16 14:06:31.116595
\.


--
-- TOC entry 5116 (class 0 OID 16854)
-- Dependencies: 225
-- Data for Name: promo_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.promo_codes (id, code, description, discount_type, discount_value, min_order_amount, max_uses, used_count, is_active, expires_at, created_at) FROM stdin;
6d087fbb-5a8c-44bf-a7e1-5f6f03d6f6a8	BIENVENUE10	Réduction de 10% pour les nouveaux clients	percentage	10.00	0.00	100	0	t	2027-05-16 13:12:03.476958	2026-05-16 13:12:03.476958
99e77902-2c2d-489c-be5c-0babda3f5e23	LIVRAISON50	50 FCFA de réduction sur la livraison	fixed	50.00	5000.00	50	0	t	2026-11-16 13:12:03.476958	2026-05-16 13:12:03.476958
94d0acf8-c22e-405b-b17b-5a5c7b9b550a	PROMO20	20% de réduction sur toute commande	percentage	20.00	10000.00	30	0	t	2026-08-16 13:12:03.476958	2026-05-16 13:12:03.476958
\.


--
-- TOC entry 5111 (class 0 OID 16754)
-- Dependencies: 220
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, password_hash, full_name, phone, role, is_active, created_at, updated_at) FROM stdin;
f385e387-74c5-4cb2-ac0c-b3cd35d4261c	fabintou@esp.sn	$2a$10$guQyxs2D5FQo2QSx5muMjO1GXo4rkBSySgkwGF8coqNN8Btn/fyg2	Fatou	771234567	client	t	2026-05-16 13:39:32.986962	2026-05-16 13:39:32.986962
8e708e32-5dfe-40b2-bb43-3f774061175b	admin@boutique.sn	$2a$10$trd0mGSvFU8jf9GFz.4g0eKa.i/f4xCLv2Ar/iHVMZxQFzBHoK25q	Administrateur	\N	admin	t	2026-05-16 13:12:03.440705	2026-05-16 13:12:03.440705
\.


--
-- TOC entry 4950 (class 2606 OID 16990)
-- Name: banners banners_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.banners
    ADD CONSTRAINT banners_pkey PRIMARY KEY (id);


--
-- TOC entry 4929 (class 2606 OID 16841)
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- TOC entry 4931 (class 2606 OID 16843)
-- Name: cart_items cart_items_session_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_session_id_product_id_key UNIQUE (session_id, product_id);


--
-- TOC entry 4925 (class 2606 OID 16824)
-- Name: cart_sessions cart_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_sessions
    ADD CONSTRAINT cart_sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 4927 (class 2606 OID 16826)
-- Name: cart_sessions cart_sessions_session_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_sessions
    ADD CONSTRAINT cart_sessions_session_token_key UNIQUE (session_token);


--
-- TOC entry 4915 (class 2606 OID 16786)
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- TOC entry 4917 (class 2606 OID 16788)
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- TOC entry 4944 (class 2606 OID 16924)
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- TOC entry 4946 (class 2606 OID 16945)
-- Name: order_status_history order_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_pkey PRIMARY KEY (id);


--
-- TOC entry 4940 (class 2606 OID 16896)
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- TOC entry 4942 (class 2606 OID 16894)
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- TOC entry 4948 (class 2606 OID 16967)
-- Name: product_reviews product_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_pkey PRIMARY KEY (id);


--
-- TOC entry 4921 (class 2606 OID 16807)
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- TOC entry 4923 (class 2606 OID 16809)
-- Name: products products_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_slug_key UNIQUE (slug);


--
-- TOC entry 4934 (class 2606 OID 16871)
-- Name: promo_codes promo_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promo_codes
    ADD CONSTRAINT promo_codes_code_key UNIQUE (code);


--
-- TOC entry 4936 (class 2606 OID 16869)
-- Name: promo_codes promo_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promo_codes
    ADD CONSTRAINT promo_codes_pkey PRIMARY KEY (id);


--
-- TOC entry 4911 (class 2606 OID 16772)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 4913 (class 2606 OID 16770)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4932 (class 1259 OID 16995)
-- Name: idx_cart_session; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cart_session ON public.cart_items USING btree (session_id);


--
-- TOC entry 4937 (class 1259 OID 16994)
-- Name: idx_orders_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_created ON public.orders USING btree (created_at);


--
-- TOC entry 4938 (class 1259 OID 16993)
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_status ON public.orders USING btree (status);


--
-- TOC entry 4918 (class 1259 OID 16992)
-- Name: idx_products_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_active ON public.products USING btree (is_active);


--
-- TOC entry 4919 (class 1259 OID 16991)
-- Name: idx_products_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_category ON public.products USING btree (category_id);


--
-- TOC entry 4953 (class 2606 OID 16849)
-- Name: cart_items cart_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- TOC entry 4954 (class 2606 OID 16844)
-- Name: cart_items cart_items_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.cart_sessions(id) ON DELETE CASCADE;


--
-- TOC entry 4952 (class 2606 OID 16827)
-- Name: cart_sessions cart_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_sessions
    ADD CONSTRAINT cart_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4958 (class 2606 OID 16925)
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- TOC entry 4959 (class 2606 OID 16930)
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- TOC entry 4960 (class 2606 OID 16951)
-- Name: order_status_history order_status_history_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4961 (class 2606 OID 16946)
-- Name: order_status_history order_status_history_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- TOC entry 4955 (class 2606 OID 16907)
-- Name: orders orders_promo_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_promo_code_id_fkey FOREIGN KEY (promo_code_id) REFERENCES public.promo_codes(id) ON DELETE SET NULL;


--
-- TOC entry 4956 (class 2606 OID 16902)
-- Name: orders orders_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.cart_sessions(id) ON DELETE SET NULL;


--
-- TOC entry 4957 (class 2606 OID 16897)
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4962 (class 2606 OID 16968)
-- Name: product_reviews product_reviews_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- TOC entry 4963 (class 2606 OID 16973)
-- Name: product_reviews product_reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4951 (class 2606 OID 16810)
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


-- Completed on 2026-05-16 20:14:21

--
-- PostgreSQL database dump complete
--

\unrestrict ggUTeh26Mwjgq0nm5d00NODgexYPdg1kuGEpe7mCr7OwfDtNy3nVIchT7UHWkWk

