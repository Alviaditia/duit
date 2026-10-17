import React from 'react';
import { 
  Bot, 
  Sparkles, 
  LayoutDashboard, 
  MessageSquareCode, 
  ReceiptText, 
  WalletCards, 
  BrainCircuit, 
  Settings2, 
  Plus, 
  ExternalLink,
  ShieldCheck,
  Flame
} from 'lucide-react';
import { formatRupiah } from '../services/api';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  onOpenAddModal: () => void;
  telegramBotUsername?: string;
  isRegistered?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  totalBalance,
  totalIncome,
  totalExpense,
  onOpenAddModal,
  telegramBotUsername,
  isRegistered,
}) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'telegram', label: 'Telegram Bot AI', icon: MessageSquareCode, badge: 'Live' },
    { id: 'transactions', label: 'Transaksi', icon: ReceiptText },
    { id: 'wallets', label: 'Dompet & Budget', icon: WalletCards },
    { id: 'advisor', label: 'Penasehat AI', icon: BrainCircuit, badge: 'Gemini' },
    { id: 'integration', label: 'Setup Webhook', icon: Settings2 },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
      {/* Top Banner / Status bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-3 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/60">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20 text-white font-bold">
                <Bot className="w-6 h-6" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-slate-900 animate-pulse"></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                  TeleFinance <span className="text-sky-400 font-extrabold">AI</span>
                </h1>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Gemini AI
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30 shadow-sm">
                  <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20 animate-pulse" /> Firebase Cloud Permanen (24/7)
                </span>
              </div>
              <p className="text-xs text-slate-400">Pencatatan Keuangan Otomatis via Telegram & AI</p>
            </div>
          </div>

          {/* Quick Balance Ticker */}
          <div className="hidden md:flex items-center gap-6 text-xs bg-slate-950/60 border border-slate-800/80 px-4 py-1.5 rounded-xl">
            <div>
              <span className="text-slate-400 block text-[10px]">Total Saldo</span>
              <span className="font-semibold text-emerald-400 text-sm">{formatRupiah(totalBalance)}</span>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div>
              <span className="text-slate-400 block text-[10px]">Pemasukan</span>
              <span className="font-medium text-emerald-300">+{formatRupiah(totalIncome)}</span>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div>
              <span className="text-slate-400 block text-[10px]">Pengeluaran</span>
              <span className="font-medium text-rose-400">-{formatRupiah(totalExpense)}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('telegram')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 border border-sky-500/30 transition-colors"
            >
              <Bot className="w-3.5 h-3.5 text-sky-400" />
              <span>Simulasi Bot</span>
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
            </button>

            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-500 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Catat Transaksi</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center space-x-1 overflow-x-auto py-2 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-800 text-sky-400 shadow-sm border border-slate-700/60'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                      isActive ? 'bg-sky-500/20 text-sky-300' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
