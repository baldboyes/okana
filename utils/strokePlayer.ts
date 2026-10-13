import { strokeTransform, type KanjiStrokes } from './kanjiStrokes.ts';
import type { KanaStrokes } from './kanaStrokes.ts';

/** Presentation only: each array entry is one logical stroke, regardless of part count. */
export interface StrokeGeometry {
  viewBox: '0 0 1024 1024';
  transform?: string;
  strokes: readonly { parts: readonly { outline: string; median: string }[] }[];
}
export function kanjiGeometry(record: KanjiStrokes): StrokeGeometry {
  return {
    viewBox: '0 0 1024 1024', transform: strokeTransform,
    strokes: record.strokes.map((outline, index) => {
      const median = record.medians[index];
      if (!median) throw new Error(`Missing median for kanji stroke ${index}`);
      return { parts: [{ outline,
        median: median.map(([x, y], point) => `${point ? 'L' : 'M'}${x},${y}`).join(' '),
      }] };
    }),
  };
}
export function kanaGeometry(record: KanaStrokes): StrokeGeometry {
  return { viewBox: record.viewBox, strokes: record.strokes.map(stroke => ({
    parts: stroke.parts.map(({ outline, median }) => ({ outline, median })),
  })) };
}
