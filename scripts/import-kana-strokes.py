#!/usr/bin/env python3
"""Import only application Kana from pinned official AnimCJK SVG sources."""
import argparse
import hashlib
import http.client
import json
import math
import re
import subprocess
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'public/kana-strokes'
COMMIT = 'ec5e17cca76c87587790bcbce5ea0b4d4fb753d6'
BASE = f'https://raw.githubusercontent.com/parsimonhi/animCJK/{COMMIT}/'
LISTING = f'https://api.github.com/repos/parsimonhi/animCJK/contents/svgsJaKana?ref={COMMIT}'
DATE = '2026-10-02'
NOTICE = f'Converted SVG outlines and median paths to grouped JSON without geometry changes by Okana on {DATE}, from AnimCJK {COMMIT}. Graphics remain LGPL-3.0-or-later; original copyright and notices are retained in sourceHeader and corresponding source SVG files.'
NS = '{http://www.w3.org/2000/svg}'
NUMBER = r'[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?'


def targets():
    program = "import {hiraganaData,katakanaData} from './data/characters.ts'; console.log(JSON.stringify([...hiraganaData,...katakanaData].map(({character,type})=>({character,type}))));"
    try:
        rows = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', program], cwd=ROOT))
    except (ValueError, subprocess.SubprocessError) as error:
        raise ValueError('Cannot read application targets') from error
    if any(len(r['character']) != 1 or r['type'] not in ('hiragana', 'katakana') for r in rows):
        raise ValueError('Invalid application target')
    if len({r['character'] for r in rows}) != len(rows):
        raise ValueError('Duplicate application target')
    return sorted(rows, key=lambda r: ord(r['character']))


def path(value):
    # Safety/token validation, not a claim of full SVG path grammar validation.
    if not isinstance(value, str) or not 1 <= len(value) <= 20000 or not re.fullmatch(r'[MmLlHhVvCcSsQqTtAaZz0-9eE+.,\s-]+', value) or not value.lstrip().startswith(('M', 'm')):
        raise ValueError('Unsafe SVG path')
    tokens = re.findall(NUMBER + r'|[MmLlHhVvCcSsQqTtAaZz]', value)
    residue = re.sub(NUMBER + r'|[MmLlHhVvCcSsQqTtAaZz]|[\s,]', '', value)
    if residue or len(tokens) < 3:
        raise ValueError('Invalid path tokens')
    for number in re.findall(NUMBER, value):
        if not math.isfinite(float(number)) or abs(float(number)) > 4096:
            raise ValueError('Unbounded SVG number')
    return value


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def blob(raw):
    return hashlib.sha1(f'blob {len(raw)}\0'.encode() + raw, usedforsecurity=False).hexdigest()


