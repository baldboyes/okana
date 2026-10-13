/** Keep Tabla's existing URL convention, using the actual corpus record. */
export function kanaAudioUrl(entry: { type: string; romaji: string }): string {
  return `/sounds/${entry.type}/${entry.romaji}.mp3`;
}
