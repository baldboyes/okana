import { detailFilename } from './kanjiDetails.ts';

export const strokeCommit = 'ec5e17cca76c87587790bcbce5ea0b4d4fb753d6';
export const strokeTransform = 'translate(0,900) scale(1,-1)';
export interface KanjiStrokes {
  character: string;
  strokes: string[];
  medians: [number, number][][];
  provenance: {
    commit: string;
    modifiedAt: string;
    notice: string;
    license: 'APL';
    coordinateTransform: string;
  };
}

/** Only a selected application glyph can form a local asset filename. */
export function strokeFilename(character: string): string {
  return detailFilename(character);
}

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function coordinate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 4096;
}
function path(value: unknown): value is string {
  if (typeof value !== 'string' || !value.length || value.length > 20000
    || !/^[MmLlHhVvCcSsQqTtAaZz0-9eE+.,\s-]+$/.test(value)
    || !/^[\s]*[Mm]/.test(value)) return false;
  return (value.match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? [])
    .every(number => coordinate(Number(number)));
}
function median(value: unknown): value is [number, number][] {
  return Array.isArray(value) && value.length >= 2 && value.length <= 1024
    && value.every(point => Array.isArray(point) && point.length === 2 && point.every(coordinate));
}

/** Decode unknown JSON; never insert source markup or external resource URLs. */
export function validateStrokes(value: unknown, character: string): KanjiStrokes {
  strokeFilename(character);
  if (!object(value) || value.character !== character
    || !Array.isArray(value.strokes) || value.strokes.length < 1 || value.strokes.length > 64
    || !value.strokes.every(path) || !Array.isArray(value.medians)
    || value.medians.length !== value.strokes.length || !value.medians.every(median)
    || !object(value.provenance)) throw new Error('Invalid kanji strokes');
  const provenance = value.provenance;
  if (provenance.commit !== strokeCommit || provenance.modifiedAt !== '2026-10-01'
    || provenance.license !== 'APL' || provenance.coordinateTransform !== strokeTransform
    || typeof provenance.notice !== 'string' || provenance.notice.length > 2000
    || !provenance.notice.includes(strokeCommit) || !provenance.notice.includes('Arphic Public License')) {
    throw new Error('Invalid stroke provenance');
  }
  return {
    character, strokes: value.strokes, medians: value.medians,
    provenance: {
      commit: strokeCommit, modifiedAt: provenance.modifiedAt, notice: provenance.notice,
      license: 'APL', coordinateTransform: strokeTransform,
    },
  };
}
