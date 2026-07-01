import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { fmtINR, monthRange } from "@/lib/format";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { format, parseISO, isAfter } from "date-fns";
import { ArrowRight, Plus } from "lucide-react";

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

function Dashboard() {
  const { t } = useTranslation();
  const { startISO, endISO, label } = monthRange(new Date());

  const q = useQuery({
    queryKey: ["dashboard", startISO],
    queryFn: async () => {
      const [inc, exp, cats, udh, rem, prof] = await Promise.all([
        supabase.from("salary_entries").select("amount").eq("month", startISO),
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
      ]);
      const income = (inc.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
      const expense = (exp.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
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
        balance: income - expense,
        pie,
        give,
        receive,
        reminders: rem.data ?? [],
        name: prof.data?.full_name ?? "",
      };
    },
  });

  const d = q.data;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {t("dashboard.hello")}
            {d?.name ? `, ${d.name}` : ""}
          </p>
          <h1 className="text-2xl font-semibold">
            {t("dashboard.thisMonth")} · <span className="text-primary">{label}</span>
          </h1>
        </div>
        <Link
          to="/expenses"
          className="inline-flex items-center gap-1 rounded-lg gradient-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-card"
        >
          <Plus size={16} /> {t("expenses.add")}
        </Link>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label={t("dashboard.income")} value={fmtINR(d?.income)} tone="primary" />
        <StatCard label={t("dashboard.expense")} value={fmtINR(d?.expense)} tone="warning" />
        <StatCard
          label={t("dashboard.balance")}
          value={fmtINR(d?.balance)}
          tone={d && d.balance >= 0 ? "success" : "destructive"}
        />
        <StatCard label={t("dashboard.savings")} value={fmtINR(Math.max(0, d?.balance ?? 0))} tone="muted" />
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

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("dashboard.udhariGive")}
                </p>
                <p className="mt-1 text-xl font-semibold text-destructive">
                  {fmtINR(d?.give)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("dashboard.udhariReceive")}
                </p>
                <p className="mt-1 text-xl font-semibold text-success">
                  {fmtINR(d?.receive)}
                </p>
              </div>
            </div>
            <Link
              to="/udhari"
              className="mt-4 inline-flex text-xs text-primary hover:underline"
            >
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
              <p className="mt-4 text-sm text-muted-foreground">
                {t("dashboard.noReminders")}
              </p>
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
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "primary" | "warning" | "success" | "destructive" | "muted";
}) {
  const toneClass = {
    primary: "text-primary",
    warning: "text-warning",
    success: "text-success",
    destructive: "text-destructive",
    muted: "text-foreground",
  }[tone];
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-semibold sm:text-xl ${toneClass}`}>{value}</p>
    </div>
  );
}
