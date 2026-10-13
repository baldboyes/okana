import { kanjiLevels, type KanjiLevel } from '../data/kanji.ts';
import { detailCharacters } from './kanjiDetails.ts';

export type TableTab = 'hiragana' | 'katakana' | 'kanji';
export interface TableContext {
  tab: TableTab;
  level: KanjiLevel;
  search: string;
}

// Reject repeated parameters, control characters and malformed Unicode.
function safeSearch(value: unknown): string {
  if (typeof value !== 'string' || [...value].length > 200
    || /[\u0000-\u001f\u007f-\u009f]/u.test(value)
    || /[\ud800-\udfff]/u.test(value)) return '';
  return value;
}

export function parseTableContext(query: Record<string, unknown>): TableContext {
  const tab = query.tab === 'kanji' || query.tab === 'katakana' ? query.tab : 'hiragana';
  const level = kanjiLevels.find(level => level === query.level) ?? 'N5';
  return { tab, level, search: safeSearch(query.search) };
}

export function tableContextQuery(context: TableContext) {
  const valid = parseTableContext({ tab: context.tab, level: context.level, search: context.search });
  return { tab: valid.tab, level: valid.level, search: valid.search };
}

export function kanjiTableLocation(query: Record<string, unknown>) {
  const context = parseTableContext(query);
  return { path: '/table', query: tableContextQuery({ ...context, tab: 'kanji' }) };
}

export function validKanjiCharacter(value: unknown): string | null {
  return typeof value === 'string' && detailCharacters.has(value) ? value : null;
}

export function kanjiDetailLocation(character: string, context: TableContext) {
  if (!validKanjiCharacter(character)) throw new Error('Unknown kanji');
  return {
    path: `/kanji/${encodeURIComponent(character)}`,
    query: tableContextQuery({ ...context, tab: 'kanji' }),
  };
}
