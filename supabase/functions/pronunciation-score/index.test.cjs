const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const source = ts.transpile(readFileSync(__dirname + '/index.ts', 'utf8'), { target: ts.ScriptTarget.ES2022 });
function fixture() {
  let handler, calls = 0;
  const logs = [];
  const context = { Request, Response, File, FormData, Uint8Array, RangeError, TypeError,
    Deno: { env: { get: () => 'fixture-key' }, serve: callback => { handler = callback; } },
    console: { error: (...args) => logs.push(args) },
    fetch: async () => { calls++; return new Response(JSON.stringify({ text: 'fixture-transcript' })); } };
  vm.runInNewContext(source, context);
  return { handle: request => handler(request), logs, context, calls: () => calls };
}
function multipart(size = 400) {
  const form = new FormData();
  form.append('audio', new File([new Uint8Array(size)], 'recording.m4a'));
  form.append('simplified', 'fixture'); form.append('traditional', 'fixture'); form.append('pinyin', 'fixture');
  return new Request('https://fixture.invalid', { method: 'POST', body: form });
}
test('valid multipart preserves response contract; file limit remains unchanged', async () => {
  const f = fixture(); const response = await f.handle(multipart());
  assert.equal(response.status, 200); assert.deepEqual(Object.keys(await response.json()).sort(), ['feedback', 'score', 'transcript']);
  assert.equal((await f.handle(multipart(2500001))).status, 400); assert.equal(f.calls(), 1);
});
test('body limit stops declared and chunked oversized uploads before parsing/provider', async () => {
  const f = fixture(); const max = 5 * 1024 * 1024 + 64 * 1024;
  assert.equal((await f.handle(new Request('https://fixture.invalid', { method: 'POST', headers: { 'content-length': String(max + 1) }, body: 'x' }))).status, 413);
  let cancelled = false;
  const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(max)); controller.enqueue(new Uint8Array(1)); }, cancel() { cancelled = true; } });
  assert.equal((await f.handle(new Request('https://fixture.invalid', { method: 'POST', body, duplex: 'half' }))).status, 413);
  assert.equal(cancelled, true); assert.equal(f.calls(), 0);
});
test('malformed multipart returns 400 without provider calls or raw logs', async () => {
  const f = fixture();
  const response = await f.handle(new Request('https://fixture.invalid', { method: 'POST', headers: { 'content-type': 'multipart/form-data; boundary=x' }, body: 'malformed-private-input' }));
  assert.equal(response.status, 400); assert.equal(f.calls(), 0); assert.deepEqual(f.logs, []);
});
test('an oversized upload is rejected even if stream cancellation fails', async () => {
  const f = fixture();
  const body = new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(6 * 1024 * 1024)); },
    cancel() { return Promise.reject(new Error('Stream closed')); },
  });
  const response = await f.handle(new Request('https://fixture.invalid', { method: 'POST', body, duplex: 'half' }));
  assert.equal(response.status, 413);
  assert.equal(f.calls(), 0);
});
test('provider errors and exceptions never disclose raw values', async () => {
  const f = fixture();
  f.context.fetch = async () => new Response('private-provider-detail', { status: 502 });
  assert.equal((await f.handle(multipart())).status, 502);
  f.context.fetch = async () => { throw new Error('private-error-detail'); };
  assert.equal((await f.handle(multipart())).status, 500);
  assert.equal(JSON.stringify(f.logs).includes('private'), false);
});
