import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const InputSchema = z.object({
  text: z.string().trim().min(1).max(4000),
  voice: z.string().max(40).optional(),
});

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const parsed = InputSchema.safeParse(body);
        if (!parsed.success) {
          return new Response(parsed.error.message, { status: 400 });
        }

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini-tts",
            input: parsed.data.text,
            voice: parsed.data.voice ?? "alloy",
            response_format: "mp3",
          }),
        });

        if (!upstream.ok) {
          const errBody = await upstream.text().catch(() => "");
          console.error(`TTS gateway failed [${upstream.status}]: ${errBody}`);
          return new Response(errBody || "TTS request failed", { status: upstream.status });
        }

        return new Response(upstream.body, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
