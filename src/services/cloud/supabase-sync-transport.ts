import type { SupabaseClient } from '@supabase/supabase-js';

import type { SyncTransport } from '@/services/cloud/sync-engine';
import type { SyncOperation } from '@/services/cloud/sync-policy';

type PushRow = { operation_id?: unknown };

function toRemoteOperation(operation: SyncOperation, deviceId: string): Record<string, unknown> {
  let payload: unknown;
  try { payload = JSON.parse(operation.payloadJson); } catch { throw new Error('INVALID_SYNC_PAYLOAD'); }
  return {
    operation_id: operation.id,
    entity_type: operation.entityType,
    entity_id: operation.entityId,
    operation: operation.operation,
    payload,
    created_at: operation.createdAt,
    updated_at: operation.updatedAt,
    device_id: deviceId,
  };
}

/**
 * The function call keeps all writes behind the authenticated Supabase RLS
 * boundary. It intentionally accepts only outbox operations, never a caller-
 * supplied account id.
 */
export function createSupabaseSyncTransport(client: SupabaseClient, deviceId: string): SyncTransport {
  return {
    async push(operations) {
      if (!operations.length) return { acceptedOperationIds: [] };
      const { data, error } = await client.rpc('sync_push_v1', {
        p_operations: operations.map((operation) => toRemoteOperation(operation, deviceId)),
      });
      if (error) throw Object.assign(new Error('SYNC_REMOTE_REJECTED'), { code: error.code ?? 'REMOTE_REJECTED' });
      if (!Array.isArray(data)) throw Object.assign(new Error('SYNC_INVALID_RESPONSE'), { code: 'INVALID_RESPONSE' });
      const acceptedOperationIds = data.flatMap((row: PushRow) =>
        typeof row.operation_id === 'string' ? [row.operation_id] : []);
      return { acceptedOperationIds };
    },
  };
}
