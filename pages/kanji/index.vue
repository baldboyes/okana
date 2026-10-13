<template>
  <div class="relative max-w-4xl mx-auto min-h-[calc(100dvh-1rem)] pb-52">
    <h1 class="sr-only">Práctica de Kanji</h1>
    <div class="flex justify-end">
      <KanjiLevelSelect v-model="level" />
    </div>

    <template v-if="currentKanji">
      <div class="flex flex-col items-center gap-4 py-8">
        <div class="text-8xl text-gray-800" lang="ja">{{ currentKanji.character }}</div>
        <p class="min-h-8 text-xl text-center" role="status" aria-live="polite">
          <template v-if="showAnswer">
            {{ isCorrect ? '¡Correcto!' : 'Respuesta incorrecta.' }} Significado: {{ currentKanji.meaning }}
          </template>
        </p>
      </div>

      <MultipleChoiceOptions
        v-if="gameMode === 'multiple-choice'"
        :options="options"
        :current-character="{ character: currentKanji.character, reading: currentKanji.meaning }"
        :show-answer="showAnswer"
        :num-options="numOptions"
        :selected-answer="selectedAnswer"
        class="kanji-options"
        @select="checkAnswer"
      />
      <form v-else class="flex flex-col items-center gap-4" @submit.prevent="checkAnswer(writtenAnswer)">
        <label for="kanji-meaning" class="text-gray-700">Significado en español</label>
        <input
          id="kanji-meaning"
          v-model="writtenAnswer"
          type="text"
          autocomplete="off"
          placeholder="Escribe el significado"
          class="w-full max-w-xs p-3 border rounded-lg text-center text-xl placeholder:text-gray-500 focus-visible:outline-blue-600"
          :disabled="showAnswer"
        />
        <button
          type="submit"
          class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 focus-visible:outline-blue-600"
          :disabled="showAnswer || !writtenAnswer.trim()"
        >Verificar</button>
      </form>
    </template>
    <p v-else class="py-8 text-gray-600" role="status">
      Preparando ejercicios…
    </p>

    <section class="absolute bottom-28 left-0 w-full" :aria-label="`Estadísticas de Kanji ${level}`">
      <GameStats :stats="stats" class="w-full max-w-4xl mx-auto" />
      <p v-if="storageNotice" class="mt-2 text-sm text-gray-600" role="status">{{ storageNotice }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useKanjiGame } from '../../composables/useKanjiGame';

const {
  level, currentKanji, options, gameMode, numOptions, selectedAnswer,
  showAnswer, isCorrect, stats, storageNotice,
  checkAnswer,
} = useKanjiGame();
const writtenAnswer = ref('');
watch([level, currentKanji], () => { writtenAnswer.value = ''; }, { flush: 'sync' });

definePageMeta({ title: 'Práctica de Kanji' });
</script>

<style scoped>
@media (max-width: 639px) {
  .kanji-options { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
.kanji-options :deep(button) { overflow-wrap: anywhere; }
</style>
