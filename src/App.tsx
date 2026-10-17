import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { TelegramSimulator } from './components/TelegramSimulator';
import { TransactionsView } from './components/TransactionsView';
import { WalletsBudgetsView } from './components/WalletsBudgetsView';
import { AIAdvisorView } from './components/AIAdvisorView';
import { TelegramIntegrationView } from './components/TelegramIntegrationView';
import { TransactionModal } from './components/TransactionModal';
import { Transaction, Wallet, Budget, TelegramConfig } from './types';
import { api } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Instant Cache Load from LocalStorage
  useEffect(() => {
    try {
      const cachedTx = localStorage.getItem('telefinance_tx');
      if (cachedTx) {
        const parsed = JSON.parse(cachedTx);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTransactions(parsed);
        }
      }
      const cachedWallets = localStorage.getItem('telefinance_wallets');
      if (cachedWallets) {
        const parsedW = JSON.parse(cachedWallets);
        if (Array.isArray(parsedW) && parsedW.length > 0) {
          setWallets(parsedW);
        }
      }
    } catch (e) {
      console.warn('LocalStorage read error:', e);
    }
  }, []);

  // Save to LocalStorage whenever state changes
  useEffect(() => {
    if (transactions.length > 0) {
      localStorage.setItem('telefinance_tx', JSON.stringify(transactions));
    }
  }, [transactions]);

  useEffect(() => {
    if (wallets.length > 0) {
      localStorage.setItem('telefinance_wallets', JSON.stringify(wallets));
    }
  }, [wallets]);

  // Initial Data Fetch & Dual-Sync
  const loadData = async () => {
    try {
      let [txs, wls, bgts, cfg] = await Promise.all([
        api.getTransactions(),
        api.getWallets(),
        api.getBudgets(),
        api.getTelegramConfig(),
      ]);

      // Check if client local cache has saved transactions that fresh server instance needs
      const cachedRaw = localStorage.getItem('telefinance_tx');
      if (cachedRaw) {
        try {
          const localTxs = JSON.parse(cachedRaw);
          if (Array.isArray(localTxs) && localTxs.length > txs.length) {
            console.log('Syncing saved transactions from client cache to server...');
            const syncRes = await api.syncData({ clientTransactions: localTxs });
            if (syncRes && syncRes.transactions) {
              txs = syncRes.transactions;
              if (syncRes.wallets) wls = syncRes.wallets;
            }
          }
        } catch (syncErr) {
          console.warn('Sync error:', syncErr);
        }
      }

      setTransactions(txs);
      setWallets(wls);
      setBudgets(bgts);
      setTelegramConfig(cfg);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handler: When transaction is added from Telegram Simulator, Voice, or Struk
  const handleTransactionAdded = (newTx: Transaction) => {
    setTransactions((prev) => {
      const updated = [newTx, ...prev];
      localStorage.setItem('telefinance_tx', JSON.stringify(updated));
      return updated;
    });
    loadData(); // Re-fetch wallets to sync balances

    if (newTx.type === 'INCOME') {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
    }
  };

  // Handler: Save manual or edited transaction
  const handleSaveTransaction = async (txData: Partial<Transaction>) => {
    try {
      if (editingTransaction) {
        const updated = await api.updateTransaction(editingTransaction.id, txData);
        setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      } else {
        const created = await api.createTransaction(txData);
        setTransactions((prev) => [created, ...prev]);
        if (created.type === 'INCOME') {
          confetti({
            particleCount: 60,
            spread: 70,
            origin: { y: 0.7 },
          });
        }
      }
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Handler: Delete transaction
  const handleDeleteTransaction = async (id: string) => {
    try {
      await api.deleteTransaction(id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Totals
  const totalBalance = wallets.reduce((s, w) => s + w.balance, 0);
  const totalIncome = transactions.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Navbar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalBalance={totalBalance}
        totalIncome={totalIncome}
        totalExpense={totalExpense}
        onOpenAddModal={() => {
          setEditingTransaction(null);
          setIsModalOpen(true);
        }}
        telegramBotUsername={telegramConfig?.botUsername}
        isRegistered={telegramConfig?.isRegistered}
      />

      {/* Main Content Area based on Active Tab */}
      <main className="flex-1">
        {activeTab === 'dashboard' && (
          <DashboardView
            transactions={transactions}
            wallets={wallets}
            budgets={budgets}
            onOpenAddModal={() => {
              setEditingTransaction(null);
              setIsModalOpen(true);
            }}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'telegram' && (
          <TelegramSimulator
            onTransactionAdded={handleTransactionAdded}
            onRefreshData={loadData}
            telegramUsername={telegramConfig?.botUsername}
            isRegistered={telegramConfig?.isRegistered}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionsView
            transactions={transactions}
            wallets={wallets}
            onOpenAddModal={() => {
              setEditingTransaction(null);
              setIsModalOpen(true);
            }}
            onEditTransaction={(tx) => {
              setEditingTransaction(tx);
              setIsModalOpen(true);
            }}
            onDeleteTransaction={handleDeleteTransaction}
          />
        )}

        {activeTab === 'wallets' && (
          <WalletsBudgetsView
            wallets={wallets}
            budgets={budgets}
            transactions={transactions}
            onWalletUpdated={loadData}
            onBudgetUpdated={loadData}
          />
        )}

        {activeTab === 'advisor' && <AIAdvisorView />}

        {activeTab === 'integration' && <TelegramIntegrationView />}
      </main>

      {/* Manual Add / Edit Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
        }}
        onSave={handleSaveTransaction}
        initialData={editingTransaction}
        wallets={wallets}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-400">
        <p className="flex items-center justify-center gap-1.5">
          <span>TeleFinance AI</span> • <span>Didukung Google Gemini & Telegram Bot API</span>
        </p>
      </footer>
    </div>
  );
}
