import { mkdtempSync, rmdirSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { describe, expect, it, vi } from 'vitest';

import { beginRoleplayTurn, createRoleplaySession, finishRoleplayTurn, requestRoleplayReply,
  setRoleplayConsent, setRoleplayMode } from '../services/speaking/roleplay-v5';

import { expoAdapter } from './fixtures/legacy_database';
import { budgetedRoleplayTransport, deleteRoleplayHistory, getRoleplayAiLimits, listRoleplayHistory, minimizeRoleplayHistory,
  reserveRoleplayAiAttempt, roleplaySchemaSQL, saveRoleplayHistory, setRoleplayAiLimits, validateRoleplayHistoryRecord } from './roleplay-history';

const date = new Date('2026-10-01T23:59:59.000Z');
const reply = { replyChinese: '你好', pinyin: 'Nǐ hǎo', translationVi: 'Chào', correctionVi: 'Chữ', suggestedChinese: '你呢' };
const completedSession = () => {
  const state = beginRoleplayTurn(createRoleplaySession(), 'PRIVATE_NAME 你好 AUDIO_URI');
  return finishRoleplayTurn(state, state.pending!.id, reply);
};
function fixture() {
  const sqlite = new DatabaseSync(':memory:'); sqlite.exec(roleplaySchemaSQL);
  return { sqlite, db: expoAdapter(sqlite) };
}

describe('minimized explicit roleplay history', () => {
  it('discards supplied transcript on opt-out; allows only separately opted-in bounded notes', () => {
    const row = minimizeRoleplayHistory('rp-1', completedSession(), false, 'PRIVATE_TRANSCRIPT', date);
    expect(row.transcript_summary).toBeNull();
    expect(JSON.stringify(row)).not.toMatch(/PRIVATE|AUDIO|replyChinese|score|exchanges/);
    expect(row.used_words_json).toBe('["你好"]');
    expect(minimizeRoleplayHistory('rp-1', completedSession(), true, '  short note  ', date).transcript_summary).toBe('short note');
    expect(() => minimizeRoleplayHistory('rp-1', completedSession(), true, 'x'.repeat(601), date)).toThrow();
    expect(() => minimizeRoleplayHistory('rp-1', beginRoleplayTurn(createRoleplaySession(), '你好'))).toThrow();
    expect(() => validateRoleplayHistoryRecord({ ...row, audio_uri: 'file://secret' })).toThrow();
    expect(() => validateRoleplayHistoryRecord({ ...row, transcript_summary: 'opt-out leak' })).toThrow();
  });
  it('saves/lists/deletes actual SQLite records with explicit confirmation and no quota refund', async () => {
    const { sqlite, db } = fixture();
    try {
      const row = minimizeRoleplayHistory('rp-1', completedSession(), false, '', date);
      await saveRoleplayHistory(db, row);
      await reserveRoleplayAiAttempt(db, 'rp-1', date);
      expect(await listRoleplayHistory(db)).toEqual([row]);
      await expect(saveRoleplayHistory(db, { ...row, level: 2 })).rejects.toThrow();
      expect((await listRoleplayHistory(db))[0]!.level).toBe(1);
      await expect(deleteRoleplayHistory(db, 'rp-1', false)).rejects.toThrow();
      expect(await listRoleplayHistory(db)).toHaveLength(1);
      await deleteRoleplayHistory(db, 'rp-1', true);
      expect(await listRoleplayHistory(db)).toEqual([]);
      expect(sqlite.prepare('SELECT attempts FROM roleplay_ai_usage').get()?.attempts).toBe(1);
    } finally { sqlite.close(); }
  });
  it('keeps only 100 ordered summaries', async () => {
    const { sqlite, db } = fixture();
    try {
      for (let i = 0; i < 101; i++) await saveRoleplayHistory(db,
        minimizeRoleplayHistory(`rp-${i}`, completedSession(), false, '', new Date(date.getTime() + i)));
      const rows = await listRoleplayHistory(db);
      expect(rows).toHaveLength(100); expect(rows[0]!.id).toBe('rp-100');
      expect(rows.some((row) => row.id === 'rp-0')).toBe(false);
    } finally { sqlite.close(); }
  });
});

describe('durable transactional attempt budgets', () => {
  it('retains history, budget and settings after closing/reopening a real database file', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'roleplay-v5-'));
    const path = join(directory, 'roleplay.sqlite');
    let sqlite = new DatabaseSync(path);
    try {
      sqlite.exec(roleplaySchemaSQL);
      await setRoleplayAiLimits(expoAdapter(sqlite), { daily_limit: 1, session_limit: 4 });
      await saveRoleplayHistory(expoAdapter(sqlite), minimizeRoleplayHistory('rp-durable', completedSession(), false, '', date));
      await reserveRoleplayAiAttempt(expoAdapter(sqlite), 'rp-durable', date);
      sqlite.close(); sqlite = new DatabaseSync(path);
      expect(await listRoleplayHistory(expoAdapter(sqlite))).toHaveLength(1);
      expect(await getRoleplayAiLimits(expoAdapter(sqlite))).toEqual({ daily_limit: 1, session_limit: 4 });
      await expect(reserveRoleplayAiAttempt(expoAdapter(sqlite), 'rp-reopened', date)).rejects.toMatchObject({ code: 'daily-limit' });
    } finally { sqlite.close(); unlinkSync(path); rmdirSync(directory); }
  });
  it('persists settings, caps daily attempts across reset/new sessions and survives adapter restart', async () => {
    const { sqlite, db } = fixture();
    try {
      await setRoleplayAiLimits(db, { daily_limit: 2, session_limit: 4 });
      await reserveRoleplayAiAttempt(db, 'rp-1', date);
      await reserveRoleplayAiAttempt(db, 'rp-reset', date);
      const restarted = expoAdapter(sqlite);
      expect(await getRoleplayAiLimits(restarted)).toEqual({ daily_limit: 2, session_limit: 4 });
      await expect(reserveRoleplayAiAttempt(restarted, 'rp-new', date)).rejects.toMatchObject({ code: 'daily-limit' });
      expect(sqlite.prepare('SELECT SUM(attempts) AS total FROM roleplay_ai_usage').get()?.total).toBe(2);
      await expect(setRoleplayAiLimits(db, { daily_limit: 101, session_limit: 4 })).rejects.toThrow();
    } finally { sqlite.close(); }
  });
  it('caps session attempts even across UTC rollover, resets daily allowance and rejects backwards clock', async () => {
    const { sqlite, db } = fixture();
    try {
      await setRoleplayAiLimits(db, { daily_limit: 4, session_limit: 4 });
      for (let i = 0; i < 4; i++) await reserveRoleplayAiAttempt(db, 'rp-same', date);
      const tomorrow = new Date('2026-10-02T00:00:00.000Z');
      await expect(reserveRoleplayAiAttempt(db, 'rp-same', tomorrow)).rejects.toMatchObject({ code: 'session-limit' });
      await reserveRoleplayAiAttempt(db, 'rp-new', tomorrow);
      await expect(reserveRoleplayAiAttempt(db, 'rp-clock', date)).rejects.toMatchObject({ code: 'quota-unavailable' });
      expect(sqlite.prepare('SELECT SUM(attempts) AS total FROM roleplay_ai_usage').get()?.total).toBe(5);
    } finally { sqlite.close(); }
  });
  it('uses an atomic conditional statement when competing reservations reach the cap', async () => {
    const { sqlite, db } = fixture();
    try {
      await setRoleplayAiLimits(db, { daily_limit: 1, session_limit: 4 });
      const results = await Promise.allSettled([reserveRoleplayAiAttempt(db, 'rp-a', date), reserveRoleplayAiAttempt(db, 'rp-b', date)]);
      expect(results.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
      expect(sqlite.prepare('SELECT SUM(attempts) AS total FROM roleplay_ai_usage').get()?.total).toBe(1);
    } finally { sqlite.close(); }
  });
  it('fails closed on missing schema/config/storage without invoking the provider', async () => {
    const sqlite = new DatabaseSync(':memory:');
    try {
      const db = expoAdapter(sqlite); const provider = vi.fn();
      const pending = beginRoleplayTurn(setRoleplayMode(setRoleplayConsent(createRoleplaySession(), true), 'AI'), '你好');
      await expect(requestRoleplayReply(pending, new AbortController().signal,
        budgetedRoleplayTransport(db, 'rp-no-schema', provider, () => date))).rejects.toMatchObject({ code: 'quota-unavailable' });
      expect(provider).not.toHaveBeenCalled();
      sqlite.exec(roleplaySchemaSQL); sqlite.exec('DELETE FROM roleplay_ai_limits');
      await expect(reserveRoleplayAiAttempt(db, 'rp-no-config', date)).rejects.toMatchObject({ code: 'quota-unavailable' });
    } finally { sqlite.close(); }
  });
  it('counts failed/no-auth and cancelled reserved attempts once, with no hidden retries', async () => {
    const { sqlite, db } = fixture();
    try {
      const provider = vi.fn().mockRejectedValue({ code: 'login-required' });
      const pending = beginRoleplayTurn(setRoleplayMode(setRoleplayConsent(createRoleplaySession(), true), 'AI'), '你好');
      await expect(requestRoleplayReply(pending, new AbortController().signal,
        budgetedRoleplayTransport(db, 'rp-failure', provider, () => date))).rejects.toMatchObject({ code: 'login-required' });
      expect(provider).toHaveBeenCalledOnce();
      const controller = new AbortController();
      await expect(requestRoleplayReply(pending, controller.signal, async () => {
        await reserveRoleplayAiAttempt(db, 'rp-cancel', date); controller.abort(); return reply;
      })).rejects.toMatchObject({ code: 'cancelled' });
      expect(sqlite.prepare('SELECT SUM(attempts) AS total FROM roleplay_ai_usage').get()?.total).toBe(2);
    } finally { sqlite.close(); }
  });
  it('never sends when consent/lifecycle cancellation occurs during quota reservation', async () => {
    const { sqlite, db } = fixture();
    try {
      const controller = new AbortController(); const provider = vi.fn();
      const run = db.runAsync.bind(db);
      vi.spyOn(db, 'runAsync').mockImplementation(async (...args) => {
        const result = await run(...args); controller.abort(); return result;
      });
      const pending = beginRoleplayTurn(setRoleplayMode(setRoleplayConsent(createRoleplaySession(), true), 'AI'), '你好');
      await expect(requestRoleplayReply(pending, controller.signal,
        budgetedRoleplayTransport(db, 'rp-reserve-cancel', provider, () => date))).rejects.toMatchObject({ code: 'cancelled' });
      expect(provider).not.toHaveBeenCalled();
      expect(sqlite.prepare('SELECT attempts FROM roleplay_ai_usage').get()?.attempts).toBe(1);
    } finally { sqlite.close(); }
  });
});
