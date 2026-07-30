// @ts-nocheck
/**
 * Unified Financial Calculations
 * Single source of truth for all financial calculations
 * No duplicates - clean, simple, easy to maintain
 */

import {
  DEDUCAO_DEPENDENTE_ANUAL,
  DESCONTO_SIMPLIFICADO_ANUAL,
  DESCONTO_SIMPLIFICADO_PERCENTUAL,
  INSS_TETO_ANUAL,
  INVESTMENT_ACCOUNTS,
  INVESTMENT_CATEGORIES,
  IRPF_ANNUAL_BRACKETS,
  IRPF_REDUCAO_2026,
  LIMITE_EDUCACAO_ANUAL,
  PERCENT,
  PREVIDENCIA_PRIVADA_PERCENTUAL_LIMITE,
} from "../../../constants";
import { getAllFinancialYears, getFinancialYear } from "../../data";
import { calculateDailyAverage, calculateDateRange, calculateMonthlyAverage } from "../index";

// ============================================================================
// BASIC CALCULATIONS
// ============================================================================

// Re-export canonical implementations for external consumers
export {
  calculateAveragePerTransaction,
  calculateDailyAverage,
  calculateDateRange,
  calculateMonthlyAverage,
  calculatePercentage,
  calculateSavings,
  calculateSavingsRate,
  calculateTotalExpense,
  calculateTotalIncome,
  getTopCategories,
  groupByCategory,
} from "../index";

// ============================================================================
// NET BALANCE BREAKDOWN
// ============================================================================

export {
  calculateNetBalanceBreakdown,
  calculateNetBalanceBreakdownFromAccounts,
  categorizeAccount,
  getBalanceBreakdownInsights,
} from "./netBalance";

// ============================================================================
// CASHBACK CALCULATIONS
// ============================================================================

export {
  calculateActualCashback,
  calculateCashbackByCard,
  calculateCashbackMetrics,
  calculateCashbackShared,
  calculateTotalCashbackEarned,
} from "./cashback";

// ============================================================================
// REIMBURSEMENT CALCULATIONS
// ============================================================================

export {
  calculateAverageReimbursement,
  calculateReimbursementByPeriod,
  calculateReimbursementMetrics,
  calculateTotalReimbursements,
  getReimbursementTransactions,
} from "./reimbursement";

// ============================================================================
// INVESTMENT PERFORMANCE
// ============================================================================

/**
 * Calculate investment performance metrics
 */
export const calculateInvestmentPerformance = (transactions) => {
  if (!transactions || transactions.length === 0) {
    return {
      totalCapitalDeployed: 0,
      totalWithdrawals: 0,
      currentHoldings: 0,
      netInvestedCapital: 0,
      realizedProfits: 0,
      realizedLosses: 0,
      netProfitLoss: 0,
      brokerageFees: 0,
      netReturn: 0,
      returnPercentage: 0,
      transactions: [],
    };
  }

  // Calculate RSU as part of current holdings
  const rsuHoldings = transactions
    .filter(
      (t) =>
        t.type === "Income" &&
        (t.subcategory?.includes("RSU") ||
          t.subcategory?.includes("Stock") ||
          t.note?.toLowerCase().includes("rsu") ||
          t.note?.toLowerCase().includes("esop"))
    )
    .reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);

  const invTransactions = transactions.filter(
    (t) =>
      INVESTMENT_CATEGORIES.has(t.category) ||
      INVESTMENT_ACCOUNTS.has(t.account) ||
      (t.subcategory &&
        (t.subcategory.includes("Stock") ||
          t.subcategory.includes("F&O") ||
          t.subcategory.includes("Brokerage")))
  );

  let totalCapitalDeployed = 0; // Total money moved INTO investments
  let totalWithdrawals = 0; // Total money moved OUT of investments
  let realizedProfits = 0;
  let realizedLosses = 0;
  let brokerageFees = 0;

  const transactionDetails = invTransactions.map((t) => {
    const amount = Math.abs(Number(t.amount) || 0);
    const isProfit =
      t.subcategory?.includes("Profit") ||
      t.category === "Investment Income" ||
      t.type === "Income";
    const isLoss = t.subcategory?.includes("Loss") || t.category === "Investment Charges & Loss";
    const isFee = t.subcategory?.includes("Brokerage") || t.subcategory?.includes("Fees");

    if (t.type === "Transfer-Out" && !isLoss && !isFee) {
      totalCapitalDeployed += amount;
    } else if (t.type === "Transfer-In" && !isProfit) {
      totalWithdrawals += amount;
    } else if (isProfit) {
      realizedProfits += amount;
    } else if (isLoss) {
      realizedLosses += amount;
    } else if (isFee) {
      brokerageFees += amount;
    }

    let transactionType = t.type;
    if (isProfit) {
      transactionType = "Profit";
    } else if (isLoss) {
      transactionType = "Loss";
    } else if (isFee) {
      transactionType = "Fee";
    }

    return {
      date: t.date,
      category: t.category,
      subcategory: t.subcategory,
      amount,
      type: transactionType,
      note: t.note,
    };
  });

  // Calculate current holdings from investment account balances
  // This gives actual current value of holdings
  const investmentAccountBalances = {};

  transactions.forEach((t) => {
    const account = t.account;
    if (!account) {
      return;
    }

    // Only track investment accounts (Groww Stocks, Groww MF, etc.)
    const isInvestmentAccount =
      account.toLowerCase().includes("groww") ||
      account.toLowerCase().includes("stock") ||
      account.toLowerCase().includes("mutual fund") ||
      account.toLowerCase().includes("mf") ||
      account.toLowerCase().includes("equity") ||
      account.toLowerCase().includes("zerodha") ||
      account.toLowerCase().includes("upstox");

    if (!isInvestmentAccount) {
      return;
    }

    if (!investmentAccountBalances[account]) {
      investmentAccountBalances[account] = 0;
    }

    const amount = Math.abs(Number(t.amount) || 0);

    if (t.type === "Income" || t.type === "Transfer-In") {
      investmentAccountBalances[account] += amount;
    } else if (t.type === "Expense" || t.type === "Transfer-Out") {
      investmentAccountBalances[account] -= amount;
    }
  });

  // Sum up all investment account balances to get current holdings
  // Include RSU holdings (equity compensation received and vested)
  const accountBasedHoldings = Object.values(investmentAccountBalances).reduce(
    (sum, balance) => sum + balance,
    0
  );
  const currentHoldings = accountBasedHoldings + rsuHoldings;

  // Net Invested Capital = Current Holdings (still in market)
  const netInvestedCapital = currentHoldings;

  const netProfitLoss = realizedProfits - realizedLosses - brokerageFees;
  const netReturn = netProfitLoss;

  // Return % calculation - uses totalCapitalDeployed for accurate portfolio return
  // Formula: (Net Return / Total Capital Deployed) × 100
  // This represents total portfolio return including withdrawn capital
  // Fixed as per audit report recommendation (Issue #1 - MEDIUM Priority)
  const returnPercentage =
    totalCapitalDeployed > 0 ? (netReturn / totalCapitalDeployed) * PERCENT : 0;

  return {
    totalCapitalDeployed,
    totalWithdrawals,
    currentHoldings,
    rsuHoldings, // RSU equity compensation
    accountBasedHoldings, // Holdings from investment accounts only
    netInvestedCapital,
    realizedProfits,
    realizedLosses,
    netProfitLoss,
    brokerageFees,
    netReturn,
    returnPercentage,
    transactions: transactionDetails.sort((a, b) => new Date(b.date) - new Date(a.date)),
  };
};

