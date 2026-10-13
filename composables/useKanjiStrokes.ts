import { onBeforeUnmount, onMounted, shallowRef, watch, type Ref } from 'vue';
import { createStrokeLoader, type StrokeLoadState } from '../utils/kanjiStrokeLoader';

export function useKanjiStrokes(character: Readonly<Ref<string>>) {
  const state = shallowRef<StrokeLoadState>({ character: '', record: null, status: 'idle' });
  const loader = createStrokeLoader(value => { state.value = value; });
  let mounted = false;
  function retry() {
    if (mounted) void loader.load(character.value);
  }
  watch(character, () => {
    loader.clear();
    retry();
  }, { flush: 'sync' });
  // No asset requests during SSR.
  onMounted(() => { mounted = true; retry(); });
  onBeforeUnmount(() => { mounted = false; loader.dispose(); });
  return { state, retry };
}
