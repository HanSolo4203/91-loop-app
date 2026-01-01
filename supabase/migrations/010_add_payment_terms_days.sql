-- Add payment_terms_days field to business_settings
alter table public.business_settings
  add column if not exists payment_terms_days integer default 8;

comment on column public.business_settings.payment_terms_days is 'Number of days for payment terms (default: 8 days)';

