export const fmtINR = (n: number | string | null | undefined) => {
  const v = typeof n === "string" ? parseFloat(n) : (n ?? 0);
  if (!isFinite(v)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v);
};

/**
 * PDF-safe money string. jsPDF's built-in Helvetica uses WinAnsi encoding, which
 * has no glyph for "₹" (U+20B9) and no glyph for the narrow/no-break spaces that
 * Intl inserts — those unmapped chars are what render as "1 1 5 , 0 0 0".
 * So: plain ASCII "Rs." + Indian digit grouping, no non-ASCII characters at all.
 */
export const fmtPdfINR = (n: number | string | null | undefined) => {
  const v = typeof n === "string" ? parseFloat(n) : (n ?? 0);
  if (!isFinite(v)) return "Rs. 0";
  const sign = v < 0 ? "-" : "";
  const grouped = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 })
    .format(Math.abs(Math.round(v)))
    // strip any non-ASCII separators Intl may emit
    .replace(/[^\d,]/g, "");
  return `${sign}Rs. ${grouped}`;
};

export const monthKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;

export const monthRange = (monthDate: Date) => {
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
  return {
    startISO: start.toISOString().slice(0, 10),
    endISO: end.toISOString().slice(0, 10),
    label: start.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
  };
};
