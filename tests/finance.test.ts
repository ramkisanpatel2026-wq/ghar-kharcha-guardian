import { describe, expect, it } from "bun:test";
import { calculateAvailableBalance } from "../src/lib/finance";

describe("available balance", () => {
  it("equals income minus expenses without subtracting savings again", () => {
    expect(calculateAvailableBalance(52000, 12750)).toBe(39250);
  });

  it("keeps a negative balance and rounds to paise", () => {
    expect(calculateAvailableBalance(12500.75, 13000.25)).toBe(-499.5);
  });
});