CREATE TABLE public.native_auth_handoff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge text NOT NULL,
  refresh_token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.native_auth_handoff TO service_role;
ALTER TABLE public.native_auth_handoff ENABLE ROW LEVEL SECURITY;