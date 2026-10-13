<template>
  <div class="max-w-4xl mx-auto">
    
    <!-- Sistema de pestañas -->
    <div class="mb-8">
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex space-x-8" aria-label="Tabs">
          <button 
            @click="activeTab = 'hiragana'" 
            class="py-4 px-1 border-b-2 font-medium text-sm"
            :class="[
              activeTab === 'hiragana' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            Hiragana
          </button>
          <button 
            @click="activeTab = 'katakana'" 
            class="py-4 px-1 border-b-2 font-medium text-sm"
            :class="[
              activeTab === 'katakana' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            Katakana
          </button>
          <button
            @click="activeTab = 'kanji'"
            class="py-4 px-1 border-b-2 font-medium text-sm"
            :class="activeTab === 'kanji' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
            :aria-pressed="activeTab === 'kanji'"
          >Kanji</button>
        </nav>
      </div>
    </div>

    <section v-if="activeTab === 'kanji'" class="pb-8" aria-label="Tabla de Kanji">
      <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 class="text-xl font-semibold text-gray-700">Kanji {{ kanjiLevel }}</h2>
        <KanjiLevelSelect v-model="kanjiLevel" id="table-kanji-level" class="ml-auto max-w-full text-right" />
      </div>
      <label for="kanji-search" class="block text-sm font-medium text-gray-700 mb-2">Buscar kanji o significado</label>
      <input id="kanji-search" v-model="kanjiSearch" type="search" placeholder="Por ejemplo: árbol"
        class="w-full mb-3 min-h-11 border border-gray-300 rounded-lg px-3 py-2 focus-visible:outline-blue-600" />
      <p class="mb-4 text-sm text-gray-600" role="status">{{ filteredKanji.length }} de {{ kanjiEntries.length }} kanji</p>
      <div v-if="filteredKanji.length" class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
        <NuxtLink
          v-for="entry in filteredKanji"
          :key="entry.character"
          :to="kanjiDetailLocation(entry.character, tableContext)"
          :aria-label="`${entry.character}: ${entry.meaning}. Ver palabras comunes`"
          class="text-center p-4 border rounded-lg hover:bg-gray-100 focus-visible:outline-blue-600"
        >
          <span class="block text-3xl mb-2" lang="ja">{{ entry.character }}</span>
          <span class="block text-gray-600 break-words">{{ entry.meaning }}</span>
        </NuxtLink>
      </div>
      <p v-else class="text-gray-600">No hay resultados. Prueba otro kanji o significado.</p>
    </section>
    
    <!-- Contenido de Hiragana -->
    <div v-if="activeTab === 'hiragana'" class="">
      <!-- Vocales -->
      <div class="mb-8">
        <h3 class="text-xl font-semibold text-gray-700 mb-4">Vocales</h3>
        <div class="grid grid-cols-5 gap-4">
          <KanaReferenceCard
            v-for="char in hiraganaVowels" :key="char.character"
            :character="char.character" :to="kanaDetailLocation(char.character, tableContext)"
            @audio="playAudio(char)"
          >
            <div class="text-3xl mb-2">{{ char.character }}</div>
            <div class="text-gray-600">{{ char.reading }}</div>
          </KanaReferenceCard>
        </div>
      </div>
      
      <!-- K y G -->
      <div class="mb-8">
        <h3 class="text-xl font-semibold text-gray-700 mb-4">K / G</h3>
        <div class="grid grid-cols-5 gap-4">
          <KanaReferenceCard
            v-for="char in hiraganaKSeries" :key="char.character"
            :character="char.character" :to="kanaDetailLocation(char.character, tableContext)"
            @audio="playAudio(char)"
          >
            <div class="text-3xl mb-2">{{ char.character }}</div>
            <div class="text-gray-600">{{ char.reading }}</div>
          </KanaReferenceCard>
        </div>
      </div>
      
      <!-- S y Z -->
      <div class="mb-8">
        <h3 class="text-xl font-semibold text-gray-700 mb-4">S / Z</h3>
        <div class="grid grid-cols-5 gap-4">
          <KanaReferenceCard
            v-for="char in hiraganaSSeries" :key="char.character"
            :character="char.character" :to="kanaDetailLocation(char.character, tableContext)"
            @audio="playAudio(char)"
          >
            <div class="text-3xl mb-2">{{ char.character }}</div>
            <div class="text-gray-600">{{ char.reading }}</div>
          </KanaReferenceCard>
        </div>
      </div>
      
      <!-- T y D -->
      <div class="mb-8">
        <h3 class="text-xl font-semibold text-gray-700 mb-4">T / D</h3>
        <div class="grid grid-cols-5 gap-4">
          <KanaReferenceCard
            v-for="char in hiraganaTSeries" :key="char.character"
            :character="char.character" :to="kanaDetailLocation(char.character, tableContext)"
            @audio="playAudio(char)"
          >
            <div class="text-3xl mb-2">{{ char.character }}</div>
            <div class="text-gray-600">{{ char.reading }}</div>
          </KanaReferenceCard>
        </div>
      </div>
      
      <!-- N -->
      <div class="mb-8">
        <h3 class="text-xl font-semibold text-gray-700 mb-4">N</h3>
        <div class="grid grid-cols-5 gap-4">
          <KanaReferenceCard
            v-for="char in hiraganaNSeries" :key="char.character"
            :character="char.character" :to="kanaDetailLocation(char.character, tableContext)"
            @audio="playAudio(char)"
          >
            <div class="text-3xl mb-2">{{ char.character }}</div>
            <div class="text-gray-600">{{ char.reading }}</div>
          </KanaReferenceCard>
        </div>
      </div>
      
      <!-- H, B y P -->
      <div class="mb-8">
        <h3 class="text-xl font-semibold text-gray-700 mb-4">H / B / P</h3>
        <div class="grid grid-cols-5 gap-4">
          <KanaReferenceCard
            v-for="char in hiraganaHSeries" :key="char.character"
            :character="char.character" :to="kanaDetailLocation(char.character, tableContext)"
            @audio="playAudio(char)"
          >
            <div class="text-3xl mb-2">{{ char.character }}</div>
            <div class="text-gray-600">{{ char.reading }}</div>
          </KanaReferenceCard>
        </div>
      </div>
      
      <!-- M -->
      <div class="mb-8">
        <h3 class="text-xl font-semibold text-gray-700 mb-4">M</h3>
        <div class="grid grid-cols-5 gap-4">
          <KanaReferenceCard
            v-for="char in hiraganaMSeries" :key="char.character"
            :character="char.character" :to="kanaDetailLocation(char.character, tableContext)"
            @audio="playAudio(char)"
          >
            <div class="text-3xl mb-2">{{ char.character }}</div>
            <div class="text-gray-600">{{ char.reading }}</div>
          </KanaReferenceCard>
        </div>
      </div>
      
      <!-- Y -->
      <div class="mb-8">
        <h3 class="text-xl font-semibold text-gray-700 mb-4">Y</h3>
        <div class="grid grid-cols-3 gap-4">
          <KanaReferenceCard
            v-for="char in hiraganaYSeries" :key="char.character"
            :character="char.character" :to="kanaDetailLocation(char.character, tableContext)"
            @audio="playAudio(char)"
          >
            <div class="text-3xl mb-2">{{ char.character }}</div>
            <div class="text-gray-600">{{ char.reading }}</div>
          </KanaReferenceCard>
        </div>
      </div>
      
      <!-- R -->
      <div class="mb-8">
        <h3 class="text-xl font-semibold text-gray-700 mb-4">R</h3>
        <div class="grid grid-cols-5 gap-4">
          <KanaReferenceCard
            v-for="char in hiraganaRSeries" :key="char.character"
            :character="char.character" :to="kanaDetailLocation(char.character, tableContext)"
            @audio="playAudio(char)"
          >
            <div class="text-3xl mb-2">{{ char.character }}</div>
            <div class="text-gray-600">{{ char.reading }}</div>
          </KanaReferenceCard>
        </div>
      </div>
      
      <!-- W y N -->
      <div class="mb-8">
        <h3 class="text-xl font-semibold text-gray-700 mb-4">W / N</h3>
        <div class="grid grid-cols-3 gap-4">
          <KanaReferenceCard
            v-for="char in hiraganaWSeries" :key="char.character"
            :character="char.character" :to="kanaDetailLocation(char.character, tableContext)"
            @audio="playAudio(char)"
          >
            <div class="text-3xl mb-2">{{ char.character }}</div>
            <div class="text-gray-600">{{ char.reading }}</div>
          </KanaReferenceCard>
        </div>
      </div>
    </div>
    
    <!-- Contenido de Katakana -->
    <div v-if="activeTab === 'katakana'" class="">
      <!-- Vocales -->
      <div class="mb-8">
        <h3 class="text-xl font-semibold text-gray-700 mb-4">Vocales</h3>
        <div class="grid grid-cols-5 gap-4">
          <KanaReferenceCard
            v-for="char in katakanaVowels" :key="char.character"
            :character="char.character" :to="kanaDetailLocation(char.character, tableContext)"
            @audio="playAudio(char)"
          >
            <div class="text-3xl mb-2">{{ char.character }}</div>
            <div class="text-gray-600">{{ char.reading }}</div>
          </KanaReferenceCard>
        </div>
      </div>
      
      <!-- K y G -->
      <div class="mb-8">
        <h3 class="text-xl font-semibold text-gray-700 mb-4">K / G</h3>
        <div class="grid grid-cols-5 gap-4">
          <KanaReferenceCard
            v-for="char in katakanaKSeries" :key="char.character"
            :character="char.character" :to="kanaDetailLocation(char.character, tableContext)"
            @audio="playAudio(char)"
          >
            <div class="text-3xl mb-2">{{ char.character }}</div>
            <div class="text-gray-600">{{ char.reading }}</div>
          </KanaReferenceCard>
        </div>
      </div>
      
      <!-- S y Z -->
      <div class="mb-8">
        <h3 class="text-xl font-semibold text-gray-700 mb-4">S / Z</h3>
        <div class="grid grid-cols-5 gap-4">
          <KanaReferenceCard
            v-for="char in katakanaSSeries" :key="char.character"
            :character="char.character" :to="kanaDetailLocation(char.character, tableContext)"
            @audio="playAudio(char)"
          >
            <div class="text-3xl mb-2">{{ char.character }}</div>
            <div class="text-gray-600">{{ char.reading }}</div>
          </KanaReferenceCard>
        </div>
      </div>
      
      <!-- T y D -->
      <div class="mb-8">
        <h3 class="text-xl font-semibold text-gray-700 mb-4">T / D</h3>
        <div class="grid grid-cols-5 gap-4">
          <KanaReferenceCard
            v-for="char in katakanaTSeries" :key="char.character"
            :character="char.character" :to="kanaDetailLocation(char.character, tableContext)"
            @audio="playAudio(char)"
          >
            <div class="text-3xl mb-2">{{ char.character }}</div>
            <div class="text-gray-600">{{ char.reading }}</div>
          </KanaReferenceCard>
        </div>
      </div>
      
      <!-- N -->
      <div class="mb-8">
        <h3 class="text-xl font-semibold text-gray-700 mb-4">N</h3>
        <div class="grid grid-cols-5 gap-4">
          <KanaReferenceCard
            v-for="char in katakanaNSeries" :key="char.character"
            :character="char.character" :to="kanaDetailLocation(char.character, tableContext)"
            @audio="playAudio(char)"
          >
            <div class="text-3xl mb-2">{{ char.character }}</div>
            <div class="text-gray-600">{{ char.reading }}</div>
          </KanaReferenceCard>
        </div>
      </div>
      
      <!-- H, B y P -->
      <div class="mb-8">
        <h3 class="text-xl font-semibold text-gray-700 mb-4">H / B / P</h3>
        <div class="grid grid-cols-5 gap-4">
          <KanaReferenceCard
            v-for="char in katakanaHSeries" :key="char.character"
            :character="char.character" :to="kanaDetailLocation(char.character, tableContext)"
            @audio="playAudio(char)"
          >
            <div class="text-3xl mb-2">{{ char.character }}</div>
            <div class="text-gray-600">{{ char.reading }}</div>
          </KanaReferenceCard>
        </div>
      </div>
      
      <!-- M -->
      <div class="mb-8">
        <h3 class="text-xl font-semibold text-gray-700 mb-4">M</h3>
        <div class="grid grid-cols-5 gap-4">
          <KanaReferenceCard
            v-for="char in katakanaMSeries" :key="char.character"
            :character="char.character" :to="kanaDetailLocation(char.character, tableContext)"
            @audio="playAudio(char)"
          >
            <div class="text-3xl mb-2">{{ char.character }}</div>
            <div class="text-gray-600">{{ char.reading }}</div>
          </KanaReferenceCard>
        </div>
      </div>
      
      <!-- Y -->
      <div class="mb-8">
        <h3 class="text-xl font-semibold text-gray-700 mb-4">Y</h3>
        <div class="grid grid-cols-3 gap-4">
          <KanaReferenceCard
            v-for="char in katakanaYSeries" :key="char.character"
            :character="char.character" :to="kanaDetailLocation(char.character, tableContext)"
            @audio="playAudio(char)"
          >
            <div class="text-3xl mb-2">{{ char.character }}</div>
            <div class="text-gray-600">{{ char.reading }}</div>
          </KanaReferenceCard>
        </div>
      </div>
      
      <!-- R -->
      <div class="mb-8">
        <h3 class="text-xl font-semibold text-gray-700 mb-4">R</h3>
        <div class="grid grid-cols-5 gap-4">
          <KanaReferenceCard
            v-for="char in katakanaRSeries" :key="char.character"
            :character="char.character" :to="kanaDetailLocation(char.character, tableContext)"
            @audio="playAudio(char)"
          >
            <div class="text-3xl mb-2">{{ char.character }}</div>
            <div class="text-gray-600">{{ char.reading }}</div>
          </KanaReferenceCard>
        </div>
      </div>
      
      <!-- W y N -->
      <div class="mb-8">
        <h3 class="text-xl font-semibold text-gray-700 mb-4">W / N</h3>
        <div class="grid grid-cols-3 gap-4">
          <KanaReferenceCard
            v-for="char in katakanaWSeries" :key="char.character"
            :character="char.character" :to="kanaDetailLocation(char.character, tableContext)"
            @audio="playAudio(char)"
          >
            <div class="text-3xl mb-2">{{ char.character }}</div>
            <div class="text-gray-600">{{ char.reading }}</div>
          </KanaReferenceCard>
        </div>
      </div>
    </div>


  </div>
