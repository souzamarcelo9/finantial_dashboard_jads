import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { BUDGET_ALLOCATION_DEFAULTS } from "../constants";
import {
  type Baseline,
  type ImportHistoryEntry,
  addHistoryEntry,
  deleteTransaction as fbDeleteTransaction,
  fetchBaselines,
  fetchHistory,
  fetchTransactions,
  saveBaseline as fbSaveBaseline,
  saveTransaction as fbSaveTransaction,
  saveTransactionsBulk,
} from "../lib/firebase/financeService";
import { isFirebaseConfigured } from "../lib/firebase/firebaseConfig";
import type { Transaction } from "../types";

interface BudgetAllocation {
  needs: number;
  wants: number;
  savings: number;
}

interface CustomCategories {
  needs: string[];
  wants: string[];
  savings: string[];
}

interface BudgetPreferences {
  allocation: BudgetAllocation;
  customCategories: CustomCategories;
}

interface DateRange {
  start: Date | null;
  end: Date | null;
}

interface FinancialStore {
  // State
  transactions: Transaction[];
  dateRange: DateRange;
  budgetPreferences: BudgetPreferences;
  loading: boolean;
  error: string | null;
  firebaseEnabled: boolean;
  syncing: boolean;
  baselines: Baseline[];
  history: ImportHistoryEntry[];

  // Actions
  setTransactions: (
    transactions: Transaction[],
    meta?: { source?: string; fileName?: string }
  ) => void;
  addTransaction: (transaction: Transaction) => Promise<void>;
  updateTransaction: (transaction: Transaction) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;
  loadFromFirebase: () => Promise<void>;
  createBaseline: (name: string, notes?: string) => Promise<void>;
  loadBaselines: () => Promise<void>;
  loadHistory: () => Promise<void>;
  updateDateRange: (start: Date | null, end: Date | null) => void;
  updateBudgetAllocation: (allocation: BudgetAllocation) => void;
  updateCustomCategories: (type: keyof CustomCategories, categories: string[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  transactions: [],
  dateRange: { start: null, end: null },
  budgetPreferences: {
    allocation: BUDGET_ALLOCATION_DEFAULTS,
    customCategories: {
      needs: [],
      wants: [],
      savings: [],
    },
  },
  loading: false,
  error: null,
  firebaseEnabled: isFirebaseConfigured(),
  syncing: false,
  baselines: [] as Baseline[],
  history: [] as ImportHistoryEntry[],
};

/**
 * Financial Dashboard Store (Zustand)
 *
 * - Persistência local (localStorage) como cache/fallback
 * - Persistência remota no Firebase Firestore (lançamentos, baselines, histórico)
 * - Mesma API pública usada pelos componentes existentes, mais as novas
 *   ações para lançamento manual e sincronização com o Firebase.
 */
export const useFinancialStore = create<FinancialStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setTransactions: (transactions, meta) => {
        set({ transactions });
        if (isFirebaseConfigured()) {
          set({ syncing: true });
          saveTransactionsBulk(transactions)
            .then(() =>
              addHistoryEntry({
                fileName: meta?.fileName ?? "importação",
                fileType: (meta?.source as "csv" | "xlsx" | "manual") ?? "csv",
                transactionCount: transactions.length,
              })
            )
            .catch((err) => {
              console.error("Erro ao sincronizar com o Firebase:", err);
              console.error("Erro ao sincronizar com o Firebase:", err);
            console.error("Erro ao sincronizar com o Firebase:", err);
          set({ error: (err as Error).message });
            })
            .finally(() => set({ syncing: false }));
        }
      },

      addTransaction: async (transaction) => {
        set((state) => ({ transactions: [transaction, ...state.transactions] }));
        if (isFirebaseConfigured()) {
          set({ syncing: true });
          try {
            await fbSaveTransaction(transaction);
            await addHistoryEntry({
              fileName: "Lançamento manual",
              fileType: "manual",
              transactionCount: 1,
            });
          } catch (err) {
            console.error("Erro ao sincronizar com o Firebase:", err);
            console.error("Erro ao sincronizar com o Firebase:", err);
          set({ error: (err as Error).message });
          } finally {
            set({ syncing: false });
          }
        }
      },

      updateTransaction: async (transaction) => {
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === transaction.id ? transaction : t
          ),
        }));
        if (isFirebaseConfigured()) {
          try {
            await fbSaveTransaction(transaction);
          } catch (err) {
            console.error("Erro ao sincronizar com o Firebase:", err);
            console.error("Erro ao sincronizar com o Firebase:", err);
          set({ error: (err as Error).message });
          }
        }
      },

      removeTransaction: async (id) => {
        set((state) => ({ transactions: state.transactions.filter((t) => t.id !== id) }));
        if (isFirebaseConfigured()) {
          try {
            await fbDeleteTransaction(id);
          } catch (err) {
            console.error("Erro ao sincronizar com o Firebase:", err);
            console.error("Erro ao sincronizar com o Firebase:", err);
          set({ error: (err as Error).message });
          }
        }
      },

      loadFromFirebase: async () => {
        if (!isFirebaseConfigured()) return;
        set({ loading: true });
        try {
          const remote = await fetchTransactions();
          if (remote.length > 0) {
            set({ transactions: remote });
          }
        } catch (err) {
          console.error("Erro ao sincronizar com o Firebase:", err);
          set({ error: (err as Error).message });
        } finally {
          set({ loading: false });
        }
      },

      createBaseline: async (name, notes) => {
        const state = get();
        try {
          await fbSaveBaseline({
            name,
            notes,
            snapshot: {
              budgetPreferences: state.budgetPreferences,
              dateRange: {
                start: state.dateRange.start ? state.dateRange.start.toISOString() : null,
                end: state.dateRange.end ? state.dateRange.end.toISOString() : null,
              },
            },
          });
          await get().loadBaselines();
        } catch (err) {
          console.error("Erro ao sincronizar com o Firebase:", err);
          set({ error: (err as Error).message });
        }
      },

      loadBaselines: async () => {
        try {
          const baselines = await fetchBaselines();
          set({ baselines });
        } catch (err) {
          console.error("Erro ao sincronizar com o Firebase:", err);
          set({ error: (err as Error).message });
        }
      },

      loadHistory: async () => {
        try {
          const history = await fetchHistory();
          set({ history });
        } catch (err) {
          console.error("Erro ao sincronizar com o Firebase:", err);
          set({ error: (err as Error).message });
        }
      },

      updateDateRange: (start, end) => set({ dateRange: { start, end } }),

      updateBudgetAllocation: (allocation) =>
        set((state) => ({
          budgetPreferences: {
            ...state.budgetPreferences,
            allocation,
          },
        })),

      updateCustomCategories: (type, categories) =>
        set((state) => ({
          budgetPreferences: {
            ...state.budgetPreferences,
            customCategories: {
              ...state.budgetPreferences.customCategories,
              [type]: categories,
            },
          },
        })),

      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
      reset: () => set(initialState),
    }),
    {
      name: "financial-dashboard-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        budgetPreferences: state.budgetPreferences,
        // Quando o Firebase está configurado, ele é a fonte da verdade;
        // localStorage guarda transações apenas em modo 100% local/offline.
        transactions: isFirebaseConfigured() ? [] : state.transactions,
      }),
      // JSON.stringify converte Date em string; ao reidratar do localStorage
      // precisamos converter essas strings de volta para objetos Date.
      onRehydrateStorage: () => (state) => {
        if (state?.transactions?.length) {
          state.transactions = state.transactions.map((t) => ({
            ...t,
            date: t.date instanceof Date ? t.date : new Date(t.date as unknown as string),
          }));
        }
      },
    }
  )
);

