/**
 * Camada de serviço do Firestore para o Dashboard Financeiro
 *
 * Responsável por salvar/ler lançamentos, baselines (metas/orçamento) e
 * histórico de importações. Todas as funções são "no-op seguro" quando o
 * Firebase não está configurado (retornam vazio / não fazem nada), para que
 * o app continue funcionando localmente até o usuário preencher o .env.
 */
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import type { Transaction } from "../../types";
import { db, ensureAuth, isFirebaseConfigured } from "./firebaseConfig";

const TRANSACTIONS_COLLECTION = "transactions";
const BASELINES_COLLECTION = "baselines";
const HISTORY_COLLECTION = "importHistory";

export interface Baseline {
  id: string;
  name: string;
  createdAt?: string;
  snapshot: {
    budgetPreferences: unknown;
    dateRange?: { start: string | null; end: string | null };
  };
  notes?: string;
}

export interface ImportHistoryEntry {
  id: string;
  fileName: string;
  fileType: "csv" | "xlsx" | "manual";
  transactionCount: number;
  importedAt?: string;
}

const toPlainTransaction = (t: Transaction) => ({
  ...t,
  date: t.date instanceof Date ? t.date.toISOString() : t.date,
});

const fromPlainTransaction = (raw: Record<string, unknown>): Transaction => ({
  ...(raw as unknown as Transaction),
  date: new Date(raw.date as string),
});

/** Salva (cria ou atualiza) um lançamento financeiro no Firestore */
export const saveTransaction = async (transaction: Transaction): Promise<void> => {
  if (!isFirebaseConfigured() || !db) return;
  await ensureAuth();
  const ref = doc(db, TRANSACTIONS_COLLECTION, transaction.id);
  await setDoc(ref, {
    ...toPlainTransaction(transaction),
    updatedAt: serverTimestamp(),
  });
};

/** Salva vários lançamentos de uma vez (ex: importação de CSV/Excel) */
export const saveTransactionsBulk = async (transactions: Transaction[]): Promise<void> => {
  if (!isFirebaseConfigured() || !db) return;
  await ensureAuth();
  await Promise.all(transactions.map((t) => saveTransaction(t)));
};

/** Remove um lançamento do Firestore */
export const deleteTransaction = async (id: string): Promise<void> => {
  if (!isFirebaseConfigured() || !db) return;
  await ensureAuth();
  await deleteDoc(doc(db, TRANSACTIONS_COLLECTION, id));
};

/** Busca todos os lançamentos salvos no Firestore (uma vez) */
export const fetchTransactions = async (): Promise<Transaction[]> => {
  if (!isFirebaseConfigured() || !db) return [];
  await ensureAuth();
  const q = query(collection(db, TRANSACTIONS_COLLECTION), orderBy("date", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => fromPlainTransaction(d.data()));
};

/**
 * Assina atualizações em tempo real da coleção de lançamentos.
 * Retorna uma função de cancelamento (unsubscribe).
 */
export const subscribeToTransactions = (
  onChange: (transactions: Transaction[]) => void
): (() => void) => {
  if (!isFirebaseConfigured() || !db) return () => {};
  const q = query(collection(db, TRANSACTIONS_COLLECTION), orderBy("date", "desc"));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => fromPlainTransaction(d.data())));
  });
};

/** Salva uma baseline (foto do orçamento/config em um momento) */
export const saveBaseline = async (baseline: Omit<Baseline, "id"> & { id?: string }) => {
  if (!isFirebaseConfigured() || !db) return null;
  await ensureAuth();
  const id = baseline.id ?? doc(collection(db, BASELINES_COLLECTION)).id;
  await setDoc(doc(db, BASELINES_COLLECTION, id), {
    ...baseline,
    id,
    createdAt: baseline.createdAt ?? Timestamp.now().toDate().toISOString(),
  });
  return id;
};

/** Lista todas as baselines salvas */
export const fetchBaselines = async (): Promise<Baseline[]> => {
  if (!isFirebaseConfigured() || !db) return [];
  await ensureAuth();
  const q = query(collection(db, BASELINES_COLLECTION), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Baseline);
};

/** Registra uma entrada no histórico de importações/lançamentos */
export const addHistoryEntry = async (
  entry: Omit<ImportHistoryEntry, "id" | "importedAt">
): Promise<void> => {
  if (!isFirebaseConfigured() || !db) return;
  await ensureAuth();
  const id = doc(collection(db, HISTORY_COLLECTION)).id;
  await setDoc(doc(db, HISTORY_COLLECTION, id), {
    ...entry,
    id,
    importedAt: Timestamp.now().toDate().toISOString(),
  });
};

/** Lista o histórico de importações/lançamentos, mais recente primeiro */
export const fetchHistory = async (): Promise<ImportHistoryEntry[]> => {
  if (!isFirebaseConfigured() || !db) return [];
  await ensureAuth();
  const q = query(collection(db, HISTORY_COLLECTION), orderBy("importedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as ImportHistoryEntry);
};
