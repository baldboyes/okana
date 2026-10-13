import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createKanaStrokeLoader, type KanaStrokeLoadState } from '../utils/kanaStrokeLoader.ts';
const fixture = (hex = '3042'): unknown => JSON.parse(readFileSync(new URL(`../public/kana-strokes/${hex}.json`, import.meta.url), 'utf8'));
const response = (value: unknown = fixture(), status = 200) => ({ ok: status === 200, status, json: async () => value });
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

test('selected local URL, immutable decoded cache and cross-script rejection', async () => {
  const states: KanaStrokeLoadState[] = [];
  let calls = 0;
  const raw = fixture();
  const loader = createKanaStrokeLoader(state => states.push(state), async (url, options) => {
    calls++;
    assert.equal(url, '/kana-strokes/3042.json');
    assert.equal(options.signal.aborted, false);
    return response(raw);
  });
  await loader.load('あ', 'hiragana');
  const record = states.at(-1)!.record!;
  assert.equal(record.strokes.length, 3);
  assert.notEqual(record, raw);
  assert.ok(Object.isFrozen(record));
  assert.ok(Object.isFrozen(record.provenance));
  assert.ok(Object.isFrozen(record.strokes[2].parts[1]));
  assert.throws(() => { record.strokes[2].parts[1].median = 'M0 0'; }, TypeError);
  await loader.load('あ');
  assert.equal(states.at(-1)!.record, record);
  for (const character of ['../bad', '日', 'https://example.com', 'あ/']) {
    await loader.load(character);
    assert.equal(states.at(-1)?.status, 'invalid');
  }
  await loader.load('あ', 'katakana');
  assert.equal(states.at(-1)?.status, 'invalid');
  assert.equal(calls, 1);
});

test('HTTP, network, JSON and schema failures never poison retry cache', async () => {
  const failures = [async () => response(null, 404), async () => response(null, 500),
    async () => response({}), async () => { throw new Error('Offline'); },
    async () => ({ ok: true, status: 200, json: async () => { throw new Error('JSON'); } })];
  for (const [index, failure] of failures.entries()) {
    let state: KanaStrokeLoadState | undefined;
    let calls = 0;
    const loader = createKanaStrokeLoader(value => { state = value; }, async () => ++calls === 1 ? failure() : response());
    await loader.load('あ');
    assert.equal(state?.status, index === 0 ? 'missing' : 'error');
    assert.equal(state?.record, null);
    await loader.load('あ');
    assert.equal(state?.status, 'ready');
    assert.equal(calls, 2);
  }
});

test('late response ignores abort, cannot publish or seed cache after new selection', async () => {
  const states: KanaStrokeLoadState[] = [];
  const pending = deferred<ReturnType<typeof response>>();
  let signal: AbortSignal | undefined;
  let calls = 0;
  const loader = createKanaStrokeLoader(value => states.push(value), async (url, options) => {
    calls++;
    if (calls === 1) { signal = options.signal; return pending.promise; }
    return response(fixture(url.includes('3044') ? '3044' : '3042'));
  });
  const first = loader.load('あ');
  await loader.load('い');
  assert.equal(signal?.aborted, true);
  const length = states.length;
  pending.resolve(response());
  await first;
  assert.equal(states.length, length);
  assert.equal(states.at(-1)?.record?.character, 'い');
  await loader.load('あ');
  assert.equal(calls, 3);
});

test('clear/dispose abort pending JSON; late decode cannot publish or cache', async () => {
  for (const dispose of [false, true]) {
    const states: KanaStrokeLoadState[] = [];
    const json = deferred<unknown>();
    let signal: AbortSignal | undefined;
    let calls = 0;
    const loader = createKanaStrokeLoader(value => states.push(value), async (_url, options) => {
      signal = options.signal;
      calls++;
      return calls === 1 ? { ok: true, status: 200, json: () => json.promise } : response();
    });
    const pending = loader.load('あ');
    await Promise.resolve();
    if (dispose) loader.dispose(); else loader.clear();
    const length = states.length;
    assert.equal(signal?.aborted, true);
    json.resolve(fixture());
    await pending;
    assert.equal(states.length, length);
    await loader.load('あ');
    assert.equal(calls, dispose ? 1 : 2);
    assert.equal(states.at(-1)?.status, dispose ? 'idle' : 'ready');
  }
});

test('script transition cancels pending glyph and does not reuse geometry', async () => {
  const pending = deferred<ReturnType<typeof response>>();
  const states: KanaStrokeLoadState[] = [];
  const loader = createKanaStrokeLoader(value => states.push(value), async () => pending.promise);
  const first = loader.load('あ', 'hiragana');
  await loader.load('あ', 'katakana');
  const length = states.length;
  pending.resolve(response());
  await first;
  assert.equal(states.length, length);
  assert.equal(states.at(-1)?.status, 'invalid');
  assert.equal(states.at(-1)?.record, null);
});
