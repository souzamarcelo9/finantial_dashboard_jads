/**
 * Tax Planning Business Logic (Regras do IRPF brasileiro)
 * Extracted from TaxPlanningDashboard component
 */

import { IRPF_ANNUAL_BRACKETS, IRPF_REDUCAO_2026 } from "../../constants";
import type { TaxProjection, Transaction } from "../../types";

/**
 * Calcula o imposto pela tabela progressiva anual do IRPF, já aplicando a
 * redução prevista na Lei nº 15.270/2025 (isenção até R$60.000/ano e
 * redução gradual até R$88.200/ano).
 * @param taxableIncome Base de cálculo anual (renda tributável, após deduções)
 * @param grossAnnualIncome Renda bruta anual (usada para checar a faixa de redução)
 */
export const calculateTaxForIncome = (
  taxableIncome: number,
  grossAnnualIncome: number = taxableIncome
): number => {
  if (taxableIncome <= 0) {
    return 0;
  }

  const bracket =
    IRPF_ANNUAL_BRACKETS.find((b) => taxableIncome > b.min && taxableIncome <= b.max) ??
    IRPF_ANNUAL_BRACKETS[IRPF_ANNUAL_BRACKETS.length - 1];

  const taxBeforeReducao = Math.max(0, taxableIncome * bracket.rate - bracket.deduction);

  if (grossAnnualIncome <= IRPF_REDUCAO_2026.isencaoAnual) {
    return 0;
  }

  if (grossAnnualIncome <= IRPF_REDUCAO_2026.limiteReducaoAnual) {
    const redutor = Math.max(
      0,
      IRPF_REDUCAO_2026.fatorFixoAnual - IRPF_REDUCAO_2026.fatorVariavelAnual * grossAnnualIncome
    );
    return Math.max(0, taxBeforeReducao - redutor);
  }

  return taxBeforeReducao;
};

/**
 * Calcula a projeção de imposto de renda para o restante do ano-calendário
 * com base na tendência atual de renda e nos meses restantes.
 */
export const calculateProjectedTax = (
  transactions: Transaction[],
  totalIncome: number,
  totalDeductions: number,
  totalTaxLiability: number
): TaxProjection | null => {
  if (!transactions || transactions.length === 0) {
    return null;
  }

  const now = new Date();
  const currentMonth = now.getMonth(); // Ano-calendário brasileiro: Jan (0) a Dez (11)
  const monthsRemaining = Math.max(0, 11 - currentMonth);

  if (monthsRemaining === 0) {
    return null;
  }

  // Olha para os últimos 3 meses de renda salarial
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const recentSalaryTransactions = transactions.filter((t) => {
    const txDate = new Date(t.date);
    const category = (t.category ?? "").toLowerCase();
    const subcategory = (t.subcategory ?? "").toLowerCase();
    return (
      t.type === "Income" &&
      (category.includes("salár") || category.includes("salario") || subcategory.includes("salár")) &&
      txDate >= threeMonthsAgo &&
      txDate <= now
    );
  });

  if (recentSalaryTransactions.length === 0) {
    return null;
  }

  const totalRecentSalary = recentSalaryTransactions.reduce(
    (sum, t) => sum + Math.abs(Number(t.amount) || 0),
    0
  );
  const avgMonthlySalary = totalRecentSalary / recentSalaryTransactions.length;
  const projectedAnnualSalary = totalIncome + avgMonthlySalary * monthsRemaining;

  // Projeta a base de cálculo mantendo a mesma proporção de deduções já identificada
  const deductionRatio = totalIncome > 0 ? totalDeductions / totalIncome : 0;
  const projectedDeductions = projectedAnnualSalary * deductionRatio;
  const projectedTaxableIncome = Math.max(0, projectedAnnualSalary - projectedDeductions);

  const projectedTotalTax = calculateTaxForIncome(projectedTaxableIncome, projectedAnnualSalary);
  const additionalTaxLiability = projectedTotalTax - totalTaxLiability;

  return {
    avgMonthlySalary,
    monthsRemaining,
    projectedAnnualSalary,
    projectedTaxableIncome,
    projectedTotalTax,
    additionalTaxLiability,
    currentTax: totalTaxLiability,
  };
};
