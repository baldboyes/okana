#!/usr/bin/env python3
"""Import official dictionaries; --check compares without downloading or writing."""
import argparse
import datetime
import gzip
import hashlib
import http.client
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path
from xml.parsers import expat

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'public/kanji-details'
SOURCES = {
    'kanjidic2.xml.gz': 'https://www.edrdg.org/kanjidic/kanjidic2.xml.gz',
    'JMdict.gz': 'https://www.edrdg.org/pub/Nihongo/JMdict.gz',
}
LANG = '{http://www.w3.org/XML/1998/namespace}lang'
POLICY = 'JMdict priority-marked spelling/reading pairs; best tier (1, 2, nf), nf bucket, marker count descending, entry ID, spelling, reading; deduplicate spelling/reading; maximum 20. Not a corpus frequency rank.'


def targets():
    # Read only the explicitly delimited typed N5 tuple list, not practice meanings.
    text = (ROOT / 'data/kanji.ts').read_text()
    block = text.split('const n5Meanings:', 1)[1].split('];', 1)[0]
    glyphs = re.findall(r"^\s*\['([^']+)'", block, re.M)
    for level in range(1, 5):
        try:
            data = json.loads((ROOT / f'data/kanji-n{level}.json').read_text())
        except (OSError, json.JSONDecodeError) as error:
            raise ValueError(f'Cannot read N{level} target data') from error
        glyphs.extend(row['character'] for row in data['entries'])
    if len(glyphs) != 2136 or len(set(glyphs)) != 2136 or any(len(g) != 1 for g in glyphs):
        raise ValueError('Expected exactly 2136 unique single-codepoint targets')
    return sorted(glyphs, key=ord)


def records(stream, tag, metadata=None):
    """Expat handles internal entities; forbid all external/parameter/nested entities."""
    parser = expat.ParserCreate(namespace_separator='}')
    builder = None
    depth = 0
    count = size = total = 0
    ready = []

    def reject(*_):
        raise ValueError('External XML entities/DTDs are forbidden')

    def entity(name, parameter, value, base, system, public, notation):
        if parameter or system or public or value is None or len(value) > 1024 or '&' in value:
            reject()

    def start(name, attrs):
        nonlocal builder, depth, count, size
        depth += 1
        if depth == 1 and name != ('kanjidic2' if tag == 'character' else 'JMdict'):
            raise ValueError('Unexpected XML root')
        if depth > 32:
            raise ValueError('XML depth limit exceeded')
        if depth == 2 and name in (tag, 'header'):
            builder = ET.TreeBuilder()
            count = size = 0
        if builder is not None:
            count += 1
            if count > 10000:
                raise ValueError('XML record node limit exceeded')
            attrs = {('{' + k if '}' in k else k): v for k, v in attrs.items()}
            builder.start(name, attrs)

    def end(name):
        nonlocal builder, depth
        if builder is not None:
            builder.end(name)
            if depth == 2:
                node = builder.close()
                if name == 'header' and metadata is not None:
                    metadata.update({child.tag: child.text for child in node})
                else:
                    ready.append(node)
                builder = None
        depth -= 1

    def text(value):
        nonlocal size
        if builder is not None:
            size += len(value)
            if size > 1000000:
                raise ValueError('XML record text limit exceeded')
            builder.data(value)

    def doctype(name, system, public, internal):
        if system or public:
            reject()
        if name != ('kanjidic2' if tag == 'character' else 'JMdict'):
            raise ValueError('Unexpected dictionary root')

    def comment(value):
        if metadata is None:
            return
        if value.strip().startswith('JMdict created:'):
            metadata['date_of_creation'] = value.strip().split(':', 1)[1].strip()
        if tag == 'entry' and 'file_version' not in metadata and value.strip().startswith('Rev '):
            metadata['file_version'] = 'XML DTD ' + value.strip().splitlines()[0]

    parser.StartElementHandler = start
    parser.EndElementHandler = end
    parser.CharacterDataHandler = text
    parser.EntityDeclHandler = entity
    parser.ExternalEntityRefHandler = reject
    parser.StartDoctypeDeclHandler = doctype
    parser.CommentHandler = comment
    parser.SetParamEntityParsing(expat.XML_PARAM_ENTITY_PARSING_NEVER)
    while True:
        chunk = stream.read(65536)
        total += len(chunk)
        if total > 500000000:
            raise ValueError('Decompressed XML exceeds 500 MB')
        parser.Parse(chunk, not chunk)
        yield from ready
        ready.clear()
        if not chunk:
            break


