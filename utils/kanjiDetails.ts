import { getKanjiForLevel, kanjiLevels } from '../data/kanji.ts';

export interface KanjiDetail {
  character: string;
  meanings: string;
  words: { japanese: string; meaning: string; entryId?: string; spelling?: string; reading?: string; senseNumbers?: number[] }[];
  availability?: { dictionaryCharacter: boolean; spanishMeanings: boolean; spanishPriorityWords: boolean };
  provenance: {
    source: string;
    capturedAt: string;
    kind?: 'original-dictionaries';
    dictionaryCredits?: string;
    dictionaryLicense?: string;
    spanishLicense?: 'unconfirmed';
    dictionaries?: Record<string, { url: string; sha256: string; date_of_creation: string; file_version: string; database_version?: string }>;
    licenses?: Record<string, string>;
    spanishCredits?: string;
    selectionPolicy?: string;
  };
}

export const detailCharacters = new Set(kanjiLevels.flatMap(level =>
  getKanjiForLevel(level).map(entry => entry.character)));

export function detailFilename(character: string): string {
  if (!detailCharacters.has(character)) throw new Error('Unknown kanji');
  return `${character.codePointAt(0)!.toString(16)}.json`;
}

export function detailSource(character: string): string {
  detailFilename(character);
  return `https://kanjikana.com/es/kanji/${encodeURIComponent(character)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string';
}

function isWord(value: unknown): boolean {
  if (!isRecord(value) || typeof value.japanese !== 'string' || !value.japanese.trim()
    || typeof value.meaning !== 'string' || !value.meaning.trim()
    || !isOptionalString(value.entryId) || !isOptionalString(value.spelling)
    || !isOptionalString(value.reading)) return false;
  return value.senseNumbers === undefined || (Array.isArray(value.senseNumbers)
    && value.senseNumbers.every((number: unknown) => typeof number === 'number'));
}

function isAvailability(value: unknown): boolean {
  return value === undefined || (isRecord(value)
    && typeof value.dictionaryCharacter === 'boolean'
    && typeof value.spanishMeanings === 'boolean'
    && typeof value.spanishPriorityWords === 'boolean');
}

function isDictionaryRecord(value: unknown): boolean {
  return isRecord(value) && typeof value.url === 'string'
    && typeof value.sha256 === 'string' && typeof value.date_of_creation === 'string'
    && typeof value.file_version === 'string' && isOptionalString(value.database_version);
}

function isStringRecord(value: unknown): boolean {
  return isRecord(value) && Object.values(value).every(entry => typeof entry === 'string');
}

function isProvenance(value: unknown): value is KanjiDetail['provenance'] {
  if (!isRecord(value) || typeof value.source !== 'string'
    || typeof value.capturedAt !== 'string'
    || !isOptionalString(value.dictionaryCredits) || !isOptionalString(value.dictionaryLicense)
    || !isOptionalString(value.spanishCredits) || !isOptionalString(value.selectionPolicy)
    || (value.spanishLicense !== undefined && value.spanishLicense !== 'unconfirmed')
    || (value.kind !== undefined && value.kind !== 'original-dictionaries')) return false;
  if (value.dictionaries !== undefined && (!isRecord(value.dictionaries)
    || !Object.values(value.dictionaries).every(isDictionaryRecord))) return false;
  return value.licenses === undefined || isStringRecord(value.licenses);
}

function isKanjiDetail(value: unknown): value is KanjiDetail {
  return isRecord(value) && typeof value.character === 'string'
    && typeof value.meanings === 'string' && Array.isArray(value.words)
    && value.words.every(isWord) && isAvailability(value.availability)
    && isProvenance(value.provenance);
}

export function validateDetail(value: unknown, character: string): KanjiDetail {
  detailFilename(character);
  if (!isKanjiDetail(value) || value.character !== character
    || Number.isNaN(Date.parse(value.provenance.capturedAt))) throw new Error('Invalid detail');
  const detail = value;
  const provenance = detail.provenance;
  if (provenance.kind === 'original-dictionaries') {
    const sources = {
      'kanjidic2.xml.gz': 'https://www.edrdg.org/kanjidic/kanjidic2.xml.gz',
      'JMdict.gz': 'https://www.edrdg.org/pub/Nihongo/JMdict.gz',
    };
    if (provenance.source !== sources['kanjidic2.xml.gz'] || !provenance.selectionPolicy
      || !provenance.spanishCredits || !provenance.dictionaries
      || provenance.licenses?.kanjidic2 !== 'https://creativecommons.org/licenses/by-sa/4.0/'
      || provenance.licenses?.jmdict !== 'https://www.edrdg.org/edrdg/licence.html'
      || provenance.licenses?.spanish !== 'https://www.edrdg.org/wwwjdic/wwwjdicinf.html'
      || !Object.entries(sources).every(([name, url]) => {
        const source = provenance.dictionaries?.[name];
        return source?.url === url && /^[a-f0-9]{64}$/.test(source.sha256)
          && /^\d{4}-\d{2}-\d{2}$/.test(source.date_of_creation) && !!source.file_version;
      })
      || detail.words.length > 20
      || !detail.words.every(word => /^\d+$/.test(word.entryId ?? '')
        && word.spelling?.includes(character) && !!word.reading?.trim()
        && word.japanese === `${word.spelling}【${word.reading}】`
        && Array.isArray(word.senseNumbers) && word.senseNumbers.length > 0
        && word.senseNumbers.every(number => Number.isInteger(number) && number > 0))
      || new Set(detail.words.map(word => `${word.spelling}\u0000${word.reading}`)).size !== detail.words.length
      || typeof detail.availability?.dictionaryCharacter !== 'boolean'
      || detail.availability.spanishMeanings !== !!detail.meanings.trim()
      || detail.availability.spanishPriorityWords !== !!detail.words.length) throw new Error('Invalid dictionary detail');
  } else if (provenance.kind !== undefined || !detail.meanings.trim()
    || provenance.source !== detailSource(character)
    || provenance.dictionaryCredits !== 'https://kanjikana.com/es/credits'
    || provenance.dictionaryLicense !== 'https://www.edrdg.org/edrdg/licence.html'
    || provenance.spanishLicense !== 'unconfirmed') throw new Error('Invalid legacy detail');
  return detail;
}

export function detailCoverage(imported: Iterable<string>) {
  const present = new Set([...imported].filter(character => detailCharacters.has(character)));
  const missing = [...detailCharacters].filter(character => !present.has(character));
  return { total: detailCharacters.size, imported: present.size, remaining: missing.length, missing };
}

// Invalidates pending requests on selection changes AND close, even if abort is ignored.
export function createDetailRequestGuard() {
  let revision = 0;
  return { next: () => ++revision, current: (token: number) => token === revision };
}
