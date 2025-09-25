-- Create a function and trigger to auto-generate paper_batch_id when null/empty
-- Format: Paper_Batch_### incrementing from highest existing numeric suffix

create or replace function public.generate_paper_batch_id()
returns trigger as $$
declare
  max_num int := 0;
  next_num int;
  candidate text;
begin
  if new.paper_batch_id is null or length(trim(new.paper_batch_id)) = 0 then
    -- get highest numeric suffix in existing rows
    select coalesce(max((regexp_matches(paper_batch_id, '(\d+)$'))[1]::int), 0)
    into max_num
    from public.batches
    where paper_batch_id ~ '(\d+)$';

    next_num := max_num + 1;
    candidate := 'Paper_Batch_' || lpad(next_num::text, 3, '0');
    new.paper_batch_id := candidate;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_generate_paper_batch_id on public.batches;

create trigger trg_generate_paper_batch_id
before insert on public.batches
for each row
execute function public.generate_paper_batch_id();


