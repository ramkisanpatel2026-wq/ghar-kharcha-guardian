import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, Trash2, Check, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, isAfter } from "date-fns";

export const Route = createFileRoute("/_authenticated/reminders")({
  head: () => ({ meta: [{ title: "Reminders — Ghar Kharcha" }] }),
  component: Reminders,
});

function Reminders() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [kind, setKind] = useState<"bill" | "emi" | "udhari" | "custom">("bill");
  const [busy, setBusy] = useState(false);

  const list = useQuery({
    queryKey: ["reminders"],
    queryFn: async () =>
      (
        await supabase
          .from("reminders")
          .select("*")
          .order("is_done")
          .order("remind_at", { ascending: true })
      ).data ?? [],
  });

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("reminders").insert({
        user_id: user.user!.id,
        title: title.trim(),
        remind_at: new Date(when).toISOString(),
        kind,
      });
      if (error) throw error;
      setTitle("");
      toast.success(t("common.success"));
      qc.invalidateQueries({ queryKey: ["reminders"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const toggle = useMutation({
    mutationFn: async (r: { id: string; done: boolean }) => {
      const { error } = await supabase
        .from("reminders")
        .update({ is_done: !r.done })
        .eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reminders"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reminders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reminders"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">{t("reminders.title")}</h1>

      <form onSubmit={add} className="grid gap-2 rounded-2xl border border-border bg-card p-4 shadow-card sm:grid-cols-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("reminders.reminderTitle")}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm sm:col-span-2"
        />
        <input
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as typeof kind)}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="bill">{t("reminders.kinds.bill")}</option>
          <option value="emi">{t("reminders.kinds.emi")}</option>
          <option value="udhari">{t("reminders.kinds.udhari")}</option>
          <option value="custom">{t("reminders.kinds.custom")}</option>
        </select>
        <button
          disabled={busy}
          className="inline-flex items-center justify-center gap-1 rounded-lg gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60 sm:col-span-4"
        >
          <Plus size={16} /> {t("reminders.add")}
        </button>
      </form>

      {(list.data ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          {t("reminders.empty")}
        </div>
      ) : (
        <ul className="space-y-2">
          {(list.data ?? []).map((r) => {
            const when = parseISO(r.remind_at);
            const overdue = !r.is_done && !isAfter(when, new Date());
            return (
              <li
                key={r.id}
                className={`flex items-center justify-between rounded-xl border border-border p-3 shadow-card ${
                  r.is_done ? "bg-secondary/40 opacity-70" : "bg-card"
                }`}
              >
                <div>
                  <p className={`font-medium ${r.is_done ? "line-through" : ""}`}>
                    {r.title}
                  </p>
                  <p className={`text-xs ${overdue ? "text-destructive" : "text-muted-foreground"}`}>
                    {format(when, "dd MMM yyyy, HH:mm")} · {t(`reminders.kinds.${r.kind}` as const)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggle.mutate({ id: r.id, done: r.is_done })}
                    className="rounded p-1.5 text-muted-foreground hover:bg-accent/10 hover:text-foreground"
                    aria-label="Toggle"
                    title={r.is_done ? t("reminders.markPending") : t("reminders.markDone")}
                  >
                    {r.is_done ? <RotateCcw size={14} /> : <Check size={14} />}
                  </button>
                  <button
                    onClick={() => del.mutate(r.id)}
                    className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
