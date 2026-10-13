# Kana stroke graphics: source and grouped contract

## Scope and rights

This separate corpus covers the existing 71 Hiragana and 71 Katakana entries in
`data/characters.ts`, including voiced marks. It adds no small kana, digraphs,
Kanji variants. Independent Hiragana/Katakana detail routes now show the existing
reading and audio alongside the shared stroke player. The importer evaluates the actual
TypeScript exports with Node 24; there is no second handwritten target list.

Kana SVG headers and upstream `licenses/COPYING.txt` explicitly license these
graphics under **LGPL-3.0-or-later**, not the Kanji graphics' APL. Original
AnimCJK 2016–2026 Copyright FM-SH headers are preserved in every JSON record and
in the byte-for-byte corresponding SVG files under `public/kana-strokes/source`.
Retain these notices and distribute original and converted graphics freely under
their license, without additional restrictions. `COPYING.txt`, `LGPL.txt` and the
GPL v3 text incorporated by LGPL v3 accompany the graphics. Independent application
code is separate; no upstream player JavaScript was copied. This guide is not
blanket legal clearance. User-visible Kana notices and license/source links are
in the final credits section of Opciones, separate from Kanji APL and dictionaries.

## Pinned evidence

Official repository: `https://github.com/parsimonhi/animCJK`.
Commit: `ec5e17cca76c87587790bcbce5ea0b4d4fb753d6`.
Source directory: `svgsJaKana/`, 177 upstream SVG files.
Selected coverage: **142/142**, missing none; **419 logical strokes, 440 parts**.
Twenty glyphs have multi-part strokes; for example あ stroke 3, お stroke 2,
な stroke 4 and は stroke 3. カ has two logical strokes.

The retained GitHub directory listing is obtained once from
`https://api.github.com/repos/parsimonhi/animCJK/contents/svgsJaKana?ref=ec5e17cca76c87587790bcbce5ea0b4d4fb753d6`.
Its SHA-256 is `1af169a3da6c0e12f9597e45bc3e0a6f55eee3eaf6c71feaede8589c9839b475`
and size is 173,815 bytes. Each selected decimal-codepoint SVG is downloaded
serially from the pinned official raw GitHub directory, checked against its
listing size and Git blob SHA-1, and assigned an original-byte SHA-256.
`manifest.json` records all URLs, sizes and hashes. Git SHA-1 is an upstream
identity check, not a replacement for SHA-256. Sources are retained unmodified.

License texts are also retained unmodified and their hashes are pinned:

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| COPYING.txt | 1476 | `4d284bbcd461e3fbaa6e2b61740ad68b281fce92ab8be817a0be5267d632a71f` |
| LGPL.txt | 7651 | `a5681bf9b05db14d86776930017c647ad9e6e56ff6bbcfdf21e5848288dfaf1b` |
| GPL-3.0.txt | 35149 | `3972dc9744f6499f0f9b2dbf76696f2ae7ad8af9b23dde66d6af86c9dfb36986` |

The first two URLs are the pinned repository's `licenses/COPYING.txt` and
`licenses/LGPL.txt`; GPL v3 is from `https://www.gnu.org/licenses/gpl-3.0.txt`.
The manifest stores their complete exact URLs.

## Implemented loading and player contract

`utils/kanaStrokes.ts` exports `KanaStrokes`, `KanaStrokePart`, `KanaScript`,
`lookupKana`, `kanaStrokeFilename`, `validKanaPath` and `validateKanaStrokes`.
The filename is lowercase Unicode hex (`あ` → `3042.json`), while provenance
identifies the original decimal filename (`12354.svg`). Optional script lookup
rejects cross-script routes. The decoder checks the current application allowlist
and returns fresh objects containing only known fields. It validates provenance
shape, not a runtime cryptographic proof of fetched JSON authenticity.

A record contains ordered `strokes: { ordinal, parts }[]`. Each part contains the
original outline ID, corresponding clip ID, outline `d` and median `d` strings.
Ordinals are consecutive and parts preserve source order. All parts of one
logical stroke share progress in the shared player; do not flatten parts into extra strokes.
The original source `--d:Ns;` grouping and clip references are verified at import.

**Coordinates are native SVG y-down**, with `viewBox="0 0 1024 1024"`; never apply
the Kanji `900-y` transform. あ has three logical strokes, with `d3a` and `d3b`
as two pieces of stroke 3. The `d3b` median begins
`M -170,442 -210,484 -60,727`: preserve that off-canvas timing prefix. Median paths
can contain curves and are not converted into point arrays. Bind only decoded
path strings and locally generated clip references; never inject raw SVG or
render provenance headers as HTML.

Safety validation bounds path length, allowed tokens and finite numbers to ±4096,
blocks markup and URLs, and verifies IDs, clip mappings, ordinal/part order and
coordinate flags. It intentionally does **not** implement full SVG path grammar
or mathematical validation of every command's arity. DTDs/entities and source
transforms are rejected. Missing sources, conflicting mappings or malformed
geometry fail instead of inventing replacement geometry.

## Reproduce and verify

No external Python package, XML dependency or npm installation is required.
HTTPS uses normal certificate validation, bounded reads and timeouts, approved
hosts, and no redirects. Downloads and writes stay inside this corpus directory.

```sh
PYTHONDONTWRITEBYTECODE=1 python3 scripts/import-kana-strokes.py --source-dir public/kana-strokes/source
PYTHONDONTWRITEBYTECODE=1 python3 scripts/import-kana-strokes.py --source-dir public/kana-strokes/source --check
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -p 'test_kana_strokes.py'
node --test tests/kana*.test.ts tests/kanji*.test.ts tests/strokePlayer.test.ts
npm run build
git diff --check
```

`--check` only reads retained bytes: no downloads, directory creation or writes.
It rechecks source Git identities and license hashes, regenerates all records and
the manifest in memory, and requires exact output-byte equality. Unexpected SVG
or JSON assets fail; nothing is automatically deleted. The modification date
`2026-10-02` identifies this conversion version, not execution time, so repeated
runs are deterministic. Original caches/licenses may be retained during a failed
first download; converted JSON publication occurs only after corpus validation.
Filesystem failures can interrupt publication, so always follow with `--check`.

Updates require an authorized new pin, notice/license review, explicit date and
validator updates, regenerated evidence and tests. Independent comparison of all
142 original SVGs against JSON is a separate verification step, not replaced by
successful regeneration using the same importer.

The instance-owned loader validates only the selected character, with cancellation
and stale-response guards. `KanaStrokeViewer` adapts grouped geometry to the shared
player without the Kanji transform. Detail routes `/hiragana/:character` and
`/katakana/:character` validate the current corpus and script before mounting the
viewer or enabling gesture-only audio. Invalid entries show an unavailable state.
Tabla opens details through the full Kana card, with sanitized return context;
a separate overlaid audio button plays without navigation. Direct links return
to the matching script tab. Practice routes remain
independent siblings, with no detail initialization of game state or statistics.
`kanaAudioUrl` preserves Tabla's exact `/sounds/${type}/${romaji}.mp3` convention;
all 142 entries are checked against it. Browser acceptance is a separate check.
