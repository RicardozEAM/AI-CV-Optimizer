CREATE TABLE public.analysis_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  recruiter_email text,
  position text NOT NULL,
  candidate_name text,
  initial_score integer NOT NULL,
  updated_score integer,
  harvard_generated boolean NOT NULL DEFAULT false,
  anonimized boolean NOT NULL DEFAULT true,
  answers jsonb
);

GRANT ALL ON public.analysis_sessions TO service_role;

ALTER TABLE public.analysis_sessions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_analysis_sessions_updated_at
BEFORE UPDATE ON public.analysis_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();