import importlib.util
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path
from unittest.mock import MagicMock, patch

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('kana_strokes', ROOT / 'scripts/import-kana-strokes.py')
assert SPEC is not None and SPEC.loader is not None
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)
SOURCE = ROOT / 'public/kana-strokes/source'


class KanaImportTests(unittest.TestCase):
    def sample(self):
        return (SOURCE / '12354.svg').read_bytes()

    def extract(self, raw):
        return MODULE.extract(raw, 'あ', 'hiragana', MODULE.blob(raw))

    def test_actual_targets(self):
        rows = MODULE.targets()
        self.assertEqual(len(rows), 142)
        self.assertEqual(sum(r['type'] == 'hiragana' for r in rows), 71)
        self.assertEqual(sum(r['type'] == 'katakana' for r in rows), 71)
        self.assertNotIn('ぁ', [r['character'] for r in rows])

    def test_grouping_and_exact_geometry(self):
        record = self.extract(self.sample())
        self.assertEqual([len(s['parts']) for s in record['strokes']], [1, 1, 2])
        self.assertTrue(record['strokes'][2]['parts'][1]['median'].startswith('M -170,442 -210,484 -60,727'))
        self.assertEqual(record['provenance']['sourceSha256'], MODULE.sha(self.sample()))
        self.assertEqual(record['coordinates'], 'svg-native-y-down')
        for stroke in record['strokes']:
            for part in stroke['parts']:
                self.assertIn(('d="' + part['outline'] + '"').encode(), self.sample())
                self.assertIn(('d="' + part['median'] + '"').encode(), self.sample())

    def test_missing_duplicate_conflicting_group_mappings(self):
        text = self.sample().decode()
        patches = [
            ('id="z12354"', 'id="z12459"'),
            ('viewBox="0 0 1024 1024"', 'viewBox="0 0 900 900"'),
            ('id="z12354d2"', 'id="z12354d1"'),
            ('id="z12354c2"', 'id="z12354c1"'),
            ('#z12354d2', '#z12354d1'),
            ('--d:2s;', '--d:4s;'),
            ('--d:3s;', '--d:2s;'),
            ('z12354d3b', 'z12354d3c'),
            ('url(#z12354c1)', 'url(https://example.com)'),
            ('id="z12354d1"', 'transform="scale(2)" id="z12354d1"'),
            ('LGPL', 'removed'),
        ]
        for original, replacement in patches:
            self.assertIn(original, text)
            with self.subTest(original=original), self.assertRaises(ValueError):
                self.extract(text.replace(original, replacement).encode())
        with self.assertRaises(ValueError):
            self.extract(b'<!DOCTYPE svg [<!ENTITY x "unsafe">]>' + self.sample())
        with self.assertRaises(ET.ParseError):
            self.extract(b'<svg')

    def test_paths(self):
        for value in ['<svg/>', 'https://x', 'M0 0L1e999 0', 'M0 0L4097 0', 'M0 0e', 'M', 'M' * 20001, None]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                MODULE.path(value)
        self.assertEqual(MODULE.path('M-210 484Q1 2 3 4Z'), 'M-210 484Q1 2 3 4Z')

    def test_read_only_cache_never_downloads_or_writes(self):
        destination = MagicMock()
        destination.exists.return_value = False
        with patch.object(MODULE.http.client, 'HTTPSConnection') as network:
            with self.assertRaises(ValueError):
                MODULE.cached(destination, MODULE.LISTING, True)
            network.assert_not_called()
        destination.write_bytes.assert_not_called()

    def test_read_only_publish_comparison(self):
        output = MagicMock()
        target = output.__truediv__.return_value
        target.exists.return_value = True
        target.read_bytes.return_value = b'original'
        output.glob.return_value = []
        with patch.object(MODULE, 'OUTPUT', output):
            MODULE.publish({'COPYING.txt': b'original'}, True)
            with self.assertRaises(ValueError):
                MODULE.publish({'COPYING.txt': b'changed'}, True)
            extra = MagicMock()
            extra.name = 'extra.json'
            output.glob.return_value = [extra]
            with self.assertRaises(ValueError):
                MODULE.publish({'COPYING.txt': b'original'}, True)
        target.write_bytes.assert_not_called()
        output.mkdir.assert_not_called()


if __name__ == '__main__':
    unittest.main()
