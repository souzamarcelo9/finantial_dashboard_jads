/**
 * Application Constants
 * Centralized configuration for the Financial Dashboard
 */

// Initial CSV data - empty by default, user will upload their own file
export const initialCsvData = `Date,Time,Accounts,Category,Subcategory,Note,INR,Income/Expense`;

// Chart color palettes
export const CHART_COLORS = {
  primary: ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"],
  income: "#10b981",
  expense: "#ef4444",
  transferIn: "#3b82f6",
  transferOut: "#f59e0b",
  gradient: {
    blue: "from-blue-600 to-blue-700",
    purple: "from-purple-600 to-purple-700",
    green: "from-green-600 to-green-700",
    red: "from-red-600 to-red-700",
  },
};

// Transaction types
export const TRANSACTION_TYPES = {
  INCOME: "Income",
  EXPENSE: "Expense",
  TRANSFER_IN: "Transfer-In",
  TRANSFER_OUT: "Transfer-Out",
};

// Date formats
export const DATE_FORMATS = {
  DISPLAY: "DD/MM/YYYY",
  ISO: "YYYY-MM-DD",
  TIME: "HH:MM:SS",
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 25,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
};

// Chart configuration
export const CHART_CONFIG = {
  DEFAULT_HEIGHT: 450,
  MAX_DATA_POINTS: 1000,
  ANIMATION_DURATION: 750,
};

// Month names
export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const SHORT_MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// Day names
export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// File upload configuration
export const FILE_UPLOAD = {
  ACCEPTED_TYPES: [".csv", ".xlsx", ".xls"],
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
};

// Local storage keys
export const STORAGE_KEYS = {
  TRANSACTION_DATA: "financial_dashboard_data",
  USER_PREFERENCES: "financial_dashboard_preferences",
  LAST_UPLOAD: "financial_dashboard_last_upload",
};

// Error messages
export const ERROR_MESSAGES = {
  FILE_PARSE_ERROR: "Could not parse the financial data. Please check the file format.",
  FILE_TOO_LARGE: "File size exceeds the maximum limit of 10MB.",
  INVALID_FILE_TYPE: "Please upload a valid CSV or Excel file.",
  NO_DATA: "No data found in the file. Please check the file format.",
  GENERIC_ERROR: "An error occurred. Please try again.",
};

// Success messages
export const SUCCESS_MESSAGES = {
  FILE_UPLOADED: "File uploaded successfully!",
  DATA_EXPORTED: "Data exported successfully!",
  CHART_DOWNLOADED: "Chart downloaded successfully!",
};

// ============================================================================
// FINANCIAL CALCULATION CONSTANTS
// ============================================================================

// Time Constants
// ============================================================================

/**
 * Average number of days in a month (365.25 / 12)
 * Used for monthly projections and averages
 */
export const DAYS_PER_MONTH = 30.44;

/**
 * Days in a week
 */
export const DAYS_PER_WEEK = 7;

/**
 * Months in a year
 */
export const MONTHS_PER_YEAR = 12;

/**
 * Milliseconds in one day
 */
export const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Days in a year (accounting for leap years)
 */
export const DAYS_PER_YEAR = 365.25;

// Percentage & Math Constants
// ============================================================================

/**
 * Percentage multiplier
 */
export const PERCENT = 100;

/**
 * Small epsilon for floating-point comparisons
 */
export const EPSILON = 1e-9;

// Tax Regime Constants (India - FY 2024-25 onwards)
// ============================================================================

/**
 * Tabela Progressiva Mensal do IRPF 2026 (Receita Federal)
 * Cada faixa: { min, max, rate, deduction } — valores em R$
 * Fonte: Receita Federal (tabela vigente desde maio/2025, mantida em 2026)
 */
export const IRPF_MONTHLY_BRACKETS = [
  { min: 0, max: 2428.8, rate: 0, deduction: 0 },
  { min: 2428.8, max: 2826.65, rate: 0.075, deduction: 182.16 },
  { min: 2826.65, max: 3751.05, rate: 0.15, deduction: 394.16 },
  { min: 3751.05, max: 4664.68, rate: 0.225, deduction: 675.49 },
  { min: 4664.68, max: Infinity, rate: 0.275, deduction: 908.73 },
];