</template>

<script setup lang="ts">
import { hiraganaData, katakanaData } from '~/data/characters';
import { kanaDetailLocation } from '../utils/kanaNavigation';
import { kanaAudioUrl } from '../utils/kanaAudio';
import { computed, ref, watch } from 'vue';
import { getKanjiForLevel, type KanjiLevel } from '../data/kanji';

import { normalizeMeaning } from '../utils/kanjiPractice';
import { kanjiDetailLocation, parseTableContext, tableContextQuery, type TableTab } from '../utils/kanjiNavigation';

const route = useRoute();
const router = useRouter();
const initialContext = parseTableContext(route.query);
const activeTab = ref<TableTab>(initialContext.tab);
const kanjiLevel = ref<KanjiLevel>(initialContext.level);
const kanjiEntries = computed(() => getKanjiForLevel(kanjiLevel.value));
const kanjiSearch = ref(initialContext.search);
const tableContext = computed(() => ({
  tab: activeTab.value, level: kanjiLevel.value, search: kanjiSearch.value,
}));
const filteredKanji = computed(() => {
  const query = normalizeMeaning(kanjiSearch.value);
  return kanjiEntries.value.filter(entry => entry.character.includes(query)
    || normalizeMeaning(entry.meaning).includes(query));
});
let restoringQuery = false;
watch(() => route.query, query => {
  const context = parseTableContext(query);
  restoringQuery = true;
  activeTab.value = context.tab;
  kanjiLevel.value = context.level;
  kanjiSearch.value = context.search;
  restoringQuery = false;
}, { flush: 'sync' });

