import "server-only";
import {
  MOCK_AUDIO_TRANSCRIPT_A,
  MOCK_AUDIO_TRANSCRIPT_B,
} from "@/lib/mock/mock-audio-transcript";

// Mock stand-in for lib/ai/whisper.ts, selected via TRANSCRIPTION_PROVIDER=mock
// (see lib/ai/transcription-provider.ts for the switch). Makes no network
// call and costs nothing — for demoing/testing the upload -> transcribe ->
// analyze pipeline without OpenAI credits. It still ignores the actual
// audio content (it isn't real speech recognition), but the transcript it
// returns depends on the uploaded file's name, so uploading different demo
// files visibly produces different transcripts rather than always the same
// canned text. Real transcripts live in lib/mock/mock-audio-transcript.ts,
// not inlined here or in any UI component.

export interface TranscribeAudioInput {
  audio: Blob;
  filename: string;
}

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

export async function transcribeAudioMock(input: TranscribeAudioInput): Promise<string> {
  // A real Whisper call for a short recording typically takes a few
  // seconds; this simulated delay keeps the demo's loading states from
  // flashing by instantly, without dragging the demo out.
  await new Promise((resolve) => setTimeout(resolve, 1800 + Math.floor(Math.random() * 900)));
  return pickMockTranscript(input.filename);
}