/**
 * Tabela Progressiva Anual do IRPF 2026 (tabela mensal × 12)
 * Usada para o planejamento anual do imposto de renda.
 */
export const IRPF_ANNUAL_BRACKETS = IRPF_MONTHLY_BRACKETS.map((b) => ({
  min: b.min * 12,
  max: b.max === Infinity ? Infinity : b.max * 12,
  rate: b.rate,
  deduction: b.deduction * 12,
}));

/**
 * Redução do IRPF (Lei nº 15.270/2025) — vigente a partir de jan/2026
 * Isenta integralmente quem ganha até R$5.000/mês (R$60.000/ano) e reduz
 * gradualmente o imposto para quem ganha entre R$5.000,01 e R$7.350,00/mês.
 */
export const IRPF_REDUCAO_2026 = {
  isencaoMensal: 5000,
  isencaoAnual: 60000,
  limiteReducaoMensal: 7350,
  limiteReducaoAnual: 88200, // 7.350 × 12
  // redutor = fatorFixo - (fatorVariavel × renda bruta)
  fatorFixoMensal: 978.62,
  fatorVariavelMensal: 0.133145,
  fatorFixoAnual: 11743.44, // 978.62 × 12
  fatorVariavelAnual: 0.133145,
};

/**
 * Desconto simplificado anual do IRPF (substitui todas as deduções legais)
 * Corresponde a 20% dos rendimentos tributáveis, limitado a este valor.
 */
export const DESCONTO_SIMPLIFICADO_ANUAL = 17640;

/**
 * Percentual do desconto simplificado sobre a renda tributável anual
 */
export const DESCONTO_SIMPLIFICADO_PERCENTUAL = 0.2;

/**
 * Dedução anual por dependente (Receita Federal, 2026)
 */
export const DEDUCAO_DEPENDENTE_ANUAL = 2275.08;

/**
 * Limite anual de dedução com educação (por pessoa: titular + cada dependente)
 */
export const LIMITE_EDUCACAO_ANUAL = 3561.5;

/**
 * Teto anual aproximado de contribuição ao INSS (empregado CLT), 2026
 * Baseado no teto mensal de referência (~R$988,09/mês)
 */
export const INSS_TETO_ANUAL = 988.09 * 12;

/**
 * Limite de dedução com Previdência Privada (PGBL) — até 12% da renda
 * bruta tributável anual, conforme legislação do IRPF
 */
export const PREVIDENCIA_PRIVADA_PERCENTUAL_LIMITE = 0.12;


/**
 * Rent deduction from salary for HRA calculation (10%)
 */
export const HRA_RENT_DEDUCTION_PERCENT = 0.1;

// Investment Categories
// ============================================================================

/**
 * Categories considered as investment-related
 */
export const INVESTMENT_CATEGORIES = new Set([
  "Investment Charges & Loss",
  "Investment Income",
  "Invest",
  "Grow Stocks",
]);

/**
 * Accounts considered as investment accounts
 */
export const INVESTMENT_ACCOUNTS = new Set(["Grow Stocks", "Zerodha", "Upstox"]);

// Financial Health Score Constants
// ============================================================================

/**
 * Maximum score for savings rate component (out of 100 total)
 */
export const HEALTH_SCORE_SAVINGS_RATE_MAX = 30;

/**
 * Maximum score for emergency fund component (out of 100 total)
 */
export const HEALTH_SCORE_EMERGENCY_FUND_MAX = 25;

/**
 * Maximum score for debt management component (out of 100 total)
 */
export const HEALTH_SCORE_DEBT_MANAGEMENT_MAX = 20;

/**
 * Maximum score for income/expense ratio component (out of 100 total)
 */
export const HEALTH_SCORE_INCOME_EXPENSE_MAX = 15;

