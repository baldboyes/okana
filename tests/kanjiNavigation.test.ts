import test from 'node:test';
import assert from 'node:assert/strict';
import {
  kanjiDetailLocation, kanjiTableLocation, parseTableContext,
  tableContextQuery, validKanjiCharacter,
} from '../utils/kanjiNavigation.ts';

test('table context restores all tabs and valid levels without losing Unicode searches', () => {
  for (const tab of ['hiragana', 'katakana', 'kanji']) {
    for (const level of ['N5', 'N4', 'N3', 'N2', 'N1']) {
      const query = { tab, level, search: ' árbol 日 𠮟 & + # / ? ' };
      const context = parseTableContext(query);
      assert.deepEqual(context, query);
      assert.deepEqual(tableContextQuery(context), query);
      const serialized = new URLSearchParams(tableContextQuery(context));
      assert.deepEqual(parseTableContext(Object.fromEntries(serialized)), context);
    }
  }
});

test('external invalid or repeated query values fall back safely', () => {
  for (const query of [
    {}, { tab: 'other', level: 'N0', search: null },
    { tab: ['kanji'], level: ['N1'], search: ['日', '月'] },
    { tab: {}, level: 1, search: {} },
  ]) {
    assert.deepEqual(parseTableContext(query), { tab: 'hiragana', level: 'N5', search: '' });
  }
  for (const search of ['a\n日', '\u0000', '\u007f', '\u0085', '\ud800', '\udfff', '日'.repeat(201)]) {
    assert.equal(parseTableContext({ tab: 'kanji', level: 'N2', search }).search, '');
  }
  assert.equal(parseTableContext({ search: '𠮟'.repeat(200) }).search, '𠮟'.repeat(200));
});

test('detail links encode BMP and supplementary characters with validated return context', () => {
  const context = parseTableContext({ tab: 'kanji', level: 'N1', search: '𠮟 & árbol' });
  for (const character of ['日', '𠮟']) {
    const location = kanjiDetailLocation(character, context);
    assert.equal(location.path, `/kanji/${encodeURIComponent(character)}`);
    assert.equal(decodeURIComponent(location.path.split('/').at(-1)!), character);
    assert.deepEqual(location.query, context);
    assert.deepEqual(kanjiTableLocation(location.query), { path: '/table', query: context });
  }
});

test('direct details always return to Kanji and cannot inject a return URL', () => {
  assert.deepEqual(kanjiTableLocation({ tab: 'katakana', level: 'N3', search: 'día', returnTo: 'https://evil.example' }), {
    path: '/table', query: { tab: 'kanji', level: 'N3', search: 'día' },
  });
  assert.deepEqual(kanjiTableLocation({}), {
    path: '/table', query: { tab: 'kanji', level: 'N5', search: '' },
  });
});

test('only exact corpus characters can create detail routes', () => {
  for (const value of [null, undefined, ['日'], '日月', '../日', '%E6%97%A5', '<script>', 'A', ' 日', '']) {
    assert.equal(validKanjiCharacter(value), null);
  }
  const context = parseTableContext({});
  assert.throws(() => kanjiDetailLocation('../日', context), /Unknown kanji/);
  assert.equal(validKanjiCharacter('日'), '日');
});
