import type { KanjiEntry, KanjiLevel } from '../data/kanji.ts';

export interface KanjiStats {
  correct: number;
  incorrect: number;
  streak: number;
  bestStreak: number;
  totalAttempts: number;
  accuracy: number;
}

export interface KanjiPreferences {
  defaultGameMode: 'multiple-choice' | 'writing';
  numOptions: number;
  waitTime: number;
}

export const kanjiStatsKey = 'kanjiN5Stats';

export function getKanjiStatsKey(level: KanjiLevel): string {
  return `kanji${level}Stats`;
}

export function normalizeMeaning(value: string): string {
  // Strip accent marks except the tilde on Spanish ñ, including decomposed input.
  return value.normalize('NFC').toLocaleLowerCase('es').normalize('NFD')
    .replace(/n\u0303/g, 'ñ').replace(/\p{M}/gu, '').normalize('NFC')
    .trim().replace(/\s+/g, ' ');
}

export function acceptsMeaning(entry: KanjiEntry, answer: string): boolean {
  const normalized = normalizeMeaning(answer);
  return normalized !== '' && [entry.meaning, ...entry.aliases]
    .some(meaning => normalizeMeaning(meaning) === normalized);
}

export function shuffle<T>(values: readonly T[], random: () => number = Math.random): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other]!, result[index]!];
  }
  return result;
}

export function createMeaningOptions(
  entry: KanjiEntry | undefined,
  pool: readonly KanjiEntry[],
  count = 4,
  random: () => number = Math.random,
): string[] {
  if (!entry || !pool.length || !Number.isInteger(count) || count < 1) return [];
  if (count === 1) return [entry.meaning];
  const seen = new Set([normalizeMeaning(entry.meaning)]);
  const distractors: string[] = [];
  for (const candidate of shuffle(pool.filter(candidate => candidate.level === entry.level), random)) {
    const normalized = normalizeMeaning(candidate.meaning);
    if (seen.has(normalized) || acceptsMeaning(entry, candidate.meaning)) continue;
    seen.add(normalized);
    distractors.push(candidate.meaning);
    if (distractors.length === count - 1) break;
  }
  return shuffle([entry.meaning, ...distractors.slice(0, count - 1)], random);
}

export function emptyKanjiStats(): KanjiStats {
  return { correct: 0, incorrect: 0, streak: 0, bestStreak: 0, totalAttempts: 0, accuracy: 0 };
}

function parseObject(raw: string | null): Record<string, unknown> | null {
  try {
    const value: unknown = raw ? JSON.parse(raw) : null;
    return value !== null && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export function parseKanjiStats(raw: string | null): KanjiStats {
  const value = parseObject(raw);
  if (!value) return emptyKanjiStats();
  const fields = ['correct', 'incorrect', 'streak', 'bestStreak', 'totalAttempts'] as const;
  if (!fields.every(field => typeof value[field] === 'number'
    && Number.isSafeInteger(value[field]) && (value[field] as number) >= 0)) return emptyKanjiStats();
  const stats = Object.fromEntries(fields.map(field => [field, value[field]])) as Omit<KanjiStats, 'accuracy'>;
  if (!Number.isSafeInteger(stats.correct + stats.incorrect)
    || stats.totalAttempts !== stats.correct + stats.incorrect
    || stats.streak > stats.bestStreak || stats.bestStreak > stats.correct) return emptyKanjiStats();
  return { ...stats, accuracy: stats.totalAttempts ? stats.correct / stats.totalAttempts * 100 : 0 };
}

export function recordKanjiAnswer(stats: KanjiStats, correct: boolean): KanjiStats {
  const streak = correct ? stats.streak + 1 : 0;
  const next = {
    correct: stats.correct + Number(correct),
    incorrect: stats.incorrect + Number(!correct),
    streak,
    bestStreak: Math.max(stats.bestStreak, streak),
    totalAttempts: stats.totalAttempts + 1,
    accuracy: 0,
  };
  next.accuracy = next.correct / next.totalAttempts * 100;
  return next;
}

export function parseKanjiPreferences(raw: string | null): KanjiPreferences {
  const value = parseObject(raw);
  return {
    defaultGameMode: value?.defaultGameMode === 'writing' ? 'writing' : 'multiple-choice',
    numOptions: [4, 8, 16].includes(Number(value?.numOptions)) ? Number(value?.numOptions) : 4,
    waitTime: [1, 2, 3, 5].includes(Number(value?.waitTime)) ? Number(value?.waitTime) : 2,
  };
}
