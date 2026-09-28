import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import { cloudBackupPath, uploadCloudBackup } from './backup';

import { createBackupArchive } from '@/services/backup/archive';
import { createLocalBackup } from '@/services/backup/format';

const uid = '12345678-1234-1234-1234-123456789abc';

describe('cloud backup path isolation', () => {
  it('builds only owner-scoped immutable ZIP paths', () => {
    expect(cloudBackupPath(uid, 'backup-1720000000000-abcdef.zip'))
      .toBe(`${uid}/backup-1720000000000-abcdef.zip`);
  });

  it.each(['../other.zip', 'backup-1720000000000-abcdef.json', 'a/b.zip',
    'backup-1720000000000-abcdef.zip/../x'])('rejects untrusted filenames: %s', (name) => {
    expect(() => cloudBackupPath(uid, name)).toThrow();
  });

  it('validates a ZIP before attempting any network upload', async () => {
    let contacted = false;
    const fake = { auth: { getUser: async () => { contacted = true; return { data: { user: { id: uid } }, error: null }; } } } as unknown as SupabaseClient;
    await expect(uploadCloudBackup(fake, Uint8Array.of(1, 2, 3))).rejects.toThrow();
    expect(contacted).toBe(false);
  });

  it('uploads a valid archive only under the signed-in user folder', async () => {
    let path = '';
    const fake = {
      auth: { getUser: async () => ({ data: { user: { id: uid } }, error: null }) },
      storage: { from: () => ({ upload: async (name: string) => { path = name; return { error: null }; } }) },
    } as unknown as SupabaseClient;
    const archive = createBackupArchive(createLocalBackup({ userSettings: [], personalDecks: [],
      customVocabulary: [], exampleSentences: [], vocabularyProgress: [], reviewLogs: [], dailyStats: [] }, 'test'), []);
    await uploadCloudBackup(fake, archive);
    expect(path).toMatch(new RegExp(`^${uid}/backup-\\d{13}-[a-z0-9]{6}\\.zip$`));
  });
});
