import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownRight, 
  Bot, 
  Sparkles, 
  Calendar, 
  Receipt, 
  Mic, 
  ChevronRight,
  PieChart as PieIcon,
  BarChart3,
  AlertCircle
} from 'lucide-react';
import { Transaction, Wallet as WalletType, Budget } from '../types';
import { formatRupiah } from '../services/api';

interface DashboardViewProps {
  transactions: Transaction[];
  wallets: WalletType[];
  budgets: Budget[];
  onOpenAddModal: () => void;
  onNavigateTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  transactions,
  wallets,
  budgets,
  onOpenAddModal,
  onNavigateTab,
}) => {
  const [timeRange, setTimeRange] = useState<'all' | 'month'>('month');

  // Calculations
  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
  const totalIncome = transactions
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0);
  const netCashflow = totalIncome - totalExpense;

  // Category breakdown
  const categoryTotals: Record<string, number> = {};
  transactions
    .filter((t) => t.type === 'EXPENSE')
    .forEach((t) => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

  const sortedCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amount]) => ({
      name: cat,
      amount,
      percentage: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
    }));

  // Palette for categories
  const categoryColors = [
    '#38bdf8', '#34d399', '#f43f5e', '#fbbf24', '#a855f7', 
    '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#64748b'
  ];

  // Helper for source icon & badge
  const renderSourceBadge = (source: string) => {
    switch (source) {
      case 'telegram':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Bot className="w-3 h-3" /> Telegram Bot
          </span>
        );
      case 'voice':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Mic className="w-3 h-3" /> Voice AI
          </span>
        );
      case 'receipt':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Receipt className="w-3 h-3" /> Struk Scanner
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
            Web Manual
          </span>
        );
    }
  };

  return (
    <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Banner AI Notification */}
      <div className="bg-gradient-to-r from-sky-950/60 via-slate-900 to-indigo-950/60 border border-sky-500/30 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl shadow-sky-950/20">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0 shadow-inner">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white">
                TeleFinance AI Assistant Siap Digunakan
              </h3>
              <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full font-medium">
                Aktif
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              Catat transaksi instan cukup dengan mengetik di Telegram Simulator atau kirim struk belanja.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={() => onNavigateTab('telegram')}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-sky-500 text-white hover:bg-sky-400 shadow-md shadow-sky-500/30 transition-all cursor-pointer"
          >
            <Bot className="w-4 h-4" />
            <span>Buka Bot Telegram</span>
          </button>
          <button
            onClick={() => onNavigateTab('advisor')}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Analisa AI</span>
          </button>
        </div>
      </div>

      {/* Main 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Saldo */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4.5 hover:border-slate-700 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Saldo Terkumpul</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2 tracking-tight">
            {formatRupiah(totalBalance)}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
            <span>{wallets.length} Akun / Dompet</span>
            <button
              onClick={() => onNavigateTab('wallets')}
              className="text-sky-400 hover:text-sky-300 font-medium text-[11px] flex items-center"
            >
              Kelola <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Total Pemasukan */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4.5 hover:border-slate-700 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Pemasukan</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-2 tracking-tight">
            +{formatRupiah(totalIncome)}
          </p>
          <div className="mt-2 flex items-center text-xs text-slate-400">
            <span className="text-emerald-400 font-medium mr-1.5 flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5" /> Positif
            </span>
            <span>Bulan Ini</span>
          </div>
        </div>

        {/* Total Pengeluaran */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4.5 hover:border-slate-700 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Pengeluaran</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-400 mt-2 tracking-tight">
            -{formatRupiah(totalExpense)}
          </p>
          <div className="mt-2 flex items-center text-xs text-slate-400">
            <span>{transactions.filter((t) => t.type === 'EXPENSE').length} transaksi tercatat</span>
          </div>
        </div>

        {/* Arus Kas Bersih */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4.5 hover:border-slate-700 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Arus Kas Bersih (Net)</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${netCashflow >= 0 ? 'bg-sky-500/10 text-sky-400' : 'bg-rose-500/10 text-rose-400'}`}>
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-2xl font-bold mt-2 tracking-tight ${netCashflow >= 0 ? 'text-sky-400' : 'text-rose-400'}`}>
            {formatRupiah(netCashflow)}
          </p>
          <div className="mt-2 flex items-center text-xs text-slate-400">
            <span className="text-slate-300">
              {totalIncome > 0 ? `${Math.round((netCashflow / totalIncome) * 100)}% Rasio Tabungan` : '0% Rasio Tabungan'}
            </span>
          </div>
        </div>
      </div>

      {/* Middle Row: Wallets Quick Strip + Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Wallets Cards Strip (1 Col) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-sky-400" />
                Dompet & Rekening Anda
              </h4>
              <button
                onClick={() => onNavigateTab('wallets')}
                className="text-xs text-sky-400 hover:text-sky-300 font-medium"
              >
                Lihat Semua
              </button>
            </div>

            <div className="space-y-2.5">
              {wallets.slice(0, 5).map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center text-xs font-bold">
                      {w.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-200">{w.name}</p>
                      <span className="text-[10px] text-slate-400 capitalize">{w.type}</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-white">
                    {formatRupiah(w.balance)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/80">
            <button
              onClick={() => onNavigateTab('wallets')}
              className="w-full py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer text-center"
            >
              + Tambah / Edit Dompet
            </button>
          </div>
        </div>

        {/* Right: Category Breakdown & Spending Donut (2 Cols) */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-emerald-400" />
                Distribusi Pengeluaran per Kategori
              </h4>
              <p className="text-xs text-slate-400">Total belanja bulan ini: {formatRupiah(totalExpense)}</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-medium">
              {sortedCategories.length} Kategori
            </span>
          </div>

          {sortedCategories.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Belum ada data pengeluaran. Coba catat transaksi pertama lewat bot!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Visual Multi-segment Bar & Key List */}
              <div className="space-y-3">
                {sortedCategories.slice(0, 5).map((cat, idx) => {
                  const color = categoryColors[idx % categoryColors.length];
                  return (
                    <div key={cat.name} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-medium flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }}></span>
                          {cat.name}
                        </span>
                        <span className="text-white font-semibold">
                          {formatRupiah(cat.amount)} ({cat.percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${cat.percentage}%`,
                            backgroundColor: color,
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary Highlights */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 space-y-3 text-xs">
                <div className="flex items-center gap-2 text-sky-400 font-semibold">
                  <Sparkles className="w-4 h-4" />
                  Insight Otomatis AI
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Pengeluaran terbesar Anda bulan ini adalah di kategori{' '}
                  <strong className="text-white">{sortedCategories[0]?.name}</strong> sebesar{' '}
                  <strong className="text-sky-300">{formatRupiah(sortedCategories[0]?.amount || 0)}</strong> ({sortedCategories[0]?.percentage}% dari total).
                </p>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Status Anggaran:</span>
                  <span className="text-emerald-400 font-medium">Dalam Batas Wajar</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section: Recent Transactions Activity Feed */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-sky-400" />
              Transaksi Terbaru
            </h4>
            <p className="text-xs text-slate-400">Sinkronisasi otomatis dari Telegram, Struk & Suara</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateTab('transactions')}
              className="text-xs text-sky-400 hover:text-sky-300 font-medium px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 transition cursor-pointer"
            >
              Lihat Semua Transaksi ({transactions.length})
            </button>
            <button
              onClick={onOpenAddModal}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white transition cursor-pointer"
            >
              + Tambah Manual
            </button>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            Belum ada transaksi yang dicatat.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {transactions.slice(0, 6).map((tx) => {
              const isIncome = tx.type === 'INCOME';
              const isTransfer = tx.type === 'TRANSFER';
              return (
                <div
                  key={tx.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-800/30 px-2 rounded-xl transition"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isIncome
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : isTransfer
                          ? 'bg-sky-500/10 text-sky-400'
                          : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {isIncome ? (
                        <ArrowDownRight className="w-5 h-5" />
                      ) : isTransfer ? (
                        <BarChart3 className="w-5 h-5" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs sm:text-sm font-semibold text-white">
                          {tx.description}
                        </p>
                        {renderSourceBadge(tx.source)}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span className="font-medium text-slate-300">{tx.category}</span>
                        <span>•</span>
                        <span>{tx.wallet}</span>
                        <span>•</span>
                        <span>
                          {new Date(tx.date).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right pl-12 sm:pl-0">
                    <span
                      className={`text-sm font-bold tracking-tight ${
                        isIncome ? 'text-emerald-400' : isTransfer ? 'text-sky-400' : 'text-rose-400'
                      }`}
                    >
                      {isIncome ? '+' : '-'}{formatRupiah(tx.amount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