watch([activeTab, kanjiLevel, kanjiSearch], () => {
  if (restoringQuery) return;
  const query = tableContextQuery(tableContext.value);
  if (query.tab === route.query.tab && query.level === route.query.level
    && query.search === route.query.search) return;
  // Replace keeps a shareable current view without adding history for each keystroke.
  void router.replace({ path: route.path, query: { ...route.query, ...query } });
}, { flush: 'sync' });

// Función para reproducir el audio
function playAudio(char: { type: string; romaji: string }) {
  const audio = new Audio(kanaAudioUrl(char));
  audio.volume = 0.5;
  audio.play().catch(e => console.log('Error al reproducir sonido:', e));
}

// Filtrar los caracteres de Hiragana por series
const hiraganaVowels = computed(() => hiraganaData.filter(char => ['a', 'i', 'u', 'e', 'o'].includes(char.reading)));
const hiraganaKSeries = computed(() => hiraganaData.filter(char => char.reading.startsWith('k') || char.reading.startsWith('g')));
const hiraganaSSeries = computed(() => hiraganaData.filter(char => char.reading.startsWith('s') || char.reading.startsWith('z')));
const hiraganaTSeries = computed(() => hiraganaData.filter(char => char.reading.startsWith('t') || char.reading.startsWith('d')));
const hiraganaNSeries = computed(() => hiraganaData.filter(char => char.reading.startsWith('n')));
const hiraganaHSeries = computed(() => hiraganaData.filter(char => char.reading.startsWith('h') || char.reading.startsWith('b') || char.reading.startsWith('p')));
const hiraganaMSeries = computed(() => hiraganaData.filter(char => char.reading.startsWith('m')));
const hiraganaYSeries = computed(() => hiraganaData.filter(char => char.reading.startsWith('y')));
const hiraganaRSeries = computed(() => hiraganaData.filter(char => char.reading.startsWith('r')));
const hiraganaWSeries = computed(() => hiraganaData.filter(char => char.reading.startsWith('w') || char.reading === 'n'));

