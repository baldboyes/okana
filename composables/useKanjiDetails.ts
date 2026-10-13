import { ref } from 'vue';
import { createDetailRequestGuard, detailFilename, validateDetail, type KanjiDetail } from '../utils/kanjiDetails';

export function useKanjiDetails() {
  const detail = ref<KanjiDetail | null>(null);
  const status = ref<'idle' | 'loading' | 'ready' | 'unavailable'>('idle');
  const cache = new Map<string, KanjiDetail>();
  const guard = createDetailRequestGuard();
  let controller: AbortController | undefined;

  function clear() {
    guard.next();
    controller?.abort();
    detail.value = null;
    status.value = 'idle';
  }

  async function load(character: string) {
    clear();
    const token = guard.next();
    status.value = 'loading';
    controller = new AbortController();
    try {
      let result = cache.get(character);
      if (!result) {
        const response = await fetch(`/kanji-details/${detailFilename(character)}`, { signal: controller.signal });
        if (!response.ok) throw new Error('Unavailable detail');
        result = validateDetail(await response.json(), character);
        cache.set(character, result);
      }
      if (!guard.current(token)) return;
      detail.value = result;
      status.value = 'ready';
    } catch {
      if (guard.current(token)) status.value = 'unavailable';
    }
  }
  return { detail, status, load, clear };
}
