import React, { useState, useEffect } from 'react';
import { X, Sparkles, Loader2, ArrowDownRight, ArrowUpRight, BarChart3 } from 'lucide-react';
import { Transaction, Wallet } from '../types';
import { api, formatRupiah } from '../services/api';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: Partial<Transaction>) => void;
  initialData?: Transaction | null;
  wallets: Wallet[];
}

const CATEGORIES = [
  'Makanan & Minuman',
  'Transportasi',
  'Belanja & Kebutuhan',
  'Tagihan & Utilitas',
  'Hiburan',
  'Kesehatan',
  'Pendidikan',
  'Gaji',
  'Freelance & Bisnis',
  'Investasi',
  'Lain-lain',
];

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  wallets,
}) => {
  const [type, setType] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER'>('EXPENSE');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('Makanan & Minuman');
  const [wallet, setWallet] = useState<string>('Tunai (Cash)');
  const [toWallet, setToWallet] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 16));

  // AI Instant fill
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setType(initialData.type);
      setAmount(String(initialData.amount));
      setCategory(initialData.category);
      setWallet(initialData.wallet);
      setToWallet(initialData.toWallet || '');
      setDescription(initialData.description);
      setNotes(initialData.notes || '');
      setDate(new Date(initialData.date).toISOString().slice(0, 16));
    } else {
      setType('EXPENSE');
      setAmount('');
      setCategory('Makanan & Minuman');
      setWallet(wallets[0]?.name || 'Tunai (Cash)');
      setToWallet('');
      setDescription('');
      setNotes('');
      setDate(new Date().toISOString().slice(0, 16));
    }
  }, [initialData, isOpen, wallets]);

  if (!isOpen) return null;

  const handleAIExtract = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    try {
      const res = await api.parseText(aiPrompt);
      if (res.isTransaction) {
        if (res.type) setType(res.type);
        if (res.amount) setAmount(String(res.amount));
        if (res.category) setCategory(res.category);
        if (res.wallet) setWallet(res.wallet);
        if (res.toWallet) setToWallet(res.toWallet);
        if (res.description) setDescription(res.description);
      }
    } catch (err) {
      console.error('AI extract error:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    onSave({
      type,
      amount: Number(amount),
      category,
      wallet,
      toWallet: type === 'TRANSFER' ? toWallet : undefined,
      description: description || 'Transaksi Baru',
      notes,
      date: new Date(date).toISOString(),
      source: initialData ? initialData.source : 'web',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto scrollbar-thin">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-base font-bold text-white mb-4">
          {initialData ? 'Edit Transaksi' : 'Catat Transaksi Baru'}
        </h3>

        {/* AI Quick Auto-Fill Assist */}
        {!initialData && (
          <div className="mb-5 p-3 rounded-2xl bg-sky-950/40 border border-sky-500/30 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ekstrak Cepat dengan Gemini AI:</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Cth: makan siang soto betawi 35rb pake gopay"
                className="flex-1 bg-slate-950 text-white text-xs px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={handleAIExtract}
                disabled={isAiLoading || !aiPrompt.trim()}
                className="px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-40 cursor-pointer"
              >
                {isAiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>Ekstrak</span>
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Type Selector (Tabs) */}
          <div className="grid grid-cols-3 gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => setType('EXPENSE')}
              className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                type === 'EXPENSE'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Pengeluaran</span>
            </button>
            <button
              type="button"
              onClick={() => setType('INCOME')}
              className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                type === 'INCOME'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Pemasukan</span>
            </button>
            <button
              type="button"
              onClick={() => setType('TRANSFER')}
              className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                type === 'TRANSFER'
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Transfer</span>
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Nominal Transaksi (Rp)</label>
            <div className="relative">
              <input
                type="number"
                required
                min="1"
                placeholder="50000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-950 text-white text-base font-bold p-3 rounded-xl border border-slate-800 focus:outline-none focus:border-sky-500"
              />
              {amount && Number(amount) > 0 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-emerald-400">
                  {formatRupiah(Number(amount))}
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Deskripsi Transaksi</label>
            <input
              type="text"
              required
              placeholder="Contoh: Kopi Kenangan, Nasi Padang, Belanja Mingguan"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Category & Wallet Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Kategori</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-sky-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">
                {type === 'TRANSFER' ? 'Dari Dompet' : 'Dompet / Rekening'}
              </label>
              <select
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-sky-500"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.name}>{w.name} ({formatRupiah(w.balance)})</option>
                ))}
              </select>
            </div>
          </div>

          {/* To Wallet if Transfer */}
          {type === 'TRANSFER' && (
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Ke Dompet Tujuan</label>
              <select
                value={toWallet}
                onChange={(e) => setToWallet(e.target.value)}
                required
                className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-sky-500"
              >
                <option value="">-- Pilih Dompet Penerima --</option>
                {wallets
                  .filter((w) => w.name !== wallet)
                  .map((w) => (
                    <option key={w.id} value={w.name}>{w.name}</option>
                  ))}
              </select>
            </div>
          )}

          {/* Date */}
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Waktu Transaksi</label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold transition cursor-pointer shadow-md shadow-emerald-500/20"
            >
              Simpan Transaksi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