// Filtrar los caracteres de Katakana por series
const katakanaVowels = computed(() => katakanaData.filter(char => ['a', 'i', 'u', 'e', 'o'].includes(char.reading)));
const katakanaKSeries = computed(() => katakanaData.filter(char => char.reading.startsWith('k') || char.reading.startsWith('g')));
const katakanaSSeries = computed(() => katakanaData.filter(char => char.reading.startsWith('s') || char.reading.startsWith('z')));
const katakanaTSeries = computed(() => katakanaData.filter(char => char.reading.startsWith('t') || char.reading.startsWith('d')));
const katakanaNSeries = computed(() => katakanaData.filter(char => char.reading.startsWith('n')));
const katakanaHSeries = computed(() => katakanaData.filter(char => char.reading.startsWith('h') || char.reading.startsWith('b') || char.reading.startsWith('p')));
const katakanaMSeries = computed(() => katakanaData.filter(char => char.reading.startsWith('m')));
const katakanaYSeries = computed(() => katakanaData.filter(char => char.reading.startsWith('y')));
const katakanaRSeries = computed(() => katakanaData.filter(char => char.reading.startsWith('r')));
const katakanaWSeries = computed(() => katakanaData.filter(char => char.reading.startsWith('w') || char.reading === 'n'));

definePageMeta({
  title: 'Tablas de Caracteres Japoneses'
});
</script>
