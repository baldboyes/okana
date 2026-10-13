import test from 'node:test';
import assert from 'node:assert/strict';
import { advancePlayback, boundedProgress, createPlayback, pausePlayback, replayPlayback,
  resumePlayback, setPlaybackSpeed, stepPlayback, strokeFraction } from '../utils/kanjiStrokePlayback.ts';

test('normal playback, partial pause and resume preserve fractional progress', () => {
  let state = resumePlayback(createPlayback(4));
  state = advancePlayback(state, 350);
  assert.equal(state.progress, 0.5);
  state = pausePlayback(state);
  assert.equal(advancePlayback(state, 1000).progress, 0.5);
  state = advancePlayback(resumePlayback(state), 350);
  assert.equal(state.progress, 1);
  assert.equal(strokeFraction(state.progress, 0), 1);
  assert.equal(strokeFraction(1.5, 1), 0.5);
  assert.equal(strokeFraction(1.5, 2), 0);
});

test('every supported speed changes future deltas only', () => {
  for (const speed of [0.5, 1, 1.5, 2]) {
    const original = advancePlayback(resumePlayback(createPlayback(4)), 350);
    const changed = setPlaybackSpeed(original, speed);
    assert.equal(changed.progress, 0.5);
    assert.equal(advancePlayback(changed, 700).progress, 0.5 + speed);
  }
  const state = createPlayback(4);
  assert.equal(setPlaybackSpeed(state, 3), state);
});

test('manual steps pause and snap to adjacent clear boundaries', () => {
  const partial = advancePlayback(resumePlayback(createPlayback(4)), 1050);
  assert.equal(stepPlayback(partial, -1).progress, 1);
  assert.equal(stepPlayback(partial, 1).progress, 2);
  assert.equal(stepPlayback(partial, 1).playing, false);
  assert.equal(stepPlayback(createPlayback(4), -1).progress, 0);
  assert.equal(stepPlayback({ ...partial, progress: 4 }, 1).progress, 4);
  assert.equal(stepPlayback({ ...partial, progress: 2 }, -1).progress, 1);
});

test('completion clamps, resume cannot restart, replay explicitly restarts', () => {
  const finished = advancePlayback(resumePlayback(createPlayback(4)), 99999);
  assert.equal(finished.progress, 4);
  assert.equal(finished.playing, false);
  assert.equal(resumePlayback(finished).playing, false);
  assert.deepEqual(replayPlayback(finished), { ...finished, progress: 0, playing: true });
  assert.equal(replayPlayback(finished, false).playing, false);
});

test('invalid count, delta, duration and progress cannot escape bounds', () => {
  for (const count of [-1, 1.5, NaN, Infinity, 65]) assert.equal(createPlayback(count).count, 0);
  assert.equal(resumePlayback(createPlayback(0)).playing, false);
  const state = resumePlayback(createPlayback(4));
  for (const delta of [-1, 0, NaN, Infinity]) assert.equal(advancePlayback(state, delta), state);
  for (const duration of [-1, 0, NaN, Infinity]) assert.equal(advancePlayback(state, 100, duration), state);
  assert.equal(boundedProgress(-1, 4), 0);
  assert.equal(boundedProgress(Infinity, 4), 0);
  assert.equal(boundedProgress(10, 4), 4);
});
