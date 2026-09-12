import "server-only";
import { transcribeAudio as transcribeWithWhisper } from "@/lib/ai/whisper";
import { transcribeAudioMock } from "@/lib/ai/mock-transcription";

// Single entry point callers (lib/actions/conversations.ts) use to
// transcribe an uploaded audio file — they never import whisper.ts or
// mock-transcription.ts directly. Which implementation actually runs is
// chosen by the TRANSCRIPTION_PROVIDER env var:
//
//   transcribeAudio(file)
//           |
//     provider selection (TRANSCRIPTION_PROVIDER)
//        /              \
//     "mock"          "openai" (default)
//        |                |
//  transcribeAudioMock   transcribeWithWhisper
//  (lib/ai/               (lib/ai/whisper.ts —
//   mock-transcription.ts) unchanged real Whisper call)
//
// Neither branch was modified to build this — whisper.ts is exactly as it
// was, and the mock lives entirely in its own file.

export type TranscriptionProvider = "mock" | "openai";

export function getTranscriptionProvider(): TranscriptionProvider {
  return process.env.TRANSCRIPTION_PROVIDER?.trim().toLowerCase() === "mock" ? "mock" : "openai";
}

export interface TranscribeAudioInput {
  audio: Blob;
  filename: string;
}

export async function transcribeAudio(input: TranscribeAudioInput): Promise<string> {
  return getTranscriptionProvider() === "mock"
    ? transcribeAudioMock(input)
    : transcribeWithWhisper(input);
}
