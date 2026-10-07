import { describe, expect, it, vi } from 'vitest';

import { expoAdapter, createLegacyDatabase } from '@/db/fixtures/legacy_database';
import { migrateDatabaseSchema } from '@/db/migrations';
import { runManualSync } from '@/services/cloud/manual-sync';

const accountId = '11111111-1111-1111-1111-111111111111';
const deviceId = 'device-test-123';

describe('manual sync', () => {
  it('pulls before queueing and sends only changed settings and decks', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      await db.runAsync(`UPDATE user_settings SET value=?,updated_at=? WHERE id=1`, '{"soundEnabled":true}', '2026-09-29T00:00:00.000Z');
      await db.runAsync(`INSERT INTO personal_deck(id,name,color,created_at,updated_at) VALUES(?,?,?,?,?)`,
        'deck-sync-1', 'Đồng bộ', '#2457D6', '2026-09-29T00:00:00.000Z', '2026-09-29T00:00:00.000Z');
      const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
        if (name === 'sync_pull_v1') return { data: [], error: null };
        const operations = args.p_operations as { operation_id: string }[];
        return { data: operations.map((operation) => ({ operation_id: operation.operation_id })), error: null };
      });
      const client = { auth: { getUser: async () => ({ data: { user: { id: accountId } }, error: null }) }, rpc } as never;

      const first = await runManualSync(db, client, deviceId, 'PREFER_REMOTE');
      expect(first.pushed).toMatchObject({ attempted: 3, completed: 3, deferred: 0 });
      expect(sqlite.prepare("SELECT COUNT(*) AS count FROM sync_entity_state WHERE account_id=?").get(accountId))
        .toEqual({ count: 3 });

      const second = await runManualSync(db, client, deviceId, 'PREFER_REMOTE');
      expect(second.pushed).toMatchObject({ attempted: 0, completed: 0, deferred: 0 });
    } finally { sqlite.close(); }
  });

  it('applies a newer remote deck before it snapshots local state', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      let pulled = false;
      const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
        if (name === 'sync_pull_v1') {
          if (pulled) return { data: [], error: null };
          pulled = true;
          return { data: [{ cursor_id: 7, entity_type: 'DECK', entity_id: 'deck-remote-1',
            payload: { id: 'deck-remote-1', name: 'Từ trên máy khác', color: '#1155CC',
              createdAt: '2026-09-29T00:00:00.000Z', updatedAt: '2026-09-29T01:00:00.000Z' },
            deleted_at: null, updated_at: '2026-09-29T01:00:00.000Z', device_id: 'device-remote-2' }], error: null };
        }
        const operations = args.p_operations as { operation_id: string }[];
        return { data: operations.map((operation) => ({ operation_id: operation.operation_id })), error: null };
      });
      const client = { auth: { getUser: async () => ({ data: { user: { id: accountId } }, error: null }) }, rpc } as never;

      const result = await runManualSync(db, client, deviceId, 'PREFER_REMOTE');
      expect(result).toMatchObject({ pulled: 1, applied: 1 });
      expect(sqlite.prepare('SELECT name,deleted_at FROM personal_deck WHERE id=?').get('deck-remote-1'))
        .toEqual({ name: 'Từ trên máy khác', deleted_at: null });
      expect(sqlite.prepare('SELECT remote_cursor FROM sync_cursor WHERE account_id=?').get(accountId))
        .toEqual({ remote_cursor: '7' });
    } finally { sqlite.close(); }
  });

  it('uses remote settings on a first sync even when a fresh device timestamp is newer', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      await db.runAsync(`UPDATE user_settings SET value=?,updated_at=? WHERE id=1`, '{"soundEnabled":true}', '2030-01-01T00:00:00.000Z');
      let pulled = false;
      const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
        if (name === 'sync_pull_v1') {
          if (pulled) return { data: [], error: null };
          pulled = true;
          return { data: [{ cursor_id: 2, entity_type: 'SETTINGS', entity_id: 'settings',
            payload: { id: 'settings', value: '{"soundEnabled":false}', updatedAt: '2026-09-29T00:00:00.000Z' },
            deleted_at: null, updated_at: '2026-09-29T00:00:00.000Z', device_id: 'device-remote-2' }], error: null };
        }
        const operations = args.p_operations as { operation_id: string }[];
        return { data: operations.map((operation) => ({ operation_id: operation.operation_id })), error: null };
      });
      const client = { auth: { getUser: async () => ({ data: { user: { id: accountId } }, error: null }) }, rpc } as never;

      await runManualSync(db, client, deviceId, 'PREFER_REMOTE');
      expect(sqlite.prepare('SELECT value,updated_at FROM user_settings WHERE id=1').get())
        .toEqual({ value: '{"soundEnabled":false}', updated_at: '2026-09-29T00:00:00.000Z' });
    } finally { sqlite.close(); }
  });});