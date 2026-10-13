<template>
  <div class="kana-detail max-w-4xl mx-auto pb-24 text-gray-800">
    <NuxtLink :to="backToTable"
      class="inline-flex items-center min-h-11 mb-6 text-blue-700 underline underline-offset-4 rounded focus-visible:outline-blue-600">
      Volver a la tabla de {{ family }}
    </NuxtLink>
    <template v-if="entry && character">
      <h1 class="text-2xl font-semibold mb-6">Detalle de {{ family }}: <span lang="ja">{{ character }}</span></h1>
      <div class="detail-layout">
        <KanaStrokeViewer :character="character" :script="script" class="detail-strokes" />
        <section aria-labelledby="kana-reading-title" class="min-w-0">
          <h2 id="kana-reading-title" class="text-xl font-semibold mb-3">Lectura</h2>
          <p class="text-3xl mb-6">{{ entry.reading }}</p>
          <button type="button" @click="playAudio"
            class="min-h-11 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus-visible:outline-blue-600">
            Escuchar audio
          </button>
          <p v-if="audioError" role="alert" class="mt-3 text-red-700">No se pudo reproducir el audio. Puedes volver a intentarlo.</p>
        </section>
      </div>
    </template>
    <section v-else aria-labelledby="kana-unavailable-title" role="status">
      <h1 id="kana-unavailable-title" class="text-2xl font-semibold mb-3">Detalle de {{ family }} no disponible</h1>
      <p>Este carácter no pertenece a la tabla de {{ family }}. Vuelve a la tabla para elegir otro.</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { lookupKana, type KanaScript } from '../utils/kanaStrokes';
import { kanaTableLocation, validKanaCharacter } from '../utils/kanaNavigation';
import { kanaAudioUrl } from '../utils/kanaAudio';

const props = defineProps<{ script: KanaScript }>();
const route = useRoute();
const family = computed(() => props.script === 'hiragana' ? 'Hiragana' : 'Katakana');
const character = computed(() => validKanaCharacter(route.params.character, props.script));
const entry = computed(() => character.value ? lookupKana(character.value, props.script) : undefined);
const backToTable = computed(() => kanaTableLocation(props.script, route.query));
const audioError = ref(false);
let audio: HTMLAudioElement | null = null;

function stopAudio() {
  if (audio) {
    audio.onerror = null;
    audio.pause();
    audio = null;
  }
  audioError.value = false;
}

async function playAudio() {
  stopAudio();
  if (!entry.value || typeof Audio === 'undefined') return;
  const current = new Audio(kanaAudioUrl(entry.value));
  audio = current;
  current.volume = 0.5;
  current.onerror = () => { if (audio === current) audioError.value = true; };
  try {
    await current.play();
  } catch {
    if (audio === current) audioError.value = true;
  }
}

watch([character, () => props.script], stopAudio, { flush: 'sync' });
onBeforeUnmount(stopAudio);
</script>

<style scoped>
.kana-detail { overflow-wrap: anywhere; }
.detail-layout { display: grid; gap: 2rem; }
@media (min-width: 768px) {
  .detail-layout { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: start; }
}
@media (min-width: 1024px) {
  .detail-strokes {
    position: sticky;
    top: 1rem;
    max-height: calc(100dvh - 7rem);
    overflow-y: auto;
  }
}
.kana-detail ::selection { background: #dbeafe; color: #1e3a8a; }
</style>
