-- Add bank account details fields to business_settings
alter table public.business_settings
  add column if not exists bank_name text,
  add column if not exists bank_account_name text,
  add column if not exists bank_account_number text,
  add column if not exists bank_branch_code text,
  add column if not exists bank_account_type text,
  add column if not exists bank_payment_reference text;