// ============================================================================
// TAX PLANNING
// ============================================================================

/**
 * Calcula o imposto pela tabela progressiva anual do IRPF
 * usando a fórmula oficial: imposto = (base × alíquota) − parcela a deduzir
 * @param {number} taxableIncome - Base de cálculo anual (renda tributável)
 * @returns {number} Imposto calculado pela tabela progressiva (antes da redução da Lei 15.270/2025)
 */
const calculateTaxFromSlabs = (taxableIncome) => {
  if (taxableIncome <= 0) {
    return 0;
  }

  const bracket =
    IRPF_ANNUAL_BRACKETS.find((b) => taxableIncome > b.min && taxableIncome <= b.max) ??
    IRPF_ANNUAL_BRACKETS[IRPF_ANNUAL_BRACKETS.length - 1];

  const tax = taxableIncome * bracket.rate - bracket.deduction;
  return Math.max(0, tax);
};

/**
 * Aplica a redução do IRPF prevista na Lei nº 15.270/2025 (vigente desde jan/2026):
 * - Isenta totalmente quem tem renda bruta anual até R$60.000
 * - Reduz gradualmente o imposto para renda bruta anual entre R$60.000,01 e R$88.200,00
 * - Não altera o imposto para quem ganha acima de R$88.200,00/ano
 * @param {number} taxCalculated - Imposto calculado pela tabela progressiva
 * @param {number} grossAnnualIncome - Renda bruta tributável anual (antes de deduções)
 * @returns {number} Imposto final, após aplicar a redução
 */
const applyIrpfReducao2026 = (taxCalculated, grossAnnualIncome) => {
  if (grossAnnualIncome <= IRPF_REDUCAO_2026.isencaoAnual) {
    return 0;
  }

  if (grossAnnualIncome <= IRPF_REDUCAO_2026.limiteReducaoAnual) {
    const redutor = Math.max(
      0,
      IRPF_REDUCAO_2026.fatorFixoAnual - IRPF_REDUCAO_2026.fatorVariavelAnual * grossAnnualIncome
    );
    return Math.max(0, taxCalculated - redutor);
  }

  return taxCalculated;
};

/**
 * Calcula o desconto simplificado anual (substitui todas as deduções legais)
 * Equivale a 20% da renda tributável, limitado ao teto anual da Receita Federal
 */
const calculateDescontoSimplificado = (grossAnnualIncome) =>
  Math.min(grossAnnualIncome * DESCONTO_SIMPLIFICADO_PERCENTUAL, DESCONTO_SIMPLIFICADO_ANUAL);

