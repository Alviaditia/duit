import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Plus, 
  Trash2, 
  Edit3, 
  Bot, 
  Mic, 
  Receipt, 
  Globe, 
  ArrowUpRight, 
  ArrowDownRight, 
  BarChart3,
  Calendar,
  Layers
} from 'lucide-react';
import { Transaction, Wallet } from '../types';
import { formatRupiah } from '../services/api';

interface TransactionsViewProps {
  transactions: Transaction[];
  wallets: Wallet[];
  onOpenAddModal: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  wallets,
  onOpenAddModal,
  onEditTransaction,
  onDeleteTransaction,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedWallet, setSelectedWallet] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set(transactions.map((t) => t.category));
    return Array.from(set);
  }, [transactions]);

  // Filtering
  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const matchSearch =
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.wallet.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.rawInput && t.rawInput.toLowerCase().includes(searchTerm.toLowerCase())) ||
        t.amount.toString().includes(searchTerm);

      const matchType = selectedType === 'ALL' || t.type === selectedType;
      const matchCategory = selectedCategory === 'ALL' || t.category === selectedCategory;
      const matchWallet = selectedWallet === 'ALL' || t.wallet === selectedWallet;

      return matchSearch && matchType && matchCategory && matchWallet;
    }).sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === 'oldest') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === 'highest') return b.amount - a.amount;
      if (sortBy === 'lowest') return a.amount - b.amount;
      return 0;
    });
  }, [transactions, searchTerm, selectedType, selectedCategory, selectedWallet, sortBy]);

  // Filtered Totals
  const filteredIncome = filtered.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const filteredExpense = filtered.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);

  // CSV Export
  const exportToCSV = () => {
    const headers = ['ID', 'Tanggal', 'Tipe', 'Deskripsi', 'Kategori', 'Dompet', 'Nominal (IDR)', 'Sumber', 'Catatan'];
    const rows = filtered.map((t) => [
      t.id,
      new Date(t.date).toLocaleString('id-ID'),
      t.type,
      `"${t.description.replace(/"/g, '""')}"`,
      `"${t.category}"`,
      `"${t.wallet}"`,
      t.amount,
      t.source,
      `"${(t.notes || t.rawInput || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `transaksi-telefinance-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderSourceBadge = (source: string) => {
    switch (source) {
      case 'telegram':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Bot className="w-3 h-3" /> Bot
          </span>
        );
      case 'voice':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Mic className="w-3 h-3" /> Suara
          </span>
        );
      case 'receipt':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Receipt className="w-3 h-3" /> Struk
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-800 text-slate-400">
            <Globe className="w-3 h-3" /> Web
          </span>
        );
    }
  };

  return (
    <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-400" />
            Buku Transaksi Keuangan
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Kelola, filter, dan telusuri seluruh catatan pengeluaran & pemasukan Anda.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>
          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-500 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Transaksi</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Box */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari transaksi, nominal, toko..."
              className="w-full bg-slate-950 text-white text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-slate-950 text-white text-xs px-3 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              <option value="ALL">Semua Tipe</option>
              <option value="EXPENSE">🔴 Pengeluaran</option>
              <option value="INCOME">🟢 Pemasukan</option>
              <option value="TRANSFER">🔄 Transfer Dana</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-950 text-white text-xs px-3 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              <option value="ALL">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-slate-950 text-white text-xs px-3 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              <option value="newest">Terbaru</option>
              <option value="oldest">Terlama</option>
              <option value="highest">Nominal Terbesar</option>
              <option value="lowest">Nominal Terkecil</option>
            </select>
          </div>
        </div>

        {/* Filter Summary Stats */}
        <div className="flex flex-wrap items-center justify-between text-xs pt-2 border-t border-slate-800/80 text-slate-400">
          <span>Menampilkan <strong className="text-white">{filtered.length}</strong> transaksi</span>
          <div className="flex items-center gap-4">
            <span>Pemasukan: <strong className="text-emerald-400">+{formatRupiah(filteredIncome)}</strong></span>
            <span>Pengeluaran: <strong className="text-rose-400">-{formatRupiah(filteredExpense)}</strong></span>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            Tidak ditemukan transaksi yang cocok dengan filter atau kata kunci.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Transaksi & Deskripsi</th>
                  <th className="py-3.5 px-4 font-semibold">Kategori</th>
                  <th className="py-3.5 px-4 font-semibold">Dompet</th>
                  <th className="py-3.5 px-4 font-semibold">Sumber</th>
                  <th className="py-3.5 px-4 font-semibold">Waktu</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Nominal</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filtered.map((tx) => {
                  const isIncome = tx.type === 'INCOME';
                  const isTransfer = tx.type === 'TRANSFER';
                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/30 transition">
                      {/* Description & Type Icon */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isIncome
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : isTransfer
                                ? 'bg-sky-500/10 text-sky-400'
                                : 'bg-rose-500/10 text-rose-400'
                            }`}
                          >
                            {isIncome ? (
                              <ArrowDownRight className="w-4 h-4" />
                            ) : isTransfer ? (
                              <BarChart3 className="w-4 h-4" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{tx.description}</p>
                            {tx.rawInput && tx.rawInput !== tx.description && (
                              <span className="text-[10px] text-slate-400 italic block">
                                "{tx.rawInput}"
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 text-slate-300 font-medium">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-200">
                          {tx.category}
                        </span>
                      </td>

                      {/* Wallet */}
                      <td className="py-3.5 px-4 text-slate-300 font-medium">
                        {tx.wallet}
                        {tx.toWallet && <span className="text-slate-400 text-[10px]"> ➔ {tx.toWallet}</span>}
                      </td>

                      {/* Source */}
                      <td className="py-3.5 px-4">
                        {renderSourceBadge(tx.source)}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-400">
                        {new Date(tx.date).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right font-bold tracking-tight">
                        <span className={isIncome ? 'text-emerald-400' : isTransfer ? 'text-sky-400' : 'text-rose-400'}>
                          {isIncome ? '+' : '-'}{formatRupiah(tx.amount)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onEditTransaction(tx)}
                            title="Edit"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Hapus transaksi "${tx.description}"?`)) {
                                onDeleteTransaction(tx.id);
                              }
                            }}
                            title="Hapus"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
