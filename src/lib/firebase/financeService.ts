/**
 * Camada de serviço do Firestore para o Dashboard Financeiro
 *
 * Responsável por salvar/ler lançamentos, baselines (metas/orçamento) e
 * histórico de importações. TODOS os dados são gravados com o campo
 * `userId` do usuário autenticado e TODAS as consultas filtram por esse
 * mesmo campo — assim, cada usuário só enxerga os próprios lançamentos.
 * Combine isso com as regras de segurança em `firestore.rules` para que a
 * restrição valha tanto no cliente quanto no servidor.
 *
 * Todas as funções são "no-op seguro" quando o Firebase não está
 * configurado, ou retornam vazio quando não há usuário autenticado.
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
  where,
} from "firebase/firestore";
import type { Transaction } from "../../types";
import { db, getCurrentUserId, isFirebaseConfigured } from "./firebaseConfig";

const TRANSACTIONS_COLLECTION = "transactions";
const BASELINES_COLLECTION = "baselines";
const HISTORY_COLLECTION = "importHistory";

export interface Baseline {
  id: string;
  userId: string;
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
  userId: string;
  fileName: string;
  fileType: "csv" | "xlsx" | "manual";
  transactionCount: number;
  importedAt?: string;
}

const toPlainTransaction = (t: Transaction, userId: string) => ({
  ...t,
  userId,
  date: t.date instanceof Date ? t.date.toISOString() : t.date,
});

const fromPlainTransaction = (raw: Record<string, unknown>): Transaction => ({
  ...(raw as unknown as Transaction),
  date: new Date(raw.date as string),
});

/**
 * Garante que há um usuário autenticado antes de qualquer leitura/escrita.
 * Lança um erro claro em vez de vazar dados de outro usuário por engano.
 */
const requireUserId = (): string => {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error("Você precisa estar autenticado para acessar seus dados.");
  }
  return userId;
};

/** Salva (cria ou atualiza) um lançamento financeiro no Firestore */
export const saveTransaction = async (transaction: Transaction): Promise<void> => {
  if (!isFirebaseConfigured() || !db) return;
  const userId = requireUserId();
  // O Firestore exige que o ID do documento seja uma string — forçamos isso
  // aqui como proteção extra, caso algum fluxo (import, migração, etc.)
  // gere um id numérico.
  const ref = doc(db, TRANSACTIONS_COLLECTION, String(transaction.id));
  await setDoc(ref, {
    ...toPlainTransaction(transaction, userId),
    updatedAt: serverTimestamp(),
  });
};

/** Salva vários lançamentos de uma vez (ex: importação de CSV/Excel) */
export const saveTransactionsBulk = async (transactions: Transaction[]): Promise<void> => {
  if (!isFirebaseConfigured() || !db) return;
  await Promise.all(transactions.map((t) => saveTransaction(t)));
};

/** Remove um lançamento do Firestore (as regras de segurança bloqueiam se não for o dono) */
export const deleteTransaction = async (id: string): Promise<void> => {
  if (!isFirebaseConfigured() || !db) return;
  requireUserId();
  await deleteDoc(doc(db, TRANSACTIONS_COLLECTION, String(id)));
};

/** Busca todos os lançamentos do usuário autenticado (uma vez) */
export const fetchTransactions = async (): Promise<Transaction[]> => {
  if (!isFirebaseConfigured() || !db) return [];
  const userId = getCurrentUserId();
  if (!userId) return [];
  const q = query(
    collection(db, TRANSACTIONS_COLLECTION),
    where("userId", "==", userId),
    orderBy("date", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => fromPlainTransaction(d.data()));
};

/**
 * Assina atualizações em tempo real dos lançamentos do usuário autenticado.
 * Retorna uma função de cancelamento (unsubscribe).
 */
export const subscribeToTransactions = (
  onChange: (transactions: Transaction[]) => void
): (() => void) => {
  if (!isFirebaseConfigured() || !db) return () => {};
  const userId = getCurrentUserId();
  if (!userId) return () => {};
  const q = query(
    collection(db, TRANSACTIONS_COLLECTION),
    where("userId", "==", userId),
    orderBy("date", "desc")
  );
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => fromPlainTransaction(d.data())));
  });
};

/** Salva uma baseline (foto do orçamento/config em um momento) do usuário autenticado */
export const saveBaseline = async (
  baseline: Omit<Baseline, "id" | "userId"> & { id?: string }
) => {
  if (!isFirebaseConfigured() || !db) return null;
  const userId = requireUserId();
  const id = baseline.id ?? doc(collection(db, BASELINES_COLLECTION)).id;
  await setDoc(doc(db, BASELINES_COLLECTION, id), {
    ...baseline,
    id,
    userId,
    createdAt: baseline.createdAt ?? Timestamp.now().toDate().toISOString(),
  });
  return id;
};

/** Lista as baselines do usuário autenticado */
export const fetchBaselines = async (): Promise<Baseline[]> => {
  if (!isFirebaseConfigured() || !db) return [];
  const userId = getCurrentUserId();
  if (!userId) return [];
  const q = query(
    collection(db, BASELINES_COLLECTION),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Baseline);
};

/** Registra uma entrada no histórico de importações/lançamentos do usuário autenticado */
export const addHistoryEntry = async (
  entry: Omit<ImportHistoryEntry, "id" | "userId" | "importedAt">
): Promise<void> => {
  if (!isFirebaseConfigured() || !db) return;
  const userId = requireUserId();
  const id = doc(collection(db, HISTORY_COLLECTION)).id;
  await setDoc(doc(db, HISTORY_COLLECTION, id), {
    ...entry,
    id,
    userId,
    importedAt: Timestamp.now().toDate().toISOString(),
  });
};

/** Lista o histórico do usuário autenticado, mais recente primeiro */
export const fetchHistory = async (): Promise<ImportHistoryEntry[]> => {
  if (!isFirebaseConfigured() || !db) return [];
  const userId = getCurrentUserId();
  if (!userId) return [];
  const q = query(
    collection(db, HISTORY_COLLECTION),
    where("userId", "==", userId),
    orderBy("importedAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as ImportHistoryEntry);
};