/**
 * Maximum score for spending consistency component (out of 100 total)
 */
export const HEALTH_SCORE_CONSISTENCY_MAX = 10;

/**
 * Target savings rate for excellent health (20%)
 */
export const TARGET_SAVINGS_RATE = 20;

/**
 * Target emergency fund coverage (6 months)
 */
export const TARGET_EMERGENCY_FUND_MONTHS = 6;

/**
 * Minimum emergency fund coverage (3 months)
 */
export const MINIMUM_EMERGENCY_FUND_MONTHS = 3;

/**
 * Maximum acceptable debt-to-income ratio (36%)
 */
export const MAX_DEBT_TO_INCOME_RATIO = 36;

// Recurring Transaction Detection Constants
// ============================================================================

/**
 * Minimum occurrences to consider a transaction recurring
 */
export const RECURRING_MIN_OCCURRENCES = 2;

/**
 * Maximum variance in days for recurring pattern detection (20% of average)
 */
export const RECURRING_VARIANCE_THRESHOLD = 0.2;

/**
 * Minimum amount threshold for recurring detection (R$10)
 */
export const RECURRING_MIN_AMOUNT = 10;

/**
 * Frequency classification ranges (in days)
 */
export const FREQUENCY_RANGES = {
  weekly: { min: 6, max: 8 },
  biWeekly: { min: 13, max: 16 },
  monthly: { min: 27, max: 33 },
  biMonthly: { min: 60, max: 70 },
  quarterly: { min: 85, max: 95 },
  semiAnnually: { min: 175, max: 185 },
  annually: { min: 360, max: 370 },
};

// Anomaly Detection Constants
// ============================================================================

/**
 * Default standard deviation multiplier for anomaly detection
 */
export const ANOMALY_SENSITIVITY_DEFAULT = 2;

/**
 * High severity threshold (3 standard deviations)
 */
export const ANOMALY_SEVERITY_HIGH = 3;

/**
 * Medium severity threshold (2 standard deviations)
 */
export const ANOMALY_SEVERITY_MEDIUM = 2;

// Budget Constants
// ============================================================================

/**
 * Budget warning threshold (75% of budget used)
 */
export const BUDGET_WARNING_THRESHOLD = 0.75;

/**
 * Budget critical threshold (90% of budget used)
 */
export const BUDGET_CRITICAL_THRESHOLD = 0.9;

/**
 * Budget exceeded threshold (100% of budget used)
 */
export const BUDGET_EXCEEDED_THRESHOLD = 1;

/**
 * Default budget buffer percentage (10% above average spending)
 */
export const BUDGET_SUGGESTION_BUFFER = 0.1;

// Rounding & Precision Constants
// ============================================================================

/**
 * Default decimal places for currency display
 */
export const CURRENCY_DECIMAL_PLACES = 2;

/**
 * Default decimal places for percentage display
 */
export const PERCENTAGE_DECIMAL_PLACES = 1;

/**
 * Rounding base for recurring amount grouping (R$100)
 */
export const RECURRING_AMOUNT_ROUNDING_BASE = 100;

// ============================================================================
// NEEDS, WANTS & SAVINGS CLASSIFICATION
// ============================================================================

/**
 * Category classifications for the 50/30/20 budgeting rule
 * Categories that are considered essential needs (50% of income)
 */
export const NEEDS_CATEGORIES = new Set([
  "Groceries",
  "Food & Dining",
  "Health & Fitness",
  "Healthcare",
  "Medical",
  "Utilities",
  "Electricity",
  "Water",
  "Gas",
  "Rent",
  "Housing",
  "Insurance",
  "Bills & Utilities",
  "Transportation",
  "Fuel",
  "Petrol",
  "Auto & Transport",
  "Public Transport",
  "Essential Shopping",
  "Education",
  "Child Care",
  "Pet Care",
  "Loan Repayment",
  "Debt Payment",
  "Credit Card Payment",
  // Sinônimos em português (categorias do lançamento manual)
  "Moradia",
  "Aluguel",
  "Condomínio",
  "Água",
  "Energia",
  "Manutenção",
  "Saúde",
  "Plano de Saúde",
  "Farmácia",
  "Consultas",
  "Exames",
  "Educação",
  "Mensalidade",
  "Transporte",
  "Combustível",
  "Transporte Público",
  "Manutenção Veículo",
  "Cartão de Crédito",
  "Fatura",
]);

