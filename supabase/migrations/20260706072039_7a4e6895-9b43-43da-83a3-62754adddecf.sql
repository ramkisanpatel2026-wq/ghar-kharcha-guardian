DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'salary_entries'
      AND column_name = 'salary_key'
  ) THEN
    ALTER TABLE public.salary_entries ADD COLUMN salary_key text;
  END IF;
END $$;

UPDATE public.salary_entries
SET
  source = 'Salary',
  salary_key = 'salary_' || to_char(month, 'YYYY_MM')
WHERE salary_key IS NULL
   OR salary_key <> 'salary_' || to_char(month, 'YYYY_MM')
   OR source <> 'Salary';

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY user_id, month
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM public.salary_entries
)
DELETE FROM public.salary_entries s
USING ranked r
WHERE s.id = r.id
  AND r.rn > 1;

ALTER TABLE public.salary_entries
  ALTER COLUMN salary_key SET NOT NULL;

ALTER TABLE public.salary_entries
  ALTER COLUMN amount SET DEFAULT 0;

ALTER TABLE public.salary_entries
  ALTER COLUMN source SET DEFAULT 'Salary';

ALTER TABLE public.salary_entries
  DROP CONSTRAINT IF EXISTS salary_entries_user_month_source_unique;

ALTER TABLE public.salary_entries
  DROP CONSTRAINT IF EXISTS salary_entries_user_month_unique;

ALTER TABLE public.salary_entries
  ADD CONSTRAINT salary_entries_user_month_unique UNIQUE (user_id, month);

ALTER TABLE public.salary_entries
  DROP CONSTRAINT IF EXISTS salary_entries_user_salary_key_unique;

ALTER TABLE public.salary_entries
  ADD CONSTRAINT salary_entries_user_salary_key_unique UNIQUE (user_id, salary_key);

ALTER TABLE public.salary_entries
  DROP CONSTRAINT IF EXISTS salary_entries_amount_non_negative;

ALTER TABLE public.salary_entries
  ADD CONSTRAINT salary_entries_amount_non_negative CHECK (amount >= 0);

CREATE OR REPLACE FUNCTION public.set_salary_entry_key()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.source := 'Salary';
  NEW.amount := COALESCE(NEW.amount, 0);
  NEW.salary_key := 'salary_' || to_char(NEW.month, 'YYYY_MM');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_salary_entry_key_before_write ON public.salary_entries;
CREATE TRIGGER set_salary_entry_key_before_write
BEFORE INSERT OR UPDATE ON public.salary_entries
FOR EACH ROW
EXECUTE FUNCTION public.set_salary_entry_key();