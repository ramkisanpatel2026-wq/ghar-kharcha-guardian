
CREATE TABLE public.savings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  category text NOT NULL DEFAULT 'Bank Savings',
  saved_on date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.savings TO authenticated;
GRANT ALL ON public.savings TO service_role;

ALTER TABLE public.savings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own savings" ON public.savings
  FOR ALL TO authenticated
  USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER savings_set_updated_at
  BEFORE UPDATE ON public.savings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX savings_user_date_idx ON public.savings(user_id, saved_on DESC);
