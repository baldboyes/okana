<template>
  <section class="stroke-viewer" :aria-labelledby="`${id}-heading`">
    <h2 :id="`${id}-heading`" class="text-xl font-semibold mb-3">Orden de trazos</h2>
    <p v-if="status === 'idle' || status === 'loading'" class="py-8" role="status">Cargando trazos…</p>
    <div v-else-if="!record" class="py-6">
      <p role="status">{{ failureMessage }}</p>
      <button v-if="status !== 'invalid'" class="stroke-control mt-4" type="button" @click="$emit('retry')">Reintentar trazos</button>
    </div>
    <template v-else>
      <svg class="stroke-canvas" :viewBox="record.viewBox" role="img" :aria-label="`Orden de trazos de ${character}`">
        <g :transform="record.transform">
          <defs>
            <template v-for="(stroke, index) in record.strokes" :key="index">
              <clipPath v-for="(part, partIndex) in stroke.parts" :id="`${id}-stroke-${index}-${partIndex}`" :key="partIndex" clipPathUnits="userSpaceOnUse">
                <path :d="part.outline" />
              </clipPath>
            </template>
          </defs>
          <template v-for="(stroke, index) in record.strokes" :key="`guide-${index}`">
            <path v-for="(part, partIndex) in stroke.parts" :key="partIndex" :d="part.outline" fill="#d1d5db" />
          </template>
          <template v-for="(stroke, index) in record.strokes" :key="`reveal-${index}`">
            <g v-for="(part, partIndex) in stroke.parts" :key="partIndex" :clip-path="`url(#${id}-stroke-${index}-${partIndex})`">
              <path :d="part.median" fill="none" stroke="#2563eb" stroke-width="128" stroke-linecap="round"
                stroke-linejoin="round" pathLength="1" stroke-dasharray="1 1"
                :stroke-dashoffset="1 - strokeFraction(playback.progress, index)"
                :visibility="strokeFraction(playback.progress, index) > 0 ? 'visible' : 'hidden'" />
            </g>
          </template>
        </g>
      </svg>
      <p class="my-3 tabular-nums" aria-live="off">{{ completedStrokes }} de {{ playback.count }} trazos</p>
      <div class="stroke-controls">
        <button class="stroke-control" type="button" @click="replay">Repetir</button>
        <button class="stroke-control stroke-primary" type="button" :disabled="!playback.playing && playback.progress >= playback.count" @click="toggle">
          {{ playback.playing ? 'Pausar' : 'Reproducir' }}
        </button>
        <button class="stroke-control" type="button" :disabled="playback.progress <= 0" @click="step(-1)">Trazo anterior</button>
        <button class="stroke-control" type="button" :disabled="playback.progress >= playback.count" @click="step(1)">Siguiente trazo</button>
        <label class="flex items-center gap-2">Velocidad
          <select class="stroke-control" :value="playback.speed" @change="changeSpeed">
            <option v-for="speed in strokeSpeeds" :key="speed" :value="speed">{{ speed }}×</option>
          </select>
        </label>
      </div>
      <p v-if="reducedMotion" class="mt-3 text-sm text-gray-600">Movimiento reducido: reproducción automática desactivada. Puedes inspeccionar cada trazo o pulsar Reproducir.</p>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, ref, useId, watch } from 'vue';
import type { StrokeGeometry } from '../utils/strokePlayer';
import type { StrokeLoadStatus } from '../utils/kanjiStrokeLoader';
import { advancePlayback, createPlayback, pausePlayback, replayPlayback, resumePlayback,
  setPlaybackSpeed, stepPlayback, strokeFraction, strokeSpeeds } from '../utils/kanjiStrokePlayback';

