import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { hiraganaData, katakanaData } from '../data/characters.ts';
import { lookupKana } from '../utils/kanaStrokes.ts';
import { kanaAudioUrl } from '../utils/kanaAudio.ts';

test('all 142 lookups preserve exact Tabla audio paths and existing assets', () => {
  const entries = [...hiraganaData, ...katakanaData];
  assert.equal(entries.length, 142);
  for (const original of entries) {
    const entry = lookupKana(original.character, original.type);
    assert.ok(entry);
    assert.equal(entry.reading, original.reading);
    assert.equal(kanaAudioUrl(entry), `/sounds/${original.type}/${original.romaji}.mp3`);
    assert.equal(kanaAudioUrl(entry), original.audioUrl);
    assert.ok(existsSync(new URL(`../public${kanaAudioUrl(entry)}`, import.meta.url)));
  }
});

test('shared audio button has a labeled opaque 44px target above the full-card link', () => {
  const source = readFileSync(new URL('../components/KanaReferenceCard.vue', import.meta.url), 'utf8');
  const button = source.match(/<button\b([\s\S]*?)>([\s\S]*?)<\/button>/);
  assert.ok(button);
  assert.ok(button[1].includes('type="button"'));
  assert.ok(button[1].includes(':aria-label="`${character}: Reproducir sonido`"'));
  assert.ok(button[1].includes('@click="emit(\'audio\')"'));
  assert.equal((source.match(/emit\('audio'\)/g) ?? []).length, 1);
  assert.ok(!button[1].includes(':to='));
  assert.ok(!button[1].includes('prevent'));
  assert.match(button[2], /width="22" height="22" aria-hidden="true"/);
  assert.match(source, /\.kana-reference-card\s*\{[^}]*position: relative;[^}]*isolation: isolate;/);
  assert.match(source, /\.kana-reference-link\s*\{[^}]*z-index: 0;/);
  assert.match(source, /\.kana-audio-button\s*\{[^}]*position: absolute;[^}]*z-index: 1;[^}]*top: 4px;[^}]*width: 44px;[^}]*height: 44px;[^}]*background-color: white;/);
  // The target ends at 48px; slot content starts at 56px, leaving an 8px gap.
  assert.match(source, /padding: 56px 4px 16px;/);
  assert.match(source, /right: 50%;\s*transform: translateX\(50%\);/);
  assert.match(source, /\.kana-audio-button:focus-visible\s*\{[^}]*outline: 2px solid/);
});

test('Tabla and detail share audio naming; detail cleans up and guards stale failure', () => {
  const table = readFileSync(new URL('../pages/table.vue', import.meta.url), 'utf8');
  const detail = readFileSync(new URL('../components/KanaDetailPage.vue', import.meta.url), 'utf8');
  assert.ok(table.includes('new Audio(kanaAudioUrl(char))'));
  assert.ok(table.includes('audio.volume = 0.5;'));
  assert.equal((table.match(/@audio="playAudio\(char\)"/g) ?? []).length, 20);
  assert.ok(!table.includes('@click="playAudio(char)"'));
  assert.ok(detail.includes('new Audio(kanaAudioUrl(entry.value))'));
  assert.ok(detail.includes("typeof Audio === 'undefined'"));
  assert.ok(detail.includes('audio.pause()'));
  assert.ok(detail.includes('onBeforeUnmount(stopAudio)'));
  assert.ok(detail.includes('if (audio === current) audioError.value = true'));
  assert.ok(!detail.includes('useGameState'));
  assert.ok(!detail.includes('localStorage'));
});
