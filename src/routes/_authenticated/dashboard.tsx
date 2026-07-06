import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fmtINR } from "@/lib/format";
import { normalizeSalaryAmount, salaryKeyFromMonthISO } from "@/lib/salary";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO, isAfter } from "date-fns";
import { ArrowRight, Pencil, Check, X, PiggyBank } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Ghar Kharcha" }] }),
  component: Dashboard,
});

const CHART_COLORS = [
  "oklch(0.55 0.16 155)",
  "oklch(0.70 0.15 90)",
  "oklch(0.65 0.18 30)",
  "oklch(0.55 0.15 250)",
  "oklch(0.60 0.20 320)",
  "oklch(0.72 0.16 150)",
];

function monthLabel(monthISO: string) {
  const d = new Date(monthISO + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
function monthRangeISO(monthISO: string) {
  const start = new Date(monthISO + "T00:00:00");
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  return { startISO: monthISO, endISO: end.toISOString().slice(0, 10) };
}
function currentMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function Dashboard() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [monthPick, setMonthPick] = useState(currentMonthISO().slice(0, 7));
  const monthISO = `${monthPick}-01`;
  const salaryKey = salaryKeyFromMonthISO(monthISO);
  const { startISO, endISO } = monthRangeISO(monthISO);

  const q = useQuery({
    queryKey: ["dashboard", monthISO],
    queryFn: async () => {
      const [inc, exp, cats, udh, rem, prof, sav] = await Promise.all([
        supabase
          .from("salary_entries")
          .select("id, amount, source, salary_key")
          .eq("salary_key", salaryKey)
          .maybeSingle(),
        supabase
          .from("expenses")
          .select("amount, category_id, expense_date")
          .gte("expense_date", startISO)
          .lt("expense_date", endISO),
        supabase.from("categories").select("id, name"),
        supabase.from("udhari").select("direction, amount").eq("status", "unpaid"),
        supabase
          .from("reminders")
          .select("id, title, remind_at, kind, is_done")
          .eq("is_done", false)
          .order("remind_at")
          .limit(5),
        supabase.from("profiles").select("full_name").maybeSingle(),
        supabase
          .from("savings")
          .select("amount, saved_on")
          .gte("saved_on", startISO)
          .lt("saved_on", endISO),
      ]);
      if (inc.error) throw inc.error;
      if (exp.error) throw exp.error;
      if (cats.error) throw cats.error;
      if (udh.error) throw udh.error;
      if (rem.error) throw rem.error;
      if (prof.error) throw prof.error;
      if (sav.error) throw sav.error;

      const income = normalizeSalaryAmount(inc.data?.amount);
      const expense = (exp.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
      const savedThisMonth = (sav.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
      const catMap = new Map((cats.data ?? []).map((c) => [c.id, c.name]));
      const byCat = new Map<string, number>();
      for (const r of exp.data ?? []) {
        const k = catMap.get(r.category_id ?? "") ?? "Other";
        byCat.set(k, (byCat.get(k) ?? 0) + Number(r.amount));
      }
      const pie = [...byCat.entries()]
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
      const give = (udh.data ?? [])
        .filter((r) => r.direction === "give")
        .reduce((s, r) => s + Number(r.amount), 0);
      const receive = (udh.data ?? [])
        .filter((r) => r.direction === "receive")
        .reduce((s, r) => s + Number(r.amount), 0);
      return {
        income,
        expense,
        savedThisMonth,
        balance: income - expense - savedThisMonth,
        pie,
        give,
        receive,
        reminders: rem.data ?? [],
        name: prof.data?.full_name ?? "",
        salaryEntry: inc.data ?? null,
      };
    },
  });

  const d = q.data;

  const upsertSalary = useMutation({
    mutationFn: async (amount: number) => {
      const safeAmount = normalizeSalaryAmount(amount);
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userRes.user) throw userErr ?? new Error("Not signed in");
      const { error } = await supabase
        .from("salary_entries")
        .upsert(
          {
            user_id: userRes.user.id,
            amount: safeAmount,
            month: monthISO,
            salary_key: salaryKey,
            source: "Salary",
          },
          { onConflict: "user_id,month" },
        );
      if (error) throw error;
      return safeAmount;
    },
    onSuccess: (amount) => {
      toast.success(t("common.success"));
      qc.setQueryData(["dashboard", monthISO], (old: typeof d) =>
        old
          ? {
              ...old,
              income: amount,
              balance: amount - old.expense - old.savedThisMonth,
              salaryEntry: {
                ...(old.salaryEntry ?? {}),
                amount,
                month: monthISO,
                salary_key: salaryKey,
                source: "Salary",
              },
            }
          : old,
      );
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["salary"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed"),
  });

  const barData = useMemo(() => {
    if (!d) return [];
    return [
      { name: t("dashboard.income"), value: d.income, fill: "oklch(0.60 0.16 155)" },
      { name: t("dashboard.expense"), value: d.expense, fill: "oklch(0.60 0.20 30)" },
      { name: t("dashboard.savings"), value: d.savedThisMonth, fill: "oklch(0.65 0.15 250)" },
      {
        name: t("dashboard.balance"),
        value: Math.max(0, d.balance),
        fill: "oklch(0.70 0.15 90)",
      },
    ];
  }, [d, t]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          {t("dashboard.hello")}
          {d?.name ? `, ${d.name}` : ""}
        </p>
        <h1 className="text-2xl font-semibold">Ghar Kharcha AI</h1>
      </div>

      {/* Hero salary card with month selector */}
      <SalaryHero
        label={monthLabel(monthISO)}
        month={monthPick}
        onMonthChange={setMonthPick}
        amount={d?.income ?? 0}
        onSave={(v) => upsertSalary.mutate(v)}
        saving={upsertSalary.isPending}
      />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label={t("dashboard.income")} value={fmtINR(d?.income)} tone="primary" />
        <StatCard label={t("dashboard.expense")} value={fmtINR(d?.expense)} tone="warning" />
        <Link to="/savings" className="contents">
          <StatCard
            label={t("dashboard.savings")}
            value={fmtINR(d?.savedThisMonth)}
            tone="success"
            icon={<PiggyBank size={14} />}
          />
        </Link>
        <StatCard
          label={t("dashboard.balance")}
          value={fmtINR(d?.balance)}
          tone={d && d.balance >= 0 ? "success" : "destructive"}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{t("dashboard.byCategory")}</h2>
            <Link to="/reports" className="text-xs text-primary hover:underline">
              {t("nav.reports")} <ArrowRight className="inline" size={12} />
            </Link>
          </div>
          {!d || d.pie.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">{t("dashboard.noExpenses")}</p>
          ) : (
            <div className="mt-2 h-56">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={d.pie}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {d.pie.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmtINR(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          {d && d.pie.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm">
              {d.pie.slice(0, 5).map((s, i) => (
                <li key={s.name} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    {s.name}
                  </span>
                  <span className="text-muted-foreground">{fmtINR(s.value)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="font-semibold">Monthly overview</h2>
          <div className="mt-2 h-56">
            <ResponsiveContainer>
              <BarChart data={barData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={50} />
                <Tooltip formatter={(v: number) => fmtINR(v)} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {barData.map((b, i) => (
                    <Cell key={i} fill={b.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {t("dashboard.udhariGive")}
              </p>
              <p className="mt-1 text-xl font-semibold text-destructive">{fmtINR(d?.give)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {t("dashboard.udhariReceive")}
              </p>
              <p className="mt-1 text-xl font-semibold text-success">{fmtINR(d?.receive)}</p>
            </div>
          </div>
          <Link to="/udhari" className="mt-4 inline-flex text-xs text-primary hover:underline">
            {t("nav.udhari")} <ArrowRight className="ml-1 inline" size={12} />
          </Link>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{t("dashboard.upcoming")}</h2>
            <Link to="/reminders" className="text-xs text-primary hover:underline">
              {t("nav.reminders")}
            </Link>
          </div>
          {!d || d.reminders.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">{t("dashboard.noReminders")}</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {d.reminders.map((r) => {
                const when = parseISO(r.remind_at);
                const overdue = !isAfter(when, new Date());
                return (
                  <li
                    key={r.id}
                    className="flex items-center justify-between rounded-lg bg-secondary/60 px-3 py-2"
                  >
                    <span>{r.title}</span>
                    <span
                      className={`text-xs ${
                        overdue ? "text-destructive" : "text-muted-foreground"
                      }`}
                    >
                      {format(when, "dd MMM, HH:mm")}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function SalaryHero({
  label,
  month,
  onMonthChange,
  amount,
  onSave,
  saving,
}: {
  label: string;
  month: string;
  onMonthChange: (v: string) => void;
  amount: number;
  onSave: (n: number) => void;
  saving: boolean;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const submit = () => {
    const n = normalizeSalaryAmount(draft);
    onSave(n);
    setEditing(false);
  };

  return (
    <section className="rounded-2xl border border-border gradient-primary p-6 text-primary-foreground shadow-hero">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide opacity-80">
            {t("dashboard.thisMonthSalary")}
          </p>
          <p className="mt-1 text-sm opacity-90">{label}</p>
        </div>
        <input
          type="month"
          value={month}
          onChange={(e) => onMonthChange(e.target.value)}
          className="rounded-lg bg-white/20 px-3 py-1.5 text-sm text-primary-foreground outline-none backdrop-blur placeholder:text-white/70 [color-scheme:dark]"
          aria-label={t("dashboard.selectMonth")}
        />
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        {editing ? (
          <div className="flex flex-1 items-center gap-2">
            <input
              autoFocus
              type="number"
              min="0"
              step="1"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="₹0"
              className="w-full rounded-lg bg-white/20 px-3 py-2 text-2xl font-semibold text-primary-foreground outline-none backdrop-blur placeholder:text-white/70"
            />
            <button
              onClick={submit}
              disabled={saving}
              className="rounded-lg bg-white/25 p-2 hover:bg-white/35 disabled:opacity-60"
              aria-label="Save"
            >
              <Check size={18} />
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-lg bg-white/15 p-2 hover:bg-white/25"
              aria-label="Cancel"
            >
              <X size={18} />
            </button>
          </div>
        ) : (
          <>
            <p className="text-4xl font-semibold tabular-nums">
              {amount > 0 ? fmtINR(amount) : "₹0"}
            </p>
            <button
              onClick={() => {
                setDraft(String(normalizeSalaryAmount(amount)));
                setEditing(true);
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-white/20 px-3 py-1.5 text-sm font-medium backdrop-blur hover:bg-white/30"
            >
              <Pencil size={14} />
              {amount > 0 ? t("dashboard.editSalary") : t("dashboard.setSalary")}
            </button>
          </>
        )}
      </div>
      {amount === 0 && !editing && (
        <p className="mt-2 text-xs opacity-80">{t("dashboard.noSalary")}</p>
      )}
    </section>
  );
}

function StatCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: "primary" | "warning" | "success" | "destructive" | "muted";
  icon?: React.ReactNode;
}) {
  const toneClass = {
    primary: "text-primary",
    warning: "text-warning",
    success: "text-success",
    destructive: "text-destructive",
    muted: "text-foreground",
  }[tone];
  return (
    <div className="cursor-default rounded-2xl border border-border bg-card p-4 shadow-card transition-transform hover:-translate-y-0.5 hover:shadow-hero">
      <p className="flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className={`mt-1 text-lg font-semibold sm:text-xl ${toneClass}`}>{value}</p>
    </div>
  );
}
