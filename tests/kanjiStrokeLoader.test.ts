import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStrokeLoader, type StrokeLoadState, type StrokeFetch } from '../utils/kanjiStrokeLoader.ts';
const fixture: unknown = JSON.parse(readFileSync(new URL('../public/kanji-strokes/65e5.json', import.meta.url), 'utf8'));
const response = (value: unknown = fixture, status = 200) => ({ ok: status === 200, status, json: async () => value });
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

test('valid selected asset uses local allowlisted path and caches validated JSON', async () => {
  const states: StrokeLoadState[] = [];
  let calls = 0;
  const loader = createStrokeLoader(state => states.push(state), async (url, options) => {
    calls++;
    assert.equal(url, '/kanji-strokes/65e5.json');
    assert.equal(options.signal.aborted, false);
    return response();
  });
  await loader.load('日');
  assert.equal(states.at(-1)?.record?.strokes.length, 4);
  assert.equal(states.at(-1)?.status, 'ready');
  await loader.load('日');
  assert.equal(calls, 1);
  await loader.load('../bad');
  assert.equal(states.at(-1)?.status, 'invalid');
  assert.equal(states.at(-1)?.record, null);
  assert.equal(calls, 1);
});

test('404, server, JSON and schema failures are honest and retryable', async () => {
  for (const failure of [response(null, 404), response(null, 500), response({}),
    { ok: true, status: 200, json: async () => { throw new Error('Bad JSON'); } }]) {
    const states: StrokeLoadState[] = [];
    let fail = true;
    const loader = createStrokeLoader(state => states.push(state), async () => fail ? failure : response());
    await loader.load('日');
    assert.equal(states.at(-1)?.status, failure.status === 404 ? 'missing' : 'error');
    assert.equal(states.at(-1)?.record, null);
    fail = false;
    await loader.load('日');
    assert.equal(states.at(-1)?.status, 'ready');
  }
});

test('late A response ignored after B selection even when fetch ignores abort', async () => {
  const states: StrokeLoadState[] = [];
  const pending = deferred<ReturnType<typeof response>>();
  let signal: AbortSignal | undefined;
  const moon: unknown = JSON.parse(readFileSync(new URL('../public/kanji-strokes/6708.json', import.meta.url), 'utf8'));
  const loader = createStrokeLoader(state => states.push(state), async (url, options) => {
    if (url.includes('65e5')) { signal = options.signal; return pending.promise; }
    return response(moon);
  });
  const first = loader.load('日');
  await loader.load('月');
  assert.equal(signal?.aborted, true);
  const length = states.length;
  pending.resolve(response());
  await first;
  assert.equal(states.length, length);
  assert.equal(states.at(-1)?.record?.character, '月');
});

test('clear and disposal invalidate pending JSON and reject late updates', async () => {
  for (const dispose of [false, true]) {
    const states: StrokeLoadState[] = [];
    const json = deferred<unknown>();
    let signal: AbortSignal | undefined;
    const fetcher: StrokeFetch = async (_url, options) => {
      signal = options.signal;
      return { ok: true, status: 200, json: () => json.promise };
    };
    const loader = createStrokeLoader(state => states.push(state), fetcher);
    const loading = loader.load('日');
    await Promise.resolve();
    if (dispose) loader.dispose(); else loader.clear();
    const length = states.length;
    json.resolve(fixture);
    await loading;
    assert.equal(signal?.aborted, true);
    assert.equal(states.length, length);
    assert.equal(states.at(-1)?.status, 'idle');
    if (dispose) { await loader.load('日'); assert.equal(states.length, length); }
  }
});

test('network rejection reports error without retaining earlier geometry', async () => {
  let state: StrokeLoadState | undefined;
  const loader = createStrokeLoader(value => { state = value; }, async () => { throw new Error('Offline'); });
  await loader.load('日');
  assert.equal(state?.status, 'error');
  assert.equal(state?.record, null);
});
