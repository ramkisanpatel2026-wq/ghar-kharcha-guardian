-- Owners keep full control of their own rows; admins can only READ other users' rows
-- (no admin edit/delete of another family's data). No data is changed.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['categories','expenses','profiles','reminders','salary_entries','savings','udhari'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "own %s" ON public.%I', CASE t WHEN 'categories' THEN 'categories' WHEN 'expenses' THEN 'expenses' WHEN 'profiles' THEN 'profile' WHEN 'reminders' THEN 'reminders' WHEN 'salary_entries' THEN 'salary' WHEN 'savings' THEN 'savings' ELSE 'udhari' END, t);
    EXECUTE format('DROP POLICY IF EXISTS "owner full access" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "admin read all" ON public.%I', t);
    EXECUTE format('CREATE POLICY "owner full access" ON public.%I FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', t);
    EXECUTE format('CREATE POLICY "admin read all" ON public.%I FOR SELECT TO authenticated USING (public.has_role(auth.uid(), ''admin''::public.app_role))', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;

-- Savings rows were the only table without a link to the account; add it without
-- touching existing rows (NOT VALID skips checking old rows).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'savings_user_id_fkey') THEN
    ALTER TABLE public.savings
      ADD CONSTRAINT savings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
  END IF;
END $$;