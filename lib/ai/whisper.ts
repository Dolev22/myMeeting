import "server-only";

// The ONLY external AI API call in this project — everything else
// (lib/ai/conversation-analysis.ts, lib/ai/website-analysis.ts) is a local
// deterministic mock, deliberately. Turning an audio recording into text is
// the one piece of this feature a local mock genuinely cannot substitute
// for, so this calls OpenAI's Whisper speech-to-text API directly over
// `fetch` (no `openai` SDK dependency needed for a single REST call).
//
// Server-only: OPENAI_API_KEY is read from process.env here and never
// forwarded to the client. Callers must be Server Actions / server code.

const WHISPER_ENDPOINT = "https://api.openai.com/v1/audio/transcriptions";
const WHISPER_MODEL = "whisper-1";

function getOpenAiApiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("Missing OPENAI_API_KEY");
  return key;
}

export interface TranscribeAudioInput {
  audio: Blob;
  filename: string;
}

export async function transcribeAudio(input: TranscribeAudioInput): Promise<string> {
  const apiKey = getOpenAiApiKey();

  const form = new FormData();
  form.append("file", input.audio, input.filename);
  form.append("model", WHISPER_MODEL);

  const response = await fetch(WHISPER_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });

  if (!response.ok) {
    // Never log the raw response body here — it can echo back request
    // details. Log only what's needed to diagnose which call failed.
    let detail = "";
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      detail = body.error?.message ?? "";
    } catch {
      // ignore — some failure responses aren't JSON
    }
    throw new Error(
      `Whisper transcription failed (${response.status})${detail ? `: ${detail}` : ""}`
    );
  }

  const data = (await response.json()) as { text?: string };
  if (!data.text || !data.text.trim()) {
    throw new Error("Whisper returned an empty transcription");
  }
  return data.text.trim();
}
