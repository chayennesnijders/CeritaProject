import { useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { recordWav } from "@/lib/speech";
import { useSignedImage } from "@/lib/articles";

export function ChatAudio({ path }: { path: string }) {
  const { data: src, isPending } = useSignedImage("chat-audio", path);
  return <div className="mt-2 w-56 max-w-full">
    {src ? <audio aria-label="Spraakmemo" controls preload="metadata" src={src} className="h-10 w-full min-w-0" />
      : <p className="text-xs">{isPending ? "Spraakmemo laden…" : "Spraakmemo niet beschikbaar."}</p>}
  </div>;
}

export function ChatVoiceMemo({ file, onChange, disabled = false, onRecordingChange }: {
  file: File | null; onChange: (file: File | null) => void; disabled?: boolean; onRecordingChange?: (recording: boolean) => void;
}) {
  const recorder = useRef<Awaited<ReturnType<typeof recordWav>> | null>(null);
  const mounted = useRef(true);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; const rec = recorder.current; recorder.current = null; rec?.stop().catch(() => {}); };
  }, []);
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [recording]);
  async function start() {
    setBusy(true);
    try {
      const rec = await recordWav();
      if (!mounted.current) { await rec.stop(); return; }
      recorder.current = rec; setSeconds(0); setRecording(true); onRecordingChange?.(true);
    } catch { toast.error("Sta toegang tot je microfoon toe om een spraakmemo op te nemen."); }
    finally { if (mounted.current) setBusy(false); }
  }
  async function stop() {
    const rec = recorder.current; if (!rec) return;
    recorder.current = null; setBusy(true);
    try { onChange(await rec.stop()); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Opnemen mislukt"); }
    finally { setRecording(false); setBusy(false); onRecordingChange?.(false); }
  }
  return <div className="flex min-w-0 flex-wrap items-center gap-2">
    <Button type="button" size={recording ? "sm" : "icon"} variant={recording ? "destructive" : "outline"}
      disabled={busy || disabled} onClick={recording ? stop : start} aria-label={recording ? "Stop spraakmemo" : "Spraakmemo opnemen"} title={recording ? "Stop spraakmemo" : "Spraakmemo opnemen"}>
      {recording ? <><Square className="size-4" />{seconds}s</> : <Mic className="size-4" />}
    </Button>
    {preview && !recording && <><audio aria-label="Spraakmemo beluisteren vóór versturen" controls src={preview} className="h-10 w-48 max-w-full min-w-0" />
      <Button type="button" size="icon" variant="ghost" disabled={disabled} aria-label="Spraakmemo verwijderen" title="Spraakmemo verwijderen" onClick={() => onChange(null)}><Trash2 className="size-4" /></Button></>}
  </div>;
}