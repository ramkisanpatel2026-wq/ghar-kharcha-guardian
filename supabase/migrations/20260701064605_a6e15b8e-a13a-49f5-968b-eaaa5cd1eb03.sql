
-- Storage: allow users to UPDATE their own files in the bills bucket
CREATE POLICY "Users can update own bills"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'bills' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'bills' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Revoke direct EXECUTE on SECURITY DEFINER functions that should only run
-- as triggers, not be callable by signed-in users.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
