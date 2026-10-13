import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { getKanjiForLevel, type KanjiLevel, type KanjiEntry } from '../data/kanji';
import {
  acceptsMeaning, createMeaningOptions, emptyKanjiStats, getKanjiStatsKey,
  parseKanjiPreferences, parseKanjiStats, recordKanjiAnswer, shuffle,
} from '../utils/kanjiPractice';

export function useKanjiGame() {
  const level = ref<KanjiLevel>('N5');
  const deck = ref<KanjiEntry[]>([]);
  const currentIndex = ref(0);
  const currentKanji = computed(() => deck.value[currentIndex.value]);
  const options = ref<string[]>([]);
  const gameMode = ref<'multiple-choice' | 'writing'>('multiple-choice');
  const numOptions = ref(4);
  const waitTime = ref(2);
  const selectedAnswer = ref('');
  const showAnswer = ref(false);
  const isCorrect = ref(false);
  const stats = ref(emptyKanjiStats());
  const storageNotice = ref('');
  const statsByLevel = new Map<KanjiLevel, ReturnType<typeof emptyKanjiStats>>();
  let timer: ReturnType<typeof setTimeout> | undefined;

  function clearTimer() {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  }

  function prepareQuestion() {
    clearTimer();
    selectedAnswer.value = '';
    showAnswer.value = false;
    isCorrect.value = false;
    options.value = createMeaningOptions(currentKanji.value, deck.value, numOptions.value);
  }

  function startLevel() {
    clearTimer();
    if (!statsByLevel.has(level.value)) {
      try {
        statsByLevel.set(level.value, parseKanjiStats(window.localStorage.getItem(getKanjiStatsKey(level.value))));
      } catch {
        statsByLevel.set(level.value, emptyKanjiStats());
        storageNotice.value = 'El almacenamiento no está disponible. El progreso durará esta sesión.';
      }
    }
    stats.value = statsByLevel.get(level.value)!;
    deck.value = shuffle(getKanjiForLevel(level.value));
    currentIndex.value = 0;
    prepareQuestion();
  }

  function persistStats() {
    statsByLevel.set(level.value, stats.value);
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(getKanjiStatsKey(level.value), JSON.stringify(stats.value));
    } catch {
      storageNotice.value = 'No se pudo guardar el progreso. Puedes seguir practicando en esta sesión.';
    }
  }

  function checkAnswer(answer: string) {
    if (!currentKanji.value || showAnswer.value || !answer.trim()) return;
    selectedAnswer.value = answer;
    isCorrect.value = acceptsMeaning(currentKanji.value, answer);
    showAnswer.value = true;
    stats.value = recordKanjiAnswer(stats.value, isCorrect.value);
    persistStats();
    clearTimer();
    timer = setTimeout(nextCharacter, waitTime.value * 1000);
  }

  function nextCharacter() {
    if (!deck.value.length) return;
    currentIndex.value = (currentIndex.value + 1) % deck.value.length;
    prepareQuestion();
  }

  function toggleGameMode() {
    gameMode.value = gameMode.value === 'writing' ? 'multiple-choice' : 'writing';
    // Keep a revealed answer locked even when switching mode.
  }

  function resetStats() {
    stats.value = emptyKanjiStats();
    persistStats();
  }

  watch(level, startLevel, { flush: 'sync' });
  onMounted(() => {
    try {
      const preferences = parseKanjiPreferences(window.localStorage.getItem('gameOptions'));
      gameMode.value = preferences.defaultGameMode;
      numOptions.value = preferences.numOptions;
      waitTime.value = preferences.waitTime;
    } catch {
      storageNotice.value = 'El almacenamiento no está disponible. El progreso durará esta sesión.';
    }
    startLevel();
  });
  onUnmounted(clearTimer);

  return {
    level, currentKanji, options, gameMode, numOptions, selectedAnswer,
    showAnswer, isCorrect, stats, storageNotice,
    checkAnswer, nextCharacter, toggleGameMode, resetStats,
  };
}
