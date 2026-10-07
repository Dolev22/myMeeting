import "server-only";
import { pickMockTranscript } from "@/lib/mock/pick-mock-transcript";

// Mock stand-in for lib/ai/whisper.ts, selected via TRANSCRIPTION_PROVIDER=mock
// (see lib/ai/transcription-provider.ts for the switch). Makes no network
// call and costs nothing — for demoing/testing the upload -> transcribe ->
// analyze pipeline without OpenAI credits. It still ignores the actual
// audio content (it isn't real speech recognition), but the transcript it
// returns depends on the uploaded file's name, so uploading different demo
// files visibly produces different transcripts rather than always the same
// canned text. Real transcripts live in lib/mock/mock-audio-transcript.ts,
// and the filename -> transcript mapping in lib/mock/pick-mock-transcript.ts
// (pure, shared with the browser-only demo mode).

export interface TranscribeAudioInput {
  audio: Blob;
  filename: string;
}

export async function transcribeAudioMock(input: TranscribeAudioInput): Promise<string> {
  // A real Whisper call for a short recording typically takes a few
  // seconds; this simulated delay keeps the demo's loading states from
  // flashing by instantly, without dragging the demo out.
  await new Promise((resolve) => setTimeout(resolve, 1800 + Math.floor(Math.random() * 900)));
  return pickMockTranscript(input.filename);
}
