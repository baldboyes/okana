import { lookupKana, type KanaScript } from './kanaStrokes.ts';
import { parseTableContext, tableContextQuery, type TableContext } from './kanjiNavigation.ts';

export function validKanaCharacter(value: unknown, script: KanaScript): string | null {
  return typeof value === 'string' && lookupKana(value, script) ? value : null;
}

export function kanaTableLocation(script: KanaScript, query: Record<string, unknown>) {
  const context = parseTableContext(query);
  return { path: '/table', query: tableContextQuery({ ...context, tab: script }) };
}

export function kanaDetailLocation(character: string, context: TableContext) {
  const entry = lookupKana(character);
  if (!entry) throw new Error('Unknown kana');
  return {
    path: `/${entry.type}/${encodeURIComponent(character)}`,
    query: tableContextQuery({ ...context, tab: entry.type }),
  };
}
