import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { detailCoverage, detailFilename, validateDetail } from '../utils/kanjiDetails.ts';
import { parseSource } from '../utils/kanjiDetailImport.ts';

// Legacy Kanjikana importer remains offline: no crawler or access bypass.
// Original dictionary imports use import-kanji-dictionaries.py instead.
// Input is a bounded batch of authorized browser text extractions, not HTML.
const output = fileURLToPath(new URL('../public/kanji-details/', import.meta.url));
type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
function parseJson(text: string): JsonValue {
  try { return JSON.parse(text); }
  catch { throw new Error('Invalid JSON extraction/checkpoint; no replacement written'); }
}
const args = process.argv.slice(2);
if (args.length && !(args.length === 2 && args[0] === '--input')) {
  throw new Error('Usage: node scripts/import-kanji-details.ts [--input /tmp/authorized-batch.json]');
}
if (args[0] === '--input') {
  const input = parseJson(await readFile(args[1]!, 'utf8'));
  if (!Array.isArray(input)) throw new Error('Expected extraction batch array');
  const batch = input.map(row => {
    if (!row || typeof row !== 'object' || Array.isArray(row)
      || typeof row.character !== 'string' || typeof row.meanings !== 'string'
      || typeof row.capturedAt !== 'string' || !Array.isArray(row.sections)) throw new Error('Invalid extraction row');
    return parseSource(row.character, row.meanings, row.sections, row.capturedAt);
  });
  if (new Set(batch.map(row => row.character)).size !== batch.length) throw new Error('Duplicate batch glyph');
  await mkdir(output, { recursive: true });
  for (const detail of batch) {
    const filename = `${output}${detailFilename(detail.character)}`;
    // Exclusive writes make each completed glyph a resumable checkpoint.
    try { await writeFile(filename, `${JSON.stringify(detail, null, 2)}\n`, { flag: 'wx' }); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      validateDetail(parseJson(await readFile(filename, 'utf8')), detail.character);
    }
  }
}
let files: string[] = [];
try { files = await readdir(output); }
catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
const imported: string[] = [];
for (const file of files.filter(file => file.endsWith('.json') && file !== 'coverage.json')) {
  if (!/^[0-9a-f]+\.json$/.test(file)) throw new Error(`Unsafe filename: ${file}`);
  const value = parseJson(await readFile(`${output}${file}`, 'utf8'));
  if (!value || typeof value !== 'object' || !('character' in value) || typeof value.character !== 'string') {
    throw new Error('Checkpoint missing character');
  }
  const detail = validateDetail(value, value.character);
  if (detailFilename(detail.character) !== file) throw new Error('Filename/glyph mismatch');
  imported.push(detail.character);
}
console.log(JSON.stringify(detailCoverage(imported), null, 2));
