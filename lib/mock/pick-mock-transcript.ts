import {
  MOCK_AUDIO_TRANSCRIPT_A,
  MOCK_AUDIO_TRANSCRIPT_B,
} from "@/lib/mock/mock-audio-transcript";

// Which prepared transcript a "transcribed" audio file gets in mock mode.
// Pure (no "server-only", no I/O) so the server-side mock transcription
// provider (lib/ai/mock-transcription.ts) and the browser-only demo mode
// resolve a filename to the same transcript.

// A couple of named demo files map to a specific, curated transcript so a
// prepared demo is reproducible. Anything else falls back to a deterministic
// hash of the filename — an unfamiliar file still consistently gets the same
// transcript on repeat uploads, and different filenames are spread across
// the same pool instead of all collapsing onto one default.
const TRANSCRIPT_POOL = [MOCK_AUDIO_TRANSCRIPT_A, MOCK_AUDIO_TRANSCRIPT_B];

const FILENAME_FIXTURES: Record<string, string> = {
  "test-call.mp3": MOCK_AUDIO_TRANSCRIPT_A,
  "test-call.mp4": MOCK_AUDIO_TRANSCRIPT_B,
};

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function pickMockTranscript(filename: string): string {
  const normalized = filename.trim().toLowerCase();
  const fixture = FILENAME_FIXTURES[normalized];
  if (fixture) return fixture;
  const index = hashString(normalized) % TRANSCRIPT_POOL.length;
  return TRANSCRIPT_POOL[index];
}
