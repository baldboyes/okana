#!/usr/bin/env python3
"""Reproduce the pinned Japanese AnimCJK subset without third-party packages."""
import argparse
import hashlib
import http.client
import json
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COMMIT = 'ec5e17cca76c87587790bcbce5ea0b4d4fb753d6'
BASE = f'https://raw.githubusercontent.com/parsimonhi/animCJK/{COMMIT}/'
BLOB = 'f2bfb05b0272b1c77ee40446722abf78d941249b'
SIZE = 21862957
DATE = '2026-10-01'
TRANSFORM = 'translate(0,900) scale(1,-1)'
NOTICE = f'Extracted without numeric geometry changes from AnimCJK Japanese graphics at {COMMIT} on {DATE}; converted line records to individual JSON files by Okana. AnimCJK 2016-2026 Copyright FM-SH; derived from MakeMeAHanzi and Arphic PL KaitiM GB/Big5 fonts. Graphics remain under the Arphic Public License; see ARPHICPL.TXT and COPYING.txt for original copyright and attribution.'
PATH = re.compile(r'^[MmLlHhVvCcSsQqTtAaZz0-9eE+.,\s-]+$')


def parse_json(text):
    try:
        return json.loads(text)
    except (ValueError, TypeError) as error:
        raise ValueError('Invalid source JSON') from error


def targets():
    source = (ROOT / 'data/kanji.ts').read_text()
    block = source.split('const n5Meanings:', 1)[1].split('\n];', 1)[0]
    glyphs = re.findall(r"^\s*\['([^']+)'", block, re.M)
    for name in re.findall(r"import \w+ from './(kanji-[^']+\.json)'", source):
        glyphs.extend(row['character'] for row in parse_json((ROOT / 'data' / name).read_text())['entries'])
    if any(len(glyph) != 1 for glyph in glyphs):
        raise ValueError('Invalid target glyph')
    return sorted(set(glyphs), key=ord)


def validate(record):
    if not isinstance(record, dict):
        raise ValueError('Expected object')
    character = record.get('character')
    strokes, medians = record.get('strokes'), record.get('medians')
    if not isinstance(character, str) or len(character) != 1 or 0xD800 <= ord(character) <= 0xDFFF:
        raise ValueError('Expected single Unicode scalar')
    if not isinstance(strokes, list) or not 1 <= len(strokes) <= 64 or not isinstance(medians, list) or len(strokes) != len(medians):
        raise ValueError('Mismatched strokes/medians')
    for stroke, median in zip(strokes, medians, strict=True):
        if not isinstance(stroke, str) or not 1 <= len(stroke) <= 20000 or not PATH.fullmatch(stroke) or not stroke.lstrip().startswith(('M', 'm')):
            raise ValueError('Unsafe path')
        numbers = re.findall(r'[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?', stroke)
        if any(not math.isfinite(float(n)) or abs(float(n)) > 4096 for n in numbers):
            raise ValueError('Invalid path coordinate')
        if not isinstance(median, list) or not 2 <= len(median) <= 1024:
            raise ValueError('Invalid median')
        for point in median:
            if not isinstance(point, list) or len(point) != 2 or any(type(n) not in (int, float) or not math.isfinite(n) or abs(n) > 4096 for n in point):
                raise ValueError('Invalid median point')
    return {'character': character, 'strokes': strokes, 'medians': medians}


def extract(raw, allowlist):
    seen, selected = set(), {}
    for line in raw.decode('utf-8').splitlines():
        record = validate(parse_json(line))
        glyph = record['character']
        if glyph in seen:
            raise ValueError(f'Duplicate source glyph: {glyph}')
        seen.add(glyph)
        if glyph in allowlist:
            selected[glyph] = dict(record, provenance={'commit': COMMIT, 'modifiedAt': DATE, 'notice': NOTICE, 'license': 'APL', 'coordinateTransform': TRANSFORM})
    return selected, len(seen)


def cached(cache, name, remote, limit, check):
    path = cache / name
    if path.exists():
        if path.stat().st_size > limit:
            raise ValueError(f'Oversized cache: {name}')
        return path.read_bytes()
    if check:
        raise ValueError(f'Missing cached source: {name}')
    if remote not in {'graphicsJa.txt', 'licenses/COPYING.txt', 'licenses/APL/english/ARPHICPL.TXT', 'svgsJa/26085.svg'}:
        raise ValueError('Unapproved source URL')
    # Fixed HTTPS host, no redirects, normal certificate validation.
    connection = http.client.HTTPSConnection('raw.githubusercontent.com', timeout=60)
    try:
        connection.request('GET', f'/parsimonhi/animCJK/{COMMIT}/{remote}')
        response = connection.getresponse()
        if response.status != 200:
            raise ValueError(f'Download failed: HTTP {response.status}')
        raw = response.read(limit + 1)
    finally:
        connection.close()
    if len(raw) > limit:
        raise ValueError(f'Oversized download: {name}')
    cache.mkdir(parents=True, exist_ok=True)
    path.write_bytes(raw)
    return raw


