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
