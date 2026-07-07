import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fmtINR, monthKey } from "@/lib/format";
import {
  normalizeSalaryAmount,
  parseSalaryAmount,
  salaryKeyFromMonthISO,
  salaryMonthISOFromPicker,
  writeSalaryLocalCache,
} from "@/lib/salary";
import { format, parseISO } from "date-fns";

export const Route = createFileRoute("/_authenticated/salary")({
  head: () => ({ meta: [{ title: "Salary — Ghar Kharcha" }] }),
  component: Salary,
});

function Salary() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [source, setSource] = useState("Salary");
  const [amount, setAmount] = useState("");
  const [month, setMonth] = useState(monthKey().slice(0, 7));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const list = useQuery({
    queryKey: ["salary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salary_entries")
        .select("*")
        .order("month", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const selectedMonthISO = salaryMonthISOFromPicker(month) ?? monthKey();
  const selectedSalary = useMemo(
    () =>
      (list.data ?? []).find(
        (r) => r.salary_key === salaryKeyFromMonthISO(selectedMonthISO) || r.month === selectedMonthISO,
      ) ?? null,
    [list.data, selectedMonthISO],
  );

  useEffect(() => {
    if (selectedSalary) {
      setAmount(String(normalizeSalaryAmount(selectedSalary.amount)));
      setNote(selectedSalary.note ?? "");
      setSource(selectedSalary.source ?? "Salary");
    } else {
      setAmount("");
      setNote("");
      setSource("Salary");
    }
  }, [selectedSalary]);

  const thisMonth = (list.data ?? [])
    .filter((r) => r.month === monthKey())
    .reduce((s, r) => s + normalizeSalaryAmount(r.amount), 0);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const safeMonth = salaryMonthISOFromPicker(month);
      if (!safeMonth) throw new Error("Select a valid month");
      const safeAmount = parseSalaryAmount(amount);
      if (safeAmount === null) throw new Error("Enter valid salary amount");
      const salaryKey = salaryKeyFromMonthISO(safeMonth);
      const { data: user, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user.user) throw userErr ?? new Error("Not signed in");
      const { data, error } = await supabase
        .from("salary_entries")
        .upsert(
          {
            user_id: user.user.id,
            source: source.trim() || "Salary",
            amount: safeAmount,
            month: safeMonth,
            salary_key: salaryKey,
            note: note.trim() || null,
          },
          { onConflict: "user_id,salary_key" },
        )
        .select("*")
        .single();
      if (error) throw error;
      writeSalaryLocalCache(safeMonth, normalizeSalaryAmount(data.amount));
      toast.success(t("common.success"));
      qc.setQueryData(["salary"], (old: typeof list.data) => {
        const rows = old ?? [];
        const nextRows = rows.filter(
          (r) => r.salary_key !== data.salary_key && r.month !== data.month,
        );
        return [data, ...nextRows].sort((a, b) => b.month.localeCompare(a.month));
      });
      qc.invalidateQueries({ queryKey: ["salary"] });
      qc.invalidateQueries({ queryKey: ["dashboard", safeMonth] });
      qc.invalidateQueries({ queryKey: ["report", safeMonth] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("salary_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salary"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">{t("salary.title")}</h1>

      <div className="rounded-2xl border border-border gradient-primary p-5 text-primary-foreground shadow-hero">
        <p className="text-xs uppercase tracking-wide opacity-80">{t("salary.thisMonthTotal")}</p>
        <p className="mt-1 text-3xl font-semibold">{fmtINR(thisMonth)}</p>
      </div>

      <form
        onSubmit={add}
        className="grid gap-2 rounded-2xl border border-border bg-card p-4 shadow-card sm:grid-cols-4"
      >
        <input
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder={t("salary.source")}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          type="number"
          min="0"
          step="1"
          placeholder={t("salary.amount")}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
        <input
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          type="month"
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
        <button
          disabled={busy}
          className="inline-flex items-center justify-center gap-1 rounded-lg gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          <Plus size={16} /> {t("salary.add")}
        </button>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("salary.note")}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm sm:col-span-4"
        />
      </form>

      {(list.data ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          {t("salary.empty")}
        </div>
      ) : (
        <ul className="space-y-2">
          {(list.data ?? []).map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-3 shadow-card"
            >
              <div>
                <p className="font-medium">{r.source}</p>
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(r.month), "MMMM yyyy")}
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
