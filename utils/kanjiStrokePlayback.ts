export const strokeSpeeds = [0.5, 1, 1.5, 2] as const;
export type StrokeSpeed = typeof strokeSpeeds[number];
export interface StrokePlayback { count: number; progress: number; playing: boolean; speed: StrokeSpeed }

export function createPlayback(count: number, speed: StrokeSpeed = 1): StrokePlayback {
  return { count: Number.isInteger(count) && count > 0 && count <= 64 ? count : 0,
    progress: 0, playing: false, speed: strokeSpeeds.includes(speed) ? speed : 1 };
}
export function boundedProgress(progress: number, count: number): number {
  return Number.isFinite(progress) ? Math.max(0, Math.min(count, progress)) : 0;
}
export function advancePlayback(state: StrokePlayback, delta: number, duration = 700): StrokePlayback {
  if (!state.playing || !Number.isFinite(delta) || delta <= 0
    || !Number.isFinite(duration) || duration <= 0) return state;
  const progress = boundedProgress(state.progress + delta * state.speed / duration, state.count);
  return { ...state, progress, playing: progress < state.count };
}
export function pausePlayback(state: StrokePlayback): StrokePlayback { return { ...state, playing: false }; }
export function resumePlayback(state: StrokePlayback): StrokePlayback {
  return { ...state, playing: state.count > 0 && state.progress < state.count };
}
export function replayPlayback(state: StrokePlayback, playing = true): StrokePlayback {
  return { ...state, progress: 0, playing: playing && state.count > 0 };
}
export function setPlaybackSpeed(state: StrokePlayback, speed: number): StrokePlayback {
  return strokeSpeeds.includes(speed as StrokeSpeed) ? { ...state, speed: speed as StrokeSpeed } : state;
}
export function stepPlayback(state: StrokePlayback, direction: -1 | 1): StrokePlayback {
  const boundary = direction === -1 ? Math.ceil(state.progress) - 1 : Math.floor(state.progress) + 1;
  return { ...state, playing: false, progress: boundedProgress(boundary, state.count) };
}
export function strokeFraction(progress: number, index: number): number {
  return Math.max(0, Math.min(1, progress - index));
}