/**
 * Calcula o imposto de renda anual devido a partir da renda bruta e das
 * deduções legais disponíveis, escolhendo automaticamente entre o desconto
 * simplificado e as deduções legais (o que resultar em menos imposto —
 * exatamente como a Receita Federal recomenda).
 * @param {number} grossAnnualIncome - Renda bruta tributável anual
 * @param {number} itemizedDeductions - Soma das deduções legais (INSS, dependentes, saúde, educação, previdência privada, pensão)
 * @returns {object} { taxableIncome, taxBeforeReducao, finalTax, deductionMethodUsed, deductionAmountUsed }
 */
const calculateAnnualIncomeTax = (grossAnnualIncome, itemizedDeductions) => {
  const descontoSimplificado = calculateDescontoSimplificado(grossAnnualIncome);

  const taxableIncomeSimplified = Math.max(0, grossAnnualIncome - descontoSimplificado);
  const taxSimplified = calculateTaxFromSlabs(taxableIncomeSimplified);

  const taxableIncomeItemized = Math.max(0, grossAnnualIncome - itemizedDeductions);
  const taxItemized = calculateTaxFromSlabs(taxableIncomeItemized);

  // A Receita Federal permite escolher o método mais vantajoso (menor imposto)
  const useSimplified = taxSimplified <= taxItemized;

  const taxableIncome = useSimplified ? taxableIncomeSimplified : taxableIncomeItemized;
  const taxBeforeReducao = useSimplified ? taxSimplified : taxItemized;
  const finalTax = applyIrpfReducao2026(taxBeforeReducao, grossAnnualIncome);

  return {
    taxableIncome,
    taxBeforeReducao,
    finalTax,
    deductionMethodUsed: useSimplified ? "simplified" : "itemized",
    deductionAmountUsed: useSimplified ? descontoSimplificado : itemizedDeductions,
    descontoSimplificado,
    itemizedDeductions,
  };
};


/**
 * Calculate tax planning metrics with financial year breakdown
 */
export const calculateTaxPlanning = (transactions) => {
  if (!transactions || transactions.length === 0) {
    return {
      overall: getDefaultTaxPlanningData(),
      byFinancialYear: {},
      availableYears: [],
    };
  }

  const availableYears = getAllFinancialYears(transactions);

  // Group transactions by financial year
  const transactionsByFY = {};
  availableYears.forEach((fy) => {
    transactionsByFY[fy] = transactions.filter((t) => getFinancialYear(t.date) === fy);
  });

  // Calculate tax planning for each FY
  const byFinancialYear = {};
  availableYears.forEach((fy) => {
    byFinancialYear[fy] = calculateTaxPlanningForYear(transactionsByFY[fy], fy);
  });

  // Calculate overall (all years combined) - use latest FY slabs
  const latestFY = availableYears.length > 0 ? availableYears[0] : "FY 2025-26";
  const overall = calculateTaxPlanningForYear(transactions, latestFY);

  return {
    overall,
    byFinancialYear,
    availableYears,
  };
};
/**
 * Helper: Get default tax planning data structure
 */
const getDefaultTaxPlanningData = () => ({
  totalIncome: 0,
  netIncome: 0,
  salaryIncome: 0,
  bonusIncome: 0,
  otherIncome: 0,
  inssDeduction: 0,
  numDependents: 0,
  dependentsDeduction: 0,
  healthDeduction: 0,
  educationDeduction: 0,
  privatePensionDeduction: 0,
  alimonyDeduction: 0,
  itemizedDeductionsTotal: 0,
  descontoSimplificado: 0,
  deductionMethodUsed: "simplified",
  taxableIncome: 0,
  estimatedTax: 0,
  totalTaxLiability: 0,
  deductions: [],
  recommendations: [],
  year: null,
  note: "",
});

/**
 * Calcula o planejamento tributário (IRPF) para um ano-calendário específico
 * @param {Array} transactions - Lançamentos do ano
 * @param {string} year - Ano-calendário (ex: "2026")
 * @returns {Object} Dados do planejamento tributário
 */
