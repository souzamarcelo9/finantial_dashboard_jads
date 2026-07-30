import { TrendingUp } from "lucide-react";
import { Bar } from "react-chartjs-2";

interface CommuteBreakdown {
  name: string;
  total: number;
  amount: number;
  count: number;
  average: number;
  percentage: number;
}

interface CommuteInsight {
  title: string;
  message: string;
  priority: string;
}

interface CommuteData {
  totalCommute: number;
  monthlyAverage: number;
  dailyAverage: number;
  breakdown: CommuteBreakdown[];
  insights: CommuteInsight[];
}

interface CommuteSectionProps {
  commuteData: CommuteData;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chartOptions: any;
}

/**
 * Commute Analytics Section Component
 */
export const CommuteSection = ({ commuteData, chartOptions }: CommuteSectionProps) => {
  const commuteChartData = {
    labels: commuteData.breakdown.map((b: CommuteBreakdown) => b.name),
    datasets: [
      {
        label: "Gastos com Transporte",
        data: commuteData.breakdown.map((b: CommuteBreakdown) => b.total),
        backgroundColor: "rgba(168, 85, 247, 0.7)",
        borderColor: "rgb(168, 85, 247)",
        borderWidth: 2,
      },
    ],
  };

  return (
    <div>
      <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
        <TrendingUp className="text-purple-400" size={28} />
        Commute & Transportation
      </h3>

      {/* Commute Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Transporte Total</span>
            <TrendingUp className="text-purple-400" size={20} />
          </div>
          <div className="text-2xl font-bold text-white">
            R$
            {commuteData.totalCommute.toLocaleString("pt-BR", {
              maximumFractionDigits: 0,
            })}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Média Mensal</span>
            <TrendingUp className="text-blue-400" size={20} />
          </div>
          <div className="text-2xl font-bold text-blue-400">
            R$
            {commuteData.monthlyAverage.toLocaleString("pt-BR", {
              maximumFractionDigits: 0,
            })}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Média Diária</span>
            <TrendingUp className="text-green-400" size={20} />
          </div>
          <div className="text-2xl font-bold text-green-400">
            R$
            {commuteData.dailyAverage.toLocaleString("pt-BR", {
              maximumFractionDigits: 0,
            })}
          </div>
        </div>
      </div>

      {/* Commute Charts */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h4 className="text-lg font-semibold text-white mb-4">Detalhamento por Categoria de Transporte</h4>
          <div style={{ height: "300px" }}>
            <Bar data={commuteChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Commute Insights */}
      {commuteData.insights && commuteData.insights.length > 0 && (
        <div className="mt-6 bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h4 className="text-lg font-semibold text-white mb-4">Insights de Transporte</h4>
          <div className="space-y-3">
            {commuteData.insights.map((insight) => {
              let bgClass: string;
              if (insight.priority === "high") {
                bgClass = "bg-red-900/30 border border-red-700";
              } else if (insight.priority === "medium") {
                bgClass = "bg-yellow-900/30 border border-yellow-700";
              } else {
                bgClass = "bg-blue-900/30 border border-blue-700";
              }
              return (
                <div
                  key={`${insight.title}-${insight.priority}`}
                  className={`p-4 rounded-lg ${bgClass}`}
                >
                  <div className="font-semibold text-white mb-1">{insight.title}</div>
                  <div className="text-gray-300">{insight.message}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
