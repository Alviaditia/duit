import { Transaction, Wallet, Budget, TelegramConfig, AIInsights } from '../types';

export const api = {
  // Transactions
  getTransactions: async (): Promise<Transaction[]> => {
    const res = await fetch('/api/transactions');
    if (!res.ok) throw new Error('Gagal mengambil data transaksi');
    return res.json();
  },

  createTransaction: async (data: Partial<Transaction>): Promise<Transaction> => {
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Gagal membuat transaksi');
    return res.json();
  },

  updateTransaction: async (id: string, data: Partial<Transaction>): Promise<Transaction> => {
    const res = await fetch(`/api/transactions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Gagal memperbarui transaksi');
    return res.json();
  },

  deleteTransaction: async (id: string): Promise<Transaction> => {
    const res = await fetch(`/api/transactions/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Gagal menghapus transaksi');
    return res.json();
  },

  // Wallets
  getWallets: async (): Promise<Wallet[]> => {
    const res = await fetch('/api/wallets');
    if (!res.ok) throw new Error('Gagal mengambil data dompet');
    return res.json();
  },

  createWallet: async (data: Partial<Wallet>): Promise<Wallet> => {
    const res = await fetch('/api/wallets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Gagal menambah dompet');
    return res.json();
  },

  updateWallet: async (id: string, data: Partial<Wallet>): Promise<Wallet> => {
    const res = await fetch(`/api/wallets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Gagal update dompet');
    return res.json();
  },

  // Budgets
  getBudgets: async (): Promise<Budget[]> => {
    const res = await fetch('/api/budgets');
    if (!res.ok) throw new Error('Gagal mengambil data anggaran');
    return res.json();
  },

  saveBudget: async (data: Partial<Budget>): Promise<Budget> => {
    const res = await fetch('/api/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Gagal menyimpan anggaran');
    return res.json();
  },

  // AI Services
  parseText: async (text: string) => {
    const res = await fetch('/api/ai/parse-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error('Gagal menganalisis teks');
    return res.json();
  },

  parseReceipt: async (base64Image: string, mimeType = 'image/jpeg', note = '') => {
    const res = await fetch('/api/ai/parse-receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Image, mimeType, note }),
    });
    if (!res.ok) throw new Error('Gagal menganalisis struk');
    return res.json();
  },

  parseVoice: async (base64Audio: string, mimeType = 'audio/webm') => {
    const res = await fetch('/api/ai/parse-voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Audio, mimeType }),
    });
    if (!res.ok) throw new Error('Gagal menganalisis suara');
    return res.json();
  },

  getAIInsights: async (): Promise<AIInsights> => {
    const res = await fetch('/api/ai/financial-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Gagal memuat konsultasi AI');
    return res.json();
  },

  // Telegram Simulator & Webhook
  simulateTelegram: async (payload: {
    message?: string;
    photoBase64?: string;
    audioBase64?: string;
    senderName?: string;
    chatId?: string;
  }) => {
    const res = await fetch('/api/telegram/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Gagal mensimulasikan pesan bot');
    return res.json();
  },

  getTelegramConfig: async (): Promise<TelegramConfig> => {
    const res = await fetch('/api/telegram/config');
    if (!res.ok) throw new Error('Gagal mengambil konfigurasi Telegram');
    return res.json();
  },

  saveTelegramConfig: async (config: Partial<TelegramConfig>): Promise<TelegramConfig> => {
    const res = await fetch('/api/telegram/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) throw new Error('Gagal menyimpan konfigurasi Telegram');
    return res.json();
  },

  testTelegramBot: async (botToken: string) => {
    const res = await fetch('/api/telegram/test-bot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botToken }),
    });
    return res.json();
  },

  registerTelegramWebhook: async (botToken: string) => {
    const res = await fetch('/api/telegram/register-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botToken }),
    });
    return res.json();
  },

  activateTelegramPolling: async (botToken: string) => {
    const res = await fetch('/api/telegram/activate-polling', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botToken }),
    });
    return res.json();
  },

  getTelegramLogs: async (): Promise<any[]> => {
    const res = await fetch('/api/telegram/logs');
    if (!res.ok) return [];
    return res.json();
  },

  getTelegramStatus: async () => {
    const res = await fetch('/api/telegram/status');
    if (!res.ok) return null;
    return res.json();
  },

  sendTestMessage: async (chatId?: string, text?: string) => {
    const res = await fetch('/api/telegram/send-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, text }),
    });
    return res.json();
  },

  syncData: async (payload: { clientTransactions?: any[]; clientWallets?: any[]; clientBudgets?: any[] }) => {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    return res.json();
  },
};

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