def serialize(value):
    return (json.dumps(value, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n').encode()


def publish(files, output, check):
    # All source validation and serialization finishes before any repository write.
    if check:
        for name, raw in files.items():
            if not (output / name).exists() or (output / name).read_bytes() != raw:
                raise ValueError(f'Regeneration mismatch: {name}')
        unexpected = {p.name for p in output.glob('*.json')} - set(files)
        if unexpected:
            raise ValueError(f'Unexpected assets: {sorted(unexpected)}')
    else:
        output.mkdir(parents=True, exist_ok=True)
        for name, raw in files.items():
            (output / name).write_bytes(raw)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache-dir', type=Path, required=True)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = cached(args.cache_dir, 'graphicsJa.txt', 'graphicsJa.txt', SIZE, args.check)
    digest = hashlib.new('sha1', f'blob {len(raw)}\0'.encode() + raw, usedforsecurity=False).hexdigest()
    if len(raw) != SIZE or digest != BLOB:
        raise ValueError('Pinned graphics size/Git blob digest mismatch')
    licences = {name: cached(args.cache_dir, name, remote, 100000, args.check) for name, remote in [('COPYING.txt', 'licenses/COPYING.txt'), ('ARPHICPL.TXT', 'licenses/APL/english/ARPHICPL.TXT')]}
    sample = cached(args.cache_dir, '26085.svg', 'svgsJa/26085.svg', 100000, args.check)
    if b'<svg' not in sample:
        raise ValueError('Invalid official coordinate reference')
    allowlist = targets()
    expected_licenses = {'COPYING.txt': '4d284bbcd461e3fbaa6e2b61740ad68b281fce92ab8be817a0be5267d632a71f', 'ARPHICPL.TXT': '3a5e90c0957524a89e48203febcd4492ca4393678abaa7e5b4d70f3ff32b386d'}
    for name, content in licences.items():
        if hashlib.sha256(content).hexdigest() != expected_licenses[name]:
            raise ValueError(f'Pinned license mismatch: {name}')
    records, count = extract(raw, set(allowlist))
    # The official 日 SVG confirms both outlines and median y coordinates.
    outlines = re.findall(r'<path id="z26085d\d+" d="([^"]+)"', sample.decode())
    median_paths = re.findall(r'<path style="[^"]+"[^>]+ d="([^"]+)"', sample.decode())
    reference = records['日']
    for paths, originals in [(outlines, reference['strokes']), (median_paths, reference['medians'])]:
        if len(paths) != len(originals):
            raise ValueError('Coordinate reference stroke count mismatch')
        for path, original in zip(paths, originals, strict=True):
            numbers = [float(n) for n in re.findall(r'-?\d+(?:\.\d+)?', path)]
            values = [float(n) for n in re.findall(r'-?\d+(?:\.\d+)?', original)] if isinstance(original, str) else [n for point in original for n in point]
            transformed = [n if i % 2 == 0 else 900 - n for i, n in enumerate(values)]
            if numbers != transformed:
                raise ValueError('Coordinate reference differs from declared transform')
    files = {f'{ord(glyph):x}.json': serialize(record) for glyph, record in records.items()}
    manifest = {
        'commit': COMMIT,
        'targetCount': len(allowlist),
        'importedCount': len(records),
        'missing': [g for g in allowlist if g not in records],
        'sourceCount': count,
        'source': {
            'url': BASE + 'graphicsJa.txt', 'bytes': len(raw),
            'gitBlobSha1': digest, 'sha256': hashlib.sha256(raw).hexdigest(),
        },
        'coordinateReference': {
            'url': BASE + 'svgsJa/26085.svg',
            'sha256': hashlib.sha256(sample).hexdigest(),
        },
        'licenses': {
            name: {
                'url': BASE + ('licenses/COPYING.txt' if name == 'COPYING.txt' else 'licenses/APL/english/ARPHICPL.TXT'),
                'sha256': hashlib.sha256(content).hexdigest(),
            } for name, content in licences.items()
        },
        'notice': NOTICE,
        'coordinateTransform': TRANSFORM,
    }
    files.update(licences)
    files['manifest.json'] = serialize(manifest)
    publish(files, ROOT / 'public/kanji-strokes', args.check)
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
