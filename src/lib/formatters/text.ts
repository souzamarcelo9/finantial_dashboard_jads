/**
 * Text Formatting Utilities
 * String manipulation and label formatting
 */
import type { TransactionType } from "../../types";

/**
 * Traduz os "status" e "ratings" internos calculados pelo motor de análise
 * (trend, cashFlowForecast.status, incomeStability.rating, month.status)
 * APENAS para exibição. Os valores internos continuam em inglês, pois são
 * usados em comparações (`=== "stable"`) em vários pontos do código —
 * nunca use o retorno desta função para lógica, só para exibir na tela.
 * @example
 * translateStatusLabel("declining") // "Em Declínio"
 */
export const translateStatusLabel = (status: string | undefined | null): string => {
  if (!status) {
    return "N/A";
  }
  const map: Record<string, string> = {
    stable: "Estável",
    Stable: "Estável",
    "Very Stable": "Muito Estável",
    Moderate: "Moderado",
    Volatile: "Volátil",
    increasing: "Em Alta",
    decreasing: "Em Queda",
    growing: "Crescendo",
    declining: "Em Declínio",
    healthy: "Saudável",
    deficit: "Déficit",
    tight: "Apertado",
    over: "Acima do Orçamento",
    under: "Dentro do Orçamento",
    warning: "Atenção",
  };
  return map[status] ?? status;
};

/**
 * Traduz o tipo de lançamento (valor interno em inglês) para um rótulo em
 * português, apenas para exibição. NUNCA usar o valor de retorno para
 * comparações — o modelo de dados continua em inglês (Income/Expense/...).
 * @example
 * translateTransactionType("Income") // "Receita"
 */
export const translateTransactionType = (type: TransactionType | string): string => {
  const map: Record<string, string> = {
    Income: "Receita",
    Expense: "Despesa",
    "Transfer-In": "Transferência (entrada)",
    "Transfer-Out": "Transferência (saída)",
    Reimbursement: "Reembolso",
    Investment: "Investimento",
  };
  return map[type] ?? type;
};

/**
 * Truncates a string to a maximum length with ellipsis
 * @param text - String to truncate
 * @param maxLength - Maximum length (default: 12)
 * @returns Truncated string with "..." if needed
 * @example
 * truncateText("Very long category name", 10) // "Very long..."
 */
export const truncateText = (text: string, maxLength: number = 12): string => {
  if (typeof text !== "string") {
    return String(text);
  }
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

/**
 * Truncates a label for chart display
 * @param label - Label to truncate
 * @param maxLength - Maximum length
 * @returns Truncated label
 * @example
 * truncateLabel("Entertainment & Media", 12) // "Entertainment..."
 */
export const truncateLabel = (label: string | number, maxLength: number = 12): string => {
  if (typeof label !== "string") {
    return String(label);
  }
  return truncateText(label, maxLength);
};

/**
 * Capitalizes the first letter of a string
 * @param text - String to capitalize
 * @returns Capitalized string
 * @example
 * capitalize("hello world") // "Hello world"
 */
export const capitalize = (text: string): string => {
  if (!text || typeof text !== "string") {
    return "";
  }
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

/**
 * Converts string to title case
 * @param text - String to convert
 * @returns Title case string
 * @example
 * toTitleCase("hello world") // "Hello World"
 */
export const toTitleCase = (text: string): string => {
  if (!text || typeof text !== "string") {
    return "";
  }
  return text
    .split(" ")
    .map((word) => capitalize(word))
    .join(" ");
};

/**
 * Converts camelCase or PascalCase to readable text
 * @param text - camelCase or PascalCase string
 * @returns Readable text
 * @example
 * camelToReadable("myVariableName") // "My Variable Name"
 */
export const camelToReadable = (text: string): string => {
  if (!text || typeof text !== "string") {
    return "";
  }
  return text
    .replaceAll(/([A-Z])/g, " $1")
    .trim()
    .split(" ")
    .map((word: string) => capitalize(word))
    .join(" ");
};

/**
 * Pluralizes a word based on count
 * @param word - Singular word
 * @param count - Count to check
 * @param plural - Optional custom plural form
 * @returns Singular or plural word
 * @example
 * pluralize("item", 1) // "item"
 * pluralize("item", 5) // "items"
 * pluralize("person", 5, "people") // "people"
 */
export const pluralize = (word: string, count: number, plural?: string): string => {
  if (count === 1) {
    return word;
  }
  return plural || `${word}s`;
};