/* eslint-disable max-lines-per-function */
const calculateTaxPlanningForYear = (transactions, year = null) => {
  if (!transactions || transactions.length === 0) {
    return { ...getDefaultTaxPlanningData(), year: year ?? String(new Date().getFullYear()) };
  }

  const incomeTransactions = transactions.filter((t) => t.type === "Income");

  const salaryIncome = incomeTransactions
    .filter(
      (t) =>
        t.category?.toLowerCase().includes("salár") ||
        t.category?.toLowerCase().includes("salario") ||
        t.category?.toLowerCase().includes("emprego") ||
        t.subcategory?.toLowerCase().includes("salár") ||
        t.subcategory?.toLowerCase().includes("salario")
    )
    .reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);

  const bonusIncome = incomeTransactions
    .filter(
      (t) =>
        t.subcategory?.toLowerCase().includes("bônus") ||
        t.subcategory?.toLowerCase().includes("bonus") ||
        t.subcategory?.toLowerCase().includes("13") ||
        t.note?.toLowerCase().includes("bônus") ||
        t.note?.toLowerCase().includes("13º")
    )
    .reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);

  const totalIncome = incomeTransactions.reduce(
    (sum, t) => sum + Math.abs(Number(t.amount) || 0),
    0
  );

  const otherIncome = Math.max(0, totalIncome - salaryIncome - bonusIncome);

  // INSS (contribuição previdenciária) — deduzido diretamente da base de cálculo
  const inssFromTransactions = transactions
    .filter(
      (t) =>
        t.type === "Expense" &&
        (t.subcategory?.toUpperCase().includes("INSS") ||
          t.category?.toUpperCase().includes("INSS") ||
          t.note?.toUpperCase().includes("INSS"))
    )
    .reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);

  const salaryMonths = incomeTransactions.filter(
    (t) =>
      t.category?.toLowerCase().includes("salár") || t.subcategory?.toLowerCase().includes("salár")
  ).length;

  // Se não houver lançamentos explícitos de INSS, estima pelo teto proporcional aos meses de salário
  const inssDeduction =
    inssFromTransactions > 0
      ? Math.min(inssFromTransactions, INSS_TETO_ANUAL)
      : Math.min((salaryMonths / 12) * INSS_TETO_ANUAL, INSS_TETO_ANUAL);

  // Dependentes — cada lançamento de despesa com subcategoria "Dependente" conta como indício,
  // mas o número de dependentes deve, idealmente, ser informado pelo usuário.
  const numDependents = 0; // valor padrão; pode ser ajustado manualmente no futuro
  const dependentsDeduction = numDependents * DEDUCAO_DEPENDENTE_ANUAL;

  // Saúde — despesas médicas, plano de saúde, dentista, etc. (dedução integral, sem teto legal)
  const healthDeduction = transactions
    .filter(
      (t) =>
        t.type === "Expense" &&
        (t.category?.toLowerCase().includes("saúde") ||
          t.category?.toLowerCase().includes("saude") ||
          t.subcategory?.toLowerCase().includes("plano de saúde") ||
          t.subcategory?.toLowerCase().includes("consulta") ||
          t.subcategory?.toLowerCase().includes("farmácia") === false) // farmácia normalmente não é dedutível
    )
    .filter((t) => !t.subcategory?.toLowerCase().includes("farmácia"))
    .reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);

  // Educação — limitada a R$3.561,50/ano por pessoa (aqui: só o titular)
  const educationRaw = transactions
    .filter(
      (t) =>
        t.type === "Expense" &&
        (t.category?.toLowerCase().includes("educação") ||
          t.category?.toLowerCase().includes("educacao") ||
          t.subcategory?.toLowerCase().includes("mensalidade") ||
          t.subcategory?.toLowerCase().includes("curso"))
    )
    .reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);
  const educationDeduction = Math.min(educationRaw, LIMITE_EDUCACAO_ANUAL * (1 + numDependents));

  // Previdência Privada (PGBL) — dedutível até 12% da renda bruta tributável anual
  const privatePensionRaw = transactions
    .filter(
      (t) =>
        t.type === "Expense" &&
        (t.subcategory?.toLowerCase().includes("previdência") ||
          t.subcategory?.toLowerCase().includes("previdencia") ||
          t.subcategory?.toLowerCase().includes("pgbl") ||
          t.note?.toLowerCase().includes("pgbl"))
    )
    .reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);
  const privatePensionDeduction = Math.min(
    privatePensionRaw,
    totalIncome * PREVIDENCIA_PRIVADA_PERCENTUAL_LIMITE
  );

  // Pensão alimentícia — dedução integral (quando determinada judicialmente)
  const alimonyDeduction = transactions
    .filter(
      (t) =>
        t.type === "Expense" &&
        (t.subcategory?.toLowerCase().includes("pensão aliment") ||
          t.subcategory?.toLowerCase().includes("pensao aliment") ||
          t.note?.toLowerCase().includes("pensão aliment"))
    )
    .reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);

  const itemizedDeductionsTotal =
    inssDeduction +
    dependentsDeduction +
    healthDeduction +
    educationDeduction +
    privatePensionDeduction +
    alimonyDeduction;

  // ============================================================================
  // IMPORTANTE: os valores de renda são os registrados nos lançamentos (podem
  // já estar líquidos de IR retido na fonte). Para acompanhar o IR retido de
  // fato, registre um lançamento de despesa com subcategoria "IR Retido na Fonte".
  // ============================================================================
  const {
    taxableIncome,
    finalTax,
    deductionMethodUsed,
    deductionAmountUsed,
    descontoSimplificado,
  } = calculateAnnualIncomeTax(totalIncome, itemizedDeductionsTotal);

  const estimatedTax = finalTax;
  const totalTaxLiability = estimatedTax;
  const netIncome = totalIncome - totalTaxLiability;

  const deductions = [
    {
      name: "Desconto Simplificado (20%, limitado a R$17.640,00/ano)",
      amount: deductionMethodUsed === "simplified" ? descontoSimplificado : 0,
      limit: DESCONTO_SIMPLIFICADO_ANUAL,
      used: descontoSimplificado,
      remaining: Math.max(0, DESCONTO_SIMPLIFICADO_ANUAL - descontoSimplificado),
      utilized: deductionMethodUsed === "simplified",
    },
    {
      name: "INSS (Contribuição Previdenciária)",
      amount: deductionMethodUsed === "itemized" ? inssDeduction : 0,
      limit: INSS_TETO_ANUAL,
      used: inssDeduction,
      remaining: Math.max(0, INSS_TETO_ANUAL - inssDeduction),
      utilized: inssDeduction > 0,
    },
    {
      name: `Dependentes (${numDependents} × R$2.275,08/ano)`,
      amount: deductionMethodUsed === "itemized" ? dependentsDeduction : 0,
      limit: dependentsDeduction,
      used: dependentsDeduction,
      remaining: 0,
      utilized: dependentsDeduction > 0,
    },
    {
      name: "Saúde (despesas médicas, sem limite legal)",
      amount: deductionMethodUsed === "itemized" ? healthDeduction : 0,
      limit: healthDeduction,
      used: healthDeduction,
      remaining: 0,
      utilized: healthDeduction > 0,
    },
    {
      name: "Educação (limite R$3.561,50/ano por pessoa)",
      amount: deductionMethodUsed === "itemized" ? educationDeduction : 0,
      limit: LIMITE_EDUCACAO_ANUAL,
      used: educationDeduction,
      remaining: Math.max(0, LIMITE_EDUCACAO_ANUAL - educationDeduction),
      utilized: educationDeduction > 0,
    },
    {
      name: "Previdência Privada - PGBL (até 12% da renda)",
      amount: deductionMethodUsed === "itemized" ? privatePensionDeduction : 0,
      limit: totalIncome * PREVIDENCIA_PRIVADA_PERCENTUAL_LIMITE,
      used: privatePensionDeduction,
      remaining: Math.max(
        0,
        totalIncome * PREVIDENCIA_PRIVADA_PERCENTUAL_LIMITE - privatePensionDeduction
      ),
      utilized: privatePensionDeduction > 0,
    },
    {
      name: "Pensão Alimentícia",
      amount: deductionMethodUsed === "itemized" ? alimonyDeduction : 0,
      limit: alimonyDeduction,
      used: alimonyDeduction,
      remaining: 0,
      utilized: alimonyDeduction > 0,
    },
  ];

  const recommendations = [];

  if (deductionMethodUsed === "simplified" && itemizedDeductionsTotal > descontoSimplificado) {
    recommendations.push({
      priority: "medium",
      message:
        "Suas deduções legais somadas já superam o desconto simplificado — vale simular a declaração completa na hora de declarar.",
      action: "Comparar desconto simplificado x deduções legais",
    });
  }

  if (privatePensionDeduction < totalIncome * PREVIDENCIA_PRIVADA_PERCENTUAL_LIMITE) {
    const remaining =
      totalIncome * PREVIDENCIA_PRIVADA_PERCENTUAL_LIMITE - privatePensionDeduction;
    recommendations.push({
      priority: "medium",
      message: `Você ainda pode contribuir mais R$${remaining.toLocaleString("pt-BR", {
        maximumFractionDigits: 0,
      })} em Previdência Privada (PGBL) para reduzir sua base tributável (se optar por deduções legais).`,
      action: "Contribuir para PGBL",
    });
  }

  if (educationDeduction >= LIMITE_EDUCACAO_ANUAL) {
    recommendations.push({
      priority: "low",
      message: "Você já atingiu o limite anual de dedução com educação (R$3.561,50 por pessoa).",
      action: "Limite de educação atingido",
    });
  }

  if (totalIncome > 0 && totalIncome <= IRPF_REDUCAO_2026.isencaoAnual) {
    recommendations.push({
      priority: "low",
      message:
        "Sua renda anual está dentro do limite de isenção total do IRPF (até R$60.000,00/ano), conforme a Lei nº 15.270/2025.",
      action: "Isento de Imposto de Renda",
    });
  }

  return {
    totalIncome,
    netIncome,
    salaryIncome,
    bonusIncome,
    otherIncome,

    inssDeduction,
    numDependents,
    dependentsDeduction,
    healthDeduction,
    educationDeduction,
    privatePensionDeduction,
    alimonyDeduction,
    itemizedDeductionsTotal,
    descontoSimplificado,
    deductionMethodUsed,
    deductionAmountUsed,

    taxableIncome,
    estimatedTax,
    totalTaxLiability,
    deductions,

    recommendations,
    year: year ?? String(new Date().getFullYear()),
    note:
      "Os valores de renda exibidos são os registrados nos lançamentos. Se o seu salário já é lançado líquido de IR retido na fonte, o imposto real pode ser diferente do calculado aqui. Para acompanhar o IR retido com precisão, registre um lançamento de despesa com subcategoria \"IR Retido na Fonte\".",
  };
};


