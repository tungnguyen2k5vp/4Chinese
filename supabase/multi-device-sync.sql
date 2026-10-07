-- Phase 35 / sync v1. Run this in the intended Supabase project before
-- enabling a Sync Now UI. It is additive and has no service-role dependency.

CREATE TABLE IF NOT EXISTS public.sync_records (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK(entity_type IN ('SETTINGS','DECK','VOCABULARY','PROGRESS','READING')),
  entity_id text NOT NULL CHECK(entity_id ~ '^[A-Za-z0-9:_-]{1,160}$'),
  payload jsonb NOT NULL CHECK(jsonb_typeof(payload) = 'object'),
  deleted_at timestamptz,
  updated_at timestamptz NOT NULL,
  device_id text NOT NULL DEFAULT 'unknown',
  last_operation_id text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, entity_type, entity_id)
);

CREATE TABLE IF NOT EXISTS public.sync_operations (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_id text NOT NULL CHECK(operation_id ~ '^[A-Za-z0-9:_-]{1,160}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, operation_id)
);

CREATE TABLE IF NOT EXISTS public.sync_change_log (
  cursor_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_change_log_pull
  ON public.sync_change_log(user_id, cursor_id);

ALTER TABLE public.sync_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "4chinese_sync_records_own" ON public.sync_records FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "4chinese_sync_operations_own" ON public.sync_operations FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "4chinese_sync_change_log_own" ON public.sync_change_log FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.sync_push_v1(p_operations jsonb)
RETURNS TABLE(operation_id text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  op jsonb;
  current_user_id uuid := auth.uid();
  incoming_updated_at timestamptz;
  incoming_deleted_at timestamptz;
  did_insert boolean;
  changed_count integer;
BEGIN
  IF current_user_id IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF jsonb_typeof(p_operations) <> 'array' OR jsonb_array_length(p_operations) > 50 THEN
    RAISE EXCEPTION 'INVALID_SYNC_BATCH';
  END IF;

  FOR op IN SELECT value FROM jsonb_array_elements(p_operations)
  LOOP
    IF jsonb_typeof(op) <> 'object'
      OR COALESCE(op->>'operation_id', '') !~ '^[A-Za-z0-9:_-]{1,160}$'
      OR COALESCE(op->>'entity_id', '') !~ '^[A-Za-z0-9:_-]{1,160}$'
      OR COALESCE(op->>'entity_type', '') NOT IN ('SETTINGS','DECK','VOCABULARY','PROGRESS','READING')
      OR COALESCE(op->>'operation', '') NOT IN ('UPSERT','DELETE')
      OR jsonb_typeof(op->'payload') <> 'object'
    THEN RAISE EXCEPTION 'INVALID_SYNC_OPERATION'; END IF;

    INSERT INTO sync_operations(user_id,operation_id) VALUES(current_user_id,op->>'operation_id')
      ON CONFLICT DO NOTHING RETURNING true INTO did_insert;
    IF COALESCE(did_insert, false) THEN
      incoming_updated_at := COALESCE((op->>'updated_at')::timestamptz, now());
      incoming_deleted_at := CASE WHEN op->>'operation' = 'DELETE' THEN incoming_updated_at ELSE NULL END;
      INSERT INTO sync_records(user_id,entity_type,entity_id,payload,deleted_at,updated_at,device_id,last_operation_id,changed_at)
        VALUES(current_user_id,op->>'entity_type',op->>'entity_id',op->'payload',incoming_deleted_at,
          incoming_updated_at,COALESCE(op->>'device_id','unknown'),op->>'operation_id',now())
        ON CONFLICT(user_id,entity_type,entity_id) DO UPDATE SET
          payload = EXCLUDED.payload, deleted_at = EXCLUDED.deleted_at, updated_at = EXCLUDED.updated_at,
          device_id = EXCLUDED.device_id, last_operation_id = EXCLUDED.last_operation_id, changed_at = EXCLUDED.changed_at
        WHERE sync_records.updated_at < EXCLUDED.updated_at
          OR (sync_records.updated_at = EXCLUDED.updated_at AND sync_records.device_id <= EXCLUDED.device_id);
      GET DIAGNOSTICS changed_count = ROW_COUNT;
      IF changed_count > 0 THEN
        INSERT INTO sync_change_log(user_id,entity_type,entity_id) VALUES(current_user_id,op->>'entity_type',op->>'entity_id');
      END IF;
    END IF;
    operation_id := op->>'operation_id';
    RETURN NEXT;
    did_insert := false;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_pull_v1(p_after_cursor bigint DEFAULT 0, p_limit integer DEFAULT 100)
RETURNS TABLE(cursor_id bigint, entity_type text, entity_id text, payload jsonb, deleted_at timestamptz, updated_at timestamptz, device_id text)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT c.cursor_id,r.entity_type,r.entity_id,r.payload,r.deleted_at,r.updated_at,r.device_id
  FROM sync_change_log c JOIN sync_records r ON r.user_id=c.user_id AND r.entity_type=c.entity_type AND r.entity_id=c.entity_id
  WHERE c.user_id = auth.uid() AND c.cursor_id > GREATEST(p_after_cursor, 0)
  ORDER BY c.cursor_id ASC
  LIMIT LEAST(GREATEST(p_limit, 1), 100);
$$;
-- Only a valid Supabase session may invoke the sync RPCs. RLS remains the
-- record-level authorization boundary inside both SECURITY INVOKER functions.
REVOKE ALL ON FUNCTION public.sync_push_v1(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_pull_v1(bigint, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_push_v1(jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.sync_pull_v1(bigint, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.sync_push_v1(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_pull_v1(bigint, integer) TO authenticated;
