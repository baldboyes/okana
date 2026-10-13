import { kanaStrokeFilename, validateKanaStrokes, type KanaScript, type KanaStrokes } from './kanaStrokes.ts';
import type { StrokeFetch, StrokeLoadStatus } from './kanjiStrokeLoader.ts';

export interface KanaStrokeLoadState {
  character: string; script?: KanaScript; record: KanaStrokes | null; status: StrokeLoadStatus;
}
/** Freeze only decoded records, never unknown transport objects. */
function immutable(record: KanaStrokes): KanaStrokes {
  for (const stroke of record.strokes) {
    stroke.parts.forEach(Object.freeze);
    Object.freeze(stroke.parts);
    Object.freeze(stroke);
  }
  Object.freeze(record.strokes);
  Object.freeze(record.provenance);
  return Object.freeze(record);
}

/** Instance-owned cache and cancellation; never shares requests or state with Kanji. */
export function createKanaStrokeLoader(publish: (state: KanaStrokeLoadState) => void,
  fetcher: StrokeFetch = (url, options) => fetch(url, options)) {
  const cache = new Map<string, KanaStrokes>();
  let revision = 0;
  let controller: AbortController | undefined;
  let disposed = false;
  function clear() {
    revision++;
    controller?.abort();
    controller = undefined;
    if (!disposed) publish({ character: '', record: null, status: 'idle' });
  }
  async function load(character: string, script?: KanaScript) {
    if (disposed) return;
    clear();
    const token = revision;
    let filename: string;
    try { filename = kanaStrokeFilename(character, script); }
    catch { publish({ character, script, record: null, status: 'invalid' }); return; }
    publish({ character, script, record: null, status: 'loading' });
    const request = new AbortController();
    controller = request;
    const current = () => !disposed && token === revision && !request.signal.aborted;
    try {
      let record = cache.get(filename);
      if (!record) {
        const response = await fetcher(`/kana-strokes/${filename}`, { signal: request.signal });
        if (!current()) return;
        if (!response.ok) {
          publish({ character, script, record: null, status: response.status === 404 ? 'missing' : 'error' });
          return;
        }
        const value: unknown = await response.json();
        if (!current()) return;
        record = immutable(validateKanaStrokes(value, character, script));
        cache.set(filename, record);
      }
      if (current()) publish({ character, script, record, status: 'ready' });
    } catch {
      if (current()) publish({ character, script, record: null, status: 'error' });
    } finally {
      if (current()) controller = undefined;
    }
  }
  function dispose() { clear(); disposed = true; cache.clear(); }
  return { load, clear, dispose };
}
