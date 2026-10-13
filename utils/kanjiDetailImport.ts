import { detailSource, validateDetail, type KanjiDetail } from './kanjiDetails.ts';

type SourceWord = { japanese: string; meaning: string };

export interface SourceSection {
  heading: string;
  words: SourceWord[] | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isSourceWord(value: unknown): value is SourceWord {
  return isRecord(value) && typeof value.japanese === 'string' && typeof value.meaning === 'string';
}

function isSourceSection(value: unknown): value is SourceSection {
  return isRecord(value) && typeof value.heading === 'string'
    && (value.words === null || (Array.isArray(value.words) && value.words.every(isSourceWord)));
}

export function parseSource(character: string, meanings: string, input: unknown, capturedAt: string): KanjiDetail {
  if (!Array.isArray(input)) throw new Error('Invalid source sections');
  const sections: SourceSection[] = input.map((section: unknown) => {
    if (!isSourceSection(section)) throw new Error('Invalid source sections');
    return {
      heading: section.heading,
      words: section.words === null ? null : section.words.map(word => ({
        japanese: word.japanese,
        meaning: word.meaning,
      })),
    };
  });
  const matches = sections.filter(section => section.heading.trim() === 'Palabras comunes');
  if (matches.length !== 1 || matches[0]!.words === null) throw new Error('Missing or ambiguous common-words list');
  return validateDetail({ character, meanings, words: matches[0]!.words, provenance: {
    source: detailSource(character), capturedAt,
    dictionaryCredits: 'https://kanjikana.com/es/credits',
    dictionaryLicense: 'https://www.edrdg.org/edrdg/licence.html',
    spanishLicense: 'unconfirmed',
  } }, character);
}

// Run in a legitimate browser context; only text, never source HTML/assets.
// The function is self-contained so browser tools can evaluate its source.
export function extractSourceDocument(doc: Document) {
  const headings = [...doc.querySelectorAll('main h1')];
  if (headings.length !== 1) throw new Error('Missing or ambiguous h1');
  const sections = [...doc.querySelectorAll('main h2')]
    .filter(heading => heading.textContent?.trim() === 'Palabras comunes')
    .map(heading => {
      let node: Element | null = heading;
      let list: Element | null = null;
      // Source has h2 inside a filter header, followed by its section ul.
      for (let depth = 0; node && depth < 3 && !list; depth++, node = node.parentElement) {
        let sibling = node.nextElementSibling;
        while (sibling) {
          if (sibling.matches('h1,h2,h3') || sibling.querySelector('h1,h2,h3')) break;
          if (sibling.matches('ul')) { list = sibling; break; }
          sibling = sibling.nextElementSibling;
        }
      }
      const words = list ? [...list.children].map(item => {
        if (!item.matches('li') || item.children.length !== 2) throw new Error('Unexpected vocabulary shape');
        return { japanese: item.children[0]!.textContent!.trim(), meaning: item.children[1]!.textContent!.trim() };
      }) : null;
      return { heading: 'Palabras comunes', words };
    });
  return { meanings: headings[0]!.textContent!.trim(), sections };
}
