/**
 * Trend Insights Generator
 * Automatically detects patterns and generates actionable insights
 */

import type {
  ComprehensiveInsights,
  DayPatterns,
  Insight,
  SeasonalData,
  Transaction,
} from "../../types";
import { getMonthKey } from "../data";
import { detectOutliers, detectSeasonality } from "./forecasts";

/**
 * Analyze spending patterns by day of week
 * @param transactions - Transaction data
 * @returns Day of week analysis
 */
export const analyzeDayOfWeekPatterns = (transactions: Transaction[]): DayPatterns | null => {
  if (!transactions || transactions.length === 0) {
    return null;
  }

  const expenses = transactions.filter((t) => t.type === "Expense" && t.category !== "In-pocket");

  const dayNames = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

  const dayData = dayNames.map(() => ({ total: 0, count: 0 }));

  expenses.forEach((t) => {
    const dayOfWeek = new Date(t.date).getDay();
    dayData[dayOfWeek].total += Math.abs(t.amount || 0);
    dayData[dayOfWeek].count += 1;
  });

  const totalSpending = dayData.reduce((sum, d) => sum + d.total, 0);
  const avgDaily = totalSpending / 7;

  const insights: Insight[] = [];

  // Find highest spending day
  const maxDay = dayData.reduce((max, d, i) => (d.total > dayData[max].total ? i : max), 0);
  const maxDayPercent = ((dayData[maxDay].total / totalSpending) * 100).toFixed(0);

  if (dayData[maxDay].total > avgDaily * 1.5) {
    insights.push({
      type: "pattern" as const,
      priority: "medium" as const,
      title: `${dayNames[maxDay]} é o Seu Dia de Pico de Gastos`,
      message: `Você gasta ${maxDayPercent}% a mais ${dayNames[maxDay] === "Sábado" || dayNames[maxDay] === "Domingo" ? "aos" : "às"} ${dayNames[maxDay]}s em relação à média (R$${dayData[maxDay].total.toLocaleString("pt-BR")})`,
      action: "Considere preparar refeições com antecedência ou evitar compras nesse dia",
    });
  }

  // Weekend vs Weekday comparison
  const weekendTotal = dayData[0].total + dayData[6].total;
  const weekdayTotal = dayData.slice(1, 6).reduce((sum, d) => sum + d.total, 0);
  const weekendAvg = weekendTotal / 2;
  const weekdayAvg = weekdayTotal / 5;

  if (weekendAvg > weekdayAvg * 1.3) {
    const difference = ((weekendAvg / weekdayAvg - 1) * 100).toFixed(0);
    insights.push({
      type: "pattern" as const,
      priority: "high" as const,
      title: "Pico de Gastos no Fim de Semana Detectado",
      message: `Os gastos de fim de semana são ${difference}% maiores que em dias úteis (R$${weekendAvg.toLocaleString("pt-BR")} vs R$${weekdayAvg.toLocaleString("pt-BR")})`,
      action: "Planeje o orçamento ou as atividades de fim de semana para controlar os gastos",
    });
  }

  return {
    dayData: dayData.map((d, i) => ({
      day: dayNames[i],
      total: d.total,
      count: d.count,
      average: d.count > 0 ? d.total / d.count : 0,
    })),
    insights,
    weekendAvg,
    weekdayAvg,
  };
};

/**
 * Detect spending anomalies
 * @param {Array} transactions - Transaction data
 * @returns {Array} Anomaly insights
 */
