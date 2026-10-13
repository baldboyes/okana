import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import { detailCharacters } from '../utils/kanjiDetails.ts';
import { strokeFilename, strokeTransform, validateStrokes } from '../utils/kanjiStrokes.ts';

const directory = new URL('../public/kanji-strokes/', import.meta.url);
const read = (name: string): unknown => JSON.parse(readFileSync(new URL(name, directory), 'utf8'));

test('all actual app glyphs decode independent local assets', () => {
  assert.equal(detailCharacters.size, 2136);
  assert.equal(readdirSync(directory).filter(name => name.endsWith('.json')).length, 2137);
  for (const glyph of detailCharacters) {
    const filename = strokeFilename(glyph);
    assert.match(filename, /^[a-f0-9]+\.json$/);
    const decoded = validateStrokes(read(filename), glyph);
    assert.equal(decoded.character, glyph);
    assert.equal(decoded.provenance.coordinateTransform, strokeTransform);
    assert.equal(decoded.strokes.length, decoded.medians.length);
  }
});

test('filename rejects markup, paths, URLs and unknown scalar glyphs', () => {
  for (const glyph of ['../日', '<svg>', 'https://example.com', '日月', '', '𠮷', '\ud800']) {
    assert.throws(() => strokeFilename(glyph));
  }
  assert.equal(strokeFilename('日'), '65e5.json');
});

test('unknown JSON is validated before rendering', () => {
  const valid = validateStrokes(read('65e5.json'), '日');
  for (const patch of [
    { character: '月' }, { strokes: ['<script/>'] }, { strokes: ['url(https://evil)'] },
    { strokes: ['M0 0L1e999 0'] }, { strokes: ['M0 0L4097 0'] },
    { medians: [] }, { medians: [[[0, 0]]] },
    { medians: Array(4).fill([[0, 0], [NaN, 0]]) },
    { medians: Array(4).fill([[0, 0], [Infinity, 0]]) },
    { medians: Array(4).fill([[0, 0], [true, 0]]) },
    { provenance: { ...valid.provenance, coordinateTransform: 'scale(1,1)' } },
    { provenance: { ...valid.provenance, license: 'unknown' } },
  ]) assert.throws(() => validateStrokes({ ...valid, ...patch }, '日'));
  for (const value of [null, [], 1, '日', {}]) assert.throws(() => validateStrokes(value, '日'));
});
