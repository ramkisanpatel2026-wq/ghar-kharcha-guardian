import { useCallback, useRef, useState } from "react";
import { encodeWav } from "@/lib/wav-encoder";

type State = "idle" | "recording" | "processing";

export function useVoiceRecorder() {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodeRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      ctxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;
      const node = ctx.createScriptProcessor(4096, 1, 1);
      nodeRef.current = node;
      chunksRef.current = [];
      node.onaudioprocess = (e) => {
        const data = e.inputBuffer.getChannelData(0);
        chunksRef.current.push(new Float32Array(data));
      };
      source.connect(node);
      node.connect(ctx.destination);
      setState("recording");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Microphone permission denied");
      setState("idle");
    }
  }, []);

  const stop = useCallback(async (): Promise<Blob | null> => {
    try {
      setState("processing");
      streamRef.current?.getTracks().forEach((t) => t.stop());
      nodeRef.current?.disconnect();
      sourceRef.current?.disconnect();
      const rate = ctxRef.current?.sampleRate ?? 48000;
      await ctxRef.current?.close();
      const chunks = chunksRef.current;
      chunksRef.current = [];
      if (chunks.length === 0) {
        setState("idle");
        setError("No audio captured");
        return null;
      }
      const wav = encodeWav(chunks, rate, 16000);
      if (wav.size < 2048) {
        setState("idle");
        setError("Recording too short");
        return null;
      }
      setState("idle");
      return wav;
    } catch (err) {
      setState("idle");
      setError(err instanceof Error ? err.message : "Failed to stop");
      return null;
    }
  }, []);

  const cancel = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    nodeRef.current?.disconnect();
    sourceRef.current?.disconnect();
    void ctxRef.current?.close();
    chunksRef.current = [];
    setState("idle");
  }, []);

  return { state, error, start, stop, cancel };
}