// Transactions
export const useTransactions = () => useFinancialStore((state) => state.transactions);
export const useSetTransactions = () => useFinancialStore((state) => state.setTransactions);
export const useAddTransaction = () => useFinancialStore((state) => state.addTransaction);
export const useUpdateTransaction = () => useFinancialStore((state) => state.updateTransaction);
export const useRemoveTransaction = () => useFinancialStore((state) => state.removeTransaction);
export const useLoadFromFirebase = () => useFinancialStore((state) => state.loadFromFirebase);

// Baselines & Histórico
export const useBaselines = () => useFinancialStore((state) => state.baselines);
export const useCreateBaseline = () => useFinancialStore((state) => state.createBaseline);
export const useLoadBaselines = () => useFinancialStore((state) => state.loadBaselines);
export const useHistory = () => useFinancialStore((state) => state.history);
export const useLoadHistory = () => useFinancialStore((state) => state.loadHistory);
export const useFirebaseEnabled = () => useFinancialStore((state) => state.firebaseEnabled);
export const useSyncing = () => useFinancialStore((state) => state.syncing);

// Date Range
export const useDateRange = () => useFinancialStore((state) => state.dateRange);
export const useUpdateDateRange = () => useFinancialStore((state) => state.updateDateRange);

// Budget Preferences
export const useBudgetPreferences = () => useFinancialStore((state) => state.budgetPreferences);
export const useUpdateBudgetAllocation = () =>
  useFinancialStore((state) => state.updateBudgetAllocation);
export const useUpdateCustomCategories = () =>
  useFinancialStore((state) => state.updateCustomCategories);

// Loading & Error
export const useLoading = () => useFinancialStore((state) => state.loading);
export const useSetLoading = () => useFinancialStore((state) => state.setLoading);
export const useError = () => useFinancialStore((state) => state.error);
export const useSetError = () => useFinancialStore((state) => state.setError);
export const useClearError = () => useFinancialStore((state) => state.clearError);
