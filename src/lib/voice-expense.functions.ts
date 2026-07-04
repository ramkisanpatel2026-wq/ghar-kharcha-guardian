import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider, requireLovableApiKey } from "./ai-gateway.server";

const InputSchema = z.object({
  audioBase64: z.string().min(100),
  mimeType: z.string().default("audio/wav"),
});

const ParsedSchema = z.object({
  amount: z.number().nullable(),
  category: z.string().nullable(),
  note: z.string().nullable(),
  payee: z.string().nullable(),
});

export const transcribeAndParseExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const apiKey = requireLovableApiKey();
    const { supabase } = context;

    // Load user's categories to guide category matching
    const { data: cats } = await supabase.from("categories").select("id, name");
    const categoryNames = (cats ?? []).map((c) => c.name);

    // 1) Speech-to-text via Lovable AI
    const ext = data.mimeType.includes("webm")
      ? "webm"
      : data.mimeType.includes("mp4") || data.mimeType.includes("m4a")
        ? "m4a"
        : data.mimeType.includes("mpeg") || data.mimeType.includes("mp3")
          ? "mp3"
          : "wav";

    const audioBuf = Uint8Array.from(atob(data.audioBase64), (c) => c.charCodeAt(0));
    const blob = new Blob([audioBuf], { type: data.mimeType });
    const form = new FormData();
    form.append("file", blob, `recording.${ext}`);
    form.append("model", "openai/gpt-4o-mini-transcribe");

    const sttRes = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!sttRes.ok) {
      const errText = await sttRes.text().catch(() => "");
      if (sttRes.status === 429) throw new Error("Rate limit — try again in a moment.");
      if (sttRes.status === 402) throw new Error("AI credits exhausted.");
      throw new Error(`Transcription failed: ${sttRes.status} ${errText.slice(0, 200)}`);
    }
    const sttJson = (await sttRes.json()) as { text?: string };
    const transcript = (sttJson.text ?? "").trim();
    if (!transcript) throw new Error("Couldn't understand the audio. Please try again.");

    // 2) Parse transcript into structured expense
    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-3-flash-preview");

    const catList = categoryNames.length > 0 ? categoryNames.join(", ") : "Miscellaneous";

    try {
      const { output } = await generateText({
        model,
        system: `You extract expense data from a short spoken phrase in English, Hindi, or Hinglish. Return ONLY the JSON object. If a value isn't clearly present, use null.

Available categories (pick the closest match by name, exact string): ${catList}

Examples:
"500 rupees grocery" -> amount 500, category "Ration" or "Grocery" if present, note "grocery"
"1200 electricity bill" -> amount 1200, category "Electricity", note "electricity bill"
"पेट्रोल 800" -> amount 800, category "Petrol"
"school fees 5000 rakesh sir" -> amount 5000, category "School Fees", payee "Rakesh Sir"`,
        prompt: `Transcript: "${transcript}"`,
        output: Output.object({ schema: ParsedSchema }),
      });

      return {
        transcript,
        amount: output.amount,
        category: output.category,
        note: output.note ?? transcript,
        payee: output.payee,
      };
    } catch {
      // Fallback: return transcript only
      return {
        transcript,
        amount: null,
        category: null,
        note: transcript,
        payee: null,
      };
    }
  });
