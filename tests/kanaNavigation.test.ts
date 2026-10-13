import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hiraganaData, katakanaData } from '../data/characters.ts';
import { kanaDetailLocation, kanaTableLocation, validKanaCharacter } from '../utils/kanaNavigation.ts';

const context = { tab: 'kanji' as const, level: 'N2' as const, search: 'árbol' };

test('all 142 current entries have encoded, script-specific detail links', () => {
  const entries = [...hiraganaData, ...katakanaData];
  assert.equal(entries.length, 142);
  for (const entry of entries) {
    const location = kanaDetailLocation(entry.character, context);
    assert.equal(location.path, `/${entry.type}/${encodeURIComponent(entry.character)}`);
    assert.equal(validKanaCharacter(decodeURIComponent(location.path.split('/')[2]), entry.type), entry.character);
    assert.deepEqual(location.query, { ...context, tab: entry.type });
  }
});

test('invalid, repeated, unknown and cross-script glyphs are rejected', () => {
  for (const value of [undefined, null, ['あ'], '日', '', 'ぁ', 'あい', '%E3%81%82', '../あ']) {
    assert.equal(validKanaCharacter(value, 'hiragana'), null);
  }
  assert.equal(validKanaCharacter('ア', 'hiragana'), null);
  assert.equal(validKanaCharacter('あ', 'katakana'), null);
  assert.throws(() => kanaDetailLocation('日', context));
});

test('direct/reloaded details return to their own tab with sanitized context', () => {
  for (const script of ['hiragana', 'katakana'] as const) {
    assert.deepEqual(kanaTableLocation(script, {}), {
      path: '/table', query: { tab: script, level: 'N5', search: '' },
    });
    assert.deepEqual(kanaTableLocation(script, { ...context, redirect: 'https://example.com' }), {
      path: '/table', query: { ...context, tab: script },
    });
    for (const search of [['repeated'], '\u0000', '\ud800', 'a'.repeat(201)]) {
      assert.deepEqual(kanaTableLocation(script, { tab: ['kanji'], level: ['N1'], search }).query,
        { tab: script, level: 'N5', search: '' });
    }
  }
});

test('all twenty Tabla sites use the shared full-card link and independent audio event', () => {
  const source = readFileSync(new URL('../pages/table.vue', import.meta.url), 'utf8');
  const sites = [...source.matchAll(/<KanaReferenceCard\b([\s\S]*?)>([\s\S]*?)<\/KanaReferenceCard>/g)];
  assert.equal(sites.length, 20);
  assert.equal(new Set(sites.map(site => site[1].match(/v-for="char in (\w+)"/)?.[1])).size, 20);
  for (const [, attributes, content] of sites) {
    assert.ok(attributes.includes(':to="kanaDetailLocation(char.character, tableContext)"'));
    assert.ok(attributes.includes(':character="char.character"'));
    assert.ok(attributes.includes('@audio="playAudio(char)"'));
    assert.ok(content.includes('{{ char.character }}'));
    assert.ok(content.includes('{{ char.reading }}'));
    assert.ok(!attributes.includes('@click'));
  }
  assert.ok(!source.includes('Ver trazos'));
  assert.ok(!source.includes('@click="playAudio(char)"'));
});

test('shared card keeps native link navigation and audio as interactive siblings', () => {
  const source = readFileSync(new URL('../components/KanaReferenceCard.vue', import.meta.url), 'utf8');
  const link = source.match(/<NuxtLink\b([\s\S]*?)>([\s\S]*?)<\/NuxtLink>/);
  assert.ok(link);
  assert.ok(link[1].includes(':to="to"'));
  assert.ok(!link[1].includes('@click'));
  assert.ok(link[2].includes('<slot />'));
  assert.ok(!link[2].includes('<button'));
  assert.match(source, /<\/NuxtLink>\s*<button/);
  assert.ok(!source.includes('>Ver trazos<'));
  assert.match(source, /\.kana-reference-link\s*\{[^}]*display: block;[^}]*height: 100%;[^}]*padding: 56px 4px 16px;/);
  assert.match(source, /\.kana-reference-link:focus-visible,/);
});

test('existing row filters retain 68 cards, including legacy omissions and duplicated n', () => {
  const source = readFileSync(new URL('../pages/table.vue', import.meta.url), 'utf8');
  for (const [script, data, omitted] of [
    ['hiragana', hiraganaData, ['じ', 'ち', 'ぢ', 'ふ']],
    ['katakana', katakanaData, ['ジ', 'チ', 'ヂ', 'フ']],
  ] as const) {
    const filters = [...source.matchAll(new RegExp(
      `const ${script}(\\w+) = computed\\(\\(\\) => ${script}Data.filter\\(char => (.*)\\)\\);`, 'g',
    ))];
    assert.equal(filters.length, 10);
    const rendered = filters.flatMap(([, , expression]) => {
      const prefixes = [...expression.matchAll(/startsWith\('([^']+)'\)/g)].map(match => match[1]);
      return data.filter(entry => prefixes.some(prefix => entry.reading.startsWith(prefix))
        || (expression.includes('.includes(char.reading)') && ['a', 'i', 'u', 'e', 'o'].includes(entry.reading))
        || (expression.includes("char.reading === 'n'") && entry.reading === 'n'));
    });
    assert.equal(rendered.length, 68);
    assert.equal(new Set(rendered.map(entry => entry.character)).size, 67);
    assert.deepEqual(data.filter(entry => !rendered.includes(entry)).map(entry => entry.character), omitted);
    assert.equal(rendered.filter(entry => entry.reading === 'n').length, 2);
  }
});