// ============================================================================
// FAMILY & HOUSING
// ============================================================================

/**
 * Calculate family expense metrics
 */
export const calculateFamilyExpenses = (transactions) => {
  if (!transactions || transactions.length === 0) {
    return {
      totalFamilyExpense: 0,
      monthlyAverage: 0,
      breakdown: [],
      topExpenses: [],
      bySubcategory: {},
      insights: [],
    };
  }

  const familyTransactions = transactions.filter(
    (t) => t.type === "Expense" && t.category === "Family"
  );

  const totalFamilyExpense = familyTransactions.reduce(
    (sum, t) => sum + Math.abs(Number(t.amount) || 0),
    0
  );

  const dateRange = calculateDateRange(familyTransactions);
  const monthlyAverage = calculateMonthlyAverage(totalFamilyExpense, dateRange.days);

  // Group by subcategory
  const bySubcategory = familyTransactions.reduce((acc, t) => {
    const sub = t.subcategory || "Other";
    if (!acc[sub]) {
      acc[sub] = { total: 0, count: 0, transactions: [] };
    }
    acc[sub].total += Math.abs(Number(t.amount) || 0);
    acc[sub].count++;
    acc[sub].transactions.push(t);
    return acc;
  }, {});

  // Create breakdown array for charts
  const breakdown = Object.entries(bySubcategory).map(([name, data]) => ({
    name,
    total: data.total,
    amount: data.total,
    count: data.count,
    average: data.count > 0 ? data.total / data.count : 0,
    percentage: totalFamilyExpense > 0 ? (data.total / totalFamilyExpense) * PERCENT : 0,
  }));

  // Get top expenses
  const topExpenses = familyTransactions
    .map((t) => ({
      date: t.date,
      subcategory: t.subcategory || "Other",
      amount: Math.abs(Number(t.amount) || 0),
      note: t.note,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  const insights = [];
  const sortedBreakdown = [...breakdown].sort((a, b) => b.amount - a.amount);
  const topSubcategory = sortedBreakdown[0];

  if (topSubcategory) {
    insights.push({
      title: "Top Family Expense",
      message: `${topSubcategory.name}: R$${topSubcategory.amount.toLocaleString()}`,
      priority: "info",
    });
  }

  return {
    totalFamilyExpense,
    monthlyAverage,
    breakdown,
    topExpenses,
    bySubcategory,
    insights,
  };
};

/**
 * Calculate housing expense metrics
 */
export const calculateHousingExpenses = (transactions) => {
  if (!transactions || transactions.length === 0) {
    return {
      totalHousing: 0,
      totalRent: 0,
      totalUtilities: 0,
      monthlyRentAverage: 0,
      rentPayments: [],
      utilities: [],
      trends: [],
      hraEligible: 0,
    };
  }

  const housingTransactions = transactions.filter(
    (t) => t.type === "Expense" && (t.category === "Housing" || t.subcategory === "Rent")
  );

  const totalHousing = housingTransactions.reduce(
    (sum, t) => sum + Math.abs(Number(t.amount) || 0),
    0
  );

  const rentTransactions = housingTransactions.filter((t) => t.subcategory === "Rent");

  const totalRent = rentTransactions.reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);

  const utilityTransactions = transactions.filter(
    (t) =>
      t.type === "Expense" &&
      (t.subcategory?.includes("Utilities") ||
        t.subcategory?.includes("Electricity") ||
        t.subcategory?.includes("Water") ||
        t.subcategory?.includes("Gas"))
  );

  const totalUtilities = utilityTransactions.reduce(
    (sum, t) => sum + Math.abs(Number(t.amount) || 0),
    0
  );

  const monthlyRentAverage = rentTransactions.length > 0 ? totalRent / rentTransactions.length : 0;

  const rentPayments = rentTransactions
    .map((t) => ({
      date: t.date,
      amount: Math.abs(Number(t.amount) || 0),
      note: t.note,
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const utilities = utilityTransactions
    .map((t) => ({
      date: t.date,
      subcategory: t.subcategory || "Utility",
      amount: Math.abs(Number(t.amount) || 0),
      note: t.note,
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  // Calculate monthly trends
  const monthlyData = {};
  rentTransactions.forEach((t) => {
    const month = new Date(t.date).toISOString().slice(0, 7);
    if (!monthlyData[month]) {
      monthlyData[month] = { rent: 0, utilities: 0 };
    }
    monthlyData[month].rent += Math.abs(Number(t.amount) || 0);
  });

  utilityTransactions.forEach((t) => {
    const month = new Date(t.date).toISOString().slice(0, 7);
    if (!monthlyData[month]) {
      monthlyData[month] = { rent: 0, utilities: 0 };
    }
    monthlyData[month].utilities += Math.abs(Number(t.amount) || 0);
  });

  const trends = Object.entries(monthlyData)
    .map(([month, data]) => ({
      month,
      rent: data.rent,
      utilities: data.utilities,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const hraEligible = Math.min(totalRent * 0.9, totalRent);

  return {
    totalHousing,
    totalRent,
    totalUtilities,
    monthlyRentAverage,
    rentPayments,
    utilities,
    trends,
    hraEligible,
  };
};

// ============================================================================
// CREDIT CARDS & FOOD
// ============================================================================

/**
 * Calculate credit card metrics
 * @deprecated Use calculateCashbackMetrics for cashback-specific data
 */
export const calculateCreditCardMetrics = (transactions) => {
  if (!transactions || transactions.length === 0) {
    return {
      totalSpending: 0,
      totalCashback: 0,
      totalCashbackEarned: 0,
      cashbackShared: 0,
      actualCashback: 0,
      totalCreditCardSpending: 0,
      cashbackRate: 0,
      byCard: {},
      cardBreakdown: [],
      insights: [],
    };
  }

  const cardAccounts = transactions
    .filter((t) => t.account?.toLowerCase().includes("credit"))
    .map((t) => t.account);

  const uniqueCards = [...new Set(cardAccounts)];

  const byCard = uniqueCards.reduce((acc, card) => {
    const cardTransactions = transactions.filter((t) => t.account === card);
    const expenseTransactions = cardTransactions.filter(
      (t) => t.type === "Expense" || t["Income/Expense"] === "Exp."
    );

    const spending = expenseTransactions.reduce(
      (sum, t) => sum + Math.abs(Number(t.amount) || 0),
      0
    );

    // Use new cashback calculation - from Refund & Cashbacks category
    const cashback = cardTransactions
      .filter(
        (t) =>
          t.category === "Refund & Cashbacks" &&
          (t.type === "Income" || t["Income/Expense"] === "Income")
      )
      .reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);

    // Calculate top category for this card
    const categoryTotals = expenseTransactions.reduce((cats, t) => {
      const cat = t.category || "Other";
      cats[cat] = (cats[cat] || 0) + Math.abs(Number(t.amount) || 0);
      return cats;
    }, {});

    const topCategoryEntry = Object.entries(categoryTotals).sort(([, a], [, b]) => b - a)[0];

    const topCategory = topCategoryEntry || ["Other", 0];

    acc[card] = {
      spending,
      cashback,
      transactionCount: expenseTransactions.length,
      average: expenseTransactions.length > 0 ? spending / expenseTransactions.length : 0,
      topCategory,
    };
    return acc;
  }, {});

  // Create breakdown array for charts
  const cardBreakdown = Object.entries(byCard).map(([card, data]) => ({
    card,
    spending: data.spending || 0,
    cashback: data.cashback || 0,
    cashbackRate: data.spending > 0 ? (data.cashback / data.spending) * 100 : 0,
  }));

  const totalSpending = Object.values(byCard).reduce((sum, card) => sum + card.spending, 0);

  // Calculate comprehensive cashback metrics using centralized functions
  const totalCashbackEarned = transactions
    .filter(
      (t) =>
        t.category === "Refund & Cashbacks" &&
        (t.type === "Income" || t["Income/Expense"] === "Income")
    )
    .reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);

  const cashbackShared = transactions
    .filter(
      (t) =>
        t.account === "Cashback Shared" &&
        (t.type === "Expense" ||
          t.type === "Transfer-Out" ||
          t["Income/Expense"] === "Exp." ||
          t["Income/Expense"] === "Transfer-Out")
    )
    .reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);

  const actualCashback = totalCashbackEarned - cashbackShared;

  const totalCreditCardSpending = totalSpending;
  const cashbackRate = totalSpending > 0 ? (totalCashbackEarned / totalSpending) * PERCENT : 0;

  const insights = [];
  if (totalCashbackEarned > 0) {
    insights.push({
      title: "Total Cashback Earned",
      message: `R$${totalCashbackEarned.toLocaleString()} earned (${cashbackRate.toFixed(2)}% back)`,
      priority: "positive",
    });
  }

  if (cashbackShared > 0) {
    const sharedPercent = (cashbackShared / totalCashbackEarned) * 100;
    insights.push({
      title: "Cashback Shared",
      message: `R$${cashbackShared.toLocaleString()} shared (${sharedPercent.toFixed(1)}%)`,
      priority: "neutral",
    });
  }

  if (actualCashback > 0) {
    insights.push({
      title: "Actual Cashback",
      message: `R$${actualCashback.toLocaleString()} retained after sharing`,
      priority: "positive",
    });
  }

  return {
    totalSpending,
    totalCashback: totalCashbackEarned, // For backwards compatibility
    totalCashbackEarned,
    cashbackShared,
    actualCashback,
    totalCreditCardSpending,
    cashbackRate,
    byCard,
    cardBreakdown,
    insights,
  };
};

/**
 * Calculate food expense metrics
 */
export const calculateFoodMetrics = (transactions) => {
  if (!transactions || transactions.length === 0) {
    return {
      totalFood: 0,
      totalFoodSpending: 0,
      monthlyAverage: 0,
      dailyAverage: 0,
      deliveryApps: 0,
      groceries: 0,
      diningOut: 0,
      officeCafeteria: 0,
      bySubcategory: {},
      breakdown: [],
      monthlyTrends: [],
      insights: [],
    };
  }

  const foodTransactions = transactions.filter((t) => {
    if (t.type !== "Expense") {
      return false;
    }
    const category = (t.category || "").toLowerCase();
    return category.includes("food") || category.includes("drink");
  });

  const totalFood = foodTransactions.reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);

  const dateRange = calculateDateRange(foodTransactions);
  const monthlyAverage = calculateMonthlyAverage(totalFood, dateRange.days);
  const dailyAverage = calculateDailyAverage(totalFood, dateRange.days);

  const bySubcategory = foodTransactions.reduce((acc, t) => {
    const sub = t.subcategory || t.Subcategory || "Other";
    if (!acc[sub]) {
      acc[sub] = { total: 0, count: 0 };
    }
    acc[sub].total += Math.abs(Number(t.amount) || 0);
    acc[sub].count++;
    return acc;
  }, {});

  // Extract specific categories with case-insensitive matching
  let deliveryApps = 0;
  let groceries = 0;
  let diningOut = 0;
  let officeCafeteria = 0;

  Object.entries(bySubcategory).forEach(([key, value]) => {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes("delivery") ||
      lowerKey.includes("swiggy") ||
      lowerKey.includes("zomato")
    ) {
      deliveryApps += value.total;
    }
    if (lowerKey.includes("grocer") || lowerKey.includes("supermarket")) {
      groceries += value.total;
    }
    if (lowerKey.includes("dining") || lowerKey.includes("restaurant")) {
      diningOut += value.total;
    }
    if (lowerKey.includes("cafeteria") || lowerKey.includes("canteen")) {
      officeCafeteria += value.total;
    }
  });

  // Create breakdown array for charts
  const breakdown = Object.entries(bySubcategory).map(([name, data]) => ({
    name,
    amount: data.total,
    total: data.total,
    count: data.count,
  }));

  // Calculate monthly trends
  const monthlyData = {};
  foodTransactions.forEach((t) => {
    const month = new Date(t.date).toISOString().slice(0, 7);
    if (!monthlyData[month]) {
      monthlyData[month] = { total: 0, count: 0 };
    }
    monthlyData[month].total += Math.abs(Number(t.amount) || 0);
    monthlyData[month].count++;
  });

  const monthlyTrends = Object.entries(monthlyData)
    .map(([month, data]) => ({
      month,
      total: data.total,
      count: data.count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const insights = [];
  const sortedBreakdown = [...breakdown].sort((a, b) => b.amount - a.amount);
  const topSubcategory = sortedBreakdown[0];

  if (topSubcategory) {
    insights.push({
      title: "Top Food Category",
      message: `${topSubcategory.name}: R$${topSubcategory.amount.toLocaleString()}`,
      priority: "info",
    });
  }

  return {
    totalFood,
    totalFoodSpending: totalFood,
    monthlyAverage,
    dailyAverage,
    deliveryApps,
    groceries,
    diningOut,
    officeCafeteria,
    bySubcategory,
    breakdown,
    monthlyTrends,
    insights,
  };
};

/**
 * Calculate commute expense metrics
 */
export const calculateCommuteMetrics = (transactions) => {
  if (!transactions || transactions.length === 0) {
    return {
      totalCommute: 0,
      totalTransportation: 0,
      monthlyAverage: 0,
      dailyAverage: 0,
      dailyCommute: 0,
      intercityTravel: 0,
      byMode: {},
      breakdown: [],
      insights: [],
    };
  }

  const commuteTransactions = transactions.filter((t) => {
    if (t.type !== "Expense") {
      return false;
    }
    const category = (t.category || "").toLowerCase();
    return (
      category.includes("transport") || category.includes("commute") || category.includes("travel")
    );
  });

  const totalCommute = commuteTransactions.reduce(
    (sum, t) => sum + Math.abs(Number(t.amount) || 0),
    0
  );

  const dateRange = calculateDateRange(commuteTransactions);
  const monthlyAverage = calculateMonthlyAverage(totalCommute, dateRange.days);
  const dailyAverage = calculateDailyAverage(totalCommute, dateRange.days);

  const byMode = commuteTransactions.reduce((acc, t) => {
    const mode = t.subcategory || t.Subcategory || "Other";
    if (!acc[mode]) {
      acc[mode] = { total: 0, count: 0 };
    }
    acc[mode].total += Math.abs(Number(t.amount) || 0);
    acc[mode].count++;
    return acc;
  }, {});

  // Extract specific categories with case-insensitive matching
  let dailyCommute = 0;
  let intercityTravel = 0;

  Object.entries(byMode).forEach(([key, value]) => {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes("daily") ||
      lowerKey.includes("auto") ||
      lowerKey.includes("metro") ||
      lowerKey.includes("bus") ||
      lowerKey.includes("cab") ||
      lowerKey.includes("taxi") ||
      lowerKey.includes("uber") ||
      lowerKey.includes("ola")
    ) {
      dailyCommute += value.total;
    }
    if (
      lowerKey.includes("intercity") ||
      lowerKey.includes("train") ||
      lowerKey.includes("flight") ||
      lowerKey.includes("railway")
    ) {
      intercityTravel += value.total;
    }
  });

  // Create breakdown array for charts
  const breakdown = Object.entries(byMode).map(([name, data]) => ({
    name,
    total: data.total,
    amount: data.total,
    count: data.count,
    average: data.count > 0 ? data.total / data.count : 0,
    percentage: totalCommute > 0 ? (data.total / totalCommute) * PERCENT : 0,
  }));

  const insights = [];
  const sortedBreakdown = [...breakdown].sort((a, b) => b.amount - a.amount);
  const topMode = sortedBreakdown[0];

  if (topMode) {
    insights.push({
      title: "Primary Transport Mode",
      message: `${topMode.name}: R$${topMode.amount.toLocaleString()}`,
      priority: "info",
    });
  }

  return {
    totalCommute,
    totalTransportation: totalCommute,
    monthlyAverage,
    dailyAverage,
    dailyCommute,
    intercityTravel,
    byMode,
    breakdown,
    insights,
  };
};

// ============================================================================
// FORMAT UTILITIES
// ============================================================================

/**
 * Format number with decimals
 */
export const formatNumber = (number, decimals = 2) => {
  return number.toFixed(decimals);
};

/**
 * Format percentage
 */
export const formatPercentage = (value, decimals = 1) => {
  return `${value.toFixed(decimals)}%`;
};