/**
 * Categories that are considered wants/discretionary spending (30% of income)
 */
export const WANTS_CATEGORIES = new Set([
  "Entertainment",
  "Movies",
  "Dining Out",
  "Restaurants",
  "Travel",
  "Vacation",
  "Shopping",
  "Clothing",
  "Fashion",
  "Electronics",
  "Gadgets",
  "Hobbies",
  "Sports",
  "Gym",
  "Subscriptions",
  "Streaming",
  "Gaming",
  "Beauty & Spa",
  "Personal Care",
  "Gifts",
  "Donations",
  "Alcohol & Bars",
  "Luxury",
  "Home Decor",
  "Books",
  "Music",
  // Sinônimos em português (categorias do lançamento manual)
  "Alimentação",
  "Restaurante",
  "Delivery",
  "Padaria",
  "Supermercado",
  "Lazer",
  "Cinema/Streaming",
  "Viagens",
  "Hobbies",
  "Assinaturas",
  "Renda Extra",
  "Freelance",
  "Bônus",
  "Anuidade",
]);

/**
 * Categories that are considered savings/investments (20% of income)
 */
export const SAVINGS_CATEGORIES = new Set([
  "Investment",
  "Investment Charges & Loss",
  "Investment Income",
  "Invest",
  "Grow Stocks",
  "Savings",
  "Fixed Deposit",
  "Recurring Deposit",
  "Mutual Funds",
  "Stocks",
  "Emergency Fund",
  "Retirement",
  "PPF",
  "EPF",
  "NPS",
  "Gold",
  "Crypto",
  "SIP",
  // Sinônimos em português (categorias do lançamento manual)
  "Investimentos",
  "Renda Fixa",
  "Renda Variável",
  "Previdência",
  "Reserva de Emergência",
  "Salário",
  "Salário Mensal",
  "13º Salário",
  "Férias",
  "Reembolso",
  "Dividendos",
]);

/**
 * Default budget allocation percentages (50/30/20 rule)
 */
export const BUDGET_ALLOCATION_DEFAULTS = {
  needs: 50,
  wants: 30,
  savings: 20,
};

// Categorias e subcategorias padrão para lançamento manual
export const DEFAULT_CATEGORIES: Record<string, string[]> = {
  Moradia: ["Aluguel", "Condomínio", "Água", "Energia", "Internet", "Manutenção"],
  Alimentação: ["Supermercado", "Restaurante", "Delivery", "Padaria"],
  Transporte: ["Combustível", "Uber/99", "Transporte Público", "Manutenção Veículo", "Estacionamento"],
  Saúde: ["Plano de Saúde", "Farmácia", "Consultas", "Exames"],
  Educação: ["Mensalidade", "Cursos", "Livros"],
  Lazer: ["Cinema/Streaming", "Viagens", "Hobbies", "Assinaturas"],
  "Cartão de Crédito": ["Fatura", "Anuidade"],
  Investimentos: ["Renda Fixa", "Renda Variável", "Previdência", "Reserva de Emergência"],
  Salário: ["Salário Mensal", "13º Salário", "Férias"],
  "Renda Extra": ["Freelance", "Bônus", "Reembolso", "Dividendos"],
  Outros: ["Diversos"],
};

/**
 * Colors for Needs/Wants/Savings visualizations
 */
export const NWS_COLORS = {
  needs: "#3b82f6", // Blue
  wants: "#f59e0b", // Amber
  savings: "#10b981", // Green
  needsGradient: "from-blue-500 to-blue-600",
  wantsGradient: "from-amber-500 to-amber-600",
  savingsGradient: "from-green-500 to-green-600",
};
