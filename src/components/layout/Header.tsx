import { FileSpreadsheet, LogOut, TrendingUp, Upload } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { ManualEntryModal } from "../../features/transactions/components/ManualEntryModal";
import { useFirebaseEnabled, useSyncing } from "../../store/financialStore";

interface HeaderProps {
  onFileUpload: (_event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Header = ({ onFileUpload }: HeaderProps) => {
  const firebaseEnabled = useFirebaseEnabled();
  const syncing = useSyncing();
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="mb-8 bg-gray-800/40 border border-gray-700/30 rounded-2xl p-6 sm:p-8">
      <div className="flex items-center justify-center gap-2 mb-6 px-4 py-2 text-xs">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border ${
            firebaseEnabled
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-gray-700/30 border-gray-600/40 text-gray-400"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${firebaseEnabled ? "bg-emerald-400" : "bg-gray-500"}`}
          />
          {firebaseEnabled
            ? syncing
              ? "Sincronizando com o Firebase..."
              : "Conectado ao Firebase"
            : "Firebase não configurado (modo local)"}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
            <TrendingUp size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Painel Financeiro
            </h1>
            <p className="text-gray-400 text-sm sm:text-base mt-1">
              Sua plataforma inteligente de controle financeiro
            </p>
          </div>
        </div>

        <div className="mt-6 sm:mt-0 flex flex-wrap items-center gap-3">
          <ManualEntryModal />

          <label
            htmlFor="csv-upload"
            className="group inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl cursor-pointer hover:from-blue-500 hover:to-blue-600 transition-all duration-200 shadow-lg hover:shadow-blue-500/25"
          >
            <Upload size={18} className="mr-2" />
            Importar CSV
          </label>
          <input
            id="csv-upload"
            type="file"
            accept=".csv"
            className="hidden"
            onChange={onFileUpload}
          />

          <label
            htmlFor="excel-upload"
            className="group inline-flex items-center px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold rounded-xl cursor-pointer hover:from-emerald-500 hover:to-emerald-600 transition-all duration-200 shadow-lg hover:shadow-emerald-500/25"
          >
            <FileSpreadsheet size={18} className="mr-2" />
            Importar Excel
          </label>
          <input
            id="excel-upload"
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={onFileUpload}
          />

          {user && (
            <div className="flex items-center gap-2 pl-2 ml-1 border-l border-gray-700">
              <span className="text-sm text-gray-400 hidden sm:inline max-w-[160px] truncate">
                {user.displayName || user.email}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                title="Sair"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-700/60 transition-colors disabled:opacity-50"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
