# Rebuild local Spanish Kanji details

The `/kanji/:character` detail page uses original, openly distributed KANJIDIC2 and multilingual JMdict files, not Kanjikana common-word pages. Word selection and Spanish wording deliberately differ from Kanjikana. Practice meanings, aliases, table search and level lists remain unchanged. Credits are at the end of Opciones, never on the detail page. Japanese stroke graphics load independently; see [stroke sources and updates](kanji-strokes-sources.md).

## Quick path

```sh
python3 scripts/import-kanji-dictionaries.py --cache-dir /tmp/okana-dictionaries
python3 scripts/import-kanji-dictionaries.py --cache-dir /tmp/okana-dictionaries --check
python3 -m unittest discover -s tests -p 'test_kanji_dictionaries.py'
node --test tests/kanji*.test.ts
npm run build
git diff --check
```

The importer downloads only two pinned HTTPS files when absent. Existing cached files are reused. To update, supply a fresh authorized cache directory containing a new official pair; review version changes, checksums, coverage and sample words before publishing. `--check` is read-only: it requires both cached files and compares every expected output plus the manifest, rejecting extra JSON files. No dependency installation is needed.

## Actual coverage: 2026-10-01 dictionaries

| Measure | Count |
| --- | ---: |
| Unique application targets / valid glyph records | 2136 |
| Targets present in KANJIDIC2 | 2136 |
| Spanish KANJIDIC2 headings | 2063 |
| Missing Spanish headings | 73 |
| Records with eligible Spanish JMdict words | 2098 |
| Empty eligible-word lists | 38 |
| No valid Spanish spelling/reading/sense pairs | 10 |
| Spanish pairs exist, but none priority-marked | 28 |
| Missing target glyphs | 0 |

Both source files were parsed completely: 13,108 KANJIDIC2 characters and 218,850 JMdict entries.

`public/kanji-details/coverage.json` lists every missing heading and empty word list; it is not a glyph record. Missing headings are not replaced with English or practice aliases. Supplementary `𠮟` is `20b9f.json`: it has no Spanish KANJIDIC2 heading, but does have eligible JMdict vocabulary. Empty word lists mean no priority-marked valid spelling/reading pair with Spanish senses, not that the character has no words in Japanese.

## Data contract and selection

- Targets come from the explicitly delimited typed N5 tuple list and N4–N1 JSON `entries`. Exactly 2136 unique single-codepoint glyphs are required. No practice data is written.
- Each hexadecimal codepoint file contains original Spanish headings, at most 20 words, explicit availability flags and provenance. Words retain JMdict entry IDs, spelling, reading and matching Spanish sense numbers.
- `re_nokanji` excludes non-reading pairs. `re_restr` restricts readings to spellings. `stagk` and `stagr` restrict each included sense. Only actual `xml:lang="spa"` glosses are included; English glosses never substitute for Spanish.
- Only documented `ke_pri`/`re_pri` markers qualify a pair. Ranking: best tier (news/ichi/spec/gai 1, then 2, then nf-only), ascending nf bucket, descending distinct marker count, numeric entry ID, spelling, reading. Deduplicate spelling/reading pairs, retaining the best ranked entry. This is an application selection policy, not a corpus frequency ranking or Kanjikana's exact list.
- XML is streamed through standard-library Expat with internal text entities. External DTDs/entities, parameter entities and nested entity references are refused. XML depth, nodes/text per entry, compressed download and decompressed size are bounded. Gzip is consumed to EOF to validate CRC; malformed XML, missing versions and target mismatches fail.
- The browser fetches only the selected local record. Vue renders escaped text. Loader cancellation/revision guards protect character changes and page unmount. The detail page replaces the earlier modal; returning to Tabla restores its tab, level and search from validated query parameters.

## Source verification and provenance

| File | Working official URL | Observed version | SHA-256 of compressed bytes |
| --- | --- | --- | --- |
| KANJIDIC2 | https://www.edrdg.org/kanjidic/kanjidic2.xml.gz | file 4; database 2026-274; 2026-10-01 | `1c60c9453e1c7a318f3492fd8e13ea792d20130402bcbce9ed84e6165dfa1d60` |
| Full multilingual JMdict | https://www.edrdg.org/pub/Nihongo/JMdict.gz | DTD Rev 1.09; creation comment 2026-10-01 | `80fd072e541fb98a749d049ea3bd511a54d35445203cdeb414cb72efbecca6e0` |

The documented FTP-host HTTPS URL failed certificate hostname validation; the working official `www.edrdg.org` equivalent was used without disabling TLS. Headers contain structural/version information and the JMdict creation comment, but **no Spanish copyright/compiler notices**. Compiler attribution therefore comes from project documentation, not imagined XML notices. Provenance records capture time separately from dictionary generation dates. [Dictionary rights and obligations](dictionary-licenses.md) details the distinct rights scopes.

## Legacy importer and rollback

`scripts/import-kanji-details.ts` remains an offline checkpoint validator/authorized text-extraction importer for the previous Kanjikana schema. It skips the separate coverage manifest and never fetches Kanjikana. Kanjikana bulk retrieval remains unauthorized; the original-file permission does not override that restriction. Original dictionary imports do not depend on resolving Kanjikana's access restrictions.

Rollback only this detail corpus/importer/schema/source-documentation/Options-credit work if desired. The subsequent detail-page and stroke-viewer migration has its own rollback boundary in `odd/tasks/kanji-detail-page.md`. Preserve all existing Kanji practice data, table refinements, unrelated tracked modifications and untracked files. No commit, push, release or deployment is part of this change.
