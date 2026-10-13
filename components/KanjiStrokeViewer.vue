<template>
  <StrokePlayer :character="character" :record="record" :status="state.status"
    :failure-message="failureMessage" v-model:manually-paused="manuallyPaused" @retry="retry" />
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue';
import StrokePlayer from './StrokePlayer.vue';
import { useKanjiStrokes } from '../composables/useKanjiStrokes';
import { kanjiGeometry } from '../utils/strokePlayer';

const props = defineProps<{ character: string }>();
const character = toRef(props, 'character');
const { state, retry } = useKanjiStrokes(character);
const record = computed(() => state.value.character === character.value && state.value.record
  ? kanjiGeometry(state.value.record) : null);
// Preserve the original SSR-isolated session intent across Nuxt page remounts.
const manuallyPaused = useState<boolean>('kanji-stroke-manually-paused', () => false);
const failureMessage = computed(() => state.value.status === 'missing'
  ? 'No hay trazos locales disponibles para este kanji.' : state.value.status === 'invalid'
    ? 'Este carácter no pertenece a la colección de Kanji.'
    : 'No se pudieron cargar los trazos de este kanji. Puedes reintentarlo.');
</script>
