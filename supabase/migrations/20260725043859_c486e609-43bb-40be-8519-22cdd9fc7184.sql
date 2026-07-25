GRANT SELECT ON public.analysis_sessions TO anon;

DROP POLICY IF EXISTS "Deny all anon access" ON public.analysis_sessions;
CREATE POLICY "Deny all anon access" ON public.analysis_sessions FOR SELECT TO anon USING (false);
CREATE POLICY "Deny all anon insert" ON public.analysis_sessions FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "Deny all anon update" ON public.analysis_sessions FOR UPDATE TO anon USING (false);
CREATE POLICY "Deny all anon delete" ON public.analysis_sessions FOR DELETE TO anon USING (false);