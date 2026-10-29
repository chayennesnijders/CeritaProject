import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { useServerFn } from "@tanstack/react-start";
import { notifyCall } from "@/lib/push.functions";

type Ring = { convId: string; from: string; name: string; video: boolean };
type State = "idle" | "calling" | "ringing" | "connecting" | "active";
type Ctx = { startCall: (convId: string, otherId: string, video: boolean) => Promise<void> };

const CallCtx = createContext<Ctx>({ startCall: async () => {} });
export const useCall = () => useContext(CallCtx);

const ICE = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];

async function sendOnce(channelName: string, event: string, payload: object) {
  const ch = supabase.channel(channelName);
  await new Promise<void>((res) => ch.subscribe((s) => { if (s === "SUBSCRIBED") res(); }));
  await ch.send({ type: "broadcast", event, payload });
  setTimeout(() => supabase.removeChannel(ch), 1000);
}

export function CallProvider({ children }: { children: ReactNode }) {
  const { data: me } = useMe();
  const uid = me?.user.id;
  const myName = me?.profile?.display_name ?? "Lid";
  const [state, setState] = useState<State>("idle");
  const [incoming, setIncoming] = useState<Ring | null>(null);
  const [peerName, setPeerName] = useState("");
  const [isVideo, setIsVideo] = useState(false);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const pc = useRef<RTCPeerConnection | null>(null);
  const local = useRef<MediaStream | null>(null);
  const chan = useRef<RealtimeChannel | null>(null);
  const localVid = useRef<HTMLVideoElement>(null);
  const remoteVid = useRef<HTMLVideoElement>(null);
  const remoteStream = useRef<MediaStream | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ringer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pushCall = useServerFn(notifyCall);

  function cleanup() {
    if (timeout.current) clearTimeout(timeout.current);
    if (ringer.current) clearInterval(ringer.current);
    ringer.current = null;
    pc.current?.close(); pc.current = null;
    local.current?.getTracks().forEach((t) => t.stop()); local.current = null;
    remoteStream.current = null;
    if (chan.current) supabase.removeChannel(chan.current);
    chan.current = null;
    setState("idle"); setIncoming(null); setMuted(false); setCamOff(false);
  }

  function hangup() {
    chan.current?.send({ type: "broadcast", event: "hangup", payload: {} });
    cleanup();
  }

  async function setupPeer(convId: string, video: boolean, onAccepted?: () => void) {
    local.current = await navigator.mediaDevices.getUserMedia({ audio: true, video });
    const peer = new RTCPeerConnection({ iceServers: ICE });
    pc.current = peer;
    local.current.getTracks().forEach((t) => peer.addTrack(t, local.current!));
    remoteStream.current = new MediaStream();
    peer.ontrack = (e) => {
      e.streams[0]?.getTracks().forEach((t) => remoteStream.current!.addTrack(t));
      if (remoteVid.current) remoteVid.current.srcObject = remoteStream.current;
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected") setState("active");
      if (["failed", "disconnected", "closed"].includes(peer.connectionState) && pc.current === peer) {
        if (peer.connectionState === "failed") toast.error("Verbinding verbroken.");
        cleanup();
      }
    };
    const ch = supabase.channel(`call-${convId}`, { config: { broadcast: { self: false } } });
    chan.current = ch;
    peer.onicecandidate = (e) => { if (e.candidate) ch.send({ type: "broadcast", event: "ice", payload: { from: uid, c: e.candidate.toJSON() } }); };
    ch.on("broadcast", { event: "ice" }, ({ payload }) => { if (payload.from !== uid) peer.addIceCandidate(payload.c).catch(() => {}); })
      .on("broadcast", { event: "hangup" }, () => { toast("Gesprek beëindigd"); cleanup(); })
      .on("broadcast", { event: "decline" }, () => { toast("Niet opgenomen"); cleanup(); })
      .on("broadcast", { event: "accept" }, async () => {
        onAccepted?.();
        setState("connecting");
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        ch.send({ type: "broadcast", event: "offer", payload: { sdp: offer } });
      })
      .on("broadcast", { event: "offer" }, async ({ payload }) => {
        await peer.setRemoteDescription(payload.sdp);
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        ch.send({ type: "broadcast", event: "answer", payload: { sdp: answer } });
      })
      .on("broadcast", { event: "answer" }, async ({ payload }) => { await peer.setRemoteDescription(payload.sdp); });
    await new Promise<void>((res) => ch.subscribe((s) => { if (s === "SUBSCRIBED") res(); }));
    if (localVid.current) localVid.current.srcObject = local.current;
  }

  async function startCall(convId: string, otherId: string, video: boolean) {
    if (state !== "idle") return;
    const { data: ok } = await supabase.rpc("can_call", { _conv: convId });
    if (!ok) { toast.error("Bellen kan alleen als jullie allebei 'Bellen toestaan' aan hebben staan op je profiel."); return; }
    const { data: p } = await supabase.from("profiles").select("display_name").eq("id", otherId).maybeSingle();
    setPeerName(p?.display_name ?? "Lid"); setIsVideo(video); setState("calling");
    try {
      await setupPeer(convId, video, () => { if (timeout.current) clearTimeout(timeout.current); if (ringer.current) clearInterval(ringer.current); });
    } catch { toast.error("Geen toegang tot je microfoon of camera."); cleanup(); return; }
    const ring = { convId, from: uid!, name: myName, video } satisfies Ring;
    await sendOnce(`ring-${otherId}`, "ring", ring);
    pushCall({ data: { convId, video } }).catch(() => {});
    // Keep ringing so someone who opens the app via the push still sees the call.
    ringer.current = setInterval(() => { sendOnce(`ring-${otherId}`, "ring", ring).catch(() => {}); }, 4000);
    timeout.current = setTimeout(() => { toast("Niet opgenomen"); hangup(); }, 40000);
  }

  async function accept() {
    if (!incoming) return;
    const ring = incoming;
    setPeerName(ring.name); setIsVideo(ring.video); setState("connecting"); setIncoming(null);
    try { await setupPeer(ring.convId, ring.video); }
    catch { toast.error("Geen toegang tot je microfoon of camera."); await sendOnce(`call-${ring.convId}`, "decline", {}); cleanup(); return; }
    chan.current?.send({ type: "broadcast", event: "accept", payload: {} });
  }

  async function decline() {
    if (incoming) await sendOnce(`call-${incoming.convId}`, "decline", {});
    setIncoming(null); setState("idle");
  }

  // Listen for incoming rings; only show them when the database says this call is allowed.
  useEffect(() => {
    if (!uid) return;
    const ch = supabase.channel(`ring-${uid}`)
      .on("broadcast", { event: "ring" }, async ({ payload }) => {
        const ring = payload as Ring;
        const { data: ok } = await supabase.rpc("can_call", { _conv: ring.convId });
        if (!ok) return;
        setState((s) => { if (s === "idle" || s === "ringing") { setIncoming(ring); return "ringing"; } return s; });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [uid]);

  useEffect(() => { if (localVid.current && local.current) localVid.current.srcObject = local.current; });
  useEffect(() => { if (remoteVid.current && remoteStream.current) remoteVid.current.srcObject = remoteStream.current; });

  const toggleMute = () => { local.current?.getAudioTracks().forEach((t) => (t.enabled = muted)); setMuted(!muted); };
  const toggleCam = () => { local.current?.getVideoTracks().forEach((t) => (t.enabled = camOff)); setCamOff(!camOff); };

  return (
    <CallCtx.Provider value={{ startCall }}>
      {children}
      {state === "ringing" && incoming && (
        <div className="fixed inset-x-3 top-3 z-50 rounded-3xl bg-foreground p-4 text-background shadow-soft">
          <p className="text-xs opacity-70">{incoming.video ? "Videogesprek" : "Gesprek"}</p>
          <p className="font-display text-xl">{incoming.name} belt je…</p>
          <div className="mt-3 flex gap-3">
            <button onClick={decline} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-destructive py-2 font-semibold text-destructive-foreground"><PhoneOff className="size-4" /> Weigeren</button>
            <button onClick={accept} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary py-2 font-semibold text-primary-foreground"><Phone className="size-4" /> Opnemen</button>
          </div>
        </div>
      )}
      {(state === "calling" || state === "connecting" || state === "active") && (
        <div className="fixed inset-0 z-50 flex flex-col bg-foreground text-background">
          <video ref={remoteVid} autoPlay playsInline className={isVideo ? "h-full w-full object-cover" : "hidden"} />
          {isVideo && <video ref={localVid} autoPlay playsInline muted className="absolute right-4 top-4 h-40 w-28 rounded-2xl object-cover shadow-soft" />}
          <div className={`absolute inset-x-0 ${isVideo ? "top-6" : "top-1/3"} text-center`}>
            <p className="font-display text-3xl">{peerName}</p>
            <p className="mt-1 text-sm opacity-75">{state === "calling" ? "Bellen…" : state === "connecting" ? "Verbinden…" : "Verbonden"}</p>
          </div>
          <div className="absolute inset-x-0 bottom-10 flex justify-center gap-5">
            <button onClick={toggleMute} aria-label="Microfoon" className="rounded-full bg-background/20 p-4">{muted ? <MicOff /> : <Mic />}</button>
            {isVideo && <button onClick={toggleCam} aria-label="Camera" className="rounded-full bg-background/20 p-4">{camOff ? <VideoOff /> : <Video />}</button>}
            <button onClick={hangup} aria-label="Ophangen" className="rounded-full bg-destructive p-4 text-destructive-foreground"><PhoneOff /></button>
          </div>
        </div>
      )}
    </CallCtx.Provider>
  );
}
