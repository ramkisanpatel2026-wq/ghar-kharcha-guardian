export const salaryKeyFromMonthISO = (monthISO: string) => {
  const [year, month] = monthISO.split("-");
  return `salary_${year}_${month}`;
};

export const normalizeSalaryAmount = (value: number | string | null | undefined) => {
  if (value === "" || value === null || value === undefined) return 0;
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.round(amount);
};

export const parseSalaryAmount = (value: number | string | null | undefined) => {
  const amount = value === "" || value === null || value === undefined ? 0 : Number(value);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount);
};

export const salaryMonthISOFromPicker = (month: string) => {
  if (!/^\d{4}-\d{2}$/.test(month)) return null;
  return `${month}-01`;
};

export const salaryPickerFromMonthISO = (monthISO: string) => monthISO.slice(0, 7);

export const writeSalaryLocalCache = (monthISO: string, amount: number) => {
  if (typeof window === "undefined") return;
  const cacheKey = "salaryData";
  const monthKey = salaryPickerFromMonthISO(monthISO);
  try {
    const current = JSON.parse(window.localStorage.getItem(cacheKey) ?? "{}") as Record<
      string,
      number
    >;
    window.localStorage.setItem(
      cacheKey,
      JSON.stringify({
        ...current,
        [monthKey]: amount,
      }),
    );
  } catch {
    window.localStorage.setItem(cacheKey, JSON.stringify({ [monthKey]: amount }));
  }
};
