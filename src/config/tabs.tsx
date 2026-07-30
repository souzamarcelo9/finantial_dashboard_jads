/**
 * Tab Configuration
 * Centralized tab definitions for the application
 */

import {
  CreditCard,
  FileText,
  LayoutDashboard,
  LineChart,
  Receipt,
  Repeat,
  Tags,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

export const TABS_CONFIG = [
  {
    id: "overview",
    label: "Visão Geral",
    icon: LayoutDashboard,
    description: "Panorama rápido da sua saúde financeira",
  },
  {
    id: "income-expense",
    label: "Receitas e Despesas",
    icon: TrendingUp,
    description: "Análise detalhada de receitas e gastos",
  },
  {
    id: "categories",
    label: "Categorias",
    icon: Tags,
    description: "Aprofunde-se nas categorias de gastos",
  },
  {
    id: "trends",
    label: "Tendências e Previsões",
    icon: LineChart,
    description: "Análises avançadas e previsões",
  },
  {
    id: "investments",
    label: "Investimentos",
    icon: TrendingDown,
    description: "Desempenho de investimentos e resultado (P&L)",
  },
  {
    id: "tax-planning",
    label: "Planejamento Tributário",
    icon: FileText,
    description: "Cálculos de imposto de renda e deduções",
  },
  {
    id: "family-housing",
    label: "Família e Moradia",
    icon: Users,
    description: "Despesas familiares e custos de moradia",
  },
  {
    id: "lifestyle",
    label: "Estilo de Vida",
    icon: CreditCard,
    description: "Otimização de cartões, alimentação e transporte",
  },
  {
    id: "budget-goals",
    label: "Orçamento e Planejamento",
    icon: Target,
    description: "Saúde financeira, orçamentos e ferramentas de planejamento",
  },
  {
    id: "patterns",
    label: "Assinaturas e Padrões",
    icon: Repeat,
    description: "Pagamentos recorrentes e padrões de gastos",
  },
  {
    id: "transactions",
    label: "Lançamentos",
    icon: Receipt,
    description: "Lista detalhada de lançamentos com filtros",
  },
];
