import { strokeFilename, validateStrokes, type KanjiStrokes } from './kanjiStrokes.ts';

export type StrokeLoadStatus = 'idle' | 'loading' | 'ready' | 'invalid' | 'missing' | 'error';
export interface StrokeLoadState { character: string; record: KanjiStrokes | null; status: StrokeLoadStatus }
export type StrokeFetch = (url: string, options: { signal: AbortSignal }) => Promise<{
  ok: boolean; status: number; json(): Promise<unknown>;
}>;

/** One selected local asset; revision guards also protect against fetchers ignoring abort. */
export function createStrokeLoader(publish: (state: StrokeLoadState) => void,
  fetcher: StrokeFetch = (url, options) => fetch(url, options)) {
  const cache = new Map<string, KanjiStrokes>();
  let revision = 0;
  let controller: AbortController | undefined;
  let disposed = false;
  function clear() {
    revision++;
    controller?.abort();
    controller = undefined;
    if (!disposed) publish({ character: '', record: null, status: 'idle' });
  }
  async function load(character: string) {
    if (disposed) return;
    clear();
    const token = revision;
    let filename: string;
    try { filename = strokeFilename(character); }
    catch { publish({ character, record: null, status: 'invalid' }); return; }
    publish({ character, record: null, status: 'loading' });
    const request = new AbortController();
    controller = request;
    const current = () => !disposed && token === revision;
    try {
      let record = cache.get(character);
      if (!record) {
        const response = await fetcher(`/kanji-strokes/${filename}`, { signal: request.signal });
        if (!current()) return;
        if (!response.ok) {
          publish({ character, record: null, status: response.status === 404 ? 'missing' : 'error' });
          return;
        }
        const value: unknown = await response.json();
        if (!current()) return;
        record = validateStrokes(value, character);
        cache.set(character, record);
      }
      if (current()) publish({ character, record, status: 'ready' });
    } catch {
      if (current()) publish({ character, record: null, status: 'error' });
    } finally {
      if (current()) controller = undefined;
    }
  }
  function dispose() { clear(); disposed = true; cache.clear(); }
  return { load, clear, dispose };
}
