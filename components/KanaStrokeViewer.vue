<template>
  <StrokePlayer :character="character" :record="record" :status="state.status"
    :failure-message="failureMessage" v-model:manually-paused="manuallyPaused" @retry="retry" />
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue';
import StrokePlayer from './StrokePlayer.vue';
import { useKanaStrokes } from '../composables/useKanaStrokes';
import { kanaGeometry } from '../utils/strokePlayer';
import type { KanaScript } from '../utils/kanaStrokes';

const props = defineProps<{ character: string; script?: KanaScript }>();
const character = toRef(props, 'character');
const script = toRef(props, 'script');
const { state, retry } = useKanaStrokes(character, script);
const record = computed(() => state.value.character === character.value
  && state.value.script === script.value && state.value.record
  ? kanaGeometry(state.value.record) : null);
const manuallyPaused = useState<boolean>('kana-stroke-manually-paused', () => false);
const failureMessage = computed(() => state.value.status === 'missing'
  ? 'No hay trazos locales disponibles para este kana.' : state.value.status === 'invalid'
    ? 'Este carácter no pertenece a la colección de kana seleccionada.'
    : 'No se pudieron cargar los trazos de este kana. Puedes reintentarlo.');
</script>
