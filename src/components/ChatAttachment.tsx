import { useEffect, useRef, useState } from "react";
import { Camera, FileText, Paintbrush, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSignedImage } from "@/lib/articles";
import { DrawingPad } from "@/components/DrawingPad";
import {
  attachmentKind,
  CHAT_FILE_ACCEPT,
  CHAT_FILE_MAX_BYTES,
  DRAWING_FILE_NAME,
  isDrawing,
} from "@/lib/chat-files";

/** A photo, video or file inside a chat message (loaded through a short-lived signed link). */
export function ChatAttachment({
  path,
  name,
  type,
}: {
  path: string;
  name: string | null;
  type: string | null;
}) {
  const { data: src, isPending } = useSignedImage("chat-files", path);
  const kind = attachmentKind(type);
  if (!src)
    return (
      <p className="mt-2 text-xs">{isPending ? "Bijlage laden…" : "Bijlage niet beschikbaar."}</p>
    );
  if (kind === "image")
    return (
      <a href={src} target="_blank" rel="noopener noreferrer" className="mt-2 block">
        <img
          src={src}
          alt={name ?? "Foto"}
          loading="lazy"
          className="max-h-72 w-full max-w-64 rounded-xl object-cover"
        />
      </a>
    );
  if (kind === "video")
    return (
      <video
        controls
        preload="metadata"
        src={src}
        className="mt-2 max-h-72 w-full max-w-64 rounded-xl"
      />
    );
  return (
    <a
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 flex max-w-64 items-center gap-2 rounded-xl bg-background/60 px-3 py-2 text-xs text-foreground underline"
    >
      <FileText className="size-4 shrink-0" />
      <span className="truncate">{name ?? "Bestand"}</span>
    </a>
  );
}

/** Camera and paperclip buttons; shows the chosen file with a remove button before sending. */
export function ChatAttachmentPicker({
  file,
  onChange,
  disabled = false,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [drawing, setDrawing] = useState(false);
  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    e.target.value = ""; // the same file can be picked again after removing it
    if (!f) return;
    if (f.size > CHAT_FILE_MAX_BYTES) {
      toast.error("Dit bestand is te groot (max. 20 MB).");
      return;
    }
    onChange(f);
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={pick}
      />
      <input ref={fileRef} type="file" accept={CHAT_FILE_ACCEPT} hidden onChange={pick} />
      <Button
        type="button"
        size="icon"
        variant="outline"
        disabled={disabled}
        onClick={() => cameraRef.current?.click()}
        aria-label="Foto maken"
        title="Foto maken"
      >
        <Camera className="size-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="outline"
        disabled={disabled}
        onClick={() => fileRef.current?.click()}
        aria-label="Foto of bestand kiezen"
        title="Foto of bestand kiezen"
      >
        <Paperclip className="size-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="outline"
        disabled={disabled}
        onClick={() => setDrawing(true)}
        aria-label="Tekening maken"
        title="Tekening maken"
      >
        <Paintbrush className="size-4" />
      </Button>
      <DrawingPad
        open={drawing}
        title="🎨 Teken iets voor in de chat"
        start={file && isDrawing(file.name) ? file : null}
        onClose={() => setDrawing(false)}
        onDone={(f) => {
          setDrawing(false);
          onChange(new File([f], DRAWING_FILE_NAME, { type: "image/png" }));
        }}
      />
      {file && (
        <div className="flex min-w-0 items-center gap-2 rounded-xl bg-muted px-2 py-1 text-xs">
          {preview ? (
            <img
              src={preview}
              alt=""
              onClick={() => isDrawing(file.name) && !disabled && setDrawing(true)}
              className="size-8 rounded-lg object-cover"
            />
          ) : (
            <FileText className="size-4 shrink-0" />
          )}
          <span className="truncate">{isDrawing(file.name) ? "🎨 Tekening" : file.name}</span>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(null)}
            aria-label="Bijlage weghalen"
            className="shrink-0 p-0.5"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
