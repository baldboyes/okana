import { onBeforeUnmount, onMounted, shallowRef, watch, type Ref } from 'vue';
import { createKanaStrokeLoader, type KanaStrokeLoadState } from '../utils/kanaStrokeLoader';
import type { KanaScript } from '../utils/kanaStrokes';

export function useKanaStrokes(character: Readonly<Ref<string>>, script?: Readonly<Ref<KanaScript | undefined>>) {
  const state = shallowRef<KanaStrokeLoadState>({ character: '', record: null, status: 'idle' });
  const loader = createKanaStrokeLoader(value => { state.value = value; });
  let mounted = false;
  function retry() {
    if (mounted) void loader.load(character.value, script?.value);
  }
  watch(() => [character.value, script?.value], () => {
    loader.clear();
    retry();
  }, { flush: 'sync' });
  // Match the Kanji client-only loading contract; SSR never starts an asset request.
  onMounted(() => { mounted = true; retry(); });
  onBeforeUnmount(() => { mounted = false; loader.dispose(); });
  return { state, retry };
}
