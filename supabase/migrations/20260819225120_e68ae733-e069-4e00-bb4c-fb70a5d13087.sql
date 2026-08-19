DROP POLICY IF EXISTS "Anon can read all sessions" ON public.analysis_sessions;
CREATE POLICY "Deny anon read" ON public.analysis_sessions FOR SELECT TO anon USING (false);
REVOKE SELECT ON public.analysis_sessions FROM anon;

GRANT ALL ON public.rate_limits TO service_role;
REVOKE ALL ON public.rate_limits FROM anon, authenticated;
CREATE POLICY "Service role manages rate limits" ON public.rate_limits FOR ALL TO service_role USING (true) WITH CHECK (true);