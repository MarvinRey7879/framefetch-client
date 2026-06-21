import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FrameFetch, FrameFetchError } from './index.js';

// a fake fetch that records the call and returns a canned response
function fakeFetch(captured, response) {
  return async (url, init) => {
    captured.url = url;
    captured.init = init;
    return {
      ok: response.ok ?? true,
      status: response.status ?? 200,
      json: async () => response.body,
    };
  };
}

test('extract sends auth + body to /v1/extract', async () => {
  const cap = {};
  const ff = new FrameFetch({ apiKey: 'ff_test', fetch: fakeFetch(cap, { body: { platform: 'youtube', cost: { totalMicros: 2000 } } }) });
  const r = await ff.extract({ url: 'https://youtu.be/x', fields: ['metadata'], frames: { mode: 'fps', fps: 1 } });
  assert.equal(cap.url, 'https://framefetch.net/v1/extract');
  assert.equal(cap.init.method, 'POST');
  assert.equal(cap.init.headers.authorization, 'Bearer ff_test');
  assert.deepEqual(JSON.parse(cap.init.body), { url: 'https://youtu.be/x', fields: ['metadata'], frames: { mode: 'fps', fps: 1 } });
  assert.equal(r.platform, 'youtube');
});

test('demo needs no key and omits Authorization', async () => {
  const cap = {};
  const ff = new FrameFetch({ fetch: fakeFetch(cap, { body: { platform: 'youtube', demo: true } }) });
  const r = await ff.demo('https://youtu.be/x');
  assert.equal(cap.url, 'https://framefetch.net/v1/demo');
  assert.equal(cap.init.headers.authorization, undefined);
  assert.equal(r.demo, true);
});

test('missing key on an authed call throws before fetch', async () => {
  const ff = new FrameFetch({ fetch: async () => { throw new Error('should not be called'); } });
  await assert.rejects(() => ff.metadata('https://youtu.be/x'), FrameFetchError);
});

test('API error maps to FrameFetchError with status + code', async () => {
  const cap = {};
  const ff = new FrameFetch({ apiKey: 'ff_test', fetch: fakeFetch(cap, { ok: false, status: 402, body: { error: { code: 'INSUFFICIENT_CREDIT', message: 'no credit', hint: 'top up' } } }) });
  await assert.rejects(() => ff.transcript('https://youtu.be/x'), (e) => {
    assert.ok(e instanceof FrameFetchError);
    assert.equal(e.status, 402);
    assert.equal(e.code, 'INSUFFICIENT_CREDIT');
    assert.equal(e.hint, 'top up');
    return true;
  });
});

test('custom baseUrl is honored and trailing slash trimmed', async () => {
  const cap = {};
  const ff = new FrameFetch({ apiKey: 'k', baseUrl: 'http://localhost:8787/', fetch: fakeFetch(cap, { body: {} }) });
  await ff.platforms();
  assert.equal(cap.url, 'http://localhost:8787/v1/platforms');
});
