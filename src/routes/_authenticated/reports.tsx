import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Download, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fmtINR, monthRange } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Monthly report — Ghar Kharcha" }] }),
  component: Reports,
});

function Reports() {
  const { t } = useTranslation();
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const monthDate = new Date(`${month}-01T00:00:00`);
  const { startISO, endISO, label } = monthRange(monthDate);

  const q = useQuery({
    queryKey: ["report", startISO],
    queryFn: async () => {
      const [inc, exp, cats, prof] = await Promise.all([
        supabase.from("salary_entries").select("source, amount").eq("month", startISO),
        supabase
          .from("expenses")
          .select("amount, expense_date, note, payee, category_id")
          .gte("expense_date", startISO)
          .lt("expense_date", endISO)
          .order("expense_date"),
        supabase.from("categories").select("id, name"),
        supabase.from("profiles").select("full_name").maybeSingle(),
      ]);
      const catMap = new Map((cats.data ?? []).map((c) => [c.id, c.name]));
      const rows = (exp.data ?? []).map((r) => ({
        date: r.expense_date,
        category: catMap.get(r.category_id ?? "") ?? "—",
        note: r.note ?? "",
        payee: r.payee ?? "",
        amount: Number(r.amount),
      }));
      const totalExp = rows.reduce((s, r) => s + r.amount, 0);
      const totalInc = (inc.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
      const byCat = new Map<string, number>();
      rows.forEach((r) => byCat.set(r.category, (byCat.get(r.category) ?? 0) + r.amount));
      return {
        rows,
        income: inc.data ?? [],
        totalExp,
        totalInc,
        byCat: [...byCat.entries()].sort((a, b) => b[1] - a[1]),
        name: prof.data?.full_name ?? "",
      };
    },
  });

  const download = async () => {
    if (!q.data) return;
    try {
      const [{ default: jsPDF }, autoTable] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable").then((m) => m.default),
      ]);
      const doc = new jsPDF();
      const green: [number, number, number] = [15, 81, 50];

      doc.setFillColor(...green);
      doc.rect(0, 0, 210, 32, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.text("Ghar Kharcha Manager", 14, 15);
      doc.setFontSize(11);
      doc.text(`${t("reports.title")} — ${label}`, 14, 24);

      doc.setTextColor(20, 30, 30);
      doc.setFontSize(11);
      let y = 44;
      if (q.data.name) {
        doc.text(`Name: ${q.data.name}`, 14, y);
        y += 8;
      }
      doc.text(`${t("reports.totalIncome")}: ${fmtINR(q.data.totalInc)}`, 14, y);
      doc.text(`${t("reports.totalExpense")}: ${fmtINR(q.data.totalExp)}`, 105, y);
      y += 7;
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(`${t("reports.balance")}: ${fmtINR(q.data.totalInc - q.data.totalExp)}`, 14, y);
      doc.setFont("helvetica", "normal");
      y += 10;

      if (q.data.byCat.length) {
        autoTable(doc, {
          startY: y,
          head: [[t("reports.breakdown"), t("common.total")]],
          body: q.data.byCat.map(([c, v]) => [c, fmtINR(v)]),
          theme: "grid",
          headStyles: { fillColor: green, textColor: 255 },
          styles: { fontSize: 10 },
        });
        // @ts-expect-error autotable extends doc
        y = doc.lastAutoTable.finalY + 8;
      }

      if (q.data.rows.length) {
        autoTable(doc, {
          startY: y,
          head: [["Date", "Category", "Details", "Amount"]],
          body: q.data.rows.map((r) => [
            r.date,
            r.category,
            [r.payee, r.note].filter(Boolean).join(" — "),
            fmtINR(r.amount),
          ]),
          theme: "striped",
          headStyles: { fillColor: green, textColor: 255 },
          styles: { fontSize: 9 },
          columnStyles: { 3: { halign: "right" } },
        });
      }

      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(`${t("reports.generated")} · Page ${i} / ${pageCount}`, 14, 290);
      }

      doc.save(`ghar-kharcha-${month}.pdf`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "PDF failed");
    }
  };

  const share = () => {
    if (!q.data) return;
    const bal = q.data.totalInc - q.data.totalExp;
    const text = [
      `*Ghar Kharcha — ${label}*`,
      `${t("reports.totalIncome")}: ${fmtINR(q.data.totalInc)}`,
      `${t("reports.totalExpense")}: ${fmtINR(q.data.totalExp)}`,
      `${t("reports.balance")}: ${fmtINR(bal)}`,
      "",
      t("reports.breakdown"),
      ...q.data.byCat.map(([c, v]) => `• ${c}: ${fmtINR(v)}`),
    ].join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">{t("reports.title")}</h1>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-4 shadow-card">
        <label className="flex items-center gap-2 text-sm">
          {t("reports.month")}
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        <div className="ml-auto flex gap-2">
          <button
            onClick={share}
            className="inline-flex items-center gap-1 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent/10"
          >
            <Share2 size={16} /> {t("reports.share")}
          </button>
          <button
            onClick={download}
            className="inline-flex items-center gap-1 rounded-lg gradient-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
          >
            <Download size={16} /> {t("reports.download")}
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label={t("reports.totalIncome")} value={fmtINR(q.data?.totalInc)} tone="success" />
        <Stat label={t("reports.totalExpense")} value={fmtINR(q.data?.totalExp)} tone="warning" />
        <Stat
          label={t("reports.balance")}
          value={fmtINR((q.data?.totalInc ?? 0) - (q.data?.totalExp ?? 0))}
          tone="primary"
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h2 className="mb-3 font-semibold">
          {t("reports.breakdown")} — {label}
        </h2>
        {(q.data?.byCat ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No data for this month.</p>
        ) : (
          <ul className="divide-y divide-border">
            {(q.data?.byCat ?? []).map(([c, v]) => (
              <li key={c} className="flex items-center justify-between py-2 text-sm">
                <span>{c}</span>
                <span className="font-medium">{fmtINR(v)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "success" | "warning" | "primary";
}) {
  const cls = { success: "text-success", warning: "text-warning", primary: "text-primary" }[tone];
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${cls}`}>{value}</p>
    </div>
  );
}
