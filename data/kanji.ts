import n4 from './kanji-n4.json' with { type: 'json' };
import n3 from './kanji-n3.json' with { type: 'json' };
import n2 from './kanji-n2.json' with { type: 'json' };
import n1 from './kanji-n1.json' with { type: 'json' };

export type KanjiLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

export interface KanjiEntry {
  character: string;
  meaning: string;
  aliases: readonly string[];
  level: KanjiLevel;
  detailUrl: string;
}

export const kanjiSourceUrl = 'https://kanjikana.com/es/kanji/jlpt/n5';
export const kanjiLevels: readonly KanjiLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

// Primary meanings transcribed from both pages of Kanjikana's Spanish N5 list.
// This is a learning list, not an official JLPT syllabus. Aliases are explicit synonyms.
const n5Meanings: readonly (readonly [string, string, ...string[]])[] = [
  ['人', 'persona'],
  ['大', 'grande'],
  ['一', 'uno'],
  ['分', 'parte'],
  ['見', 'vista', 'ver'],
  ['出', 'salir'],
  ['日', 'día', 'sol'],
  ['行', 'ir'],
  ['前', 'antes', 'delante'],
  ['時', 'tiempo', 'hora'],
  ['生', 'vida'],
  ['本', 'libro'],
  ['中', 'centro', 'dentro'],
  ['今', 'ahora'],
  ['間', 'intervalo'],
  ['年', 'año'],
  ['子', 'chiquillo', 'niño', 'niña'],
  ['長', 'largo'],
  ['上', 'arriba'],
  ['入', 'entrar'],
  ['後', 'después', 'detrás'],
  ['気', 'espíritu'],
  ['来', 'venir'],
  ['話', 'cuento', 'hablar'],
  ['女', 'femenino', 'mujer'],
  ['国', 'país'],
  ['金', 'oro', 'dinero'],
  ['高', 'alto'],
  ['下', 'debajo', 'abajo'],
  ['学', 'estudio', 'estudiar'],
  ['先', 'antes'],
  ['外', 'fuera', 'exterior'],
  ['何', 'qué'],
  ['男', 'masculino', 'hombre'],
  ['名', 'nombre'],
  ['月', 'mes', 'luna'],
  ['小', 'poco', 'pequeño'],
  ['聞', 'preguntar', 'escuchar', 'oír'],
  ['食', 'alimento', 'comer', 'comida'],
  ['書', 'escritura', 'escribir'],
  ['山', 'montaña'],
  ['電', 'electricidad'],
  ['二', 'dos'],
  ['車', 'coche', 'automóvil', 'auto'],
  ['水', 'agua'],
  ['木', 'árbol', 'madera'],
  ['母', 'madre'],
  ['校', 'escuela'],
  ['父', 'padre'],
  ['白', 'blanco'],
  ['語', 'palabra', 'idioma'],
  ['十', 'diez'],
  ['万', 'diez mil'],
  ['友', 'amigo', 'amiga'],
  ['川', 'arroyo', 'río'],
  ['三', 'tres'],
  ['天', 'paraíso', 'cielo'],
  ['東', 'Este'],
  ['半', 'mitad'],
  ['北', 'Norte'],
  ['火', 'fuego'],
  ['土', 'suelo', 'tierra'],
  ['南', 'Sur'],
  ['千', 'mil'],
  ['西', 'Oeste'],
  ['毎', 'siempre', 'cada'],
  ['休', 'descanso', 'descansar'],
  ['八', 'ocho'],
  ['読', 'leer', 'lectura'],
  ['五', 'cinco'],
  ['四', 'cuatro'],
  ['百', 'cien'],
  ['円', 'circular', 'círculo', 'yen'],
  ['午', 'mediodía'],
  ['七', 'siete'],
  ['左', 'izquierda'],
  ['右', 'derecha'],
  ['雨', 'lluvia'],
  ['六', 'seis'],
  ['九', 'nueve'],
];

export const kanjiN5: readonly KanjiEntry[] = n5Meanings.map(([character, meaning, ...aliases]) => ({
  character,
  meaning,
  aliases,
  level: 'N5',
  detailUrl: `https://kanjikana.com/es/kanji/${encodeURIComponent(character)}`,
}));

// Machine-extracted primary Spanish meanings from every source pagination page.
// JSON retains source URLs, displayed totals and per-page coverage for auditing.
export const kanjiSourceData = { N4: n4, N3: n3, N2: n2, N1: n1 };
export const kanjiCounts: Readonly<Record<KanjiLevel, number>> = {
  N5: 80, N4: 170, N3: 370, N2: 380, N1: 1136,
};

function sourceEntries(level: Exclude<KanjiLevel, 'N5'>): readonly KanjiEntry[] {
  return kanjiSourceData[level].entries.map(({ character, meaning }) => ({
    character, meaning, aliases: [], level,
    detailUrl: `https://kanjikana.com/es/kanji/${encodeURIComponent(character)}`,
  }));
}

const entriesByLevel: Readonly<Record<KanjiLevel, readonly KanjiEntry[]>> = {
  N5: kanjiN5, N4: sourceEntries('N4'), N3: sourceEntries('N3'),
  N2: sourceEntries('N2'), N1: sourceEntries('N1'),
};

export function getKanjiSourceUrl(level: KanjiLevel): string {
  return `https://kanjikana.com/es/kanji/jlpt/${level.toLowerCase()}`;
}

export function getKanjiForLevel(level: string): readonly KanjiEntry[] {
  return kanjiLevels.includes(level as KanjiLevel) ? entriesByLevel[level as KanjiLevel] : [];
}