def extract(raw, character, script, git_sha):
    text = raw.decode('utf-8')
    if '<!DOCTYPE' in text.upper() or '<!ENTITY' in text.upper():
        raise ValueError('Entities forbidden')
    # DTD/entities are rejected above; use a bounded parser with no external resolver.
    parser = ET.XMLParser(target=ET.TreeBuilder())
    parser.feed(text)
    root = parser.close()
    cp = str(ord(character))
    if root.tag != NS + 'svg' or root.get('id') != 'z' + cp or root.get('viewBox') != '0 0 1024 1024':
        raise ValueError('Source glyph/viewBox mismatch')
    comments = re.findall(r'<!--(.*?)-->', text, re.S)
    header = '\n'.join(comments)
    if not all(notice in header for notice in ('LGPL', 'AnimCJK 2016-2026 Copyright FM-SH', 'Lesser General Public License', 'either version 3')):
        raise ValueError('Missing LGPL notice')
    outlines, clips, medians = {}, {}, {}
    order = []
    for element in root.iter():
        if element.get('transform'):
            raise ValueError('Unexpected coordinate transform')
        if element.tag == NS + 'path':
            identifier = element.get('id')
            if identifier:
                match = re.fullmatch(r'z' + cp + r'd([1-9]\d*)([a-z]?)', identifier)
                if not match or identifier in outlines:
                    raise ValueError('Invalid/duplicate outline ID')
                outlines[identifier] = path(element.get('d'))
                order.append(identifier)
            elif element.get('clip-path'):
                clip = re.fullmatch(r'url\(#(z' + cp + r'c[1-9]\d*[a-z]?)\)', element.get('clip-path', ''))
                ordinal = re.fullmatch(r'--d:([1-9]\d*)s;', element.get('style', ''))
                if not clip or not ordinal or clip[1] in medians:
                    raise ValueError('Invalid median mapping/style')
                medians[clip[1]] = (int(ordinal[1]), path(element.get('d')))
            else:
                raise ValueError('Unmapped source path')
        elif element.tag == NS + 'clipPath':
            identifier = element.get('id')
            children = list(element)
            if identifier in clips or len(children) != 1 or children[0].tag != NS + 'use':
                raise ValueError('Invalid/duplicate clip')
            href = children[0].get('{http://www.w3.org/1999/xlink}href', children[0].get('href'))
            if not href or not href.startswith('#'):
                raise ValueError('External/missing clip reference')
            clips[identifier] = href[1:]
    if not 1 <= len(outlines) <= 128 or len(clips) != len(outlines) or set(medians) != set(clips):
        raise ValueError('Missing geometry mappings')
    if list(medians) != ['z' + cp + 'c' + identifier.split('d', 1)[1] for identifier in order]:
        raise ValueError('Median order conflicts with outline order')
    strokes = []
    for identifier in order:
        suffix = identifier.split('d', 1)[1]
        ordinal_match = re.match(r'\d+', suffix)
        if ordinal_match is None:
            raise ValueError('Missing ordinal')
        ordinal = int(ordinal_match[0])
        clip_id = 'z' + cp + 'c' + suffix
        if clips.get(clip_id) != identifier or medians[clip_id][0] != ordinal:
            raise ValueError('Conflicting clip/ordinal mapping')
        if not strokes or strokes[-1]['ordinal'] != ordinal:
            if ordinal != len(strokes) + 1:
                raise ValueError('Nonconsecutive logical strokes')
            strokes.append({'ordinal': ordinal, 'parts': []})
        strokes[-1]['parts'].append({'id': identifier, 'clipId': clip_id, 'outline': outlines[identifier], 'median': medians[clip_id][1]})
    for stroke in strokes:
        suffixes = [p['id'].split('d', 1)[1][len(str(stroke['ordinal'])):] for p in stroke['parts']]
        if suffixes != [''] and suffixes != [chr(97 + i) for i in range(len(suffixes))]:
            raise ValueError('Nonconsecutive stroke parts')
    return {'character': character, 'script': script, 'viewBox': '0 0 1024 1024', 'coordinates': 'svg-native-y-down', 'strokes': strokes,
            'provenance': {'commit': COMMIT, 'modifiedAt': DATE, 'license': 'LGPL-3.0-or-later', 'sourceFilename': cp + '.svg', 'sourceUrl': BASE + 'svgsJaKana/' + cp + '.svg', 'sourceSha256': sha(raw), 'gitBlobSha1': git_sha, 'sourceHeader': header, 'notice': NOTICE}}


def cached(destination, url, check, limit=2000000):
    if destination.exists():
        raw = destination.read_bytes()
    else:
        if check:
            raise ValueError(f'Missing retained source: {destination}')
        approved = url == LISTING or url == 'https://www.gnu.org/licenses/gpl-3.0.txt' or url.startswith(BASE + 'svgsJaKana/') or url in (BASE + 'licenses/COPYING.txt', BASE + 'licenses/LGPL.txt')
        if not approved:
            raise ValueError('Unapproved source URL')
        parsed = urlsplit(url)
        if parsed.scheme != 'https' or parsed.hostname not in ('api.github.com', 'raw.githubusercontent.com', 'www.gnu.org'):
            raise ValueError('Unapproved HTTPS host')
        connection = http.client.HTTPSConnection(parsed.hostname, timeout=60)
        try:
            connection.request('GET', parsed.path + ('?' + parsed.query if parsed.query else ''), headers={'User-Agent': 'Okana-kana-corpus-importer'})
            response = connection.getresponse()
            if response.status != 200:
                raise ValueError(f'Download failed: HTTP {response.status}')
            raw = response.read(limit + 1)
        finally:
            connection.close()
        if len(raw) > limit:
            raise ValueError('Oversized download')
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(raw)
    if len(raw) > limit:
        raise ValueError('Oversized retained source')
    return raw


