import test from 'node:test';
import assert from 'node:assert/strict';
import { getKanjiForLevel, kanjiN5, kanjiLevels, kanjiSourceUrl, kanjiCounts, kanjiSourceData, getKanjiSourceUrl } from '../data/kanji.ts';
import {
  acceptsMeaning, createMeaningOptions, emptyKanjiStats, kanjiStatsKey, getKanjiStatsKey,
  normalizeMeaning, parseKanjiPreferences, parseKanjiStats, recordKanjiAnswer, shuffle,
} from '../utils/kanjiPractice.ts';

// Independent transcription of the two parent-verified source snapshots.
// Keep tests portable: browser evidence is untracked and is not a test dependency.
const sourceMeanings = `
人 persona
大 grande
一 uno
分 parte
見 vista
出 salir
日 día
行 ir
前 antes
時 tiempo
生 vida
本 libro
中 centro
今 ahora
間 intervalo
年 año
子 chiquillo
長 largo
上 arriba
入 entrar
後 después
気 espíritu
来 venir
話 cuento
女 femenino
国 país
金 oro
高 alto
下 debajo
学 estudio
先 antes
外 fuera
何 qué
男 masculino
名 nombre
月 mes
小 poco
聞 preguntar
食 alimento
書 escritura
山 montaña
電 electricidad
二 dos
車 coche
水 agua
木 árbol
母 madre
校 escuela
父 padre
白 blanco
語 palabra
十 diez
万 diez mil
友 amigo
川 arroyo
三 tres
天 paraíso
東 Este
半 mitad
北 Norte
火 fuego
土 suelo
南 Sur
千 mil
西 Oeste
毎 siempre
休 descanso
八 ocho
読 leer
五 cinco
四 cuatro
百 cien
円 circular
午 mediodía
七 siete
左 izquierda
右 derecha
雨 lluvia
六 seis
九 nueve
`;

test('all 80 unique N5 glyphs and primary meanings match both source snapshots', () => {
  const sourceEntries = sourceMeanings.trim().split('\n').map(line => [line[0], line.slice(2)]);
  assert.equal(sourceEntries.length, 80);
  assert.equal(kanjiN5.length, 80);
  assert.equal(new Set(kanjiN5.map(entry => entry.character)).size, 80);
  assert.deepEqual(kanjiN5.map(entry => [entry.character, entry.meaning]), sourceEntries);
  for (const entry of kanjiN5) {
    assert.equal(entry.level, 'N5');
    assert.equal(entry.detailUrl, `https://kanjikana.com/es/kanji/${encodeURIComponent(entry.character)}`);
    assert.equal(acceptsMeaning(entry, entry.meaning), true);
  }
  assert.equal(kanjiSourceUrl, 'https://kanjikana.com/es/kanji/jlpt/n5');
});

test('all complete levels have verified counts, unique glyphs and nonempty Spanish meanings', () => {
  const seen = new Set<string>();
  assert.deepEqual(kanjiCounts, { N5: 80, N4: 170, N3: 370, N2: 380, N1: 1136 });
  for (const level of kanjiLevels) {
    const pool = getKanjiForLevel(level);
    assert.equal(pool.length, kanjiCounts[level]);
    assert.equal(new Set(pool.map(entry => entry.character)).size, pool.length);
    for (const entry of pool) {
      assert.equal(entry.level, level);
      assert.equal([...entry.character].length, 1);
      assert.ok(entry.meaning.trim());
      assert.ok(!seen.has(entry.character), `Overlapping glyph ${entry.character}`);
      seen.add(entry.character);
      assert.equal(entry.detailUrl, `https://kanjikana.com/es/kanji/${encodeURIComponent(entry.character)}`);
    }
    if (level === 'N5') continue;
    const source = kanjiSourceData[level];
    assert.equal(source.sourceTotal, kanjiCounts[level]);
    assert.equal(source.sourceUrl, getKanjiSourceUrl(level));
    assert.equal(source.pages.length, Math.ceil(source.sourceTotal / 48));
    assert.equal(source.pages.reduce((sum, page) => sum + page.count, 0), source.sourceTotal);
    source.pages.forEach((page, index) => {
      assert.equal(page.url, index === 0 ? source.sourceUrl : `${source.sourceUrl}/pages/${index + 1}`);
      assert.equal(page.count, Math.min(48, source.sourceTotal - index * 48));
    });
    assert.deepEqual(pool.map(({ character, meaning }) => ({ character, meaning })), source.entries);
  }
  for (const level of ['', 'N6', 'n5', '__proto__']) assert.deepEqual(getKanjiForLevel(level), []);
});

test('each level has isolated statistics storage and preserves the N5 key', () => {
  const keys = kanjiLevels.map(getKanjiStatsKey);
  assert.equal(new Set(keys).size, 5);
  assert.equal(getKanjiStatsKey('N5'), kanjiStatsKey);
  const storage = new Map<string, string>();
  storage.set(getKanjiStatsKey('N4'), JSON.stringify(recordKanjiAnswer(emptyKanjiStats(), true)));
  for (const level of kanjiLevels) {
    const stats = parseKanjiStats(storage.get(getKanjiStatsKey(level)) ?? null);
    assert.equal(stats.correct, level === 'N4' ? 1 : 0);
    assert.notEqual(getKanjiStatsKey(level), 'gameStats');
  }
});

test('normalization handles Spanish case, accents and whitespace without merging ñ and n', () => {
  assert.equal(normalizeMeaning('  DÍEZ   MIL  '), 'diez mil');
  assert.equal(normalizeMeaning(' AÑO '), 'año');
  assert.equal(normalizeMeaning('an\u0303o'), 'año');
  assert.notEqual(normalizeMeaning('año'), normalizeMeaning('ano'));
  assert.equal(normalizeMeaning(' ÁÉÍÓÚÜ '), 'aeiouu');
});

