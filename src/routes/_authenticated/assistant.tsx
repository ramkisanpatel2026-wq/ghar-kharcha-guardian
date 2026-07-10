import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Send, Sparkles, User2, Volume2, Loader2, Square } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { askAssistant } from "@/lib/assistant.functions";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({ meta: [{ title: "AI Assistant — Ghar Kharcha" }] }),
  component: Assistant,
});

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS_EN = [
  "How much did I spend this month?",
  "Where can I save money?",
  "Show my top spending categories",
  "How much udhari do I need to collect?",
];

const SUGGESTIONS_HI = [
  "इस महीने कितना खर्च हुआ?",
  "मैं कहाँ पैसे बचा सकता हूँ?",
  "मेरी सबसे बड़ी खर्च श्रेणियाँ कौन सी हैं?",
  "मुझे कितनी उधारी वसूलनी है?",
];

function Assistant() {
  const { t, i18n } = useTranslation();
  const ask = useServerFn(askAssistant);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const [ttsLoadingIdx, setTtsLoadingIdx] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const mutation = useMutation({
    mutationFn: async (next: Msg[]) => {
      const res = await ask({ data: { messages: next } });
      return res.text;
    },
    onSuccess: (text) => {
      setMessages((m) => [...m, { role: "assistant", content: text }]);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed");
      setMessages((m) => m.slice(0, -1));
    },
    onSettled: () => {
      setTimeout(() => inputRef.current?.focus(), 0);
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, mutation.isPending]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || mutation.isPending) return;
    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    mutation.mutate(next);
  };

  const stopSpeaking = () => {
    audioRef.current?.pause();
    if (audioRef.current) {
      audioRef.current.src = "";
    }
    audioRef.current = null;
    setSpeakingIdx(null);
  };

  const speak = async (idx: number, text: string) => {
    if (speakingIdx === idx) {
      stopSpeaking();
      return;
    }
    stopSpeaking();
    setTtsLoadingIdx(idx);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => "TTS failed"));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        setSpeakingIdx(null);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setSpeakingIdx(null);
        URL.revokeObjectURL(url);
      };
      setSpeakingIdx(idx);
      await audio.play();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Speech failed");
      setSpeakingIdx(null);
    } finally {
      setTtsLoadingIdx(null);
    }
  };

  useEffect(() => {
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const suggestions = i18n.language === "hi" ? SUGGESTIONS_HI : SUGGESTIONS_EN;

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col lg:h-[calc(100vh-6rem)]">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary shadow-card">
          <Sparkles size={18} className="text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">{t("assistant.title")}</h1>
          <p className="text-xs text-muted-foreground">{t("assistant.subtitle")}</p>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-border bg-card/50 p-4"
      >
        {messages.length === 0 && !mutation.isPending && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary shadow-hero">
              <Sparkles size={24} className="text-primary-foreground" />
            </div>
            <p className="mt-4 text-sm font-medium">{t("assistant.greeting")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("assistant.hint")}</p>
            <div className="mt-6 grid w-full max-w-md gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-xl border border-border bg-background px-4 py-2.5 text-left text-sm hover:bg-accent/10"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
            {m.role === "assistant" && (
              <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft">
                <Sparkles size={14} className="text-primary" />
              </div>
            )}
            <div
              className={
                m.role === "user"
                  ? "max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground shadow-card"
                  : "max-w-[85%] text-sm leading-relaxed"
              }
            >
              {m.role === "assistant" ? (
                <div>
                  <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0 prose-strong:text-foreground prose-headings:mt-2 prose-headings:mb-1">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                  <button
                    type="button"
                    onClick={() => speak(i, m.content)}
                    disabled={ttsLoadingIdx === i}
                    className="mt-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-60"
                    aria-label={speakingIdx === i ? "Stop" : "Speak"}
                  >
                    {ttsLoadingIdx === i ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : speakingIdx === i ? (
                      <Square size={12} />
                    ) : (
                      <Volume2 size={12} />
                    )}
                    <span>{speakingIdx === i ? "Stop" : "Speak"}</span>
                  </button>
                </div>
              ) : (
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
              )}
            </div>
            {m.role === "user" && (
              <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary">
                <User2 size={14} />
              </div>
            )}
          </div>
        ))}

        {mutation.isPending && (
          <div className="flex gap-2">
            <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft">
              <Sparkles size={14} className="text-primary animate-pulse" />
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
              </span>
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-3 flex items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-card"
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder={t("assistant.placeholder")}
          rows={1}
          className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none"
          disabled={mutation.isPending}
        />
        <button
          type="submit"
          disabled={mutation.isPending || !input.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl gradient-primary text-primary-foreground shadow-card disabled:opacity-50"
          aria-label={t("assistant.send")}
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
