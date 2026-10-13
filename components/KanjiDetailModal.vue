<template>
  <dialog ref="dialog" aria-labelledby="kanji-detail-title" @close="finishClose" @cancel.prevent="close" @keydown="containFocus" @click="closeBackdrop"
    class="w-[calc(100%_-_2rem)] max-w-xl max-h-[calc(100dvh_-_2rem)] rounded-xl p-0 text-gray-800 shadow-xl">
    <div class="p-5 sm:p-7">
      <div class="flex items-start justify-between gap-4">
        <h2 id="kanji-detail-title" class="text-5xl leading-tight" lang="ja">{{ character }}</h2>
        <button type="button" autofocus @click="close"
          class="min-h-11 px-3 rounded-lg border border-gray-300 hover:bg-gray-100 focus-visible:outline-blue-600">Cerrar</button>
      </div>
      <p v-if="status === 'loading'" class="mt-6" role="status">Cargando detalles…</p>
      <div v-else-if="status === 'unavailable'" class="mt-6" role="status">
        <p>Los detalles de este kanji todavía no están disponibles aquí.</p>
        <a :href="source" target="_blank" rel="noopener noreferrer"
          class="inline-block mt-3 text-blue-700 underline underline-offset-4">Consultar página original (nueva pestaña)</a>
      </div>
      <template v-else-if="detail">
        <p class="mt-5 text-lg leading-relaxed">{{ detail.meanings || 'KANJIDIC2 no incluye significados en español para este kanji.' }}</p>
        <h3 class="mt-7 mb-3 text-lg font-semibold">Palabras comunes</h3>
        <ul v-if="detail.words.length" class="divide-y divide-gray-200">
          <li v-for="(word, index) in detail.words" :key="index" class="py-3 first:pt-0">
            <p lang="ja" class="text-lg break-words">{{ word.japanese }}</p>
            <p class="mt-1 leading-relaxed break-words text-gray-600">{{ word.meaning }}</p>
          </li>
        </ul>
        <p v-else class="text-gray-600">No hay palabras con traducción al español y marca de prioridad de JMdict para este kanji.</p>
      </template>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { detailSource } from '../utils/kanjiDetails';
import { useKanjiDetails } from '../composables/useKanjiDetails';

const props = defineProps<{ character: string | null }>();
const emit = defineEmits<{ close: [] }>();
const dialog = ref<HTMLDialogElement | null>(null);
const { detail, status, load, clear } = useKanjiDetails();
const source = computed(() => props.character ? detailSource(props.character) : '');
let opener: HTMLElement | null = null;
let previousOverflow = '';
let locked = false;

function closeBackdrop(event: MouseEvent) {
  if (event.target !== dialog.value) return;
  const bounds = dialog.value.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right
    || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
}
function containFocus(event: KeyboardEvent) {
  if (event.key !== 'Tab' || !dialog.value) return;
  const controls = [...dialog.value.querySelectorAll<HTMLElement>('button, a[href], [tabindex="0"]')];
  const first = controls[0];
  const last = controls.at(-1);
  if (!first || !last) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault(); last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault(); first.focus();
  }
}
function release() {
  clear();
  if (!locked) return;
  document.body.style.overflow = previousOverflow;
  locked = false;
  if (opener?.isConnected) opener.focus();
  opener = null;
}
function finishClose() {
  if (dialog.value?.open) return;
  release();
  if (props.character) emit('close');
}
function close() {
  dialog.value?.close();
  finishClose();
}
watch(() => props.character, character => {
  if (!character) { close(); return; }
  if (!dialog.value?.open) {
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    locked = true;
    dialog.value?.showModal();
  }
  void load(character);
}, { flush: 'post' });
onBeforeUnmount(() => { dialog.value?.close(); release(); });
</script>

<style scoped>
dialog { overflow-y: auto; overscroll-behavior: contain; }
dialog::backdrop { background: rgb(17 24 39 / 55%); }
</style>
