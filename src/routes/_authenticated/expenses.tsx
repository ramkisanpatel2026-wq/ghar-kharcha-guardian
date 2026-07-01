import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, Trash2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fmtINR } from "@/lib/format";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/expenses")({
  head: () => ({ meta: [{ title: "Expenses — Ghar Kharcha" }] }),
  component: Expenses,
});

function Expenses() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");

  const cats = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("name")).data ?? [],
  });

  const list = useQuery({
    queryKey: ["expenses"],
    queryFn: async () =>
      (
        await supabase
          .from("expenses")
          .select("id, amount, expense_date, note, payee, category_id")
          .order("expense_date", { ascending: false })
          .limit(200)
      ).data ?? [],
  });

  const filtered = useMemo(() => {
    const items = list.data ?? [];
    const catMap = new Map((cats.data ?? []).map((c) => [c.id, c.name]));
    return items
      .filter((r) => filterCat === "all" || r.category_id === filterCat)
      .filter((r) => {
        if (!search.trim()) return true;
        const s = search.toLowerCase();
        return (
          (r.note ?? "").toLowerCase().includes(s) ||
          (r.payee ?? "").toLowerCase().includes(s) ||
          (catMap.get(r.category_id ?? "") ?? "").toLowerCase().includes(s)
        );
      })
      .map((r) => ({ ...r, category: catMap.get(r.category_id ?? "") ?? "—" }));
  }, [list.data, cats.data, filterCat, search]);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Deleted");
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{t("expenses.title")}</h1>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 rounded-lg gradient-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-card"
        >
          <Plus size={16} /> {t("expenses.add")}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("expenses.search")}
            className="w-full rounded-lg border border-input bg-card py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="rounded-lg border border-input bg-card px-3 py-2 text-sm"
        >
          <option value="all">{t("expenses.filterCategory")}</option>
          {(cats.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {list.isLoading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          {t("expenses.empty")}
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-3 shadow-card"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary">
                    {r.category}
                  </span>
                  <span className="truncate text-sm">{r.note || r.payee || "—"}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {format(new Date(r.expense_date), "dd MMM yyyy")}
                  {r.payee && r.note ? ` · ${r.payee}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{fmtINR(r.amount)}</span>
                <button
                  aria-label="Delete"
                  onClick={() => del.mutate(r.id)}
                  className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <ExpenseForm
          categories={cats.data ?? []}
          onClose={() => setOpen(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["expenses"] });
            qc.invalidateQueries({ queryKey: ["dashboard"] });
          }}
        />
      )}
    </div>
  );
}

function ExpenseForm({
  categories,
  onClose,
  onSaved,
}: {
  categories: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [note, setNote] = useState("");
  const [payee, setPayee] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not signed in");
      const { error } = await supabase.from("expenses").insert({
        user_id: user.user.id,
        amount: Number(amount),
        expense_date: date,
        note: note || null,
        payee: payee || null,
        category_id: categoryId || null,
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
        <h2 className="text-lg font-semibold">{t("expenses.add")}</h2>
        <div className="mt-4 space-y-3">
          <input
            required
            type="number"
            step="0.01"
            min="0"
            placeholder={t("expenses.amount")}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-lg font-semibold outline-none focus:ring-2 focus:ring-ring"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <select
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <input
            placeholder={t("expenses.payee")}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm"
            value={payee}
            onChange={(e) => setPayee(e.target.value)}
          />
          <textarea
            placeholder={t("expenses.note")}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
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
            {busy ? t("common.saving") : t("expenses.save")}
          </button>
        </div>
      </form>
    </div>
  );
}