test('writing accepts only primary meanings and explicit aliases', () => {
  const car = kanjiN5.find(entry => entry.character === '車')!;
  const year = kanjiN5.find(entry => entry.character === '年')!;
  assert.equal(acceptsMeaning(car, ' AUTOMOVIL '), true);
  assert.equal(acceptsMeaning(car, 'auto'), true);
  assert.equal(acceptsMeaning(car, 'coch'), false);
  assert.equal(acceptsMeaning(car, 'el coche'), false);
  assert.equal(acceptsMeaning(car, ''), false);
  assert.equal(acceptsMeaning(year, 'ano'), false);
  assert.equal(acceptsMeaning(year, 'AÑO'), true);
});

test('every question has unique distractors and exactly one accepted meaning', () => {
  for (const level of kanjiLevels) for (const entry of getKanjiForLevel(level)) {
    const pool = getKanjiForLevel(level);
    for (const count of [4, 8, 16]) {
      const options = createMeaningOptions(entry, pool, count, () => 0.25);
      assert.ok(options.every(option => pool.some(candidate => candidate.meaning === option)));
      assert.equal(options.length, count);
      assert.equal(new Set(options.map(normalizeMeaning)).size, count);
      assert.equal(options.filter(option => acceptsMeaning(entry, option)).length, 1);
      assert.equal(options.filter(option => option === entry.meaning).length, 1);
    }
  }
  const before = kanjiN5.find(entry => entry.character === '前')!;
  const options = createMeaningOptions(before, kanjiN5, 80, () => 0.5);
  assert.equal(options.filter(option => option === 'antes').length, 1);
  assert.equal(options.length, 79);
});

test('mixed input pools cannot leak distractors from another level', () => {
  const entry = getKanjiForLevel('N4')[0]!;
  const mixed = [...kanjiN5, ...getKanjiForLevel('N4')];
  assert.deepEqual(createMeaningOptions(entry, mixed, 16, () => 0.25),
    createMeaningOptions(entry, getKanjiForLevel('N4'), 16, () => 0.25));
});

test('option generation handles unavailable entries, small pools and invalid counts', () => {
  assert.deepEqual(createMeaningOptions(undefined, []), []);
  assert.deepEqual(createMeaningOptions(kanjiN5[0], []), []);
  assert.deepEqual(createMeaningOptions(kanjiN5[0], kanjiN5, 0), []);
  assert.deepEqual(createMeaningOptions(kanjiN5[0], kanjiN5, NaN), []);
  assert.deepEqual(createMeaningOptions(kanjiN5[0], kanjiN5, 1), ['persona']);
  assert.deepEqual(createMeaningOptions(kanjiN5[0], [kanjiN5[0]!]), ['persona']);
});

test('shuffle copies its input and preserves entries', () => {
  const input = [1, 2, 3, 4];
  const result = shuffle(input, () => 0);
  assert.deepEqual(input, [1, 2, 3, 4]);
  assert.deepEqual([...result].sort(), input);
  assert.notEqual(result, input);
});

test('stats record correct and incorrect answers independently of kana storage', () => {
  assert.notEqual(kanjiStatsKey, 'gameStats');
  const initial = emptyKanjiStats();
  const one = recordKanjiAnswer(initial, true);
  const two = recordKanjiAnswer(one, true);
  const three = recordKanjiAnswer(two, false);
  assert.deepEqual(initial, emptyKanjiStats());
  assert.equal(three.correct, 2);
  assert.equal(three.incorrect, 1);
  assert.equal(three.totalAttempts, 3);
  assert.equal(three.streak, 0);
  assert.equal(three.bestStreak, 2);
  assert.equal(three.accuracy, 2 / 3 * 100);
  assert.deepEqual(parseKanjiStats(JSON.stringify(three)), three);
});

test('malformed and inconsistent stats reset safely; accuracy is derived', () => {
  const valid = recordKanjiAnswer(emptyKanjiStats(), true);
  for (const raw of [null, '', '{', 'null', '[]', 'true', '{}',
    JSON.stringify({ ...valid, correct: -1 }),
    JSON.stringify({ ...valid, incorrect: 0.5 }),
    JSON.stringify({ ...valid, totalAttempts: 2 }),
    JSON.stringify({ ...valid, bestStreak: 0 }),
    JSON.stringify({ ...valid, streak: 4 }),
    JSON.stringify({ ...valid, correct: '1' }),
    JSON.stringify({ ...valid, correct: Number.MAX_VALUE }),
  ]) assert.deepEqual(parseKanjiStats(raw), emptyKanjiStats());
  assert.equal(parseKanjiStats(JSON.stringify({ ...valid, accuracy: -400 })).accuracy, 100);
});

test('preferences use incumbent field names and validate allowed values', () => {
  assert.deepEqual(parseKanjiPreferences(null), {
    defaultGameMode: 'multiple-choice', numOptions: 4, waitTime: 2,
  });
  assert.deepEqual(parseKanjiPreferences('{broken'), parseKanjiPreferences(null));
  assert.deepEqual(parseKanjiPreferences(JSON.stringify({
    defaultGameMode: 'writing', numOptions: 16, waitTime: 5,
  })), { defaultGameMode: 'writing', numOptions: 16, waitTime: 5 });
  assert.deepEqual(parseKanjiPreferences(JSON.stringify({
    defaultGameMode: 'unknown', numOptions: 80, waitTime: -1,
  })), parseKanjiPreferences(null));
});