def serialize(value):
    return (json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n').encode()


def publish(files, check):
    if check:
        for name, raw in files.items():
            if not (OUTPUT / name).exists() or (OUTPUT / name).read_bytes() != raw:
                raise ValueError(f'Regeneration mismatch: {name}')
        if {p.name for p in OUTPUT.glob('*.json')} != {n for n in files if n.endswith('.json')}:
            raise ValueError('Unexpected JSON assets')
    else:
        OUTPUT.mkdir(parents=True, exist_ok=True)
        for name, raw in files.items():
            (OUTPUT / name).write_bytes(raw)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir', type=Path, required=True)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    if args.source_dir.resolve() != (OUTPUT / 'source').resolve():
        raise ValueError('Source directory must be public/kana-strokes/source')
    listing_raw = cached(args.source_dir / 'directory.json', LISTING, args.check)
    try:
        listing = json.loads(listing_raw)
    except ValueError as error:
        raise ValueError('Invalid directory JSON') from error
    entries = {}
    for row in listing:
        name = row['name']
        if row['type'] != 'file' or not re.fullmatch(r'\d+\.svg', name) or name in entries or not re.fullmatch(r'[0-9a-f]{40}', row['sha']) or row['download_url'] != BASE + 'svgsJaKana/' + name:
            raise ValueError('Invalid pinned directory metadata')
        entries[name] = row
    rows = targets()
    missing = [r['character'] for r in rows if str(ord(r['character'])) + '.svg' not in entries]
    if missing:
        raise ValueError(f'Missing official targets: {missing}')
    expected_sources = {str(ord(r['character'])) + '.svg' for r in rows}
    if {p.name for p in args.source_dir.glob('*.svg')} - expected_sources:
        raise ValueError('Unexpected retained SVG sources')
    files, sources = {}, {}
    logical, pieces, multipart = 0, 0, {}
    for row in rows:
        glyph = row['character']
        name = str(ord(glyph)) + '.svg'
        raw = cached(args.source_dir / name, entries[name]['download_url'], args.check, 200000)
        if blob(raw) != entries[name]['sha'] or len(raw) != entries[name]['size']:
            raise ValueError(f'Pinned blob mismatch: {name}')
        record = extract(raw, glyph, row['type'], entries[name]['sha'])
        files[f'{ord(glyph):x}.json'] = serialize(record)
        sources[name] = {'url': entries[name]['download_url'], 'gitBlobSha1': blob(raw), 'sha256': sha(raw), 'bytes': len(raw)}
        logical += len(record['strokes'])
        pieces += sum(len(s['parts']) for s in record['strokes'])
        groups = [s['ordinal'] for s in record['strokes'] if len(s['parts']) > 1]
        if groups:
            multipart[glyph] = groups
    licenses = {}
    expected_license_hashes = {
        'COPYING.txt': '4d284bbcd461e3fbaa6e2b61740ad68b281fce92ab8be817a0be5267d632a71f',
        'LGPL.txt': 'a5681bf9b05db14d86776930017c647ad9e6e56ff6bbcfdf21e5848288dfaf1b',
        'GPL-3.0.txt': '3972dc9744f6499f0f9b2dbf76696f2ae7ad8af9b23dde66d6af86c9dfb36986',
    }
    for name, url in [('COPYING.txt', BASE + 'licenses/COPYING.txt'), ('LGPL.txt', BASE + 'licenses/LGPL.txt'), ('GPL-3.0.txt', 'https://www.gnu.org/licenses/gpl-3.0.txt')]:
        raw = cached(OUTPUT / name, url, args.check, 100000)
        if sha(raw) != expected_license_hashes[name]:
            raise ValueError(f'License byte/hash mismatch: {name}')
        files[name] = raw
        licenses[name] = {'url': url, 'sha256': sha(raw), 'bytes': len(raw)}
    manifest = {
        'commit': COMMIT,
        'modifiedAt': DATE,
        'license': 'LGPL-3.0-or-later',
        'notice': NOTICE,
        'coordinates': 'svg-native-y-down',
        'targetCount': len(rows),
        'importedCount': len(sources),
        'sourceCount': len(entries),
        'missing': [],
        'logicalStrokeCount': logical,
        'partCount': pieces,
        'multipart': multipart,
        'directory': {'url': LISTING, 'sha256': sha(listing_raw), 'bytes': len(listing_raw)},
        'sources': sources,
        'licenses': licenses,
    }
    files['manifest.json'] = serialize(manifest)
    publish(files, args.check)
    print(json.dumps({k: v for k, v in manifest.items() if k not in ('sources', 'notice')}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
