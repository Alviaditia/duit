import React, { useState } from 'react';
import { 
  WalletCards, 
  Target, 
  Plus, 
  CreditCard, 
  Building2, 
  Smartphone, 
  Banknote, 
  Edit2, 
  AlertTriangle, 
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { Wallet, Budget, Transaction } from '../types';
import { formatRupiah, api } from '../services/api';

interface WalletsBudgetsViewProps {
  wallets: Wallet[];
  budgets: Budget[];
  transactions: Transaction[];
  onWalletUpdated: () => void;
  onBudgetUpdated: () => void;
}

export const WalletsBudgetsView: React.FC<WalletsBudgetsViewProps> = ({
  wallets,
  budgets,
  transactions,
  onWalletUpdated,
  onBudgetUpdated,
}) => {
  // New wallet form state
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [walletName, setWalletName] = useState('');
  const [walletType, setWalletType] = useState<'cash' | 'bank' | 'ewallet'>('bank');
  const [walletBalance, setWalletBalance] = useState('');

  // Edit budget modal state
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [budgetCategory, setBudgetCategory] = useState('Makanan & Minuman');
  const [budgetLimit, setBudgetLimit] = useState('');

  // Handle create wallet
  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletName.trim()) return;

    await api.createWallet({
      name: walletName,
      type: walletType,
      balance: Number(walletBalance) || 0,
      icon: walletType === 'bank' ? 'CreditCard' : walletType === 'ewallet' ? 'Smartphone' : 'Banknote',
      color: 'sky',
    });

    setWalletName('');
    setWalletBalance('');
    setShowAddWallet(false);
    onWalletUpdated();
  };

  // Handle save budget
  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetCategory || !budgetLimit) return;

    await api.saveBudget({
      category: budgetCategory,
      monthlyLimit: Number(budgetLimit),
      month: '2026-10',
    });

    setBudgetLimit('');
    setShowAddBudget(false);
    onBudgetUpdated();
  };

  const totalBalance = wallets.reduce((s, w) => s + w.balance, 0);

  return (
    <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* SECTION 1: WALLETS */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <WalletCards className="w-5 h-5 text-sky-400" />
              Dompet & Rekening Keuangan
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Total Saldo Semua Akun: <strong className="text-emerald-400">{formatRupiah(totalBalance)}</strong>
            </p>
          </div>

          <button
            onClick={() => setShowAddWallet(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-white transition cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Dompet Baru</span>
          </button>
        </div>

        {/* Wallets Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {wallets.map((w) => {
            return (
              <div
                key={w.id}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4.5 hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {w.type === 'bank' ? '🏦 Rekening Bank' : w.type === 'ewallet' ? '📱 E-Wallet' : '💵 Tunai'}
                    </span>
                    <button
                      onClick={async () => {
                        const newBal = prompt(`Sesuaikan saldo untuk ${w.name}:`, String(w.balance));
                        if (newBal !== null) {
                          await api.updateWallet(w.id, { balance: Number(newBal) || 0 });
                          onWalletUpdated();
                        }
                      }}
                      className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
                      title="Ubah Saldo"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h3 className="text-sm font-semibold text-white mt-2.5">{w.name}</h3>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Saldo Tersedia</span>
                  <span className="text-base font-bold text-white tracking-tight">
                    {formatRupiah(w.balance)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: BUDGETS */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-400" />
              Target & Batas Anggaran Bulanan
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Pantau batas pengeluaran per kategori agar keuangan tetap aman & terkontrol.
            </p>
          </div>

          <button
            onClick={() => setShowAddBudget(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-white transition cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Atur Batas Anggaran</span>
          </button>
        </div>

        {/* Budgets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map((b) => {
            const spent = transactions
              .filter((t) => t.type === 'EXPENSE' && t.category.toLowerCase() === b.category.toLowerCase())
              .reduce((s, t) => s + t.amount, 0);

            const percentage = Math.round((spent / b.monthlyLimit) * 100);
            const remaining = b.monthlyLimit - spent;
            const isOver = spent > b.monthlyLimit;
            const isWarning = percentage >= 80 && !isOver;

            return (
              <div
                key={b.id}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4.5 hover:border-slate-700 transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">{b.category}</h3>
                    <span className="text-[11px] text-slate-400">Periode Bulan Ini</span>
                  </div>

                  {isOver ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      <AlertTriangle className="w-3 h-3" /> Melebihi Batas ({percentage}%)
                    </span>
                  ) : isWarning ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <AlertTriangle className="w-3 h-3" /> Waspada ({percentage}%)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3" /> Aman ({percentage}%)
                    </span>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOver ? 'bg-rose-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                      style={{ width: `${Math.min(100, percentage)}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-between text-xs pt-1">
                    <span className="text-slate-400">
                      Terpakai: <strong className="text-white">{formatRupiah(spent)}</strong>
                    </span>
                    <span className="text-slate-400">
                      Batas: <strong className="text-slate-200">{formatRupiah(b.monthlyLimit)}</strong>
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Sisa Kuota:</span>
                  <span className={`font-bold ${isOver ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {isOver ? `Minus ${formatRupiah(Math.abs(remaining))}` : formatRupiah(remaining)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Add Wallet */}
      {showAddWallet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Tambah Dompet / Rekening Baru</h3>
            <form onSubmit={handleCreateWallet} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Nama Dompet</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Bank Jago, ShopeePay, Blu"
                  value={walletName}
                  onChange={(e) => setWalletName(e.target.value)}
                  className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Tipe Akun</label>
                <select
                  value={walletType}
                  onChange={(e) => setWalletType(e.target.value as any)}
                  className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-sky-500"
                >
                  <option value="bank">Rekening Bank</option>
                  <option value="ewallet">E-Wallet</option>
                  <option value="cash">Tunai / Dompet Fisik</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Saldo Awal (Rp)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={walletBalance}
                  onChange={(e) => setWalletBalance(e.target.value)}
                  className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddWallet(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold transition"
                >
                  Simpan Dompet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Set Budget */}
      {showAddBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Atur Batas Anggaran Kategori</h3>
            <form onSubmit={handleSaveBudget} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Kategori</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Makanan & Minuman, Transportasi, Hiburan"
                  value={budgetCategory}
                  onChange={(e) => setBudgetCategory(e.target.value)}
                  className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Batas Bulanan (Rp)</label>
                <input
                  type="number"
                  required
                  placeholder="Contoh: 2000000"
                  value={budgetLimit}
                  onChange={(e) => setBudgetLimit(e.target.value)}
                  className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddBudget(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold transition"
                >
                  Simpan Batas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
