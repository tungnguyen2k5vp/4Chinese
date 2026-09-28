-- Run in the Supabase project's SQL editor before enabling Cloud Backup UI.
-- Files are private and can only be addressed inside auth.uid()'s folder.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('user-backups', 'user-backups', false, 104857600, ARRAY['application/zip'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 104857600,
  allowed_mime_types = ARRAY['application/zip'];

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = '4chinese_backup_select_own') THEN
    CREATE POLICY "4chinese_backup_select_own" ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = 'user-backups' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = '4chinese_backup_insert_own') THEN
    CREATE POLICY "4chinese_backup_insert_own" ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'user-backups' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = '4chinese_backup_delete_own') THEN
    CREATE POLICY "4chinese_backup_delete_own" ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'user-backups' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
  END IF;
END $$;