export const detectSpendingAnomalies = (transactions: Transaction[]): Insight[] => {
  if (!transactions || transactions.length === 0) {
    return [];
  }

  const insights: Insight[] = [];
  const expenses = transactions.filter((t) => t.type === "Expense" && t.category !== "In-pocket");

  // Group by month
  const monthlyData: Record<string, { total: number; byCategory: Record<string, number> }> = {};
  expenses.forEach((t) => {
    const month = getMonthKey(t.date);
    if (!monthlyData[month]) {
      monthlyData[month] = { total: 0, byCategory: {} };
    }
    monthlyData[month].total += Math.abs(t.amount || 0);

    if (!monthlyData[month].byCategory[t.category]) {
      monthlyData[month].byCategory[t.category] = 0;
    }
    monthlyData[month].byCategory[t.category] += Math.abs(t.amount || 0);
  });

  const months = Object.keys(monthlyData).sort((a, b) => a.localeCompare(b));
  if (months.length < 3) {
    return insights;
  }

  // Check overall spending anomalies
  const monthlyTotals = months.map((m) => monthlyData[m].total);
  const { outliers } = detectOutliers(monthlyTotals);

  outliers.forEach(({ index }) => {
    const month = months[index];
    const amount = monthlyData[month].total;
    const avg = monthlyTotals.reduce((a, b) => a + b, 0) / monthlyTotals.length;
    const percentDiff = (((amount - avg) / avg) * 100).toFixed(0);

    const monthDate = new Date(`${month}-01`);
    const monthName = monthDate.toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });

    if (amount > avg) {
      insights.push({
        type: "anomaly" as const,
        priority: "high" as const,
        title: `Gasto Incomum em ${monthName}`,
        message: `O gasto foi ${percentDiff}% maior que a média (R$${amount.toLocaleString("pt-BR")} vs R$${avg.toLocaleString("pt-BR")})`,
        action: "Revise as despesas grandes nesse mês",
      });
    }
  });

  // Check category-level anomalies in recent months
  const recentMonths = months.slice(-3);
  const allCategories = new Set<string>();
  expenses.forEach((t) => {
    allCategories.add(t.category);
  });

  allCategories.forEach((category: string) => {
    const categoryData = months.map((m) => monthlyData[m].byCategory[category] || 0);
    const recentAvg =
      recentMonths.reduce((sum, m) => sum + (monthlyData[m].byCategory[category] || 0), 0) /
      recentMonths.length;
    const historicalAvg = categoryData.reduce((a, b) => a + b, 0) / categoryData.length;

    if (recentAvg > historicalAvg * 1.4 && recentAvg > 1000 && categoryData.length >= 3) {
      const increase = (((recentAvg - historicalAvg) / historicalAvg) * 100).toFixed(0);
      insights.push({
        type: "trend" as const,
        priority: "medium" as const,
        title: `Gastos com ${category} em Alta`,
        message: `A média dos últimos 3 meses está ${increase}% maior (R$${recentAvg.toLocaleString("pt-BR")} vs R$${historicalAvg.toLocaleString("pt-BR")})`,
        action: `Revise as despesas de ${category} e identifique custos desnecessários`,
      });
    }
  });

  return insights;
};

/**
 * Analyze seasonal patterns and generate insights
 * @param {Array} transactions - Transaction data
 * @returns {Object} Seasonal analysis
 */
export const analyzeSeasonalPatterns = (transactions: Transaction[]): SeasonalData | null => {
  if (!transactions || transactions.length === 0) {
    return null;
  }

  const insights: Insight[] = [];
  const expenses = transactions.filter((t) => t.type === "Expense" && t.category !== "In-pocket");

  // Group by month
  const monthlyData: Record<string, number> = {};
  expenses.forEach((t) => {
    const month = getMonthKey(t.date);
    monthlyData[month] = (monthlyData[month] || 0) + Math.abs(t.amount || 0);
  });

  const seasonalAnalysis = detectSeasonality(monthlyData);

  if (seasonalAnalysis.hasSeasonality) {
    // Find peak months
    const monthNames = [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro",
    ];

    const peakMonths = Object.entries(seasonalAnalysis.indices)
      .filter(([, index]) => index > 1.2)
      .map(([month, index]) => ({
        month: monthNames[Number.parseInt(month, 10) - 1],
        index,
        percent: ((index - 1) * 100).toFixed(0),
      }))
      .sort((a, b) => b.index - a.index);

    if (peakMonths.length > 0) {
      const topPeak = peakMonths[0];
      insights.push({
        type: "seasonal" as const,
        priority: "high" as const,
        title: `${topPeak.month} Tem Historicamente Gastos Altos`,
        message: `Os gastos costumam ficar ${topPeak.percent}% acima da média em ${topPeak.month}`,
        action: `Reserve R$${((seasonalAnalysis.overallAverage || 0) * topPeak.index).toLocaleString("pt-BR")} para ${topPeak.month}`,
      });
    }

    // Find low months (savings opportunities)
    const lowMonths = Object.entries(seasonalAnalysis.indices)
      .filter(([, index]) => index < 0.8)
      .map(([month, index]) => ({
        month: monthNames[Number.parseInt(month, 10) - 1],
        index,
        percent: ((1 - index) * 100).toFixed(0),
      }))
      .sort((a, b) => a.index - b.index);

    if (lowMonths.length > 0) {
      const topLow = lowMonths[0];
      insights.push({
        type: "seasonal" as const,
        priority: "low" as const,
        title: `${topLow.month} Tem Gastos Mais Baixos`,
        message: `Historicamente ${topLow.percent}% abaixo da média - bom para poupar`,
        action: "Considere poupar mais ou quitar dívidas nesse mês",
      });
    }
  }

  return {
    ...seasonalAnalysis,
    insights,
  };
};

