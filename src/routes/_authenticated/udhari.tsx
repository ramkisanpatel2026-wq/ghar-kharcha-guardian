import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, Trash2, Check, RotateCcw, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fmtINR } from "@/lib/format";
import { format, parseISO } from "date-fns";

export const Route = createFileRoute("/_authenticated/udhari")({
  head: () => ({ meta: [{ title: "Udhari — Ghar Kharcha" }] }),
  component: Udhari,
});

function Udhari() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"give" | "receive">("give");
  const [open, setOpen] = useState(false);

  const list = useQuery({
    queryKey: ["udhari"],
    queryFn: async () =>
      (
        await supabase
          .from("udhari")
          .select("*")
          .order("status")
          .order("due_date", { ascending: true, nullsFirst: false })
      ).data ?? [],
  });

  const totals = useMemo(() => {
    const items = list.data ?? [];
    return {
      give: items
        .filter((r) => r.direction === "give" && r.status === "unpaid")
        .reduce((s, r) => s + Number(r.amount), 0),
      receive: items
        .filter((r) => r.direction === "receive" && r.status === "unpaid")
        .reduce((s, r) => s + Number(r.amount), 0),
    };
  }, [list.data]);

  const filtered = (list.data ?? []).filter((r) => r.direction === tab);

  const toggle = useMutation({
    mutationFn: async (r: { id: string; status: string }) => {
      const { error } = await supabase
        .from("udhari")
        .update({ status: r.status === "paid" ? "unpaid" : "paid" })
        .eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["udhari"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("udhari").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["udhari"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("udhari.title")}</h1>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 rounded-lg gradient-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-card"
        >
          <Plus size={16} /> {t("udhari.add")}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setTab("give")}
          className={`rounded-2xl border p-4 text-left shadow-card ${
            tab === "give" ? "border-primary bg-primary-soft" : "border-border bg-card"
          }`}
        >
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {t("udhari.give")}
          </p>
          <p className="mt-1 text-xl font-semibold text-destructive">{fmtINR(totals.give)}</p>
        </button>
        <button
          onClick={() => setTab("receive")}
          className={`rounded-2xl border p-4 text-left shadow-card ${
            tab === "receive" ? "border-primary bg-primary-soft" : "border-border bg-card"
          }`}
        >
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {t("udhari.receive")}
          </p>
          <p className="mt-1 text-xl font-semibold text-success">{fmtINR(totals.receive)}</p>
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          {t("udhari.empty")}
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((r) => (
            <li
              key={r.id}
              className={`flex items-center justify-between rounded-xl border p-3 shadow-card ${
                r.status === "paid"
                  ? "border-border bg-secondary/40 opacity-70"
                  : "border-border bg-card"
              }`}
            >
              <div>
                <p className="font-medium">{r.person_name}</p>
                <p className="text-xs text-muted-foreground">
                  {r.due_date ? format(parseISO(r.due_date), "dd MMM yyyy") : "—"}
                  {r.note ? ` · ${r.note}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{fmtINR(r.amount)}</span>
                {r.phone && (
                  <a
                    href={`tel:${r.phone}`}
                    className="rounded p-1.5 text-muted-foreground hover:bg-accent/10 hover:text-foreground"
                    aria-label="Call"
                  >
                    <Phone size={14} />
                  </a>
                )}
                <button
                  onClick={() => toggle.mutate({ id: r.id, status: r.status })}
                  className="rounded p-1.5 text-muted-foreground hover:bg-accent/10 hover:text-foreground"
                  aria-label="Toggle paid"
                  title={r.status === "paid" ? t("udhari.markUnpaid") : t("udhari.markPaid")}
                >
                  {r.status === "paid" ? <RotateCcw size={14} /> : <Check size={14} />}
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
          ))}
        </ul>
      )}

      {open && (
        <UdhariForm
          initialDirection={tab}
          onClose={() => setOpen(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["udhari"] });
            qc.invalidateQueries({ queryKey: ["dashboard"] });
          }}
        />
      )}
    </div>
  );
}

function UdhariForm({
  initialDirection,
  onClose,
  onSaved,
}: {
  initialDirection: "give" | "receive";
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [direction, setDirection] = useState<"give" | "receive">(initialDirection);
  const [person, setPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [due, setDue] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("udhari").insert({
        user_id: user.user!.id,
        direction,
        person_name: person,
        phone: phone || null,
        amount: Number(amount),
        due_date: due || null,
        note: note || null,
      });
      if (error) throw error;
      toast.success(t("common.success"));
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-4">
      <form
        onSubmit={save}
        className="w-full max-w-md rounded-t-3xl bg-card p-5 shadow-hero sm:rounded-3xl"
      >
        <h2 className="text-lg font-semibold">{t("udhari.add")}</h2>
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDirection("give")}
              className={`rounded-xl border p-3 text-sm ${
                direction === "give" ? "border-primary bg-primary-soft" : "border-input"
              }`}
            >
              {t("udhari.directionGive")}
            </button>
            <button
              type="button"
              onClick={() => setDirection("receive")}
              className={`rounded-xl border p-3 text-sm ${
                direction === "receive" ? "border-primary bg-primary-soft" : "border-input"
              }`}
            >
              {t("udhari.directionReceive")}
            </button>
          </div>
          <input
            required
            placeholder={t("udhari.person")}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm"
            value={person}
            onChange={(e) => setPerson(e.target.value)}
          />
          <input
            placeholder={t("udhari.phone")}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <input
            required
            type="number"
            min="0"
            placeholder={t("udhari.amount")}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-lg font-semibold"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <input
            type="date"
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm"
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
          <textarea
            placeholder={t("udhari.note")}
            rows={2}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-input bg-background py-3 text-sm font-medium"
          >
            {t("common.cancel")}
          </button>
          <button
            disabled={busy}
            className="flex-1 rounded-xl gradient-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy ? t("common.saving") : t("udhari.save")}
          </button>
        </div>
      </form>
    </div>
  );
}
