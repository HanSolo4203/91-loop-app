-- Create a sequence-backed generator and trigger to auto-generate paper_batch_id when null/empty
-- Format: numeric string with zero-padding (e.g., 001, 002, ...)

-- Create sequence if not exists
do $$
begin
  if not exists (
    select 1 from pg_class where relkind = 'S' and relname = 'paper_batch_id_seq'
  ) then
    create sequence public.paper_batch_id_seq;
  end if;
end$$;

-- Initialize the sequence to max existing numeric suffix (once)
do $$
declare
  curr_max int := 0;
begin
  select coalesce(max((substring(paper_batch_id from '(\d+)$'))::int), 0)
    into curr_max
    from public.batches
   where paper_batch_id ~ '(\d+)$';

  perform setval('public.paper_batch_id_seq', curr_max);
end$$;

create or replace function public.generate_paper_batch_id()
returns trigger as $$
declare
  next_num int;
begin
  if new.paper_batch_id is null or length(trim(new.paper_batch_id)) = 0 then
    next_num := nextval('public.paper_batch_id_seq');
    new.paper_batch_id := 'RSL' || lpad(next_num::text, 4, '0');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_generate_paper_batch_id on public.batches;

create trigger trg_generate_paper_batch_id
before insert on public.batches
for each row
execute function public.generate_paper_batch_id();


