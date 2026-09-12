"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CloudUpload, FileAudio, CheckCircle2, AlertCircle, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { transcribeUploadedAudioAction } from "@/lib/actions/conversations";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MAX_AUDIO_FILE_BYTES,
  formatFileSize,
  getFileExtension,
  isAllowedAudioFile,
} from "@/lib/audio/constants";
import type { Conversation } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type Stage = "idle" | "uploading" | "transcribing" | "analyzing" | "done" | "error";

// Private Storage bucket — see supabase/migrations/0009_conversation_audio.sql
// for its RLS policies (folder-per-user: `{auth.uid()}/...`).
const AUDIO_BUCKET = "audio-files";

// Progress shown per stage is a cosmetic animation, not real byte/percent
// progress (Supabase's simple storage upload() call doesn't expose one, and
// "analyzing" is a fixed-duration local computation) — each stage's bar
// ramps toward a cap and the next stage's UI replaces it once the
// underlying request actually resolves.
const STAGE_PROGRESS_CAP: Partial<Record<Stage, number>> = {
  uploading: 95,
  transcribing: 92,
  analyzing: 96,
};

const SERVER_ERROR_TO_DICT_KEY: Record<string, keyof Dictionary["audioUpload"]> = {
  unauthorized: "errorUnauthorized",
  not_found: "errorNotFound",
  invalid_file_type: "errorInvalidType",
  download_failed: "errorDownloadFailed",
  file_too_large: "errorTooLarge",
  transcription_failed: "errorTranscriptionFailed",
  analysis_failed: "errorAnalysisFailed",
  unknown_error: "errorUnknown",
};

export function AudioUploadCard({
  conversation,
  leadId,
}: {
  conversation: Conversation;
  leadId: string;
}) {
  const { dict } = useI18n();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [errorKey, setErrorKey] = useState<keyof Dictionary["audioUpload"] | null>(null);

  const [progress, setProgress] = useState(0);
  const stageStartedAtRef = useRef<number | null>(null);

  const isProcessing = stage === "uploading" || stage === "transcribing" || stage === "analyzing";

  useEffect(() => {
    const cap = STAGE_PROGRESS_CAP[stage];
    if (!cap) return;
    stageStartedAtRef.current = Date.now();
    const interval = setInterval(() => {
      const elapsedMs = Date.now() - (stageStartedAtRef.current ?? Date.now());
      // Ramps to the cap over ~1.5s, then holds — real completion (the
      // stage changing) always arrives independently of this animation.
      setProgress(Math.min(cap, (elapsedMs / 1500) * cap));
    }, 100);
    return () => clearInterval(interval);
  }, [stage]);

  async function processFile(file: File) {
    setErrorKey(null);
    setFileName(file.name);
    setFileSize(file.size);

    if (!isAllowedAudioFile(file.name, file.type)) {
      setStage("error");
      setErrorKey("errorInvalidType");
      return;
    }
    if (file.size > MAX_AUDIO_FILE_BYTES) {
      setStage("error");
      setErrorKey("errorTooLarge");
      return;
    }

    setStage("uploading");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setStage("error");
      setErrorKey("errorUnauthorized");
      return;
    }

    // Folder-per-user path so the storage RLS policies (bucket_id = this
    // bucket AND first path segment = auth.uid()) scope each user to their
    // own files. Timestamped filename avoids collisions on re-upload.
    const extension = getFileExtension(file.name);
    const storagePath = `${user.id}/${conversation.id}/${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(AUDIO_BUCKET)
      .upload(storagePath, file, { contentType: file.type || undefined, upsert: false });

    if (uploadError) {
      setStage("error");
      setErrorKey("errorUploadFailed");
      return;
    }

    setStage("transcribing");
    // The server action performs transcription and analysis in one call —
    // there's no separate round trip for "analyzing". This timer only
    // advances the displayed stage so progress reads honestly rather than
    // sitting on "Transcribing" for the whole (longer) request.
    const analyzingTimer = setTimeout(() => setStage("analyzing"), 1800);

    startTransition(async () => {
      const result = await transcribeUploadedAudioAction(
        conversation.id,
        leadId,
        storagePath,
        file.name
      );
      clearTimeout(analyzingTimer);

      if (result.error) {
        setStage("error");
        setErrorKey(SERVER_ERROR_TO_DICT_KEY[result.error] ?? "errorUnknown");
      } else {
        setStage("done");
      }
      router.refresh();
    });
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || isProcessing) return;
    void processFile(files[0]);
  }

  function reset() {
    setStage("idle");
    setErrorKey(null);
    setFileName(null);
    setFileSize(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const errorText = errorKey ? dict.audioUpload[errorKey] : null;

  return (
    <Card className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-medium text-zinc-900 dark:text-zinc-50">
        <FileAudio size={18} className="text-teal-600 dark:text-teal-400" />
        {dict.audioUpload.title}
      </h2>

      {conversation.audioOriginalFilename && stage === "idle" && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {dict.audioUpload.existingAudioLabel}: {conversation.audioOriginalFilename}
        </p>
      )}

      {stage === "idle" && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
            isDragging
              ? "border-teal-500 bg-teal-50 dark:bg-teal-950/30"
              : "border-zinc-300 dark:border-zinc-700"
          )}
        >
          <CloudUpload size={28} className="text-zinc-400 dark:text-zinc-500" />
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            {dict.audioUpload.dropzoneHint}{" "}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="font-medium text-teal-700 hover:underline dark:text-teal-400"
            >
              {dict.audioUpload.browseButton}
            </button>
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            {dict.audioUpload.maxSizeHint}
          </p>
          {conversation.transcription && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              {dict.audioUpload.replaceHint}
            </p>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".mp3,.mp4,audio/mpeg,audio/mp3,audio/mp4,video/mp4"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      )}

      {stage !== "idle" && (
        <div className="space-y-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
              <FileAudio size={16} className="shrink-0 text-zinc-400" />
              <span className="truncate">{fileName}</span>
              {fileName && (
                <Badge color="zinc">{getFileExtension(fileName).toUpperCase()}</Badge>
              )}
              {fileSize !== null && (
                <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500">
                  ({formatFileSize(fileSize)})
                </span>
              )}
            </div>
            {stage === "error" && (
              <button
                type="button"
                onClick={reset}
                className="shrink-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                aria-label={dict.audioUpload.removeSelected}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {isProcessing && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-teal-700 dark:text-teal-400">
                <Loader2 size={16} className="animate-spin" />
                {stage === "uploading" && dict.audioUpload.stageUploading}
                {stage === "transcribing" && dict.audioUpload.stageTranscribing}
                {stage === "analyzing" && dict.audioUpload.stageAnalyzing}
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-teal-600 transition-[width] duration-150 dark:bg-teal-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {stage === "done" && (
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
              <CheckCircle2 size={16} />
              {dict.audioUpload.successMessage}
            </div>
          )}

          {stage === "error" && errorText && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertCircle size={16} />
              {errorText}
            </div>
          )}

          {(stage === "done" || stage === "error") && (
            <Button type="button" size="sm" variant="secondary" onClick={reset}>
              {dict.audioUpload.startOver}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
