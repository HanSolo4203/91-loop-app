-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.batch_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL,
  linen_category_id uuid NOT NULL,
  quantity_sent integer NOT NULL DEFAULT 0,
  quantity_received integer NOT NULL DEFAULT 0,
  price_per_item numeric NOT NULL DEFAULT 0.00,
  subtotal numeric NOT NULL DEFAULT 0.00,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  discrepancy_details text,
  CONSTRAINT batch_items_pkey PRIMARY KEY (id),
  CONSTRAINT batch_items_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batches(id),
  CONSTRAINT batch_items_linen_category_id_fkey FOREIGN KEY (linen_category_id) REFERENCES public.linen_categories(id)
);
CREATE TABLE public.batches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  paper_batch_id text NOT NULL UNIQUE,
  system_batch_id text NOT NULL UNIQUE,
  client_id uuid NOT NULL,
  pickup_date date NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'pickup'::batch_status,
  total_amount numeric NOT NULL DEFAULT 0.00,
  has_discrepancy boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT batches_pkey PRIMARY KEY (id),
  CONSTRAINT batches_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id)
);
CREATE TABLE public.clients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_number text,
  email text,
  address text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT clients_pkey PRIMARY KEY (id)
);
CREATE TABLE public.linen_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  price_per_item numeric NOT NULL DEFAULT 0.00,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT linen_categories_pkey PRIMARY KEY (id)
);