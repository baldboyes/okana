import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { detailCharacters, detailCoverage, detailFilename, validateDetail, createDetailRequestGuard } from '../utils/kanjiDetails.ts';
import { parseSource } from '../utils/kanjiDetailImport.ts';

const date = '2026-10-01T16:52:35.644Z';
const words = [{ japanese: '今日【きょう】', meaning: 'hoy, este día' }];
const source = () => parseSource('日', 'día, solar, Japón, sol, rayo de sol', [
  { heading: 'Kanji', words: [{ japanese: 'navigation', meaning: 'wrong list' }] },
  { heading: 'Palabras comunes', words },
  { heading: 'Acerca de', words: [] },
], date);

test('selects common words rather than unrelated navigation lists', () => {
  const detail = source();
  assert.deepEqual(detail.words, words);
  assert.equal(detail.meanings, 'día, solar, Japón, sol, rayo de sol');
  assert.equal(detail.provenance.spanishLicense, 'unconfirmed');
});
test('valid legacy and original dictionary JSON retain their schemas', () => {
  assert.deepEqual(validateDetail(source(), '日'), source());
  const original = JSON.parse(readFileSync(new URL('../public/kanji-details/65e5.json', import.meta.url), 'utf8'));
  assert.equal(validateDetail(original, '日').provenance.kind, 'original-dictionaries');
});

test('unknown JSON rejects coercible identifiers and malformed nested values', () => {
  const legacy = source();
  assert.throws(() => validateDetail({ ...legacy, words: [{ japanese: '日', meaning: 'día', entryId: 12 }] }, '日'));
  assert.throws(() => validateDetail({ ...legacy, provenance: { ...legacy.provenance, kind: 'unexpected' } }, '日'));
  assert.throws(() => validateDetail({ ...legacy, availability: { dictionaryCharacter: 1 } }, '日'));
  assert.throws(() => validateDetail({ ...legacy, words: [{ japanese: '日', meaning: 'día', reading: 12 }] }, '日'));

  const original = JSON.parse(readFileSync(new URL('../public/kanji-details/65e5.json', import.meta.url), 'utf8'));
  const numericVersion = structuredClone(original);
  numericVersion.provenance.dictionaries['JMdict.gz'].file_version = 2;
  assert.throws(() => validateDetail(numericVersion, '日'));
  const malformedDatabaseVersion = structuredClone(original);
  malformedDatabaseVersion.provenance.dictionaries['JMdict.gz'].database_version = false;
  assert.throws(() => validateDetail(malformedDatabaseVersion, '日'));
  const malformedLicense = structuredClone(original);
  malformedLicense.provenance.licenses.jmdict = null;
  assert.throws(() => validateDetail(malformedLicense, '日'));
  const invalidSpanishLicense = structuredClone(original);
  invalidSpanishLicense.provenance.spanishLicense = 'invalid-license';
  assert.throws(() => validateDetail(invalidSpanishLicense, '日'));
});

test('missing, malformed and ambiguous lists fail rather than inventing entries', () => {
  assert.throws(() => parseSource('日', 'día', [], date));
  assert.throws(() => parseSource('日', 'día', [{ heading: 'Palabras comunes', words: null }], date));
  assert.throws(() => parseSource('日', 'día', [{ heading: 'Palabras comunes', words }, { heading: 'Palabras comunes', words }], date));
  assert.throws(() => parseSource('日', 'día', [{ heading: 9 }], date));
  assert.throws(() => validateDetail({ ...source(), words: [{ japanese: '', meaning: 'día' }] }, '日'));
  assert.throws(() => validateDetail({ ...source(), meanings: '' }, '日'));
  assert.throws(() => validateDetail({ ...source(), character: '月' }, '日'));
});
test('source parsing validates every section word before selecting a list', () => {
  const commonWords = { heading: 'Palabras comunes', words };
  for (const malformedSection of [
    { heading: 'Otra sección', words: [null] },
    { heading: 'Otra sección', words: [7] },
    { heading: 'Otra sección', words: [{ japanese: '日', meaning: null }] },
    { heading: 'Otra sección', words: 3 },
  ]) assert.throws(() => parseSource('日', 'día', [commonWords, malformedSection], date));

  assert.deepEqual(parseSource('日', 'día', [
    { heading: 'Otra sección', words: null },
    { heading: 'Palabras comunes', words: [] },
  ], date).words, []);
});

test('a verified empty list is different from unavailable data', () => {
  assert.deepEqual(parseSource('日', 'día', [{ heading: 'Palabras comunes', words: [] }], date).words, []);
});
test('Unicode code points yield safe closed-allowlist filenames', () => {
  assert.equal(detailFilename('日'), '65e5.json');
  assert.ok(detailCharacters.has('𠮟'));
  assert.equal(detailFilename('𠮟'), '20b9f.json');
  for (const value of ['../日', '%2f', 'https://example.com', '', '日日']) assert.throws(() => detailFilename(value));
});
test('coverage deduplicates glyphs and ignores unknown characters', () => {
  const result = detailCoverage(['日', '日', '../']);
  assert.equal(result.total, detailCharacters.size);
  assert.equal(result.imported, 1);
  assert.equal(result.remaining, result.total - 1);
  assert.ok(!result.missing.includes('日'));
  assert.equal(detailCoverage([]).remaining, detailCharacters.size);
});
test('request tokens invalidate previous loads and close while loading', () => {
  const guard = createDetailRequestGuard();
  const first = guard.next();
  const second = guard.next();
  assert.equal(guard.current(first), false);
  assert.equal(guard.current(second), true);
  guard.next();
  assert.equal(guard.current(second), false);
});