const props = defineProps<{
  character: string; record: StrokeGeometry | null; status: StrokeLoadStatus;
  failureMessage: string; manuallyPaused: boolean;
}>();
const emit = defineEmits<{ retry: []; 'update:manuallyPaused': [value: boolean] }>();
const record = computed(() => props.record);
const id = `stroke-${useId().replace(/[^a-zA-Z0-9_-]/g, '-')}`;
const playback = shallowRef(createPlayback(0));
const completedStrokes = computed(() => Math.floor(playback.value.progress));
const reducedMotion = ref(false);
let frame: number | null = null;
let lastTimestamp: number | null = null;
let mounted = false;
let media: MediaQueryList | undefined;

function stopLoop() {
  if (frame !== null) cancelAnimationFrame(frame);
  frame = null;
  lastTimestamp = null;
}
function startLoop() {
  if (!mounted || !record.value || !playback.value.playing || frame !== null || document.hidden) return;
  frame = requestAnimationFrame(tick);
}
function tick(timestamp: number) {
  frame = null;
  if (!mounted || !record.value || !playback.value.playing) { lastTimestamp = null; return; }
  if (lastTimestamp !== null) playback.value = advancePlayback(playback.value, timestamp - lastTimestamp);
  lastTimestamp = timestamp;
  if (playback.value.playing) startLoop(); else lastTimestamp = null;
}
function toggle() {
  stopLoop();
  emit('update:manuallyPaused', playback.value.playing);
  playback.value = playback.value.playing ? pausePlayback(playback.value) : resumePlayback(playback.value);
  startLoop();
}
function replay() {
  stopLoop();
  emit('update:manuallyPaused', reducedMotion.value);
  playback.value = replayPlayback(playback.value, !reducedMotion.value);
  startLoop();
}
function step(direction: -1 | 1) {
  stopLoop();
  emit('update:manuallyPaused', true);
  playback.value = stepPlayback(playback.value, direction);
}
function changeSpeed(event: Event) {
  stopLoop();
  playback.value = setPlaybackSpeed(playback.value, Number((event.target as HTMLSelectElement).value));
  startLoop();
}
function motionChanged() {
  reducedMotion.value = media?.matches ?? false;
  if (reducedMotion.value) {
    stopLoop();
    playback.value = pausePlayback(playback.value);
  }
}
function visibilityChanged() {
  if (document.hidden) stopLoop(); else startLoop();
}
watch(record, value => {
  stopLoop();
  playback.value = createPlayback(value?.strokes.length ?? 0, playback.value.speed);
  if (value && mounted && !reducedMotion.value && !props.manuallyPaused) {
    playback.value = resumePlayback(playback.value);
    startLoop();
  }
}, { flush: 'sync', immediate: true });
onMounted(() => {
  mounted = true;
  media = window.matchMedia('(prefers-reduced-motion: reduce)');
  motionChanged();
  media.addEventListener('change', motionChanged);
  document.addEventListener('visibilitychange', visibilityChanged);
  if (record.value && !reducedMotion.value && !props.manuallyPaused) {
    playback.value = resumePlayback(playback.value);
    startLoop();
  }
});
onBeforeUnmount(() => {
  mounted = false;
  stopLoop();
  media?.removeEventListener('change', motionChanged);
  document.removeEventListener('visibilitychange', visibilityChanged);
});
</script>

<style scoped>
.stroke-viewer { min-width: 0; }
.stroke-canvas { display: block; width: 100%; max-width: 24rem; height: auto; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: .5rem; }
.stroke-controls { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; }
.stroke-control { min-height: 44px; min-width: 44px; padding: .5rem .75rem; border: 1px solid #9ca3af; border-radius: .5rem; background: white; color: #1f2937; font: inherit; }
.stroke-control:hover:not(:disabled) { background: #eff6ff; border-color: #2563eb; }
.stroke-control:focus-visible { outline: 2px solid #2563eb; outline-offset: 3px; }
.stroke-control:disabled { background: #f3f4f6; color: #6b7280; cursor: not-allowed; }
.stroke-primary { background: #2563eb; border-color: #2563eb; color: white; }
.stroke-primary:hover:not(:disabled) { background: #1d4ed8; color: white; }
</style>
