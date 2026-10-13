# Japanese stroke graphics: source and updates

## Scope and rights

`public/kanji-strokes` contains only the application's selected 2,136 glyphs from
AnimCJK's Japanese `graphicsJa.txt`, not Chinese replacements. Each selected glyph
has an independently fetchable lowercase Unicode-hex filename. `manifest.json`
reports measured coverage, missing glyphs, source counts, URLs and checksums.
No runtime module imports the complete graphics corpus.

The graphics are distributed under the Arphic Public License (APL), not the
upstream application's LGPL code licence. Original attribution includes AnimCJK
2016–2026 Copyright FM-SH, MakeMeAHanzi, and the Arphic PL KaitiM GB and Big5 fonts;
see the unaltered upstream `COPYING.txt` and `ARPHICPL.TXT` served beside the assets.
Retain those notices and files when redistributing. Make the derived graphics
freely available under APL without additional restrictions. Each record prominently
states how and when it was modified: selected from the Japanese line-JSON source
and converted to individual JSON, without changing numeric geometry.
Independent application importer, validator and player code are separate;
this notice does not assign the entire application to APL or provide blanket legal
clearance for unrelated material. User-visible credits are at the end of Opciones.

## Pinned snapshot and coordinate evidence

- Commit: `ec5e17cca76c87587790bcbce5ea0b4d4fb753d6`.
- Official source: `https://raw.githubusercontent.com/parsimonhi/animCJK/ec5e17cca76c87587790bcbce5ea0b4d4fb753d6/graphicsJa.txt`.
- Bytes: 21,862,957; source unique records: 7,007.
- Git blob SHA-1: `f2bfb05b0272b1c77ee40446722abf78d941249b`
  (Git identity, not a security hash).
- SHA-256: `2bcd1c6d186e5376c5f9202b4eae2eaeff13c2566675a55f1c9dd548a2ef31c8`.
- Actual selected coverage: 2,136 / 2,136; missing: none.
- `COPYING.txt` SHA-256: `4d284bbcd461e3fbaa6e2b61740ad68b281fce92ab8be817a0be5267d632a71f`.
- `ARPHICPL.TXT` SHA-256: `3a5e90c0957524a89e48203febcd4492ca4393678abaa7e5b4d70f3ff32b386d`.

Source coordinates are **y-up**. Rendering the unchanged data in a 1024×1024 SVG
requires `translate(0,900) scale(1,-1)`, for both outlines and medians. The importer
compares every numeric outline and median coordinate of 日 against the single
pinned official `svgsJa/26085.svg` reference: source outline starts `M349,664`,
reference starts `M349 236`; source median starts `[279,689]`, reference starts
`M279 211`. In each case the reference y is `900 - source y`. The reference uses
`viewBox="0 0 1024 1024"`. Do not guess a 1024-based flip, mutate the geometry, or
render raw y-up coordinates as downward SVG coordinates. No approximate path
lengths are precomputed; `components/KanjiStrokeViewer.vue` uses normalized SVG
`pathLength` for playback.

## Reproduce and validate

Python uses only its standard library. Cache is external to the repository.
The importer downloads one official bulk source, two licences and one coordinate
reference with bounded reads, timeouts, fixed HTTPS host and normal certificate
validation. Cached graphics and licences are verified before repository writes.
Every source record is validated, including unselected records; duplicate glyphs
fail. App targets are read from the existing N5 tuples and imported level JSONs,
not a manually duplicated glyph list. Unknown source glyphs never become targets.

```sh
PYTHONDONTWRITEBYTECODE=1 python3 scripts/import-kanji-strokes.py --cache-dir /tmp/okana-animcjk
PYTHONDONTWRITEBYTECODE=1 python3 scripts/import-kanji-strokes.py --cache-dir /tmp/okana-animcjk --check
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -p 'test_kanji_strokes.py'
node --test tests/kanji*.test.ts
git diff --check
```

`--check` never downloads or writes; it compares exact cached regeneration,
including licences and the manifest, and rejects unexpected JSON assets.
Normal import never deletes stale files. If targets change, inspect unexpected
files and request a separate authorized cleanup; do not silently remove assets.
Missing coverage is advisory and honestly listed, not filled with other variants.
All validation and serialization completes before output starts; filesystem errors
can still interrupt writes, so run the readonly check afterwards.

For an update, review the new official notices and source schema first; update the
pinned commit, size, Git identity, licence digests and fixed modification date in the
importer, and corresponding validator constants. The date records this extraction
version, not the current run time. Review the coordinate reference again. Preserve
original copyright and unaltered licences, regenerate, run all checks, and update
this snapshot documentation with measured evidence. No scraping, certificate
bypass, whole-repository download or one-request-per-glyph workflow is needed.
