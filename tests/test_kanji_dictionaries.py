"""Synthetic XML proves parser behavior; real corpus checks live in Node tests."""
import importlib.util
import io
import sys
import unittest
from pathlib import Path
from xml.parsers.expat import ExpatError

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('dictionaries', Path(__file__).resolve().parents[1] / 'scripts/import-kanji-dictionaries.py')
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def parse(body, declarations=''):
    return list(module.records(io.BytesIO(f'<!DOCTYPE JMdict [{declarations}]><JMdict>{body}</JMdict>'.encode()), 'entry'))


class DictionaryTests(unittest.TestCase):
    def entry(self, extra='', senses=None):
        senses = senses or '<sense><gloss xml:lang="spa">día</gloss><gloss>day</gloss></sense>'
        return parse('<entry><ent_seq>123</ent_seq><k_ele><keb>日</keb><ke_pri>news1</ke_pri></k_ele>'
                     '<k_ele><keb>月</keb></k_ele><r_ele><reb>ひ</reb>' + extra + '</r_ele>' + senses + '</entry>')[0]

    def test_reading_restrictions(self):
        self.assertEqual(list(module.candidates(self.entry('<re_restr>月</re_restr>'), {'日'})), [])
        self.assertEqual(list(module.candidates(self.entry('<re_nokanji/>'), {'日'})), [])
        words = list(module.candidates(self.entry('<re_restr>日</re_restr>'), {'日', '月'}))
        self.assertEqual(len(words), 1)
        self.assertEqual(words[0][2]['japanese'], '日【ひ】')
        self.assertEqual(words[0][2]['meaning'], 'día')

    def test_sense_restrictions_and_no_english_fallback(self):
        for restriction in ['<stagk>月</stagk>', '<stagr>つき</stagr>']:
            sense = '<sense>' + restriction + '<gloss xml:lang="spa">luna</gloss></sense>'
            self.assertEqual(list(module.candidates(self.entry(senses=sense), {'日'})), [])
        self.assertEqual(list(module.candidates(self.entry(senses='<sense><gloss>day</gloss></sense>'), {'日'})), [])
        sense = '<sense><stagk>日</stagk><stagr>ひ</stagr><gloss xml:lang="spa">día</gloss></sense>'
        self.assertEqual(list(module.candidates(self.entry(senses=sense), {'日'}))[0][2]['senseNumbers'], [1])

    def test_priority_and_stable_ids(self):
        self.assertIsNone(module.priority(['unknown']))
        self.assertLess(module.priority(['news1']), module.priority(['news2']))
        self.assertLess(module.priority(['nf01']), module.priority(['nf02']))
        self.assertLess(module.priority(['news1', 'ichi1']), module.priority(['news1']))
        self.assertEqual(list(module.candidates(self.entry(), {'日'}))[0][2]['entryId'], '123')

    def test_variants_cannot_cross_pair_readings_or_senses(self):
        entry = parse('<entry><ent_seq>8</ent_seq>'
                      '<k_ele><keb>日</keb><ke_pri>news1</ke_pri></k_ele>'
                      '<k_ele><keb>月</keb><ke_pri>news1</ke_pri></k_ele>'
                      '<r_ele><reb>ひ</reb><re_restr>日</re_restr></r_ele>'
                      '<r_ele><reb>つき</reb><re_restr>月</re_restr></r_ele>'
                      '<sense><stagk>日</stagk><stagr>ひ</stagr><gloss xml:lang="spa">día</gloss></sense>'
                      '<sense><stagk>月</stagk><stagr>つき</stagr><gloss xml:lang="spa">luna</gloss></sense></entry>')[0]
        words = [word for included, rank, word in module.candidates(entry, {'日', '月'})]
        self.assertEqual([(w['japanese'], w['meaning']) for w in words], [('日【ひ】', 'día'), ('月【つき】', 'luna')])

    def test_source_allowlist_and_observed_version(self):
        with self.assertRaises(ValueError):
            module.fetch(Path('/not-written'), 'file:///not-read')
        metadata = {}
        xml = b'<!-- Rev 1.09 --><!-- Rev 1.04 --><!-- JMdict created: 2026-10-01 --><JMdict/>'
        list(module.records(io.BytesIO(xml), 'entry', metadata))
        self.assertEqual(metadata['file_version'], 'XML DTD Rev 1.09')
        self.assertEqual(metadata['date_of_creation'], '2026-10-01')
        with self.assertRaises(ValueError):
            list(module.records(io.BytesIO(b'<wrong/>'), 'entry'))

    def test_internal_entities_and_supplementary_unicode(self):
        entry = parse('<entry><ent_seq>9</ent_seq><k_ele><keb>𠮟る</keb><ke_pri>ichi1</ke_pri></k_ele>'
                      '<r_ele><reb>しかる</reb></r_ele><sense><pos>&noun;</pos>'
                      '<gloss xml:lang="spa">reprender &amp; regañar</gloss></sense></entry>', '<!ENTITY noun "noun">')[0]
        word = list(module.candidates(entry, {'𠮟'}))[0][2]
        self.assertEqual(word['meaning'], 'reprender & regañar')

    def test_external_nested_parameter_entities_refused(self):
        for declaration in ['<!ENTITY x SYSTEM "file:///not-read">', '<!ENTITY % x "parameter">',
                            '<!ENTITY a "one"><!ENTITY b "&a;&a;">']:
            with self.assertRaises(ValueError):
                parse('<entry/>', declaration)
        with self.assertRaises(ValueError):
            list(module.records(io.BytesIO(b'<!DOCTYPE JMdict SYSTEM "https://invalid.example"><JMdict/>'), 'entry'))

    def test_bad_xml_and_buffer_boundaries(self):
        with self.assertRaises(ExpatError):
            parse('<entry>')
        with self.assertRaises(ValueError):
            parse('<entry>' + '<node>' * 40 + '</node>' * 40 + '</entry>')
        self.assertEqual(len(module.targets()), 2136)
        self.assertIn('𠮟', module.targets())


if __name__ == '__main__':
    unittest.main()
