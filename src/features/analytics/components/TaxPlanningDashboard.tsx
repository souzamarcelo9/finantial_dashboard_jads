/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ChartOptions as ChartJSOptions } from "chart.js";
import { AlertCircle, CheckCircle2, DollarSign, FileText, Shield, TrendingDown } from "lucide-react";
import { useMemo, useState } from "react";
import { Doughnut } from "react-chartjs-2";
import { calculateProjectedTax } from "../../../lib/analytics/taxPlanning";
import { calculateTaxPlanning } from "../../../lib/calculations/financial";
import type { ChartData, ComprehensiveTaxData, TaxProjection, Transaction } from "../../../types";

interface TaxPlanningDashboardProps {
  filteredData: Transaction[];
}

const createChartOptions = (): ChartJSOptions<"doughnut"> => ({
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
          return `${label}: R$${value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
        },
      },
    },
  },
});

interface HeaderProps {
  availableYears: string[];
  selectedYear: string;
  onYearChange: (value: string) => void;
  deductionMethodUsed: string;
}

const TaxDashboardHeader = ({
  availableYears,
  selectedYear,
  onYearChange,
  deductionMethodUsed,
}: HeaderProps) => (
  <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl p-6 shadow-lg">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">📋 Planejamento Tributário (IRPF)</h2>
        <p className="text-blue-100">
          Planeje seu Imposto de Renda, maximize deduções e otimize sua economia
        </p>
      </div>

      {availableYears.length > 0 && (
        <div className="flex items-center gap-2">
          <label htmlFor="year-select" className="text-white text-sm font-medium">
            Ano-calendário:
          </label>
          <select
            id="year-select"
            value={selectedYear}
            onChange={(e) => onYearChange(e.target.value)}
            className="bg-white/20 text-white rounded-lg px-4 py-2 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            <option value="overall" className="bg-gray-800">
              Geral (Todos os Anos)
            </option>
            {availableYears.map((year) => (
              <option key={year} value={year} className="bg-gray-800">
                {year}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
    <div className="mt-2 inline-block bg-white/20 rounded-full px-3 py-1 text-sm text-white">
      Método de dedução usado: {deductionMethodUsed === "simplified" ? "Desconto Simplificado (20%)" : "Deduções Legais"}
    </div>
  </div>
);

interface KeyMetricsProps {
  totalIncome: number;
  taxableIncome: number;
  totalTaxLiability: number;
  estimatedTax: number;
}

const KeyMetricsSection = ({
  totalIncome,
  taxableIncome,
  totalTaxLiability,
}: KeyMetricsProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-blue-100 text-sm font-medium">Renda Bruta Recebida</span>
        <DollarSign className="text-blue-200" size={24} />
      </div>
      <div className="text-3xl font-bold text-white">
        R${totalIncome.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
      </div>
      <div className="text-sm text-blue-100 mt-1">Como registrado nos lançamentos</div>
    </div>

    <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-orange-100 text-sm font-medium">Base de Cálculo</span>
        <FileText className="text-orange-200" size={24} />
      </div>
      <div className="text-3xl font-bold text-white">
        R${taxableIncome.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
      </div>
      <div className="text-sm text-orange-100 mt-1">Após deduções</div>
    </div>

    <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-red-100 text-sm font-medium">IRPF Estimado</span>
        <TrendingDown className="text-red-200" size={24} />
      </div>
      <div className="text-3xl font-bold text-white">
        R${totalTaxLiability.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
      </div>
      <div className="text-sm text-red-100 mt-1">Sobre a renda registrada</div>
    </div>

    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-green-100 text-sm font-medium">Renda Líquida (pós-IR)</span>
        <Shield className="text-green-200" size={24} />
      </div>
      <div className="text-3xl font-bold text-white">
        R$
        {(totalIncome - totalTaxLiability).toLocaleString("pt-BR", {
          maximumFractionDigits: 0,
        })}
      </div>
      <div className="text-sm text-green-100 mt-1">Valor líquido estimado</div>
    </div>
  </div>
);

const ImportantNote = () => (
  <div className="bg-yellow-900/30 border-yellow-500/50 border rounded-xl p-4 flex items-start gap-3">
    <AlertCircle className="text-yellow-400 flex-shrink-0 mt-0.5" size={20} />
    <div className="text-sm text-yellow-100">
      <strong className="text-yellow-300">Importante:</strong> os valores de renda mostrados são
      os registrados nos seus lançamentos. Se o seu salário já entra líquido de IR retido na
      fonte, o imposto real recolhido ao longo do ano pode ser diferente do calculado aqui.
      <span className="block mt-2 text-yellow-300 font-medium">
        💡 Para acompanhar o IR retido com precisão, adicione um lançamento de despesa com a
        subcategoria "IR Retido na Fonte" para cada mês de salário.
      </span>
    </div>
  </div>
);

interface ProjectedTaxProps {
  projectedTaxData: TaxProjection | null;
  totalIncome: number;
}

const ProjectedTaxSection = ({ projectedTaxData, totalIncome }: ProjectedTaxProps) => {
  if (!projectedTaxData || projectedTaxData.monthsRemaining <= 0) {
    return null;
  }

  const {
    avgMonthlySalary,
    monthsRemaining,
    projectedAnnualSalary,
    projectedTotalTax,
    currentTax,
    additionalTaxLiability,
  } = projectedTaxData;

  return (
    <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-xl p-6 shadow-lg border border-purple-700/50">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <TrendingDown className="text-purple-400" size={24} />
            Projeção de Fim de Ano
          </h3>
          <p className="text-purple-200 text-sm">
            Baseado na média dos últimos 3 meses, projetado para os próximos {monthsRemaining} mês(es)
          </p>
        </div>
        <div className="bg-purple-500/20 rounded-lg px-4 py-2">
          <div className="text-xs text-purple-300">Meses Restantes</div>
          <div className="text-2xl font-bold text-purple-400">{monthsRemaining}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-xs text-gray-400 mb-1">Salário Médio Mensal</div>
          <div className="text-lg font-bold text-white">
            R${avgMonthlySalary.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-gray-400 mt-1">(Últimos 3 meses)</div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-xs text-gray-400 mb-1">Renda Anual Projetada</div>
          <div className="text-lg font-bold text-blue-400">
            R${projectedAnnualSalary.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-green-400 mt-1">
            +R${(projectedAnnualSalary - totalIncome).toLocaleString("pt-BR", {
              maximumFractionDigits: 0,
            })}{" "}
            nos próximos {monthsRemaining} mês(es)
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-xs text-gray-400 mb-1">IR Total Projetado</div>
          <div className="text-lg font-bold text-orange-400">
            R${projectedTotalTax.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Atual: R${currentTax.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-xs text-gray-400 mb-1">IR Adicional a Provisionar</div>
          <div className="text-lg font-bold text-red-400">
            R${Math.max(0, additionalTaxLiability).toLocaleString("pt-BR", {
              maximumFractionDigits: 0,
            })}
          </div>
          <div className="text-xs text-yellow-400 mt-1">{monthsRemaining} meses restantes</div>
        </div>
      </div>

      <div className="mt-4 bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-yellow-400 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-yellow-200">
            <strong>Nota:</strong> esta projeção assume que os próximos {monthsRemaining} mês(es)
            terão salário próximo da média dos últimos 3 meses. O imposto real pode variar
            conforme bônus, deduções e outras fontes de renda.
            {additionalTaxLiability > 0 && (
              <span className="block mt-2">
                💡 <strong>Dica:</strong> considere guardar R$
                {Math.ceil(additionalTaxLiability / monthsRemaining).toLocaleString("pt-BR")} por
                mês nos próximos {monthsRemaining} mês(es) para cobrir o imposto projetado.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface ChartSectionProps {
  incomeChartData: ChartData;
  deductionsChartData: ChartData;
  chartOptions: ChartJSOptions<"doughnut">;
  salaryIncome: number;
  bonusIncome: number;
  otherIncome: number;
  totalIncome: number;
  taxableIncome: number;
  estimatedTax: number;
}

const ChartsSection = ({
  incomeChartData,
  deductionsChartData,
  chartOptions,
  salaryIncome,
  bonusIncome,
  otherIncome,
  totalIncome,
  taxableIncome,
  estimatedTax,
}: ChartSectionProps) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700">
      <h3 className="text-xl font-bold text-white mb-4">Composição da Renda</h3>
      <div style={{ height: "300px" }}>
        <Doughnut data={incomeChartData} options={chartOptions} />
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-300">Salário:</span>
          <span className="text-white font-medium">
            R${salaryIncome.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-300">Bônus / 13º:</span>
          <span className="text-white font-medium">
            R${bonusIncome.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-300">Outras Rendas:</span>
          <span className="text-white font-medium">
            R${otherIncome.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>
    </div>

    <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700">
      <h3 className="text-xl font-bold text-white mb-4">Imposto e Deduções</h3>
      <div style={{ height: "300px" }}>
        <Doughnut data={deductionsChartData} options={chartOptions} />
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-300">Total de Deduções:</span>
          <span className="text-green-400 font-medium">
            R${(totalIncome - taxableIncome).toLocaleString("pt-BR", {
              maximumFractionDigits: 0,
            })}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-300">Imposto Devido:</span>
          <span className="text-red-400 font-medium">
            R${estimatedTax.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>
    </div>
  </div>
);

interface DeductionItem {
  name: string;
  amount: number;
  utilized?: boolean;
  remaining?: number;
  limit?: number;
}

const DeductionsSection = ({ deductions }: { deductions: DeductionItem[] }) => (
  <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700">
    <h3 className="text-xl font-bold text-white mb-4">Deduções do IRPF</h3>
    <div className="space-y-4">
      {deductions.map((deduction) => (
        <div key={deduction.name} className="bg-gray-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              {deduction.utilized ? (
                <CheckCircle2 className="text-green-400" size={20} />
              ) : (
                <AlertCircle className="text-gray-400" size={20} />
              )}
              <span className="text-white font-medium">{deduction.name}</span>
            </div>
            <span className="text-2xl font-bold text-green-400">
              R${deduction.amount.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
            </span>
          </div>
          {deduction.limit ? (
            <div className="mt-2">
              <div className="flex justify-between text-sm text-gray-300 mb-1">
                <span>
                  Utilizado: R$
                  {(deduction.limit - (deduction.remaining || 0)).toLocaleString("pt-BR", {
                    maximumFractionDigits: 0,
                  })}
                </span>
                <span>
                  Restante: R${(deduction.remaining || 0).toLocaleString("pt-BR", {
                    maximumFractionDigits: 0,
                  })}
                </span>
              </div>
              <div className="w-full bg-gray-600 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{
                    width: `${((deduction.limit - (deduction.remaining || 0)) / deduction.limit) * 100}%`,
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  </div>
);

const IrpfBracketsTable = ({ taxableIncome }: { taxableIncome: number }) => {
  const brackets = [
    { label: "Até R$29.145,60", rate: "Isento", min: 0, max: 29145.6, rateNum: 0, deduction: 0 },
    {
      label: "R$29.145,61 – R$33.919,80",
      rate: "7,5%",
      min: 29145.6,
      max: 33919.8,
      rateNum: 0.075,
      deduction: 2185.92,
    },
    {
      label: "R$33.919,81 – R$45.012,60",
      rate: "15%",
      min: 33919.8,
      max: 45012.6,
      rateNum: 0.15,
      deduction: 4729.92,
    },
    {
      label: "R$45.012,61 – R$55.976,16",
      rate: "22,5%",
      min: 45012.6,
      max: 55976.16,
      rateNum: 0.225,
      deduction: 8105.88,
    },
    {
      label: "Acima de R$55.976,16",
      rate: "27,5%",
      min: 55976.16,
      max: Infinity,
      rateNum: 0.275,
      deduction: 10904.76,
    },
  ];

  return (
    <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700">
      <h3 className="text-xl font-bold text-white mb-1">Tabela Progressiva Anual do IRPF (2026)</h3>
      <p className="text-gray-400 text-sm mb-4">
        Tabela oficial da Receita Federal, já considerando a redução da Lei nº 15.270/2025
      </p>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left text-gray-300 py-3 px-4">Faixa de Renda Anual</th>
              <th className="text-center text-gray-300 py-3 px-4">Alíquota</th>
              <th className="text-right text-gray-300 py-3 px-4">Seu Imposto na Faixa</th>
            </tr>
          </thead>
          <tbody>
            {brackets.map((b) => {
              const taxInBracket =
                taxableIncome > b.min
                  ? Math.max(
                      0,
                      Math.min(taxableIncome, b.max === Infinity ? taxableIncome : b.max) *
                        b.rateNum -
                        b.deduction -
                        (taxableIncome > b.max ? 0 : 0)
                    )
                  : 0;
              return (
                <tr key={b.label} className="border-b border-gray-700/50">
                  <td className="py-3 px-4 text-gray-300">{b.label}</td>
                  <td className="py-3 px-4 text-center text-gray-300">{b.rate}</td>
                  <td className="py-3 px-4 text-right text-gray-300">
                    {taxableIncome > b.min
                      ? `R$${taxInBracket.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500 mt-3">
        Renda anual até R$60.000,00 é isenta de IRPF (Lei nº 15.270/2025). Entre R$60.000,01 e
        R$88.200,00/ano o imposto é reduzido gradualmente.
      </p>
    </div>
  );
};

const RecommendationsSection = ({
  recommendations,
}: {
  recommendations: Array<{
    priority?: string;
    message: string;
    action: string;
  }>;
}) => {
  if (!recommendations.length) {
    return null;
  }

  const priorityStyles: Record<
    string,
    { container: string; icon: string; title: string; message: string }
  > = {
    high: {
      container: "bg-red-500/10 border-red-500/30",
      icon: "text-red-400",
      title: "text-red-300",
      message: "text-red-200/80",
    },
    medium: {
      container: "bg-yellow-500/10 border-yellow-500/30",
      icon: "text-yellow-400",
      title: "text-yellow-300",
      message: "text-yellow-200/80",
    },
    default: {
      container: "bg-blue-500/10 border-blue-500/30",
      icon: "text-blue-400",
      title: "text-blue-300",
      message: "text-blue-200/80",
    },
  };

  return (
    <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 rounded-xl p-6 shadow-lg border border-blue-700/50">
      <h3 className="text-xl font-bold text-white mb-4">💡 Recomendações para Economizar Imposto</h3>
      <div className="space-y-3">
        {recommendations.map((rec) => {
          const styles = priorityStyles[rec.priority ?? ""] ?? priorityStyles.default;

          return (
            <div
              key={rec.message}
              className={`flex items-start gap-3 rounded-lg p-4 border ${styles.container}`}
            >
              <AlertCircle className={styles.icon} size={20} />
              <div>
                <p className={`font-medium ${styles.title}`}>{rec.action}</p>
                <p className={`text-sm mt-1 ${styles.message}`}>{rec.message}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ImportantNotesSection = () => (
  <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700">
    <h3 className="text-xl font-bold text-white mb-4">📌 Observações Importantes</h3>
    <ul className="space-y-2 text-gray-300">
      <li className="flex items-start gap-2">
        <span className="text-blue-400 mt-1">•</span>
        <span>Esta é uma estimativa baseada na tabela progressiva do IRPF vigente em 2026</span>
      </li>
      <li className="flex items-start gap-2">
        <span className="text-blue-400 mt-1">•</span>
        <span>
          O sistema escolhe automaticamente entre o Desconto Simplificado (20%, até
          R$17.640,00/ano) e as Deduções Legais (INSS, dependentes, saúde, educação, previdência
          privada, pensão), usando sempre o método que resulta em menos imposto — como a Receita
          Federal recomenda
        </span>
      </li>
      <li className="flex items-start gap-2">
        <span className="text-blue-400 mt-1">•</span>
        <span>Renda anual até R$60.000,00 é isenta de IRPF, conforme a Lei nº 15.270/2025</span>
      </li>
      <li className="flex items-start gap-2">
        <span className="text-blue-400 mt-1">•</span>
        <span>Despesas com saúde não têm limite legal de dedução</span>
      </li>
      <li className="flex items-start gap-2">
        <span className="text-blue-400 mt-1">•</span>
        <span>Consulte um(a) contador(a) para a declaração e o planejamento tributário definitivos</span>
      </li>
    </ul>
  </div>
);

export const TaxPlanningDashboard = ({ filteredData }: TaxPlanningDashboardProps) => {
  const taxPlanningData = useMemo(() => {
    return calculateTaxPlanning(filteredData);
  }, [filteredData]);

  const { overall, byFinancialYear, availableYears } = taxPlanningData;

  const [selectedYear, setSelectedYear] = useState<string>("overall");

  const taxData: ComprehensiveTaxData =
    selectedYear === "overall"
      ? overall
      : (byFinancialYear as Record<string, any>)[selectedYear] || overall;

  const {
    totalIncome = 0,
    salaryIncome = 0,
    bonusIncome = 0,
    otherIncome = 0,
    taxableIncome = 0,
    estimatedTax = 0,
    totalTaxLiability = 0,
    deductions = [],
    recommendations = [],
    itemizedDeductionsTotal = 0,
    deductionMethodUsed = "simplified",
  } = taxData || {};

  const incomeChartData = {
    labels: ["Salário", "Bônus/13º", "Outras Rendas"],
    datasets: [
      {
        data: [salaryIncome, bonusIncome, otherIncome],
        backgroundColor: ["#3b82f6", "#8b5cf6", "#10b981"],
        borderColor: "#1f2937",
        borderWidth: 3,
      },
    ],
  };

  const deductionsChartData = {
    labels: ["Renda Tributável", "Deduções", "Imposto"],
    datasets: [
      {
        data: [taxableIncome, totalIncome - taxableIncome, estimatedTax],
        backgroundColor: ["#ef4444", "#10b981", "#f59e0b"],
        borderColor: "#1f2937",
        borderWidth: 3,
      },
    ],
  };

  const chartOptions = createChartOptions();

  const projectedTaxData = useMemo(
    () =>
      calculateProjectedTax(filteredData, totalIncome, itemizedDeductionsTotal, totalTaxLiability),
    [filteredData, totalIncome, itemizedDeductionsTotal, totalTaxLiability]
  );

  return (
    <div className="space-y-6">
      <TaxDashboardHeader
        availableYears={availableYears as string[]}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        deductionMethodUsed={deductionMethodUsed}
      />

      <KeyMetricsSection
        totalIncome={totalIncome}
        taxableIncome={taxableIncome}
        totalTaxLiability={totalTaxLiability}
        estimatedTax={estimatedTax}
      />

      <ImportantNote />

      <ProjectedTaxSection projectedTaxData={projectedTaxData} totalIncome={totalIncome} />

      <ChartsSection
        incomeChartData={incomeChartData}
        deductionsChartData={deductionsChartData}
        chartOptions={chartOptions}
        salaryIncome={salaryIncome}
        bonusIncome={bonusIncome}
        otherIncome={otherIncome}
        totalIncome={totalIncome}
        taxableIncome={taxableIncome}
        estimatedTax={estimatedTax}
      />

      <DeductionsSection deductions={deductions} />

      <IrpfBracketsTable taxableIncome={taxableIncome} />

      <RecommendationsSection recommendations={recommendations} />

      <ImportantNotesSection />
    </div>
  );
};
