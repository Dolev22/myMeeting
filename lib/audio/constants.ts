// Shared between the client upload UI and the server action that verifies
// it again (never trust client-side validation alone). No "server-only" /
// browser-only import here on purpose — safe in both bundles.

export const MAX_AUDIO_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

export const ALLOWED_AUDIO_EXTENSIONS = ["mp3", "mp4"] as const;

export const ALLOWED_AUDIO_MIME_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "video/mp4",
] as const;

export function getFileExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot + 1).toLowerCase();
}

export function isAllowedAudioFile(filename: string, mimeType: string): boolean {
  const extension = getFileExtension(filename);
  const extensionOk = (ALLOWED_AUDIO_EXTENSIONS as readonly string[]).includes(extension);
  // Some browsers/recordings report an empty or generic mime type for
  // audio/mp4 (e.g. "application/octet-stream") — the extension check
  // above is the primary guard; mime type is a secondary signal only,
  // never required on its own.
  const mimeOk =
    !mimeType || (ALLOWED_AUDIO_MIME_TYPES as readonly string[]).includes(mimeType);
  return extensionOk && mimeOk;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}
