<template>
  <div class="kanji-detail max-w-4xl mx-auto pb-24 text-gray-800">
    <NuxtLink :to="backToTable"
      class="inline-flex items-center min-h-11 mb-6 text-blue-700 underline underline-offset-4 rounded focus-visible:outline-blue-600">
      Volver a la tabla de Kanji
    </NuxtLink>

    <template v-if="character">
      <h1 class="text-2xl font-semibold mb-6">Detalle de Kanji: <span lang="ja">{{ character }}</span></h1>
      <div class="detail-layout">
        <KanjiStrokeViewer :character="character" class="detail-strokes" />
        <div class="min-w-0">
      <p v-if="status === 'idle' || status === 'loading'" class="mt-6" role="status">Cargando detalles…</p>
      <section v-else-if="status === 'unavailable'" class="mt-6" aria-label="Detalles no disponibles">
        <p role="status">No se pudieron cargar los detalles de este kanji.</p>
        <div class="flex flex-wrap items-center gap-4 mt-4">
          <button type="button" @click="loadCurrentCharacter"
            class="min-h-11 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus-visible:outline-blue-600">
            Reintentar
          </button>
          <a :href="source" target="_blank" rel="noopener noreferrer"
            class="text-blue-700 underline underline-offset-4 rounded focus-visible:outline-blue-600">
            Consultar página original (nueva pestaña)
          </a>
        </div>
      </section>
      <template v-else-if="detail">
        <section class="mt-8" aria-labelledby="kanji-meanings-title">
          <h2 id="kanji-meanings-title" class="text-xl font-semibold mb-3">Significados en español</h2>
          <p class="max-w-prose text-lg leading-relaxed break-words">
            {{ detail.meanings.trim() ? detail.meanings : 'KANJIDIC2 no incluye significados en español para este kanji.' }}
          </p>
        </section>
        <section class="mt-8" aria-labelledby="kanji-words-title">
          <h2 id="kanji-words-title" class="text-xl font-semibold mb-3">Palabras comunes</h2>
          <ul v-if="detail.words.length" class="divide-y divide-gray-200">
            <li v-for="(word, index) in detail.words" :key="index" class="py-4 first:pt-0">
              <p lang="ja" class="text-lg break-words">{{ word.japanese }}</p>
              <p class="mt-1 max-w-prose leading-relaxed break-words text-gray-600">{{ word.meaning }}</p>
            </li>
          </ul>
          <p v-else class="max-w-prose text-gray-600 leading-relaxed">
            No hay palabras con traducción al español y marca de prioridad de JMdict para este kanji.
          </p>
        </section>
      </template>
        </div>
      </div>
    </template>
    <section v-else aria-labelledby="invalid-kanji-title">
      <h1 id="invalid-kanji-title" class="text-2xl font-semibold">Kanji no disponible</h1>
      <p class="mt-3 max-w-prose text-gray-600 leading-relaxed" role="status">
        El carácter de este enlace no pertenece a la colección de Kanji. Vuelve a la tabla para elegir uno.
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue';
import KanjiStrokeViewer from '../../components/KanjiStrokeViewer.vue';
import { useKanjiDetails } from '../../composables/useKanjiDetails';
import { detailSource } from '../../utils/kanjiDetails';
import { kanjiTableLocation, validKanjiCharacter } from '../../utils/kanjiNavigation';

const route = useRoute();
const character = computed(() => validKanjiCharacter(route.params.character));
const backToTable = computed(() => kanjiTableLocation(route.query));
const source = computed(() => character.value ? detailSource(character.value) : '');
const { detail, status, load, clear } = useKanjiDetails();
let mounted = false;

function loadCurrentCharacter() {
  clear();
  if (mounted && character.value) void load(character.value);
}

// The local fetch runs only in the browser; SSR renders the same initial loading state.
onMounted(() => {
  mounted = true;
  loadCurrentCharacter();
});
watch(character, loadCurrentCharacter, { flush: 'sync' });
onBeforeUnmount(() => {
  mounted = false;
  clear();
});

definePageMeta({ title: 'Detalle de Kanji' });
</script>

<style scoped>
.kanji-detail { overflow-wrap: anywhere; }
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
.kanji-detail ::selection { background: #dbeafe; color: #1e3a8a; }
</style>