/**
 * Generate budget forecast alerts
 * @param {Array} transactions - Transaction data
 * @param {Object} budgets - User budgets by category
 * @returns {Array} Budget forecast alerts
 */
export const generateBudgetForecastAlerts = (
  transactions: Transaction[],
  budgets: Record<string, number>
): any[] => {
  if (!transactions || transactions.length === 0 || !budgets || Object.keys(budgets).length === 0) {
    return [];
  }

  const insights: any[] = [];
  const currentMonth = getMonthKey(new Date());
  const currentMonthExpenses = transactions.filter(
    (t) =>
      t.type === "Expense" && t.category !== "In-pocket" && getMonthKey(t.date) === currentMonth
  );

  // Group current month by category
  const categorySpending: Record<string, number> = {};
  currentMonthExpenses.forEach((t) => {
    categorySpending[t.category] = (categorySpending[t.category] || 0) + Math.abs(t.amount || 0);
  });

  // Get current day of month
  const today = new Date();
  const currentDay = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysRemaining = daysInMonth - currentDay;
  const monthProgress = currentDay / daysInMonth;

  Object.entries(budgets).forEach(([category, budget]) => {
    const spent = categorySpending[category] || 0;
    const remaining = budget - spent;
    const projectedSpending = monthProgress > 0 ? spent / monthProgress : spent;
    const projectedOverrun = projectedSpending - budget;

    if (projectedOverrun > 0 && daysRemaining > 0) {
      const overrunPercent = ((projectedOverrun / budget) * 100).toFixed(0);
      insights.push({
        type: "budget-alert" as const,
        priority: "high" as const,
        title: `Orçamento de ${category} em Risco`,
        message: `No ritmo atual, o orçamento será estourado em R$${projectedOverrun.toLocaleString("pt-BR")} (${overrunPercent}%)`,
        action: `Reduza o gasto diário para R$${(remaining / daysRemaining).toLocaleString("pt-BR")} ou menos`,
      });
    } else if (spent > budget * 0.8 && spent < budget) {
      insights.push({
        type: "budget-warning" as const,
        priority: "medium" as const,
        title: `Orçamento de ${category} com 80% Utilizado`,
        message: `Restam R$${remaining.toLocaleString("pt-BR")} para ${daysRemaining} dias`,
        action: `Limite-se a R$${(remaining / daysRemaining).toLocaleString("pt-BR")}/dia`,
      });
    }
  });

  return insights;
};

/**
 * Comprehensive insights generation
 * @param {Array} transactions - All transactions
 * @param {Object} budgets - User budgets
 * @returns {Object} All insights categorized
 */
export const generateComprehensiveInsights = (
  transactions: Transaction[],
  budgets: Record<string, number> = {}
): ComprehensiveInsights => {
  const dayPatterns = analyzeDayOfWeekPatterns(transactions);
  const anomalies = detectSpendingAnomalies(transactions);
  const seasonal = analyzeSeasonalPatterns(transactions);
  const budgetAlerts = generateBudgetForecastAlerts(transactions, budgets);

  // Combine all insights
  const allInsights: Insight[] = [
    ...(dayPatterns?.insights || []),
    ...anomalies,
    ...(seasonal?.insights || []),
    ...budgetAlerts,
  ];

  // Sort by priority
  const priorityOrder: Record<string, number> = { high: 1, medium: 2, low: 3 };
  allInsights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return {
    all: allInsights,
    byType: {
      pattern: allInsights.filter((i) => i.type === "pattern"),
      anomaly: allInsights.filter((i) => i.type === "anomaly"),
      trend: allInsights.filter((i) => i.type === "trend"),
      seasonal: allInsights.filter((i) => i.type === "seasonal"),
      budgetAlert: allInsights.filter(
        (i) => i.type === "budget-alert" || i.type === "budget-warning"
      ),
    },
    byPriority: {
      high: allInsights.filter((i) => i.priority === "high"),
      medium: allInsights.filter((i) => i.priority === "medium"),
      low: allInsights.filter((i) => i.priority === "low"),
    },
    dayPatterns,
    seasonal,
  };
};
