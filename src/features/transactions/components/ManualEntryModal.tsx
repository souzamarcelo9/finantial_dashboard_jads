import { PlusCircle, X } from "lucide-react";
import { useState } from "react";
import { DEFAULT_CATEGORIES } from "../../../constants";
import { useAddTransaction, useBudgetPreferences, useFirebaseEnabled } from "../../../store/financialStore";
import type { Transaction, TransactionType } from "../../../types";

const TRANSACTION_TYPE_OPTIONS: { value: TransactionType; label: string }[] = [
  { value: "Income", label: "Receita" },
  { value: "Expense", label: "Despesa" },
  { value: "Transfer-In", label: "Transferência (entrada)" },
  { value: "Transfer-Out", label: "Transferência (saída)" },
  { value: "Reimbursement", label: "Reembolso" },
  { value: "Investment", label: "Investimento" },
];

const todayISO = () => new Date().toISOString().slice(0, 10);

export const ManualEntryModal = () => {
  const [open, setOpen] = useState(false);
  const addTransaction = useAddTransaction();
  const firebaseEnabled = useFirebaseEnabled();
  const budgetPreferences = useBudgetPreferences();

  const customCategoryNames = Object.values(budgetPreferences.customCategories).flat();
  const categories: Record<string, string[]> = {
    ...DEFAULT_CATEGORIES,
    ...(customCategoryNames.length ? { Personalizadas: customCategoryNames } : {}),
  };

  const [form, setForm] = useState({
    date: todayISO(),
    type: "Expense" as TransactionType,
    category: Object.keys(categories)[0],
    subcategory: categories[Object.keys(categories)[0]]?.[0] ?? "",
    account: "",
    amount: "",
    note: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const subcategoryOptions = categories[form.category] ?? [];

  const handleCategoryChange = (category: string) => {
    setForm((prev) => ({
      ...prev,
      category,
      subcategory: categories[category]?.[0] ?? "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const amountNumber = Number.parseFloat(form.amount.replace(",", "."));
    if (Number.isNaN(amountNumber) || amountNumber <= 0) {
      setErrorMsg("Informe um valor válido maior que zero.");
      return;
    }
    if (!form.account.trim()) {
      setErrorMsg("Informe a conta/carteira do lançamento.");
      return;
    }

    const transaction: Transaction = {
      id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: new Date(form.date),
      amount: amountNumber,
      type: form.type,
      category: form.category,
      subcategory: form.subcategory,
      account: form.account.trim(),
      note: form.note.trim() || undefined,
    };

    setSubmitting(true);
    try {
      await addTransaction(transaction);
      setOpen(false);
      setForm((prev) => ({ ...prev, amount: "", note: "" }));
    } catch (err) {
      setErrorMsg((err as Error).message ?? "Erro ao salvar o lançamento.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-xl cursor-pointer hover:from-purple-500 hover:to-purple-600 transition-all duration-200 shadow-lg hover:shadow-purple-500/25"
      >
        <PlusCircle size={18} className="mr-2" />
        Novo Lançamento
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-lg bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Lançamento manual</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-white"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            {!firebaseEnabled && (
              <p className="mb-4 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                O Firebase ainda não está configurado (.env). Este lançamento será salvo apenas
                localmente neste navegador.
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-1" htmlFor="me-date">
                    Data
                  </label>
                  <input
                    id="me-date"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                    className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1" htmlFor="me-type">
                    Tipo
                  </label>
                  <select
                    id="me-type"
                    value={form.type}
                    onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as TransactionType }))}
                    className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-white"
                  >
                    {TRANSACTION_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-1" htmlFor="me-category">
                    Categoria
                  </label>
                  <select
                    id="me-category"
                    value={form.category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-white"
                  >
                    {Object.keys(categories).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1" htmlFor="me-subcategory">
                    Subcategoria
                  </label>
                  <select
                    id="me-subcategory"
                    value={form.subcategory}
                    onChange={(e) => setForm((p) => ({ ...p, subcategory: e.target.value }))}
                    className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-white"
                  >
                    {subcategoryOptions.map((sub: string) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-1" htmlFor="me-amount">
                    Valor (R$)
                  </label>
                  <input
                    id="me-amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={form.amount}
                    onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                    className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1" htmlFor="me-account">
                    Conta/Carteira
                  </label>
                  <input
                    id="me-account"
                    type="text"
                    placeholder="Ex.: Nubank, Carteira"
                    value={form.account}
                    onChange={(e) => setForm((p) => ({ ...p, account: e.target.value }))}
                    className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1" htmlFor="me-note">
                  Observação (opcional)
                </label>
                <input
                  id="me-note"
                  type="text"
                  placeholder="Detalhes do lançamento"
                  value={form.note}
                  onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
                  className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-white"
                />
              </div>

              {errorMsg && <p className="text-sm text-red-400">{errorMsg}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold hover:from-purple-500 hover:to-purple-600 disabled:opacity-50"
                >
                  {submitting ? "Salvando..." : "Salvar lançamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
