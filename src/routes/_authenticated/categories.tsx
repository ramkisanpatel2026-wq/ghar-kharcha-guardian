import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fmtINR, monthRange } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/categories")({
  head: () => ({ meta: [{ title: "Categories — Ghar Kharcha" }] }),
  component: Categories,
});

function Categories() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { startISO, endISO } = monthRange(new Date());
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("");
  const [busy, setBusy] = useState(false);

  const cats = useQuery({
    queryKey: ["categories"],
    queryFn: async () =>
      (await supabase.from("categories").select("*").order("name")).data ?? [],
  });

  const usage = useQuery({
    queryKey: ["cat-usage", startISO],
    queryFn: async () => {
      const { data } = await supabase
        .from("expenses")
        .select("category_id, amount")
        .gte("expense_date", startISO)
        .lt("expense_date", endISO);
      const m = new Map<string, number>();
      for (const r of data ?? []) {
        if (!r.category_id) continue;
        m.set(r.category_id, (m.get(r.category_id) ?? 0) + Number(r.amount));
      }
      return m;
    },
  });

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("categories").insert({
        user_id: user.user!.id,
        name: name.trim(),
        monthly_budget: budget ? Number(budget) : null,
      });
      if (error) throw error;
      setName("");
      setBudget("");
      toast.success(t("common.success"));
      qc.invalidateQueries({ queryKey: ["categories"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Deleted");
    },
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">{t("categories.title")}</h1>

      <form
        onSubmit={add}
        className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 shadow-card sm:flex-row"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("categories.name")}
          className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
        <input
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          type="number"
          min="0"
          placeholder={t("categories.budget")}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm sm:w-56"
        />
        <button
          disabled={busy}
          className="inline-flex items-center justify-center gap-1 rounded-lg gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          <Plus size={16} /> {t("categories.add")}
        </button>
      </form>

      <ul className="space-y-2">
        {(cats.data ?? []).map((c) => {
          const used = usage.data?.get(c.id) ?? 0;
          const budget = c.monthly_budget ? Number(c.monthly_budget) : null;
          const pct = budget ? Math.min(100, (used / budget) * 100) : 0;
          const over = budget ? used > budget : false;
          return (
            <li
              key={c.id}
              className="rounded-xl border border-border bg-card p-3 shadow-card"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {c.name}
                    {c.is_default && (
                      <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
                        {t("categories.defaultTag")}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {fmtINR(used)} {t("categories.used")}
                    {budget ? ` ${t("categories.of")} ${fmtINR(budget)}` : ""}
                  </p>
                </div>
                <button
                  aria-label="Delete"
                  onClick={() => del.mutate(c.id)}
                  className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              {budget && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full transition-all ${
                      over ? "bg-destructive" : "bg-primary"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
