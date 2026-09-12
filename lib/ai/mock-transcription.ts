import "server-only";
import { MOCK_AUDIO_TRANSCRIPT_HE } from "@/lib/mock/mock-audio-transcript";

// Mock stand-in for lib/ai/whisper.ts, selected via TRANSCRIPTION_PROVIDER=mock
// (see lib/ai/transcription-provider.ts for the switch). Makes no network
// call and costs nothing — for demoing/testing the upload -> transcribe ->
// analyze pipeline without OpenAI credits. Ignores the actual audio content
// entirely and returns a fixed, realistic Hebrew sales-call transcript,
// kept in lib/mock/mock-audio-transcript.ts (not inlined here or in any UI
// component) so it's easy to find and swap later.

export interface TranscribeAudioInput {
  audio: Blob;
  filename: string;
}

export async function transcribeAudioMock(
  // Intentionally unused — the mock ignores the actual audio content and
  // always returns the same fixed transcript. Kept in the signature so this
  // function is interchangeable with the real Whisper implementation.
  _input: TranscribeAudioInput
): Promise<string> {
  // A real Whisper call for a short recording typically takes a few
  // seconds; this simulated delay keeps the demo's loading states from
  // flashing by instantly, without dragging the demo out.
  await new Promise((resolve) => setTimeout(resolve, 1800 + Math.floor(Math.random() * 900)));
  return MOCK_AUDIO_TRANSCRIPT_HE;
}
