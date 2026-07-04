import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider, requireLovableApiKey } from "./ai-gateway.server";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const InputSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(30),
});

function fmt(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function monthRange(d = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  const startISO = start.toISOString().slice(0, 10);
  const endISO = end.toISOString().slice(0, 10);
  return { startISO, endISO, label: start.toLocaleString("en-IN", { month: "long", year: "numeric" }) };
}

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { startISO, endISO, label } = monthRange();

    const [expRes, catRes, salRes, udhRes] = await Promise.all([
      supabase
        .from("expenses")
        .select("amount, category_id, expense_date, note")
        .gte("expense_date", startISO)
        .lt("expense_date", endISO),
      supabase.from("categories").select("id, name, monthly_budget"),
      supabase.from("salary_entries").select("amount, source").eq("month", startISO),
      supabase.from("udhari").select("direction, amount, person_name, status").eq("status", "unpaid"),
    ]);

    const categories = catRes.data ?? [];
    const catMap = new Map(categories.map((c) => [c.id, c.name]));
    const expenses = expRes.data ?? [];
    const salary = salRes.data ?? [];
    const udhari = udhRes.data ?? [];

    const byCat = new Map<string, number>();
    for (const e of expenses) {
      const name = catMap.get(e.category_id ?? "") ?? "Other";
      byCat.set(name, (byCat.get(name) ?? 0) + Number(e.amount));
    }
    const totalExpense = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const totalIncome = salary.reduce((s, e) => s + Number(e.amount), 0);
    const balance = totalIncome - totalExpense;
    const owed = udhari.filter((u) => u.direction === "give").reduce((s, u) => s + Number(u.amount), 0);
    const owing = udhari.filter((u) => u.direction === "receive").reduce((s, u) => s + Number(u.amount), 0);

    const catLines = [...byCat.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([n, v]) => {
        const cat = categories.find((c) => c.name === n);
        const bud = cat?.monthly_budget ? ` (budget ${fmt(Number(cat.monthly_budget))})` : "";
        return `- ${n}: ${fmt(v)}${bud}`;
      })
      .join("\n");

    const systemPrompt = `You are Ghar Kharcha AI, a warm and practical financial assistant for an Indian middle-class family. Reply in the same language the user writes in — English, Hindi, or Hinglish. Keep answers short (3-6 sentences or a small bullet list). Use ₹ for money. Be specific and reference the user's actual numbers below. Never invent figures.

USER'S DATA — ${label}
Income: ${fmt(totalIncome)}
Expense: ${fmt(totalExpense)}
Balance: ${fmt(balance)}
Money to receive back (udhari given): ${fmt(owed)}
Money owed to others (udhari to pay): ${fmt(owing)}

Spending by category:
${catLines || "(no expenses recorded this month)"}

Give actionable tips: flag categories over budget, suggest realistic savings, highlight overspending trends, remind about pending udhari. Be encouraging.`;

    const gateway = createLovableAiGatewayProvider(requireLovableApiKey());
    const model = gateway("google/gemini-3-flash-preview");

    try {
      const result = await generateText({
        model,
        system: systemPrompt,
        messages: data.messages,
      });
      return { text: result.text };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI request failed";
      if (msg.includes("429")) throw new Error("Rate limit reached — please wait a moment and try again.");
      if (msg.includes("402")) throw new Error("AI credits exhausted. Please add credits in your workspace.");
      throw new Error(msg);
    }
  });
