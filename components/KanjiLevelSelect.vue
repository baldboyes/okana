<template>
  <div>
    <select
      :id="id"
      aria-label="Nivel JLPT"
      :value="modelValue"
      class="w-full sm:w-auto min-h-11 border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-800 focus-visible:outline-blue-600"
      @change="selectLevel"
    >
      <option v-for="level in kanjiLevels" :key="level" :value="level" :disabled="!kanjiCounts[level]">
        {{ level }} · {{ kanjiCounts[level] }} kanji
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { kanjiLevels, kanjiCounts, type KanjiLevel } from '../data/kanji';

withDefaults(defineProps<{ modelValue: KanjiLevel; id?: string }>(), { id: 'kanji-level' });
const emit = defineEmits<{ 'update:modelValue': [level: KanjiLevel] }>();

function selectLevel(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  if (kanjiLevels.includes(value as KanjiLevel)) emit('update:modelValue', value as KanjiLevel);
}
</script>
