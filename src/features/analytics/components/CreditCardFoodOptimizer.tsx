/* eslint-disable @typescript-eslint/no-explicit-any */
import { CreditCard, TrendingUp, UtensilsCrossed } from "lucide-react";
import { useMemo } from "react";
import {
  calculateCashbackMetrics,
  calculateCommuteMetrics,
  calculateFoodMetrics,
} from "../../../lib/calculations/financial";
import type { CardBreakdown, Transaction } from "../../../types";
import { CashbackSection } from "./CashbackSection";
import { CommuteSection } from "./CommuteSection";
import { FoodSpendingSection } from "./FoodSpendingSection";

interface CreditCardFoodOptimizerProps {
  filteredData: Transaction[];
}

/**
 * Credit Card & Lifestyle Optimizer
 * Main coordinator component - delegates to sub-components
 */
const CreditCardFoodOptimizer = ({ filteredData }: CreditCardFoodOptimizerProps) => {
  // Calculate metrics using useMemo for performance
  const creditCardData = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = calculateCashbackMetrics(filteredData) as any;
    const normalizedBreakdown: CardBreakdown[] = (raw.cardBreakdown || raw.breakdown || []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (item: any) => {
        const spending = item.spending ?? item.total ?? 0;
        const cashback = item.cashback ?? 0;
        const computedRate = spending > 0 ? (cashback / spending) * 100 : 0;
        return {
          card: item.card || item.name || "Card",
          spending,
          cashback,
          cashbackRate: item.cashbackRate ?? item.rate ?? computedRate,
        };
      }
    );
    const totalCreditCardSpending = normalizedBreakdown.reduce(
      (sum, item) => sum + (item.spending || 0),
      0
    );
    return {
      totalCreditCardSpending,
      totalCashbackEarned: raw.totalCashbackEarned || 0,
      cashbackShared: raw.cashbackShared || 0,
      actualCashback: raw.actualCashback || 0,
      cashbackRate: raw.cashbackRate || 0,
      byCard: raw.byCard || {},
      cardBreakdown: normalizedBreakdown,
      insights: raw.insights || [],
    };
  }, [filteredData]);

  const foodData = useMemo(() => {
    const data = calculateFoodMetrics(filteredData);
    return {
      totalFood: data.totalFood || 0,
      totalFoodSpending: data.totalFoodSpending || 0,
      monthlyAverage: data.monthlyAverage || 0,
      dailyAverage: data.dailyAverage || 0,
      deliveryApps: data.deliveryApps || 0,
      groceries: data.groceries || 0,
      diningOut: data.diningOut || 0,
      officeCafeteria: data.officeCafeteria || 0,
      bySubcategory: data.bySubcategory || {},
      breakdown: data.breakdown || [],
      monthlyTrends: data.monthlyTrends || [],
      insights: data.insights || [],
    };
  }, [filteredData]);

  const commuteData = useMemo(() => {
    const data = calculateCommuteMetrics(filteredData);
    return {
      totalCommute: data.totalCommute || 0,
      totalTransportation: data.totalTransportation || 0,
      monthlyAverage: data.monthlyAverage || 0,
      dailyAverage: data.dailyAverage || 0,
      dailyCommute: data.dailyCommute || 0,
      intercityTravel: data.intercityTravel || 0,
      byMode: data.byMode || {},
      breakdown: data.breakdown || [],
      insights: data.insights || [],
    };
  }, [filteredData]);

  // Prepare chart data
  const cardChartData = useMemo(
    () => ({
      labels: creditCardData.cardBreakdown.map((c: CardBreakdown) =>
        c.card.replace(" Credit Card", "")
      ),
      datasets: [
        {
          data: creditCardData.cardBreakdown.map((c: CardBreakdown) => c.spending),
          backgroundColor: ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"],
          borderColor: "#1f2937",
          borderWidth: 3,
        },
      ],
    }),
    [creditCardData.cardBreakdown]
  );

  const foodChartData = useMemo(
    () => ({
      labels: foodData.breakdown.map((b) => b.name),
      datasets: [
        {
          data: foodData.breakdown.map((b) => b.total),
          backgroundColor: ["#10b981", "#f59e0b", "#8b5cf6", "#3b82f6", "#ec4899"],
          borderColor: "#1f2937",
          borderWidth: 3,
        },
      ],
    }),
    [foodData.breakdown]
  );

  const foodTrendsData = useMemo(
    () => ({
      labels: foodData.monthlyTrends.map((t) => t.month),
      datasets: [
        {
          label: "Gastos Mensais com Alimentação",
          data: foodData.monthlyTrends.map((t) => t.total),
          borderColor: "rgb(34, 197, 94)",
          backgroundColor: "rgba(34, 197, 94, 0.1)",
          tension: 0.4,
          fill: true,
        },
      ],
    }),
    [foodData.monthlyTrends]
  );

  // Chart options
  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: "#fff" },
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const label = context.label || context.dataset?.label || "";
              const value = context.parsed.y === undefined ? context.parsed : context.parsed.y;
              return `${label}: R$${value.toLocaleString("pt-BR", {
                maximumFractionDigits: 0,
              })}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: "#9ca3af" },
          grid: { color: "rgba(75, 85, 99, 0.3)" },
        },
        y: {
          ticks: {
            color: "#9ca3af",
            callback: (value: string | number) => `R$${(Number(value) / 1000).toFixed(0)}k`,
          },
          grid: { color: "rgba(75, 85, 99, 0.3)" },
        },
      },
    }),
    []
  );

  const doughnutOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom" as const,
          labels: { color: "#fff", padding: 15 },
        },
        tooltip: {
          callbacks: {
            label: (context: { label?: string; parsed: number }) => {
              const label = context.label || "";
              const value = context.parsed;
              return `${label}: R$${value.toLocaleString("pt-BR", {
                maximumFractionDigits: 0,
              })}`;
            },
          },
        },
      },
    }),
    []
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 shadow-lg">
        <h2 className="text-2xl font-bold text-white mb-2">💳 Otimizador de Gastos com Estilo de Vida</h2>
        <p className="text-blue-100">Otimize cartões de crédito, gastos com alimentação e transporte</p>
      </div>

      {/* Cashback Section */}
      <CashbackSection
        creditCardData={creditCardData}
        cardChartData={cardChartData}
        doughnutOptions={doughnutOptions}
      />

      {/* Food Spending Section */}
      <FoodSpendingSection
        foodData={foodData}
        foodChartData={foodChartData}
        foodTrendsData={foodTrendsData}
        chartOptions={chartOptions}
        doughnutOptions={doughnutOptions}
      />

      {/* Commute Section */}
      <CommuteSection commuteData={commuteData} chartOptions={chartOptions} />

      {/* Optimization Recommendations */}
      <OptimizationTips
        foodData={foodData}
        creditCardData={creditCardData}
        commuteData={commuteData}
      />
    </div>
  );
};

interface OptimizationTipsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  foodData: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  creditCardData: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  commuteData: any;
}

/**
 * Optimization Tips Component
 */
const OptimizationTips = ({ foodData, creditCardData, commuteData }: OptimizationTipsProps) => (
  <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-xl p-6 shadow-lg border border-purple-700/50">
    <h3 className="text-xl font-bold text-white mb-4">💡 Dicas de Otimização</h3>
    <div className="space-y-3">
      {foodData.deliveryApps > foodData.groceries && (
        <div className="flex items-start gap-3 bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
          <UtensilsCrossed className="text-orange-400 mt-0.5" size={20} />
          <div>
            <p className="text-orange-300 font-medium">Reduza o Uso de Apps de Delivery</p>
            <p className="text-orange-200/80 text-sm mt-1">
              Você está gastando R$
              {(foodData.deliveryApps - foodData.groceries).toLocaleString("pt-BR")} a mais em
              apps de delivery do que em supermercado. Cozinhar em casa pode economizar R$
              {((foodData.deliveryApps - foodData.groceries) * 0.6).toLocaleString("pt-BR", {
                maximumFractionDigits: 0,
              })}{" "}
              por mês.
            </p>
          </div>
        </div>
      )}

      {creditCardData.cashbackRate < 2 && creditCardData.totalCreditCardSpending > 50000 && (
        <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <CreditCard className="text-blue-400 mt-0.5" size={20} />
          <div>
            <p className="text-blue-300 font-medium">Otimize as Recompensas do Cartão de Crédito</p>
            <p className="text-blue-200/80 text-sm mt-1">
              Sua taxa de cashback é de {creditCardData.cashbackRate.toFixed(2)}%. Considere cartões
              com recompensas maiores (3-5%) para ganhar R$
              {(
                creditCardData.totalCreditCardSpending * 0.03 -
                creditCardData.totalCashback
              ).toLocaleString("pt-BR", {
                maximumFractionDigits: 0,
              })}{" "}
              a mais em cashback.
            </p>
          </div>
        </div>
      )}

      {commuteData.dailyCommute > 30000 && (
        <div className="flex items-start gap-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
          <TrendingUp className="text-cyan-400 mt-0.5" size={20} />
          <div>
            <p className="text-cyan-300 font-medium">Considere um Passe Mensal ou Bicicleta</p>
            <p className="text-cyan-200/80 text-sm mt-1">
              Você gastou R${commuteData.dailyCommute.toLocaleString("pt-BR")} com transporte diário.
              Um passe mensal ou uma bicicleta pode economizar dinheiro a longo prazo.
            </p>
          </div>
        </div>
      )}
    </div>
  </div>
);

export { CreditCardFoodOptimizer };
