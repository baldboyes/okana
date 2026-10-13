import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import { hiraganaData, katakanaData } from '../data/characters.ts';
import { kanaStrokeFilename, lookupKana, validateKanaStrokes, validKanaPath } from '../utils/kanaStrokes.ts';

const root = new URL('../public/kana-strokes/', import.meta.url);
const load = (glyph: string) => JSON.parse(readFileSync(new URL(kanaStrokeFilename(glyph), root), 'utf8'));

test('actual application allowlist and entire generated contract', () => {
  const rows = [...hiraganaData, ...katakanaData];
  assert.equal(rows.length, 142);
  assert.equal(hiraganaData.length, 71);
  assert.equal(katakanaData.length, 71);
  assert.equal(readdirSync(root).filter(name => /^[0-9a-f]+\.json$/.test(name)).length, 142);
  let strokes = 0, parts = 0;
  for (const row of rows) {
    assert.equal(lookupKana(row.character, row.type), row);
    const decoded = validateKanaStrokes(load(row.character), row.character, row.type);
    strokes += decoded.strokes.length;
    parts += decoded.strokes.reduce((sum, s) => sum + s.parts.length, 0);
    assert.deepEqual(decoded, load(row.character));
  }
  assert.equal(strokes, 419);
  assert.equal(parts, 440);
});

test('あ preserves three logical strokes, four parts and off-canvas timing prefix', () => {
  const record = validateKanaStrokes(load('あ'), 'あ');
  assert.deepEqual(record.strokes.map(s => s.parts.length), [1, 1, 2]);
  assert.equal(record.strokes[2].parts[1].id, 'z12354d3b');
  assert.ok(record.strokes[2].parts[1].median.startsWith('M -170,442 -210,484 -60,727'));
  assert.equal(record.coordinates, 'svg-native-y-down');
  assert.equal(validateKanaStrokes(load('カ'), 'カ').strokes.length, 2);
});

test('reject unsupported, normalized, traversal and wrong-script glyphs', () => {
  for (const glyph of ['日', '../あ', 'ぁ', 'きゃ', 'か\u3099', '', 'ああ', '\ud800']) {
    assert.equal(lookupKana(glyph), undefined);
    assert.throws(() => kanaStrokeFilename(glyph));
  }
  assert.equal(lookupKana('あ', 'katakana'), undefined);
  assert.throws(() => validateKanaStrokes(load('あ'), 'あ', 'katakana'));
  assert.equal(kanaStrokeFilename('あ'), '3042.json');
});

test('path token boundary blocks markup, URLs, nonfinite and unbounded values', () => {
  for (const path of ['<path/>', 'https://x', 'M0 0L1e999 2', 'M0 0L4097 2', 'M0 0LNaN 0', 'M0 0e', 'M', 'M'.repeat(20001)]) {
    assert.equal(validKanaPath(path), false, path);
  }
  assert.equal(validKanaPath('M-210 484Q1 2 3 4C1 2 3 4 5 6Z'), true);
});

test('malformed grouped contracts and provenance fail closed', () => {
  const patches: ((value: ReturnType<typeof load>) => void)[] = [
    v => { v.character = 'い'; }, v => { v.script = 'katakana'; },
    v => { v.coordinates = 'translate(0,900) scale(1,-1)'; },
    v => { v.viewBox = '0 0 900 900'; }, v => { v.strokes = []; },
    v => { v.strokes[0].ordinal = 2; }, v => { v.strokes[0].parts = []; },
    v => { v.strokes[2].parts.reverse(); }, v => { v.strokes[2].parts.pop(); },
    v => { v.strokes[0].parts[0].clipId = 'z12354c2'; },
    v => { v.strokes[0].parts[0].outline = '<svg/>'; },
    v => { v.strokes[0].parts[0].median = 'M0 0L1e999 0'; },
    v => { v.provenance.license = 'APL'; }, v => { v.provenance.commit = 'bad'; },
    v => { v.provenance.modifiedAt = 'today'; }, v => { v.provenance.sourceFilename = '12459.svg'; },
    v => { v.provenance.sourceUrl = 'https://example.com'; },
    v => { v.provenance.sourceSha256 = 'bad'; }, v => { v.provenance.gitBlobSha1 = 'bad'; },
    v => { v.provenance.sourceHeader = ''; }, v => { v.provenance.notice = ''; },
  ];
  for (const patch of patches) {
    const value = load('あ');
    patch(value);
    assert.throws(() => validateKanaStrokes(value, 'あ'));
  }
  for (const value of [null, [], {}, 'bad']) assert.throws(() => validateKanaStrokes(value, 'あ'));
});

test('decoder creates fresh records and strips unrecognized rendering fields', () => {
  const value = load('あ');
  value.strokes[0].parts[0].onclick = 'bad';
  const decoded = validateKanaStrokes(value, 'あ');
  assert.equal('onclick' in decoded.strokes[0].parts[0], false);
  value.strokes[0].parts[0].outline = 'changed';
  assert.notEqual(decoded.strokes[0].parts[0].outline, 'changed');
});
