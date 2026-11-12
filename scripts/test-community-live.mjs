// Explicit opt-in. Creates and deletes only tagged synthetic community users.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

if (!process.argv.includes('--run-live')) throw new Error('Use --run-live to test the configured social backend.');
const env = process.loadEnvFile ? (() => { process.loadEnvFile('.env'); return process.env; })() : process.env;
const ref = 'xxuxvcqkojevqerrpsyo', url = env.EXPO_PUBLIC_SUPABASE_URL, key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
assert.equal(url?.replace(/\/$/, ''), `https://${ref}.supabase.co`); assert.ok(key);
const run = `social-qa-${randomUUID()}`, users = [], clients = [];
let admin;
const client = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
async function rpc(c, action, data = {}) {
  const result = await c.rpc(['profile', 'feed', 'post', 'post_view'].includes(action) ? 'social_community_api' : 'social_api', { p_action: action, p_data: data });
  if (result.error) throw new Error(`social ${action}: ${result.error.code} ${result.error.message}`);
  return result.data;
}
async function rejected(c, action, data, reason) {
  const result = await c.rpc(['profile', 'feed', 'post', 'post_view'].includes(action) ? 'social_community_api' : 'social_api', { p_action: action, p_data: data });
  assert.ok(result.error?.message.includes(reason), `${action} must reject ${reason}`);
}
async function subscribe(c, recipient, onMessage) {
  const session = (await c.auth.getSession()).data.session;
  await c.realtime.setAuth(session.access_token);
  const channel = c.channel(`${run}-${randomUUID()}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'social_messages', filter: `recipient_id=eq.${recipient}` }, onMessage);
  channel.on('system', {}, event => console.log('Realtime system:', event.status, event.message));
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Realtime subscription timed out')), 15000);
    channel.subscribe(status => { if (status === 'SUBSCRIBED') { clearTimeout(timeout); resolve(); } else if (status === 'CHANNEL_ERROR') { clearTimeout(timeout); reject(new Error('Realtime subscription failed')); } });
  });
  return channel;
}
try {
  // CLI returns credentials only into process memory; never log or persist its output.
  let listed;
  try { listed = JSON.parse(execFileSync(process.execPath, [resolve('node_modules/supabase/dist/supabase.js'), 'projects', 'api-keys', '--project-ref', ref, '--output', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })); }
  catch { throw new Error('Official Supabase CLI authentication is required; credential output was suppressed.'); }
  const service = listed.find(k => k.name === 'service_role')?.api_key; assert.ok(service, 'CLI service key required for synthetic-user cleanup');
  admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  for (let n = 0; n < 3; n++) {
    const c = client(); clients.push(c);
    let result;
    if (process.argv.includes('--guest')) result = await c.auth.signInAnonymously({ options: { data: { social_qa_run: run } } });
    else {
      const email = `${run}-${n}@example.test`, password = randomUUID() + randomUUID();
      const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { social_qa_run: run } });
      assert.equal(created.error, null, 'seed QA user without sending email'); users.push(created.data.user.id);
      result = await c.auth.signInWithPassword({ email, password });
    }
    assert.equal(result.error, null, 'QA sign in'); assert.ok(result.data.user); if (!users.includes(result.data.user.id)) users.push(result.data.user.id);
    await rpc(c, 'profile', { display_name: `QA tạm ${n + 1}` });
  }
  const [a, b, outsider] = clients, [aId, bId] = users;
  const p = await rpc(a, 'profile'), p2 = await rpc(b, 'profile'); assert.notEqual(p.handle, p2.handle);
  assert.equal((await rpc(a, 'search', { handle: p2.handle })).profile.id, bId);
  await rpc(a, 'friend', { peer: bId, verb: 'request' });
  await rpc(b, 'friend', { peer: aId, verb: 'accept' });
  const photo = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j0yQAAAAASUVORK5CYII=', 'base64');
  async function upload(c, name, mime, bytes, peer) {
    const file = await rpc(c, 'media_prepare', { name, mime, bytes: bytes.length, ...(peer ? { peer } : {}) });
    const stored = await c.storage.from('social-media').upload(file.path, bytes, { contentType: mime, upsert: false });
    assert.equal(stored.error, null, 'private storage upload');
    return rpc(c, 'media_finish', { id: file.id });
  }
  const image = await upload(a, 'qa-photo.png', 'image/png', photo);
  const imagePost = await rpc(a, 'post', { id: randomUUID(), body: 'QA attachment post', category: 'share', attachments: [image.id] });
  assert.equal(imagePost.attachments[0].id, image.id);
  assert.equal((await rpc(b, 'post_detail', { id: imagePost.id })).post.attachments[0].id, image.id);
  const document = await upload(a, 'qa-lesson.pdf', 'application/pdf', Buffer.from('%PDF-1.4\n% synthetic QA learning document\n%%EOF'), bId);
  assert.ok((await b.storage.from('social-media').createSignedUrl(document.path, 60)).error, 'recipient cannot read draft');
  const docNonce = randomUUID(), withDocument = await rpc(a, 'send', { peer: bId, id: docNonce, body: 'QA document', attachments: [document.id] });
  assert.equal((await rpc(a, 'send', { peer: bId, id: docNonce, body: 'QA document', attachments: [document.id] })).id, withDocument.id);
  assert.equal((await rpc(b, 'messages', { peer: aId })).messages.find(m => m.id === withDocument.id).attachments[0].id, document.id);
  const signed = await b.storage.from('social-media').createSignedUrl(document.path, 60);
  assert.equal(signed.error, null); assert.equal((await (await fetch(signed.data.signedUrl)).arrayBuffer()).byteLength, document.bytes);
  assert.ok((await outsider.storage.from('social-media').createSignedUrl(document.path, 60)).error, 'third party cannot sign private file');
  await rpc(a, 'withdraw', { peer: bId, id: withDocument.id });
  assert.ok((await b.storage.from('social-media').createSignedUrl(document.path, 60)).error, 'withdrawal prevents new signed URLs');
  await rpc(a, 'presence_ping', { device: randomUUID() });
  assert.equal((await rpc(b, 'presence_status', { ids: [aId] }))[0].online, true);
  assert.deepEqual(await rpc(outsider, 'presence_status', { ids: [aId] }), []);
  console.log('Media bytes, private URLs, withdrawal and friend presence: passed.');
  const delivered = [], leaked = [];
  await subscribe(b, bId, event => delivered.push(event.new));
  await subscribe(outsider, bId, event => leaked.push(event.new));
  const sentAt = Date.now(), nonce = randomUUID(), first = await rpc(a, 'send', { peer: bId, id: nonce, body: 'QA: 你好！一起学习中文。' });
  const visibleToRecipient = await b.from('social_messages').select('id').eq('id', first.id);
  assert.equal(visibleToRecipient.error, null, 'recipient direct read'); assert.equal(visibleToRecipient.data.length, 1, 'recipient SELECT policy');
  // Simulate a lost response: retry the same operation without a new nonce.
  assert.equal((await rpc(a, 'send', { peer: bId, id: nonce, body: first.body })).id, first.id);
  await rejected(a, 'send', { peer: bId, id: nonce, body: 'changed' }, 'SOCIAL_IDEMPOTENCY_CONFLICT');
  const deadline = Date.now() + 25000;
  while (!delivered.some(m => m.id === first.id) && Date.now() < deadline) await new Promise(r => setTimeout(r, 100));
  assert.ok(delivered.some(m => m.id === first.id), 'recipient receives live event'); assert.equal(leaked.length, 0, 'outsider never receives private event');
  console.log(JSON.stringify({ realtimeDeliveryMs: Date.now() - sentAt }));
  await b.removeAllChannels();
  const second = await rpc(a, 'send', { peer: bId, id: randomUUID(), body: 'QA: tin khi mất kết nối' });
  await subscribe(b, bId, event => delivered.push(event.new));
  const missed = await rpc(b, 'messages', { peer: aId, after: first.id }); assert.deepEqual(missed.messages.map(m => m.id), [second.id]);
  await rpc(b, 'read', { peer: aId, id: second.id }); await rpc(b, 'read', { peer: aId, id: first.id });
  assert.equal((await rpc(a, 'messages', { peer: bId })).read, second.id);
  const hidden = await outsider.from('social_messages').select('id').in('sender_id', [aId, bId]); assert.equal(hidden.error, null); assert.deepEqual(hidden.data, []);
  assert.deepEqual((await rpc(outsider, 'messages', { peer: aId })).messages, []);
  const postId = randomUUID(); await rpc(a, 'post', { id: postId, body: 'QA tạm: kiểm tra cộng đồng, sẽ tự xóa.', category: 'practice' });
  await rpc(b, 'react', { post: postId, kind: 'like' }); await rpc(b, 'react', { post: postId, kind: 'heart' });
  const commentId = randomUUID(); await rpc(b, 'comment', { id: commentId, post: postId, body: '加油！' }); await rpc(b, 'comment', { id: commentId, post: postId, body: '加油！' });
  const detail = await rpc(a, 'post_detail', { id: postId }); assert.equal(detail.post.likes, 0); assert.equal(detail.post.hearts, 1); assert.equal(detail.post.comments, 1);
  assert.equal((await rpc(a, 'profile', { avatar: 0, icon: 59 })).icon, 59);
  const stickerPost = await rpc(a, 'post', { id: randomUUID(), body: 'QA V3 stickers', category: 'share', community_topic: 'travel', stickers: ['m001', 'm072'] });
  assert.equal(stickerPost.topic, 'general'); assert.equal(stickerPost.community_topic, 'travel'); assert.deepEqual(stickerPost.stickers, ['m001', 'm072']);
  assert.ok((await rpc(b, 'feed', { topic: 'travel' })).some(p => p.id === stickerPost.id));
  assert.equal(await rpc(a, 'post_view', { id: stickerPost.id }), 0);
  assert.equal(await rpc(b, 'post_view', { id: stickerPost.id }), 1);
  assert.equal(await rpc(b, 'post_view', { id: stickerPost.id }), 1);
  assert.equal(await rpc(outsider, 'post_view', { id: stickerPost.id }), 2);
  assert.equal((await rpc(a, 'post_detail', { id: stickerPost.id })).post.views, 2);
  assert.ok((await b.from('social_post_views').select('viewer_id').eq('post_id', stickerPost.id)).error, 'viewer identities stay private');
  console.log('Expanded avatar, new topic, stickers, unique views and viewer privacy: passed.');

  if (process.argv.includes('--ui')) {
    const { testCommunityUI } = await import('./qa-community-ui.mjs');
    await testCommunityUI({ clients, profiles: [p, p2], postId, rpc });
  }
  await rejected(a, 'post', { id: randomUUID(), author_id: bId, body: 'spoof', category: 'share' }, 'SOCIAL_INVALID_INPUT');
  await rpc(b, 'report', { kind: 'post', id: postId, reason: 'QA synthetic report' });
  assert.deepEqual((await outsider.from('social_reports').select('target_id').eq('target_id', postId)).data, []);
  await rpc(b, 'block', { peer: aId, active: true });
  await rejected(a, 'send', { peer: bId, id: randomUUID(), body: 'blocked' }, 'SOCIAL_NOT_FOUND');
  await rpc(b, 'block', { peer: aId, active: false });
  await rejected(a, 'send', { peer: bId, id: randomUUID(), body: 'friend required again' }, 'SOCIAL_FRIEND_REQUIRED');
  console.log(JSON.stringify({ ok: true, auth: process.argv.includes('--guest') ? 'anonymous' : 'seeded_test_users', checks: ['unique_handle', 'friendship', 'realtime_delivery', 'realtime_rls', 'lost_ack_retry', 'reconnect_replay', 'monotonic_read', 'dm_privacy', 'reaction_switch', 'comment_dedupe', 'spoof_rejected', 'report_privacy', 'block'] }));
} finally {
  await Promise.all(clients.map(c => c.removeAllChannels()));
  for (const id of users) {
    const lookup = await admin.auth.admin.getUserById(id);
    assert.equal(lookup.data.user?.user_metadata.social_qa_run, run, 'delete only users created by this QA run');
    const objects = await admin.storage.from('social-media').list(id, { limit: 100 });
    if (objects.error) throw objects.error;
    const paths = objects.data.filter(o => o.id).map(o => `${id}/${o.name}`);
    if (paths.length) { const cleanup = await admin.storage.from('social-media').remove(paths); assert.equal(cleanup.error, null, 'cleanup only tagged QA-owned storage'); }
    const deleted = await admin.auth.admin.deleteUser(id); assert.equal(deleted.error, null, 'cleanup synthetic user');
  }
  console.log(`Cleaned ${users.length} synthetic QA users.`);
}