def values(node, path):
    return [e.text for e in node.findall(path) if e.text]


def priority(markers):
    known = [m for m in markers if m in {'news1', 'ichi1', 'spec1', 'gai1', 'news2', 'ichi2', 'spec2', 'gai2'} or re.fullmatch(r'nf\d{2}', m)]
    if not known:
        return None
    tier = min(1 if m.endswith('1') and not m.startswith('nf') else 2 if not m.startswith('nf') else 3 for m in known)
    nf = min([int(m[2:]) for m in known if m.startswith('nf')] or [99])
    return tier, nf, -len(set(known))


def candidates(entry, glyphs, priority_only=True):
    entry_id = entry.findtext('ent_seq')
    if not entry_id or not entry_id.isdecimal():
        raise ValueError('Invalid JMdict entry ID')
    for spelling in entry.findall('k_ele'):
        japanese = spelling.findtext('keb') or ''
        included = set(japanese) & glyphs
        if not included:
            continue
        for reading in entry.findall('r_ele'):
            kana = reading.findtext('reb') or ''
            restrictions = values(reading, 're_restr')
            if not kana or reading.find('re_nokanji') is not None or (restrictions and japanese not in restrictions):
                continue
            rank = priority(values(spelling, 'ke_pri') + values(reading, 're_pri'))
            if rank is None and priority_only:
                continue
            glosses = []
            senses = []
            for index, sense in enumerate(entry.findall('sense'), 1):
                stagk, stagr = values(sense, 'stagk'), values(sense, 'stagr')
                if (stagk and japanese not in stagk) or (stagr and kana not in stagr):
                    continue
                spanish = [''.join(g.itertext()).strip() for g in sense.findall('gloss') if g.get(LANG) == 'spa']
                spanish = [g for g in spanish if g]
                if spanish:
                    senses.append(index)
                    glosses.extend(spanish)
            if glosses:
                word = {'entryId': entry_id, 'spelling': japanese, 'reading': kana,
                        'senseNumbers': senses, 'japanese': f'{japanese}【{kana}】',
                        'meaning': '; '.join(dict.fromkeys(glosses))}
                yield included, ((*rank, int(entry_id), japanese, kana) if rank else None), word


def fetch(path, url):
    # Only these two pinned URLs; no per-entry requests or certificate bypass.
    if url not in SOURCES.values() or not url.startswith('https://www.edrdg.org/'):
        raise ValueError('Only pinned official HTTPS downloads are permitted')
    if path.is_symlink():
        raise ValueError('Dictionary cache cannot be a symbolic link')
    if path.exists():
        return
    connection = http.client.HTTPSConnection('www.edrdg.org', timeout=60)
    try:
        connection.request('GET', url.removeprefix('https://www.edrdg.org'))
        response = connection.getresponse()
        if response.status != 200:
            raise ValueError(f'Official download returned HTTP {response.status}')
        with path.open('xb') as dest:
            size = 0
            while chunk := response.read(65536):
                size += len(chunk)
                if size > 100000000:
                    raise ValueError('Compressed dictionary exceeds 100 MB')
                dest.write(chunk)
    finally:
        connection.close()


