import { currentUserId } from "@/lib/auth";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, Trash2, Search, Mic, Loader2, Square, Sparkles, Camera, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fmtINR } from "@/lib/format";
import { format } from "date-fns";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { blobToBase64 } from "@/lib/wav-encoder";
import { transcribeAndParseExpense } from "@/lib/voice-expense.functions";
import { analyzeExpenseInput } from "@/lib/expense-analysis.functions";
import { Button } from "@/components/ui/button";

const RECEIPT_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
type ReceiptMimeType = (typeof RECEIPT_MIME_TYPES)[number];

function isReceiptMimeType(value: string): value is ReceiptMimeType {
  return RECEIPT_MIME_TYPES.some((mimeType) => mimeType === value);
}

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
    queryFn: async () => (await supabase.from("categories").select("*").eq("user_id", await currentUserId()).order("name")).data ?? [],
  });

  const list = useQuery({
    queryKey: ["expenses"],
    queryFn: async () =>
      (
        await supabase
          .from("expenses")
          .select("id, amount, expense_date, note, payee, category_id")
          .eq("user_id", await currentUserId())
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
      const { error } = await supabase.from("expenses").delete().eq("id", id).eq("user_id", await currentUserId());
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
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={16}
          />
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
  const [aiBusy, setAiBusy] = useState(false);
  const [naturalText, setNaturalText] = useState("");
  const [receiptPath, setReceiptPath] = useState<string | null>(null);
  const [receiptName, setReceiptName] = useState<string | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [analysisConfidence, setAnalysisConfidence] = useState<string | null>(null);
  const [possibleDuplicate, setPossibleDuplicate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rec = useVoiceRecorder();
  const parseFn = useServerFn(transcribeAndParseExpense);
  const analyzeFn = useServerFn(analyzeExpenseInput);
  const [parsing, setParsing] = useState(false);
  const [voiceHint, setVoiceHint] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (receiptPreview) URL.revokeObjectURL(receiptPreview);
    };
  }, [receiptPreview]);

  const applySuggestion = (suggestion: {
    amount: number | null;
    categoryId: string | null;
    expenseDate: string | null;
    merchant: string | null;
    note: string | null;
    confidence: "high" | "medium" | "low";
    possibleDuplicate: boolean;
  }) => {
    if (suggestion.amount !== null) setAmount(String(suggestion.amount));
    if (suggestion.categoryId) setCategoryId(suggestion.categoryId);
    if (suggestion.expenseDate) setDate(suggestion.expenseDate);
    if (suggestion.merchant) setPayee(suggestion.merchant);
    if (suggestion.note) setNote(suggestion.note);
    setAnalysisConfidence(suggestion.confidence);
    setPossibleDuplicate(suggestion.possibleDuplicate);
  };

  const analyzeNaturalText = async () => {
    const text = naturalText.trim();
    if (!text) return;
    setAiBusy(true);
    setVoiceHint(null);
    setPossibleDuplicate(false);
    try {
      const suggestion = await analyzeFn({ data: { source: "text", text } });
      applySuggestion(suggestion);
      setVoiceHint(`“${text}”`);
      toast.success(t("expenses.reviewSuggestion"));
      if (suggestion.possibleDuplicate) toast.warning(t("expenses.possibleDuplicate"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("expenses.analysisFailed"));
    } finally {
      setAiBusy(false);
    }
  };

  const scanReceipt = async (file: File) => {
    if (!isReceiptMimeType(file.type)) {
      toast.error(t("expenses.unsupportedReceipt"));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error(t("expenses.receiptTooLarge"));
      return;
    }

    setAiBusy(true);
    setVoiceHint(null);
    setPossibleDuplicate(false);
    try {
      const userId = await currentUserId();
      const extension = file.type === "application/pdf"
        ? "pdf"
        : file.type === "image/jpeg"
          ? "jpg"
          : file.type === "image/png"
            ? "png"
            : "webp";
      const objectPath = `${userId}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("bills").upload(objectPath, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });
      if (uploadError) throw new Error(t("expenses.receiptUploadFailed"));

      const previousReceipt = receiptPath;
      setReceiptPath(objectPath);
      setReceiptName(file.name);
      setReceiptPreview(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
      if (previousReceipt) {
        const { error } = await supabase.storage.from("bills").remove([previousReceipt]);
        if (error) toast.warning(t("expenses.receiptCleanupFailed"));
      }

      const suggestion = await analyzeFn({
        data: { source: "receipt", objectPath, mimeType: file.type, fileName: file.name },
      });
      applySuggestion(suggestion);
      setVoiceHint(t("expenses.receiptRead"));
      toast.success(t("expenses.reviewSuggestion"));
      if (suggestion.possibleDuplicate) toast.warning(t("expenses.possibleDuplicate"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("expenses.analysisFailed"));
    } finally {
      setAiBusy(false);
    }
  };

  const handleMic = async () => {
    if (rec.state === "recording") {
      const blob = await rec.stop();
      if (!blob) {
        if (rec.error) toast.error(rec.error);
        return;
      }
      setParsing(true);
      setVoiceHint(null);
      try {
        const audioBase64 = await blobToBase64(blob);
        const parsed = await parseFn({ data: { audioBase64, mimeType: "audio/wav" } });
        if (parsed.amount != null) setAmount(String(parsed.amount));
        if (parsed.note) setNote(parsed.note);
        if (parsed.payee) setPayee(parsed.payee);
        const parsedCategory = parsed.category?.toLowerCase();
        if (parsedCategory) {
          const match = categories.find(
            (c) => c.name.toLowerCase() === parsedCategory,
          );
          if (match) setCategoryId(match.id);
        }
        setVoiceHint(`"${parsed.transcript}"`);
        toast.success(t("voice.filled"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("voice.failed"));
      } finally {
        setParsing(false);
      }
    } else {
      await rec.start();
    }
  };

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
        bill_photo_url: receiptPath,
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

  const micLabel =
    rec.state === "recording"
      ? t("voice.listening")
      : parsing
        ? t("voice.processing")
        : t("voice.tap");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-4">
      <form
        onSubmit={save}
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-card p-5 shadow-hero sm:rounded-3xl"
      >
        <h2 className="text-lg font-semibold">{t("expenses.add")}</h2>

        <button
          type="button"
          onClick={handleMic}
          disabled={parsing || aiBusy || busy}
          className={`mt-4 flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition ${
            rec.state === "recording"
              ? "border-destructive bg-destructive/10 text-destructive"
              : "border-dashed border-primary/40 bg-primary-soft text-primary hover:bg-primary-soft/80"
          }`}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            {parsing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : rec.state === "recording" ? (
              <Square size={14} />
            ) : (
              <Mic size={16} />
            )}
          </span>
          <span className="flex-1">
            <span className="block font-medium">{micLabel}</span>
            {voiceHint && (
              <span className="block truncate text-xs opacity-70">{voiceHint}</span>
            )}
          </span>
        </button>

        <div className="mt-4 space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="expense-natural-language">
              {t("expenses.describeExpense")}
            </label>
            <textarea
              id="expense-natural-language"
              value={naturalText}
              onChange={(event) => setNaturalText(event.target.value)}
              placeholder={t("expenses.naturalPlaceholder")}
              rows={2}
              maxLength={1000}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              disabled={aiBusy || busy}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => void analyzeNaturalText()}
              disabled={aiBusy || busy || !naturalText.trim()}
            >
              {aiBusy ? <Loader2 className="animate-spin" /> : <Sparkles />}
              {t("expenses.fillFromText")}
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            capture="environment"
            className="hidden"
            disabled={aiBusy || busy}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (file) void scanReceipt(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={aiBusy || busy}
          >
            {aiBusy ? <Loader2 className="animate-spin" /> : <Camera />}
            {receiptName ? t("expenses.changeReceipt") : t("expenses.scanReceipt")}
          </Button>

          {receiptName && (
            <div className="flex items-center gap-3 rounded-md border border-border p-2">
              {receiptPreview ? (
                <img src={receiptPreview} alt="" className="h-12 w-12 rounded object-cover" />
              ) : (
                <FileText className="h-8 w-8 shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0 truncate text-sm">{receiptName}</span>
            </div>
          )}

          {voiceHint && <p className="text-xs text-muted-foreground">{voiceHint}</p>}
          {analysisConfidence === "low" && (
            <p className="text-xs text-destructive">{t("expenses.lowConfidence")}</p>
          )}
          {possibleDuplicate && (
            <p className="text-xs text-destructive">{t("expenses.possibleDuplicate")}</p>
          )}

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
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={busy || aiBusy}
            onClick={() => {
              void (async () => {
                if (receiptPath) {
                  const { error } = await supabase.storage.from("bills").remove([receiptPath]);
                  if (error) toast.error(t("expenses.receiptCleanupFailed"));
                }
                onClose();
              })();
            }}
          >
            {t("common.cancel")}
          </Button>
          <Button
            disabled={busy || aiBusy}
            className="flex-1"
          >
            {busy ? t("common.saving") : t("expenses.save")}
          </Button>
        </div>
      </form>
    </div>
  );
}
