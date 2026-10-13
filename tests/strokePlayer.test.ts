import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { kanaGeometry, kanjiGeometry } from '../utils/strokePlayer.ts';
import { validateKanaStrokes } from '../utils/kanaStrokes.ts';
import { validateStrokes, strokeTransform } from '../utils/kanjiStrokes.ts';
import { advancePlayback, createPlayback, resumePlayback, strokeFraction } from '../utils/kanjiStrokePlayback.ts';
const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Kana adapter retains every exact path and logical grouping, without y flip', () => {
  for (const [character, hex] of [['あ', '3042'], ['が', '304c'], ['パ', '30d1']]) {
    const record = validateKanaStrokes(JSON.parse(source(`public/kana-strokes/${hex}.json`)), character);
    const geometry = kanaGeometry(record);
    assert.equal(geometry.viewBox, '0 0 1024 1024');
    assert.equal(geometry.transform, undefined);
    assert.equal(geometry.strokes.length, record.strokes.length);
    geometry.strokes.forEach((stroke, index) => {
      assert.deepEqual(stroke.parts, record.strokes[index].parts.map(({ outline, median }) => ({ outline, median })));
    });
    if (character === 'あ') {
      assert.equal(geometry.strokes.length, 3);
      assert.equal(geometry.strokes[2].parts.length, 2);
      assert.ok(geometry.strokes[2].parts[1].median.startsWith('M -170,442 -210,484 -60,727'));
      const playback = advancePlayback(resumePlayback({ ...createPlayback(3), progress: 2 }), 350);
      assert.deepEqual(geometry.strokes[2].parts.map(() => strokeFraction(playback.progress, 2)), [0.5, 0.5]);
    }
  }
});

test('Kanji adapter retains original outlines, point-path conversion and transform', () => {
  const record = validateStrokes(JSON.parse(source('public/kanji-strokes/65e5.json')), '日');
  const geometry = kanjiGeometry(record);
  assert.equal(geometry.transform, strokeTransform);
  assert.equal(geometry.transform, 'translate(0,900) scale(1,-1)');
  geometry.strokes.forEach((stroke, index) => {
    assert.equal(stroke.parts.length, 1);
    assert.equal(stroke.parts[0].outline, record.strokes[index]);
    assert.equal(stroke.parts[0].median, record.medians[index].map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' '));
  });
});

test('Kanji adapter rejects a missing median instead of fabricating an empty path', () => {
  const record = validateStrokes(JSON.parse(source('public/kanji-strokes/65e5.json')), '日');
  assert.throws(() => kanjiGeometry({ ...record, medians: record.medians.slice(0, -1) }),
    /Missing median for kanji stroke/);
});

test('shared presentation retains root, controls, local references and logical-index progress', () => {
  const player = source('components/StrokePlayer.vue');
  assert.match(player, /<section class="stroke-viewer"/);
  assert.match(player, /class="stroke-canvas"/);
  assert.match(player, /strokeFraction\(playback.progress, index\)/);
  assert.match(player, /useId\(\)/);
  assert.match(player, /url\(#\$\{id\}-stroke-\$\{index\}-\$\{partIndex\}\)/);
  assert.doesNotMatch(player, /v-html|localStorage|sourceHeader|part\.clipId/);
  for (const label of ['Repetir', 'Pausar', 'Reproducir', 'Trazo anterior', 'Siguiente trazo', 'Velocidad']) assert.ok(player.includes(label));
  assert.match(player, /onBeforeUnmount\(\(\) => \{\s*mounted = false;\s*stopLoop\(\)/);
  assert.match(player, /frame !== null \|\| document.hidden/);
  assert.match(player, /media\?\.removeEventListener/);
});

test('wrappers keep single root fallthrough, original Kanji loader and separate SSR pause keys', () => {
  const kanji = source('components/KanjiStrokeViewer.vue');
  const kana = source('components/KanaStrokeViewer.vue');
  assert.match(kanji, /useState<boolean>\('kanji-stroke-manually-paused', \(\) => false\)/);
  assert.match(kana, /useState<boolean>\('kana-stroke-manually-paused', \(\) => false\)/);
  assert.match(kanji, /useKanjiStrokes\(character\)/);
  assert.match(kana, /script\?: KanaScript/);
  for (const wrapper of [kanji, kana]) {
    assert.match(wrapper, /<template>\s*<StrokePlayer/);
    assert.doesNotMatch(wrapper, /requestAnimationFrame|<section|inheritAttrs: false/);
  }
});
