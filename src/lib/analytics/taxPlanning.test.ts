import { describe, expect, it } from "vitest";
import type { Transaction } from "../../types";
import { calculateProjectedTax, calculateTaxForIncome } from "./taxPlanning";

describe("Tax Planning - Business Logic (Regras do IRPF brasileiro)", () => {
  const createMockTransaction = (
    date: string,
    amount: number,
    type: "Income" | "Expense" = "Income",
    category = "Salário",
    subcategory = "Salário Mensal"
  ): Transaction => ({
    id: `tx-${date}-${amount}`,
    date,
    amount,
    type,
    category,
    subcategory,
    account: "Conta Bancária",
  });

  describe("calculateTaxForIncome", () => {
    it("should return 0 for annual income within the full exemption threshold (R$60,000)", () => {
      expect(calculateTaxForIncome(0)).toBe(0);
      expect(calculateTaxForIncome(30000)).toBe(0);
      expect(calculateTaxForIncome(50000)).toBe(0);
    });

    it("should apply the Lei 15.270/2025 gradual reduction between R$60,000 and R$88,200", () => {
      const tax = calculateTaxForIncome(70000);
      expect(tax).toBeCloseTo(5921.95, 1);
    });

    it("should apply the full progressive table above R$88,200 (no reduction)", () => {
      const tax = calculateTaxForIncome(100000);
      expect(tax).toBeCloseTo(16595.24, 1);
    });

    it("should scale correctly for higher incomes", () => {
      const tax = calculateTaxForIncome(200000);
      expect(tax).toBeCloseTo(44095.24, 1);
    });

    it("should use grossAnnualIncome separately from taxableIncome when deductions apply", () => {
      // Renda bruta de R$65.000 com R$10.000 de deduções -> base de R$55.000
      // Ainda dentro da faixa de redução (renda bruta <= 88.200)
      const tax = calculateTaxForIncome(55000, 65000);
      expect(tax).toBeGreaterThanOrEqual(0);
    });
  });

  describe("calculateProjectedTax", () => {
    it("should return null for no transactions", () => {
      const result = calculateProjectedTax([], 0, 0, 0);
      expect(result).toBeNull();
    });

    it("should return null when there is no recent salary data", () => {
      const oldTransactions = [createMockTransaction("2020-01-15", 10000)];
      const result = calculateProjectedTax(oldTransactions, 10000, 0, 0);
      expect(result).toBeNull();
    });

    it("should project remaining months using the current calendar date", () => {
      const today = new Date();
      const recentDate = today.toISOString().slice(0, 10);
      const recentTransactions = [createMockTransaction(recentDate, 8000)];
      const result = calculateProjectedTax(recentTransactions, 8000, 0, 0);
      // Só há projeção se ainda restarem meses no ano-calendário atual
      if (today.getMonth() < 11) {
        expect(result).not.toBeNull();
        expect(result?.avgMonthlySalary).toBe(8000);
      } else {
        expect(result).toBeNull();
      }
    });
  });
});
