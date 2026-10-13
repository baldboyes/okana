import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { detailCharacters, detailFilename, validateDetail } from '../utils/kanjiDetails.ts';

const directory = new URL('../public/kanji-details/', import.meta.url);
const read = (name: string) => JSON.parse(readFileSync(new URL(name, directory), 'utf8'));

test('real dictionary corpus validates all 2136 glyphs, not the coverage manifest', () => {
  const files = readdirSync(directory).filter(name => name !== 'coverage.json');
  assert.equal(files.length, 2136);
  assert.equal(detailCharacters.size, 2136);
  let meanings = 0;
  let words = 0;
  for (const character of detailCharacters) {
    const detail = validateDetail(read(detailFilename(character)), character);
    meanings += Number(!!detail.meanings);
    words += Number(!!detail.words.length);
  }
  const coverage = read('coverage.json');
  assert.equal(coverage.targetEntries, 2136);
  assert.equal(meanings, coverage.spanishHeadlineCoverage);
  assert.equal(words, coverage.recordsWithWords);
  assert.equal(2136 - words, coverage.emptyWordLists);
  assert.deepEqual(coverage.missingGlyphs, []);
  assert.equal(coverage.missingSpanishMeanings.length, 2136 - meanings);
});

test('real 日/学 contain Spanish words; 𠮟 has honest missing Spanish heading', () => {
  for (const character of ['日', '学']) {
    const detail = validateDetail(read(detailFilename(character)), character);
    assert.ok(detail.meanings.length > 0);
    assert.ok(detail.words.length > 0);
    assert.ok(detail.words.every(word => word.spelling?.includes(character) && word.reading));
  }
  const detail = validateDetail(read('20b9f.json'), '𠮟');
  assert.equal(detail.meanings, '');
  assert.equal(detail.availability?.spanishMeanings, false);
  assert.ok(detail.words.some(word => word.spelling === '𠮟る'));
});

test('original schema refuses unsafe source, corrupt checksum, pairing and false coverage', () => {
  const original = read('65e5.json');
  const badSource = structuredClone(original);
  badSource.provenance.dictionaries['JMdict.gz'].url = 'https://invalid.example/JMdict.gz';
  assert.throws(() => validateDetail(badSource, '日'));
  const badChecksum = structuredClone(original);
  badChecksum.provenance.dictionaries['JMdict.gz'].sha256 = 'invalid';
  assert.throws(() => validateDetail(badChecksum, '日'));
  const badPair = structuredClone(original);
  badPair.words[0].reading = '';
  assert.throws(() => validateDetail(badPair, '日'));
  const duplicate = structuredClone(original);
  duplicate.words = [duplicate.words[0], duplicate.words[0]];
  assert.throws(() => validateDetail(duplicate, '日'));
  const falseCoverage = structuredClone(original);
  falseCoverage.meanings = '';
  assert.throws(() => validateDetail(falseCoverage, '日'));
  assert.throws(() => validateDetail(read('coverage.json'), '日'));
});
