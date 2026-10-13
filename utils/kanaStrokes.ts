import { hiraganaData, katakanaData } from '../data/characters.ts';

export const kanaStrokeCommit = 'ec5e17cca76c87587790bcbce5ea0b4d4fb753d6';
export const kanaStrokeCoordinates = 'svg-native-y-down';
export type KanaScript = 'hiragana' | 'katakana';
export interface KanaStrokePart {
  id: string;
  clipId: string;
  outline: string;
  median: string;
}
export interface KanaStrokes {
  character: string;
  script: KanaScript;
  viewBox: '0 0 1024 1024';
  coordinates: typeof kanaStrokeCoordinates;
  strokes: { ordinal: number; parts: KanaStrokePart[] }[];
  provenance: {
    commit: string;
    modifiedAt: string;
    license: 'LGPL-3.0-or-later';
    sourceFilename: string;
    sourceUrl: string;
    sourceSha256: string;
    gitBlobSha1: string;
    sourceHeader: string;
    notice: string;
  };
}
const selected = new Map([...hiraganaData, ...katakanaData].map(row => [row.character, row]));

/** Exact application entry lookup: no normalization, aliases or Kanji coupling. */
export function lookupKana(character: string, script?: KanaScript) {
  const entry = selected.get(character);
  return entry && (!script || entry.type === script) ? entry : undefined;
}
export function kanaStrokeFilename(character: string, script?: KanaScript): string {
  if (!lookupKana(character, script)) throw new Error('Unsupported kana');
  return `${character.codePointAt(0)!.toString(16)}.json`;
}
function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
/** Bounded SVG token safety; intentionally not a complete SVG grammar parser. */
export function validKanaPath(value: unknown): value is string {
  if (typeof value !== 'string' || !value.length || value.length > 20000
    || !/^[MmLlHhVvCcSsQqTtAaZz0-9eE+.,\s-]+$/.test(value)
    || !/^\s*[Mm]/.test(value)) return false;
  const token = /[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?|[MmLlHhVvCcSsQqTtAaZz]/g;
  const tokens = value.match(token) ?? [];
  if (tokens.length < 3 || value.replace(token, '').replace(/[\s,]/g, '')) return false;
  return (value.match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? [])
    .every(n => Number.isFinite(Number(n)) && Math.abs(Number(n)) <= 4096);
}

/** Decode to a fresh safe record. Consumers bind paths, never sourceHeader/markup. */
export function validateKanaStrokes(value: unknown, character: string, script?: KanaScript): KanaStrokes {
  kanaStrokeFilename(character, script);
  const entry = lookupKana(character)!;
  const fail = (): never => { throw new Error('Invalid kana strokes'); };
  if (!object(value) || value.character !== character || value.script !== entry.type
    || value.viewBox !== '0 0 1024 1024' || value.coordinates !== kanaStrokeCoordinates
    || !Array.isArray(value.strokes) || value.strokes.length < 1 || value.strokes.length > 64
    || !object(value.provenance)) return fail();
  const cp = String(character.codePointAt(0));
  let totalParts = 0;
  const strokes = value.strokes.map((stroke: unknown, index: number) => {
    if (!object(stroke) || stroke.ordinal !== index + 1 || !Array.isArray(stroke.parts)
      || stroke.parts.length < 1 || stroke.parts.length > 26) return fail();
    const sourceParts = stroke.parts;
    totalParts += sourceParts.length;
    const parts = sourceParts.map((part: unknown, partIndex: number): KanaStrokePart => {
      const suffix = `${index + 1}${sourceParts.length === 1 ? '' : String.fromCharCode(97 + partIndex)}`;
      if (!object(part) || part.id !== `z${cp}d${suffix}` || part.clipId !== `z${cp}c${suffix}`
        || !validKanaPath(part.outline) || !validKanaPath(part.median)) return fail();
      return { id: part.id, clipId: part.clipId, outline: part.outline, median: part.median };
    });
    return { ordinal: index + 1, parts };
  });
  if (totalParts > 128) return fail();
  const p = value.provenance;
  const filename = `${cp}.svg`;
  const url = `https://raw.githubusercontent.com/parsimonhi/animCJK/${kanaStrokeCommit}/svgsJaKana/${filename}`;
  if (p.commit !== kanaStrokeCommit || p.modifiedAt !== '2026-10-02' || p.license !== 'LGPL-3.0-or-later'
    || p.sourceFilename !== filename || p.sourceUrl !== url
    || typeof p.sourceSha256 !== 'string' || !/^[0-9a-f]{64}$/.test(p.sourceSha256)
    || typeof p.gitBlobSha1 !== 'string' || !/^[0-9a-f]{40}$/.test(p.gitBlobSha1)
    || typeof p.sourceHeader !== 'string' || p.sourceHeader.length > 10000
    || !p.sourceHeader.includes('AnimCJK 2016-2026 Copyright FM-SH')
    || !p.sourceHeader.includes('Lesser General Public License') || !p.sourceHeader.includes('either version 3')
    || typeof p.notice !== 'string' || p.notice.length > 2000 || !p.notice.includes(kanaStrokeCommit)
    || !p.notice.includes('LGPL-3.0-or-later') || !p.notice.includes('without geometry changes')) return fail();
  return {
    character, script: entry.type, viewBox: '0 0 1024 1024', coordinates: kanaStrokeCoordinates, strokes,
    provenance: { commit: kanaStrokeCommit, modifiedAt: p.modifiedAt, license: p.license,
      sourceFilename: filename, sourceUrl: url, sourceSha256: p.sourceSha256, gitBlobSha1: p.gitBlobSha1,
      sourceHeader: p.sourceHeader, notice: p.notice },
  };
}
