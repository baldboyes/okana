import importlib.util
import json
import unittest
from pathlib import Path
from unittest.mock import MagicMock

SPEC = importlib.util.spec_from_file_location('strokes', Path(__file__).resolve().parents[1] / 'scripts/import-kanji-strokes.py')
assert SPEC is not None and SPEC.loader is not None
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def record(character='日'):
    return {'character': character, 'strokes': ['M1,2L3,4Z'], 'medians': [[[1, 2], [3, 4]]]}


class StrokeImportTests(unittest.TestCase):
    def test_targets_are_actual_app_allowlist(self):
        self.assertEqual(len(MODULE.targets()), 2136)
        self.assertIn('日', MODULE.targets())

    def test_preserves_geometry_and_honest_coverage(self):
        raw = (json.dumps(record()) + '\n' + json.dumps(record('𠮷'))).encode()
        selected, count = MODULE.extract(raw, {'日', '月'})
        self.assertEqual(count, 2)
        self.assertEqual(set(selected), {'日'})
        self.assertEqual(selected['日']['medians'], record()['medians'])
        self.assertEqual(selected['日']['strokes'], record()['strokes'])
        self.assertIn('modifiedAt', selected['日']['provenance'])

    def test_duplicate_even_unselected_rejected(self):
        with self.assertRaises(ValueError):
            MODULE.extract((json.dumps(record()) + '\n' + json.dumps(record())).encode(), set())

    def test_invalid_json(self):
        with self.assertRaises(ValueError):
            MODULE.extract(b'{bad', {'日'})

    def test_malformed_geometry(self):
        invalid = [
            {'character': '../日'}, {'character': '\ud800'}, {'strokes': ['<script/>']},
            {'strokes': ['https://example.com']}, {'strokes': ['M0 0L1e999 0']},
            {'strokes': ['M0 0L99999 0']}, {'strokes': ['M' * 20001]},
            {'medians': []}, {'medians': [[[1, 2]]]},
            {'medians': [[[1, 2], [float('nan'), 2]]]},
            {'medians': [[[1, 2], [float('inf'), 2]]]},
            {'medians': [[[1, 2], [True, 2]]]}, {'medians': [[[1, 2], [4097, 2]]]},
        ]
        for patch in invalid:
            with self.subTest(patch=patch), self.assertRaises(ValueError):
                MODULE.validate(dict(record(), **patch))

    def test_readonly_check_mismatch_and_extras(self):
        output = MagicMock()
        target = output.__truediv__.return_value
        target.exists.return_value = True
        target.read_bytes.return_value = b'original'
        output.glob.return_value = []
        MODULE.publish({'65e5.json': b'original'}, output, True)
        with self.assertRaises(ValueError):
            MODULE.publish({'65e5.json': b'changed'}, output, True)
        target.write_bytes.assert_not_called()
        extra = MagicMock()
        extra.name = 'extra.json'
        output.glob.return_value = [extra]
        with self.assertRaises(ValueError):
            MODULE.publish({'65e5.json': b'original'}, output, True)
        target.write_bytes.assert_not_called()


if __name__ == '__main__':
    unittest.main()