def digest(path):
    if path.is_symlink() or not path.is_file() or path.stat().st_size > 100000000:
        raise ValueError('Unsafe or oversized dictionary cache')
    h = hashlib.sha256()
    with path.open('rb') as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def generate(cache, check=False):
    glyphs = targets()
    wanted = set(glyphs)
    metadata = {}
    for name, url in SOURCES.items():
        path = cache / name
        if not check:
            fetch(path, url)
        metadata[name] = {'url': url, 'sha256': digest(path)}
    found = {}
    kd = metadata['kanjidic2.xml.gz']
    kd['entries'] = 0
    with gzip.open(cache / 'kanjidic2.xml.gz', 'rb') as f:
        for node in records(f, 'character', kd):
            kd['entries'] += 1
            glyph = node.findtext('literal')
            if glyph in wanted:
                found[glyph] = list(dict.fromkeys(e.text.strip() for e in node.findall('reading_meaning/rmgroup/meaning') if e.get('m_lang') == 'es' and e.text and e.text.strip()))
    buckets = {g: {} for g in glyphs}
    jm = metadata['JMdict.gz']
    jm['entries'] = 0
    spanish_pairs = set()
    with gzip.open(cache / 'JMdict.gz', 'rb') as f:
        for node in records(f, 'entry', jm):
            jm['entries'] += 1
            for included, rank, word in candidates(node, wanted, priority_only=False):
                spanish_pairs.update(included)
                if rank is None:
                    continue
                for glyph in included:
                    bucket = buckets[glyph]
                    key = (word['spelling'], word['reading'])
                    if key not in bucket or rank < bucket[key][0]:
                        bucket[key] = (rank, word)
                    if len(bucket) > 20:
                        del bucket[max(bucket, key=lambda key: bucket[key][0])]
    if not kd.get('database_version') or not jm.get('date_of_creation') or not jm.get('file_version') or not found:
        raise ValueError('Missing dictionary version/header/data')
    manifest_path = OUTPUT / 'coverage.json'
    try:
        previous = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError('Cannot read existing coverage manifest') from error
    captured = previous.get('capturedAt') if previous.get('dictionaries') == metadata else None
    captured = captured or datetime.datetime.now(datetime.timezone.utc).isoformat()
    provenance = {'kind': 'original-dictionaries', 'source': SOURCES['kanjidic2.xml.gz'],
                  'capturedAt': captured, 'dictionaries': metadata, 'selectionPolicy': POLICY,
                  'licenses': {'kanjidic2': 'https://creativecommons.org/licenses/by-sa/4.0/',
                               'jmdict': 'https://www.edrdg.org/edrdg/licence.html',
                               'spanish': 'https://www.edrdg.org/wwwjdic/wwwjdicinf.html'},
                  'spanishCredits': 'KANJIDIC2: Francisco Gutierrez / Gabriel Sanroman. JMdict Spanish: HISPADIC and RUI / Francisco Barberan (WWWJDIC documentation; XML does not identify individual gloss compilers).'}
    result = {}
    for glyph in glyphs:
        meanings = ', '.join(found.get(glyph, []))
        words = [word for rank, word in sorted(buckets[glyph].values(), key=lambda item: item[0])]
        result[f'{ord(glyph):x}.json'] = {'character': glyph, 'meanings': meanings, 'words': words,
            'availability': {'dictionaryCharacter': glyph in found, 'spanishMeanings': bool(meanings), 'spanishPriorityWords': bool(words)},
            'provenance': provenance}
    manifest = {'targetEntries': len(glyphs), 'capturedAt': captured, 'dictionaries': metadata,
        'dictionaryCharacters': len(found), 'spanishHeadlineCoverage': sum(bool(v) for v in found.values()),
        'recordsWithWords': sum(bool(b) for b in buckets.values()), 'emptyWordLists': sum(not b for b in buckets.values()),
        'missingGlyphs': [g for g in glyphs if g not in found], 'missingSpanishMeanings': [g for g in glyphs if not found.get(g)],
        'emptySpanishPriorityWords': [g for g in glyphs if not buckets[g]],
        'emptyWordCategories': {
            'noValidSpanishPairs': [g for g in glyphs if g not in spanish_pairs],
            'noPriorityMarkedSpanishPairs': [g for g in glyphs if g in spanish_pairs and not buckets[g]],
        }, 'selectionPolicy': POLICY}
    result['coverage.json'] = manifest
    if not check:
        OUTPUT.mkdir(parents=True, exist_ok=True)
    for filename, value in result.items():
        text = json.dumps(value, ensure_ascii=False, indent=2) + '\n'
        path = OUTPUT / filename
        if path.is_symlink() or OUTPUT.is_symlink():
            raise ValueError('Output cannot be a symbolic link')
        if check:
            if not path.exists() or path.read_text() != text:
                raise ValueError(f'Generated data mismatch: {filename}')
        else:
            path.write_text(text)
    extras = {p.name for p in OUTPUT.glob('*.json')} - result.keys()
    if extras:
        raise ValueError(f'Unexpected files (not counted): {sorted(extras)}')
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    # Caller supplies the explicitly authorized cache; reject symbolic links below.
    parser.add_argument('--cache-dir', type=Path, required=True)
    parser.add_argument('--check', action='store_true', help='Read-only: requires cached sources and exact generated records')
    args = parser.parse_args()
    if args.cache_dir.is_symlink() or any((args.cache_dir / name).is_symlink() for name in SOURCES):
        raise ValueError('Dictionary cache paths must not be symbolic links')
    if not args.check:
        args.cache_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
    generate(args.cache_dir, args.check)
