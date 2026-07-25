DROP POLICY IF EXISTS "Deny all anon access" ON public.analysis_sessions;
DROP POLICY IF EXISTS "Deny all anon insert" ON public.analysis_sessions;
DROP POLICY IF EXISTS "Deny all anon update" ON public.analysis_sessions;
DROP POLICY IF EXISTS "Deny all anon delete" ON public.analysis_sessions;

CREATE POLICY "Anon can read all sessions" ON public.analysis_sessions FOR SELECT TO anon USING (true);
CREATE POLICY "Deny anon insert" ON public.analysis_sessions FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "Deny anon update" ON public.analysis_sessions FOR UPDATE TO anon USING (false);
CREATE POLICY "Deny anon delete" ON public.analysis_sessions FOR DELETE TO anon USING (false);