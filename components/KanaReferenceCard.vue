<template>
  <div class="kana-reference-card">
    <NuxtLink
      :to="to"
      :aria-label="`${character}: Ver trazos`"
      class="kana-reference-link text-center border rounded-lg hover:bg-gray-100 focus-visible:outline-blue-600"
    >
      <slot />
    </NuxtLink>
    <button
      type="button"
      class="kana-audio-button text-gray-600 border border-gray-200 rounded hover:bg-gray-100 focus-visible:outline-blue-600"
      :aria-label="`${character}: Reproducir sonido`"
      @click="emit('audio')"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';

defineProps<{ character: string; to: RouteLocationRaw }>();
const emit = defineEmits<{ audio: [] }>();
</script>

<style scoped>
.kana-reference-card {
  position: relative;
  isolation: isolate;
  min-width: 0;
}

.kana-reference-link {
  position: relative;
  z-index: 0;
  display: block;
  height: 100%;
  /* A dedicated top lane keeps the audio target clear of glyphs at five columns. */
  padding: 56px 4px 16px;
}

.kana-audio-button {
  position: absolute;
  z-index: 1;
  top: 4px;
  right: 50%;
  transform: translateX(50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background-color: white;
  cursor: pointer;
}

.kana-reference-link:focus-visible,
.kana-audio-button:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

@media (min-width: 640px) {
  .kana-reference-link {
    padding-inline: 16px;
  }

  .kana-audio-button {
    right: 4px;
    transform: none;
  }
}
</style>
