/** Available balance follows the product rule: income minus expenses. */
export function calculateAvailableBalance(income: number, expenses: number): number {
  return Math.round((income - expenses) * 100) / 100;
}