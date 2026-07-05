import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, Trash2, PiggyBank } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fmtINR } from "@/lib/format";
import { format, parseISO } from "date-fns";

export const Route = createFileRoute("/_authenticated/savings")({
  head: () => ({ meta: [{ title: "Savings — Ghar Kharcha" }] }),
  component: SavingsPage,
});

const CATEGORIES = [
  "Bank Savings",
  "Piggy Bank",
  "Gold",
  "Investment",
  "Emergency Fund",
  "FD",
  "Mutual Fund",
  "Cash Saving",
  "Other",
];

function SavingsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const list = useQuery({
    queryKey: ["savings"],
    queryFn: async () =>
      (await supabase.from("savings").select("*").order("saved_on", { ascending: false })).data ??
      [],
  });

  const total = (list.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthISO = monthStart.toISOString().slice(0, 10);
  const thisMonth = (list.data ?? [])
    .filter((r) => r.saved_on >= monthISO)
    .reduce((s, r) => s + Number(r.amount), 0);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("savings").insert({
        user_id: user.user!.id,
        category,
        amount: Number(amount),
        saved_on: date,
        note: note || null,
      });
      if (error) throw error;
      toast.success(t("common.success"));
      setAmount("");
      setNote("");
      qc.invalidateQueries({ queryKey: ["savings"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("savings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["savings"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <PiggyBank className="text-primary" />
        <h1 className="text-2xl font-semibold">{t("savings.title")}</h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border gradient-primary p-5 text-primary-foreground shadow-hero">
          <p className="text-xs uppercase tracking-wide opacity-80">{t("savings.total")}</p>
          <p className="mt-1 text-3xl font-semibold">{fmtINR(total)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {t("savings.thisMonth")}
          </p>
          <p className="mt-1 text-3xl font-semibold text-success">{fmtINR(thisMonth)}</p>
        </div>
      </div>

      <form
        onSubmit={add}
        className="grid gap-2 rounded-2xl border border-border bg-card p-4 shadow-card sm:grid-cols-4"
      >
        <input
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          type="number"
          min="0"
          placeholder={t("savings.amount")}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          value={date}
          onChange={(e) => setDate(e.target.value)}
          type="date"
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
        <button
          disabled={busy}
          className="inline-flex items-center justify-center gap-1 rounded-lg gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          <Plus size={16} /> {t("savings.add")}
        </button>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("savings.note")}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm sm:col-span-4"
        />
      </form>

      {(list.data ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          {t("savings.empty")}
        </div>
      ) : (
        <ul className="space-y-2">
          {(list.data ?? []).map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-3 shadow-card"
            >
              <div>
                <p className="font-medium">{r.category}</p>
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(r.saved_on), "dd MMM yyyy")}
                  {r.note ? ` · ${r.note}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-success">{fmtINR(r.amount)}</span>
                <button
                  onClick={() => del.mutate(r.id)}
                  className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
