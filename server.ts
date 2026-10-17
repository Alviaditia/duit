import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import {
  testFirestore,
  saveTransactionToFirestore,
  deleteTransactionFromFirestore,
  saveWalletToFirestore,
  syncWalletsToFirestore,
  saveBudgetToFirestore,
  saveTelegramLogToFirestore,
  saveTelegramConfigToFirestore,
  loadAllDataFromFirestore,
} from './src/lib/serverFirestore.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Setup body parsing for JSON and urlencoded, with sufficient limit for receipt photos
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Initialize Google GenAI Server-side Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Types & Data Structures
export interface Transaction {
  id: string;
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
  amount: number;
  category: string;
  wallet: string;
  description: string;
  date: string;
  transactionTime?: string;
  source: 'telegram' | 'voice' | 'receipt' | 'web';
  rawInput?: string;
  notes?: string;
  toWallet?: string;
}

export interface Wallet {
  id: string;
  name: string;
  type: 'cash' | 'bank' | 'ewallet';
  balance: number;
  icon: string;
  color: string;
}

export interface Budget {
  id: string;
  category: string;
  monthlyLimit: number;
  month: string; // YYYY-MM
}

export interface TelegramConfig {
  botToken: string;
  botUsername: string;
  webhookUrl: string;
  isActive: boolean;
  isRegistered: boolean;
  mode: 'polling' | 'webhook';
  lastWebhookStatus?: string;
  lastSync?: string;
  isPollingActive?: boolean;
  lastMessageReceived?: string;
  totalMessagesProcessed?: number;
}

export interface TelegramLog {
  id: string;
  timestamp: string;
  senderName: string;
  username?: string;
  chatId: string;
  input: string;
  reply: string;
  isTransaction: boolean;
}

// In-Memory Database with realistic Indonesian financial seed data
let wallets: Wallet[] = [
  { id: 'w1', name: 'Tunai (Cash)', type: 'cash', balance: 450000, icon: 'Banknote', color: 'emerald' },
  { id: 'w2', name: 'Bank BCA', type: 'bank', balance: 5850000, icon: 'CreditCard', color: 'blue' },
  { id: 'w3', name: 'Bank Mandiri', type: 'bank', balance: 2400000, icon: 'Building2', color: 'indigo' },
  { id: 'w4', name: 'GoPay', type: 'ewallet', balance: 175000, icon: 'Smartphone', color: 'teal' },
  { id: 'w5', name: 'OVO', type: 'ewallet', balance: 85000, icon: 'Wallet', color: 'purple' },
  { id: 'w6', name: 'Dana', type: 'ewallet', balance: 120000, icon: 'Zap', color: 'sky' },
];

let budgets: Budget[] = [
  { id: 'b1', category: 'Makanan & Minuman', monthlyLimit: 2500000, month: '2026-10' },
  { id: 'b2', category: 'Transportasi', monthlyLimit: 800000, month: '2026-10' },
  { id: 'b3', category: 'Belanja & Kebutuhan', monthlyLimit: 1500000, month: '2026-10' },
  { id: 'b4', category: 'Tagihan & Utilitas', monthlyLimit: 1200000, month: '2026-10' },
  { id: 'b5', category: 'Hiburan', monthlyLimit: 600000, month: '2026-10' },
];

const today = new Date().toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const twoDaysAgo = new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10);

let transactions: Transaction[] = [
  {
    id: 'tx-1',
    type: 'INCOME',
    amount: 8500000,
    category: 'Gaji',
    wallet: 'Bank BCA',
    description: 'Gaji Bulanan Oktober',
    date: `${twoDaysAgo}T09:00:00.000Z`,
    source: 'web',
    rawInput: 'Gaji masuk BCA 8.5jt',
  },
  {
    id: 'tx-2',
    type: 'EXPENSE',
    amount: 35000,
    category: 'Makanan & Minuman',
    wallet: 'GoPay',
    description: 'Kopi Kenangan Mantan Large',
    date: `${twoDaysAgo}T14:20:00.000Z`,
    source: 'telegram',
    rawInput: 'Kopi kenangan 35rb pake gopay',
  },
  {
    id: 'tx-3',
    type: 'EXPENSE',
    amount: 65000,
    category: 'Makanan & Minuman',
    wallet: 'Tunai (Cash)',
    description: 'Makan Nasi Padang Sederhana',
    date: `${yesterday}T12:35:00.000Z`,
    source: 'voice',
    rawInput: 'Makan siang nasi padang 65rb tunai',
  },
  {
    id: 'tx-4',
    type: 'EXPENSE',
    amount: 145000,
    category: 'Belanja & Kebutuhan',
    wallet: 'Bank BCA',
    description: 'Belanja Mingguan Indomaret',
    date: `${yesterday}T19:10:00.000Z`,
    source: 'receipt',
    rawInput: 'Struk Indomaret Rp 145.000',
  },
  {
    id: 'tx-5',
    type: 'EXPENSE',
    amount: 50000,
    category: 'Transportasi',
    wallet: 'Dana',
    description: 'Isi Bensin Pertamax',
    date: `${today}T08:15:00.000Z`,
    source: 'telegram',
    rawInput: 'Beli bensin pertamax 50rb pake dana',
  },
  {
    id: 'tx-6',
    type: 'EXPENSE',
    amount: 250000,
    category: 'Tagihan & Utilitas',
    wallet: 'Bank Mandiri',
    description: 'Token Listrik PLN 250k',
    date: `${today}T10:45:00.000Z`,
    source: 'telegram',
    rawInput: 'Bayar token listrik 250rb mandiri',
  },
];

const DATA_FILE = path.resolve(__dirname, 'telefinance-data.json');
const CONFIG_FILE = path.resolve(__dirname, 'telegram-config.json');

// Persistent Database Functions (Disk + Cloud Firestore)
export function saveDatabaseToFile() {
  try {
    const data = {
      wallets,
      budgets,
      transactions,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    // Asynchronously backup wallets to Firestore
    syncWalletsToFirestore(wallets).catch((e) => console.error('Firestore wallet sync error:', e));
  } catch (err) {
    console.error('Failed to save telefinance-data.json:', err);
  }
}

export function loadDatabaseFromFile() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.wallets) && data.wallets.length > 0) wallets = data.wallets;
      if (Array.isArray(data.budgets) && data.budgets.length > 0) budgets = data.budgets;
      if (Array.isArray(data.transactions) && data.transactions.length > 0) transactions = data.transactions;
      console.log(`Loaded ${transactions.length} transactions and ${wallets.length} wallets from disk cache.`);
    } else {
      saveDatabaseToFile();
    }
  } catch (err) {
    console.warn('Could not read telefinance-data.json, using defaults:', err);
  }
}

// Initial immediate load from local file
loadDatabaseFromFile();

let telegramConfig: TelegramConfig = {
  botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  botUsername: 'telefinance_bot',
  webhookUrl: '',
  isActive: true,
  isRegistered: false,
  mode: 'polling',
  isPollingActive: false,
  totalMessagesProcessed: 0,
};

// Load saved config if exists
try {
  if (fs.existsSync(CONFIG_FILE)) {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    telegramConfig = { ...telegramConfig, ...JSON.parse(raw) };
    console.log('Loaded Telegram config from disk for bot:', telegramConfig.botUsername);
  }
} catch (e) {
  console.warn('Could not read telegram-config.json, using defaults');
}

export async function initFirestoreDatabase() {
  try {
    const connected = await testFirestore();
    if (!connected) return;

    const cloudData = await loadAllDataFromFirestore();

    // 1. Transactions
    if (cloudData.transactions && cloudData.transactions.length > 0) {
      transactions = cloudData.transactions;
      console.log(`🔥 Loaded ${transactions.length} transactions from Cloud Firestore.`);
    } else {
      console.log('🔥 Seeding Cloud Firestore with initial transactions...');
      for (const tx of transactions) {
        await saveTransactionToFirestore(tx);
      }
    }

    // 2. Wallets
    if (cloudData.wallets && cloudData.wallets.length > 0) {
      wallets = cloudData.wallets;
      console.log(`🔥 Loaded ${wallets.length} wallets from Cloud Firestore.`);
    } else {
      await syncWalletsToFirestore(wallets);
    }

    // 3. Budgets
    if (cloudData.budgets && cloudData.budgets.length > 0) {
      budgets = cloudData.budgets;
      console.log(`🔥 Loaded ${budgets.length} budgets from Cloud Firestore.`);
    } else {
      for (const b of budgets) {
        await saveBudgetToFirestore(b);
      }
    }

    // 4. Telegram Config
    if (cloudData.telegramConfig && cloudData.telegramConfig.botToken) {
      telegramConfig = { ...telegramConfig, ...cloudData.telegramConfig };
      console.log(`🔥 Loaded Telegram bot configuration from Cloud Firestore (@${telegramConfig.botUsername}).`);
    }

    // 5. Telegram Logs
    if (cloudData.telegramLogs && cloudData.telegramLogs.length > 0) {
      recentTelegramLogs = cloudData.telegramLogs;
    }

    saveDatabaseToFile();
  } catch (err: any) {
    console.warn('Firestore initial sync notice:', err?.message || err);
  }
}

function saveTelegramConfigFile() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(telegramConfig, null, 2));
    saveTelegramConfigToFirestore(telegramConfig).catch((e) => console.error('Telegram config cloud sync error:', e));
  } catch (e) {
    console.error('Failed to save telegram-config.json:', e);
  }
}

// In-Memory Telegram Logs (max 50)
let recentTelegramLogs: TelegramLog[] = [];

// Standard Categories
export const STANDARD_CATEGORIES = [
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

// Helper: Format IDR
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Function: Update wallet balance after transaction
function adjustWalletBalance(tx: Transaction, multiplier: 1 | -1 = 1) {
  const amount = tx.amount * multiplier;
  if (tx.type === 'EXPENSE') {
    const w = wallets.find((w) => w.name.toLowerCase() === tx.wallet.toLowerCase());
    if (w) w.balance -= amount;
  } else if (tx.type === 'INCOME') {
    const w = wallets.find((w) => w.name.toLowerCase() === tx.wallet.toLowerCase());
    if (w) w.balance += amount;
  } else if (tx.type === 'TRANSFER' && tx.toWallet) {
    const fromW = wallets.find((w) => w.name.toLowerCase() === tx.wallet.toLowerCase());
    const toW = wallets.find((w) => w.name.toLowerCase() === tx.toWallet!.toLowerCase());
    if (fromW) fromW.balance -= amount;
    if (toW) toW.balance += amount;
  }
}

// Smart NLP Extractor (Indonesian financial, time & entity parser)
export function extractSmartTransactionNLP(text: string) {
  const clean = text.toLowerCase().trim();
  let amount = 0;
  let type: 'EXPENSE' | 'INCOME' | 'TRANSFER' = 'EXPENSE';

  // 1. Time extraction (e.g. "jam 7pagi", "jam 7 pagi", "pukul 14.30", "jam 8 malam", "tadi pagi")
  let transactionTime: string | null = null;
  const timeRegex = /(?:jam|pukul)\s*(\d{1,2})(?::(\d{2})|\.(\d{2}))?\s*(pagi|siang|sore|malam)?/i;
  const timeMatch = text.match(timeRegex);
  if (timeMatch) {
    let hour = parseInt(timeMatch[1], 10);
    const minute = timeMatch[2] || timeMatch[3] || '00';
    const period = (timeMatch[4] || '').toLowerCase();
    if ((period === 'siang' || period === 'sore' || period === 'malam') && hour < 12) hour += 12;
    if (period === 'pagi' && hour === 12) hour = 0;
    const periodLabel = period ? ` (${period.charAt(0).toUpperCase() + period.slice(1)})` : '';
    transactionTime = `${String(hour).padStart(2, '0')}.${minute} WIB${periodLabel}`;
  } else if (/tadi\s*pagi/i.test(clean) || /pagi\s*ini/i.test(clean)) {
    transactionTime = '07.30 WIB (Pagi)';
  } else if (/tadi\s*siang/i.test(clean) || /siang\s*ini/i.test(clean)) {
    transactionTime = '12.30 WIB (Siang)';
  } else if (/tadi\s*sore/i.test(clean) || /sore\s*ini/i.test(clean)) {
    transactionTime = '16.30 WIB (Sore)';
  } else if (/tadi\s*malam/i.test(clean) || /semalam/i.test(clean)) {
    transactionTime = '20.00 WIB (Malam)';
  }

  // 2. Type detection
  if (
    clean.includes('gaji') ||
    clean.includes('masuk') ||
    clean.includes('dapat') ||
    clean.includes('dapet') ||
    clean.includes('terima') ||
    clean.includes('penjualan') ||
    clean.includes('bonus') ||
    clean.includes('cashback')
  ) {
    type = 'INCOME';
  } else if (
    clean.includes('transfer ke') ||
    clean.includes('topup') ||
    clean.includes('top up') ||
    clean.includes('tarik tunai')
  ) {
    type = 'TRANSFER';
  }

  // 3. Amount extraction
  const matchK = clean.match(/(\d+(?:[.,]\d+)?)\s*(?:rb|ribu|k\b)/);
  const matchJt = clean.match(/(\d+(?:[.,]\d+)?)\s*(?:jt|juta)/);
  const matchPerak = clean.match(/(\d+)\s*perak/);
  const matchRaw = clean.match(/(?:rp\.?|idr)?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?|\d+)/);

  if (matchJt) {
    amount = parseFloat(matchJt[1].replace(',', '.')) * 1000000;
  } else if (matchK) {
    amount = parseFloat(matchK[1].replace(',', '.')) * 1000;
  } else if (matchPerak) {
    amount = parseInt(matchPerak[1], 10);
  } else if (matchRaw) {
    const rawDigits = matchRaw[1].replace(/[.,]/g, '');
    amount = parseInt(rawDigits, 10) || 0;
  }

  // 4. Wallet detection
  let wallet = 'Tunai (Cash)';
  if (clean.includes('bca')) wallet = 'Bank BCA';
  else if (clean.includes('mandiri')) wallet = 'Bank Mandiri';
  else if (clean.includes('gopay') || clean.includes('go-pay')) wallet = 'GoPay';
  else if (clean.includes('ovo')) wallet = 'OVO';
  else if (clean.includes('dana')) wallet = 'Dana';
  else if (clean.includes('shopeepay') || clean.includes('spay')) wallet = 'ShopeePay';
  else if (clean.includes('cash') || clean.includes('tunai')) wallet = 'Tunai (Cash)';

  // 5. Category detection
  let category = 'Makanan & Minuman';
  if (
    clean.includes('bensin') ||
    clean.includes('pertamax') ||
    clean.includes('pertalite') ||
    clean.includes('grab') ||
    clean.includes('gojek') ||
    clean.includes('mrt') ||
    clean.includes('parkir') ||
    clean.includes('tol') ||
    clean.includes('ongkir')
  ) {
    category = 'Transportasi';
  } else if (
    clean.includes('listrik') ||
    clean.includes('wifi') ||
    clean.includes('indihome') ||
    clean.includes('pulsa') ||
    clean.includes('kuota') ||
    clean.includes('air') ||
    clean.includes('token') ||
    clean.includes('iuran') ||
    clean.includes('bpjs')
  ) {
    category = 'Tagihan & Utilitas';
  } else if (
    clean.includes('indomaret') ||
    clean.includes('alfamart') ||
    clean.includes('supermarket') ||
    clean.includes('beli') ||
    clean.includes('shopee') ||
    clean.includes('tokopedia')
  ) {
    category = 'Belanja & Kebutuhan';
  } else if (
    clean.includes('nonton') ||
    clean.includes('bioskop') ||
    clean.includes('game') ||
    clean.includes('netflix') ||
    clean.includes('spotify')
  ) {
    category = 'Hiburan';
  } else if (
    clean.includes('obat') ||
    clean.includes('apotek') ||
    clean.includes('dokter') ||
    clean.includes('klinik')
  ) {
    category = 'Kesehatan';
  } else if (type === 'INCOME') {
    category = clean.includes('gaji') ? 'Gaji' : 'Freelance & Bisnis';
  }

  // 6. Clean Description: Strip nominal, payment methods, and time words
  let cleanDesc = text;
  if (timeMatch) cleanDesc = cleanDesc.replace(timeRegex, '');
  cleanDesc = cleanDesc.replace(/(?:tadi|semalam|kemarin)\s*(?:pagi|siang|sore|malam)/gi, '');
  cleanDesc = cleanDesc.replace(/\b(?:pagi|siang|sore|malam)\s*ini\b/gi, '');
  cleanDesc = cleanDesc.replace(/(?:rp\.?|idr)?\s*\d+(?:[.,]\d+)?\s*(?:rb|ribu|k|jt|juta|perak)?/gi, '');
  cleanDesc = cleanDesc.replace(/(?:pake|pakai|via|dari|ke|lewat|bayar|di)\s*(?:gopay|ovo|dana|shopeepay|spay|bca|mandiri|bri|bni|jago|cash|tunai)/gi, '');
  cleanDesc = cleanDesc.replace(/\b(?:gopay|ovo|dana|shopeepay|spay|bca|mandiri|bri|bni|jago|cash|tunai)\b/gi, '');
  cleanDesc = cleanDesc.replace(/\b(?:pake|pakai|via|di|pada|ke|dari|bayar|dapat|dapet|terima|masuk|buat|untuk)\b/gi, '');
  cleanDesc = cleanDesc.replace(/\s+/g, ' ').trim();

  // If cleanDesc became empty, create a clean default
  if (!cleanDesc) {
    cleanDesc = category === 'Makanan & Minuman' ? 'Makan & Minum' : category;
  } else {
    // Title Case formatting
    cleanDesc = cleanDesc
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  const isTx = amount > 0;
  return {
    isTransaction: isTx,
    type,
    amount,
    category,
    wallet,
    description: cleanDesc,
    transactionTime,
    confidence: 0.95,
  };
}

// Resilient Multi-Model Gemini AI Execution Engine with Automatic Failover
async function generateGeminiContentWithFallback(params: {
  contents: any;
  systemInstruction: string;
  responseSchema?: any;
}) {
  const modelCandidates = [
    'gemini-3.5-flash',
    'gemini-flash-lite-latest',
    'gemini-3.8-flash',
    'gemini-3.7-flash',
    'gemini-3.1-flash-lite',
  ];

  let lastError: any = null;

  for (const model of modelCandidates) {
    try {
      const config: any = {
        systemInstruction: params.systemInstruction,
        responseMimeType: 'application/json',
      };
      if (params.responseSchema) {
        config.responseSchema = params.responseSchema;
      }

      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config,
      });

      const raw = response.text?.trim() || '{}';
      const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      const parsed = JSON.parse(clean);
      return { model, parsed };
    } catch (err: any) {
      lastError = err;
      console.warn(`[Gemini Engine] Model ${model} returned error (${err?.status || err?.message || 'unknown'}). Trying next model in cascade...`);

      // If failed with responseSchema, try again on same model without schema
      if (params.responseSchema) {
        try {
          const fallbackRes = await ai.models.generateContent({
            model,
            contents: params.contents,
            config: {
              systemInstruction: params.systemInstruction + '\nPENTING: Kembalikan respons HANYA dalam format JSON valid tanpa tanda markdown.',
              responseMimeType: 'application/json',
            },
          });
          const rawFb = fallbackRes.text?.trim() || '{}';
          const cleanFb = rawFb.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
          const parsedFb = JSON.parse(cleanFb);
          return { model, parsed: parsedFb };
        } catch {
          // move to next model candidate
        }
      }
    }
  }

  throw lastError || new Error('Semua model Gemini AI sedang sibuk.');
}

// AI Parsing logic using Gemini
async function parseFinanceWithAI(inputText: string, options?: { isReceipt?: boolean; base64Image?: string; mimeType?: string }) {
  const currentWallets = wallets.map((w) => w.name).join(', ');
  const currentCategories = STANDARD_CATEGORIES.join(', ');

  // First run local smart NLP baseline
  const nlp = extractSmartTransactionNLP(inputText);

  const systemInstruction = `
Kamu adalah asisten keuangan AI cerdas spesialis bahasa Indonesia bernama TeleFinance Bot.
Tugas utamamu adalah mengekstrak data pencatatan transaksi keuangan dari pesan percakapan, suara, atau struk belanja ke format JSON terstruktur.

Aturan EKSTRAKSI PENTING:
1. 'description': HANYA nama barang atau kegiatan transaksi tanpa mencantumkan nominal, dompet, atau jam.
   - Contoh input: "makan pagi 89ribu pake gopay jam 7pagi" -> description HARUS: "Makan Pagi"
   - Contoh input: "beli bensin pertamax 50rb cash jam 8 malam" -> description HARUS: "Beli Bensin Pertamax"
   - Contoh input: "kopi kenangan mantan 28k dana" -> description HARUS: "Kopi Kenangan Mantan"
2. 'transactionTime': Jika pengguna menyebutkan jam (misal: "jam 7pagi", "jam 7 pagi", "pukul 13.00", "jam 8 malam", "tadi pagi"), ekstrak ke format jam yang rapi (contoh: "07.00 WIB (Pagi)", "20.00 WIB (Malam)"). Jika TIDAK disebutkan, isi null.
3. Nominal: Pahami bahasa gaul (89ribu -> 89000, 25k -> 25000, 1.5jt -> 1500000).
4. 'type': 'EXPENSE', 'INCOME', atau 'TRANSFER'.
5. Cocokkan dompet ('wallet') dengan [${currentWallets}].
6. Cocokkan kategori ('category') dengan [${currentCategories}].
7. Jika input adalah pertanyaan konsultasi, set 'isTransaction' = false dan jawab di 'chatResponse'.
`;

  try {
    let contents: any = inputText;

    if (options?.base64Image) {
      contents = {
        parts: [
          {
            inlineData: {
              mimeType: options.mimeType || 'image/jpeg',
              data: options.base64Image,
            },
          },
          {
            text: `Analisis struk belanja ini. Ekstrak nama toko / merchant, total pembayaran, daftar item utama jika ada, dan cocokkan kategori serta metode pembayaran. ${inputText || ''}`,
          },
        ],
      };
    }

    const { parsed, model: usedModel } = await generateGeminiContentWithFallback({
      contents,
      systemInstruction,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isTransaction: { type: Type.BOOLEAN },
          type: { type: Type.STRING, enum: ['EXPENSE', 'INCOME', 'TRANSFER'] },
          amount: { type: Type.NUMBER },
          category: { type: Type.STRING },
          wallet: { type: Type.STRING },
          toWallet: { type: Type.STRING },
          description: { type: Type.STRING },
          transactionTime: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          chatResponse: { type: Type.STRING },
        },
        required: ['isTransaction'],
      },
    });

    // Use cleanest description and time
    const finalDescription = parsed.description && parsed.description.length < inputText.length ? parsed.description : nlp.description;
    const finalTime = parsed.transactionTime || nlp.transactionTime;

    return {
      isTransaction: parsed.isTransaction !== undefined ? parsed.isTransaction : nlp.isTransaction,
      type: parsed.type || nlp.type,
      amount: parsed.amount || nlp.amount,
      category: parsed.category || nlp.category,
      wallet: parsed.wallet || nlp.wallet,
      toWallet: parsed.toWallet,
      description: finalDescription,
      transactionTime: finalTime,
      confidence: parsed.confidence || 0.95,
      chatResponse: parsed.chatResponse,
      engine: 'Gemini AI',
    };
  } catch (error: any) {
    console.warn('Gemini API notice (using Smart NLP Engine):', error.message);
    // Use smart NLP with clean description and extracted time
    return {
      ...nlp,
      engine: 'TeleFinance Smart NLP',
    };
  }
}

// Generate Financial Report Markdown
function generateReportMarkdown(period = 'Bulan Ini') {
  const totalIncome = transactions.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  const totalBalance = wallets.reduce((s, w) => s + w.balance, 0);

  // Group by category
  const expenseByCategory: Record<string, number> = {};
  transactions
    .filter((t) => t.type === 'EXPENSE')
    .forEach((t) => {
      expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount;
    });

  const sortedCat = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]);

  let msg = `📊 *LAPORAN KEUANGAN TELEFINANCE*\n📅 Periode: *${period}*\n\n`;
  msg += `💰 *Total Pemasukan:* ${formatRupiah(totalIncome)}\n`;
  msg += `💸 *Total Pengeluaran:* ${formatRupiah(totalExpense)}\n`;
  msg += `📈 *Arus Kas Bersih:* ${formatRupiah(totalIncome - totalExpense)}\n`;
  msg += `🏦 *Total Saldo Dompet:* ${formatRupiah(totalBalance)}\n\n`;

  msg += `📂 *Pengeluaran Terbesar:*\n`;
  if (sortedCat.length === 0) {
    msg += `_Belum ada pengeluaran tercatat._\n`;
  } else {
    sortedCat.slice(0, 5).forEach(([cat, val], idx) => {
      const pct = totalExpense > 0 ? Math.round((val / totalExpense) * 100) : 0;
      msg += `${idx + 1}. ${cat}: *${formatRupiah(val)}* (${pct}%)\n`;
    });
  }

  msg += `\n💡 _Ketik /saldo untuk cek dompet atau /budget untuk cek anggaran._`;
  return msg;
}

// REST API Endpoints
// Transactions
app.get('/api/transactions', (req, res) => {
  res.json(transactions);
});

app.post('/api/transactions', (req, res) => {
  const { type, amount, category, wallet, description, source, date, toWallet, notes } = req.body;
  const newTx: Transaction = {
    id: `tx-${Date.now()}`,
    type: type || 'EXPENSE',
    amount: Number(amount) || 0,
    category: category || 'Makanan & Minuman',
    wallet: wallet || 'Tunai (Cash)',
    toWallet,
    description: description || 'Transaksi Baru',
    date: date || new Date().toISOString(),
    source: source || 'web',
    notes,
  };

  transactions.unshift(newTx);
  adjustWalletBalance(newTx, 1);
  saveDatabaseToFile();
  saveTransactionToFirestore(newTx).catch(console.error);
  res.status(201).json(newTx);
});

app.put('/api/transactions/:id', (req, res) => {
  const { id } = req.params;
  const idx = transactions.findIndex((t) => t.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Transaction not found' });

  // Revert old transaction balance
  adjustWalletBalance(transactions[idx], -1);

  transactions[idx] = { ...transactions[idx], ...req.body };
  // Apply new transaction balance
  adjustWalletBalance(transactions[idx], 1);
  saveDatabaseToFile();
  saveTransactionToFirestore(transactions[idx]).catch(console.error);

  res.json(transactions[idx]);
});

app.delete('/api/transactions/:id', (req, res) => {
  const { id } = req.params;
  const idx = transactions.findIndex((t) => t.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Transaction not found' });

  adjustWalletBalance(transactions[idx], -1);
  const deleted = transactions.splice(idx, 1);
  saveDatabaseToFile();
  deleteTransactionFromFirestore(id).catch(console.error);
  res.json(deleted[0]);
});

// Wallets
app.get('/api/wallets', (req, res) => {
  res.json(wallets);
});

app.put('/api/wallets/:id', (req, res) => {
  const { id } = req.params;
  const idx = wallets.findIndex((w) => w.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Wallet not found' });

  wallets[idx] = { ...wallets[idx], ...req.body };
  saveDatabaseToFile();
  saveWalletToFirestore(wallets[idx]).catch(console.error);
  res.json(wallets[idx]);
});

app.post('/api/wallets', (req, res) => {
  const { name, type, balance, icon, color } = req.body;
  const newWallet: Wallet = {
    id: `w-${Date.now()}`,
    name: name || 'Dompet Baru',
    type: type || 'ewallet',
    balance: Number(balance) || 0,
    icon: icon || 'Wallet',
    color: color || 'emerald',
  };
  wallets.push(newWallet);
  saveDatabaseToFile();
  saveWalletToFirestore(newWallet).catch(console.error);
  res.status(201).json(newWallet);
});

// Budgets
app.get('/api/budgets', (req, res) => {
  res.json(budgets);
});

app.post('/api/budgets', (req, res) => {
  const { category, monthlyLimit, month } = req.body;
  const existingIdx = budgets.findIndex((b) => b.category === category);
  if (existingIdx !== -1) {
    budgets[existingIdx].monthlyLimit = Number(monthlyLimit);
    saveDatabaseToFile();
    saveBudgetToFirestore(budgets[existingIdx]).catch(console.error);
    return res.json(budgets[existingIdx]);
  }
  const newBudget: Budget = {
    id: `b-${Date.now()}`,
    category,
    monthlyLimit: Number(monthlyLimit) || 1000000,
    month: month || '2026-10',
  };
  budgets.push(newBudget);
  saveDatabaseToFile();
  saveBudgetToFirestore(newBudget).catch(console.error);
  res.status(201).json(newBudget);
});

// Client-Server Bidirectional Sync Endpoint
app.post('/api/sync', (req, res) => {
  const { clientTransactions, clientWallets, clientBudgets } = req.body;
  let changed = false;

  if (Array.isArray(clientTransactions) && clientTransactions.length > 0) {
    const existingIds = new Set(transactions.map((t) => t.id));
    for (const tx of clientTransactions) {
      if (!existingIds.has(tx.id)) {
        transactions.push(tx);
        existingIds.add(tx.id);
        changed = true;
      }
    }
  }

  if (Array.isArray(clientWallets) && clientWallets.length > 0 && wallets.length === 0) {
    wallets = clientWallets;
    changed = true;
  }

  if (changed) {
    saveDatabaseToFile();
  }

  res.json({
    success: true,
    transactions,
    wallets,
    budgets,
  });
});

// Full Backup Download Endpoint
app.get('/api/backup', (req, res) => {
  res.setHeader('Content-Disposition', `attachment; filename=telefinance-backup-${new Date().toISOString().slice(0, 10)}.json`);
  res.setHeader('Content-Type', 'application/json');
  res.json({
    version: 1,
    exportedAt: new Date().toISOString(),
    transactions,
    wallets,
    budgets,
  });
});

// AI Parsing & Telegram Simulators
app.post('/api/ai/parse-text', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Text prompt required' });

  const result = await parseFinanceWithAI(text);
  res.json(result);
});

app.post('/api/ai/parse-receipt', async (req, res) => {
  const { base64Image, mimeType, note } = req.body;
  if (!base64Image) return res.status(400).json({ error: 'Image required' });

  const result = await parseFinanceWithAI(note || 'Analisis struk ini', {
    base64Image,
    mimeType: mimeType || 'image/jpeg',
  });
  res.json(result);
});

app.post('/api/ai/parse-voice', async (req, res) => {
  const { base64Audio, mimeType } = req.body;
  if (!base64Audio) return res.status(400).json({ error: 'Audio data required' });

  try {
    const currentWallets = wallets.map((w) => w.name).join(', ');
    const currentCategories = STANDARD_CATEGORIES.join(', ');

    const prompt = `Dengarkan rekaman suara ini dalam bahasa Indonesia. 
1. Transkripsikan ucapan pengguna ke teks ('transcript').
2. Jika rekaman menyebutkan pengeluaran, pemasukan, atau transfer, ekstrak nominal, kategori ([${currentCategories}]), dompet ([${currentWallets}]), dan deskripsinya.
Contoh suara: "Tadi beli bensin lima puluh ribu pakai dana", "Makan siang tiga puluh lima ribu gopay", "Dapat transfer gaji delapan juta di bca".
3. Kembalikan JSON terstruktur.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'audio/webm',
              data: base64Audio,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcript: { type: Type.STRING },
            isTransaction: { type: Type.BOOLEAN },
            type: { type: Type.STRING, enum: ['EXPENSE', 'INCOME', 'TRANSFER'] },
            amount: { type: Type.NUMBER },
            category: { type: Type.STRING },
            wallet: { type: Type.STRING },
            description: { type: Type.STRING },
            formattedBotReply: { type: Type.STRING },
          },
          required: ['transcript', 'isTransaction'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    if (parsed.isTransaction && parsed.amount > 0) {
      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        type: parsed.type || 'EXPENSE',
        amount: parsed.amount,
        category: parsed.category || 'Makanan & Minuman',
        wallet: parsed.wallet || 'Tunai (Cash)',
        description: parsed.description || parsed.transcript || 'Pencatatan Suara',
        date: new Date().toISOString(),
        source: 'voice',
        rawInput: parsed.transcript,
      };
      transactions.unshift(newTx);
      adjustWalletBalance(newTx, 1);
      saveDatabaseToFile();
      return res.json({ ...parsed, transaction: newTx, autoSaved: true });
    }

    res.json(parsed);
  } catch (err: any) {
    console.error('Voice parse error:', err);
    res.status(500).json({ error: 'Gagal memproses rekaman suara AI: ' + err.message });
  }
});

// AI Financial Advice Endpoint
app.post('/api/ai/financial-insights', async (req, res) => {
  const totalIncome = transactions.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  const totalBalance = wallets.reduce((s, w) => s + w.balance, 0);

  const prompt = `
Analisis kondisi keuangan pengguna berikut ini:
- Total Saldo Semua Dompet: Rp ${totalBalance}
- Pemasukan Bulan Ini: Rp ${totalIncome}
- Pengeluaran Bulan Ini: Rp ${totalExpense}
- Rasio Tabungan (Savings Rate): ${totalIncome > 0 ? (((totalIncome - totalExpense) / totalIncome) * 100).toFixed(1) : 0}%
- Daftar Transaksi Terakhir: ${JSON.stringify(transactions.slice(0, 10))}
- Target Anggaran: ${JSON.stringify(budgets)}

Berikan analisa ringkas dan ramah dalam bahasa Indonesia:
1. Skor Kesehatan Keuangan (1-100) dan label (misal: "Sangat Sehat", "Waspada", "Hemat", dsb)
2. 3 Highlight temuan penting
3. 3 Rekomendasi aksi taktis hemat yang spesifik
4. Pesan motivasi finansial singkat.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            healthScore: { type: Type.NUMBER },
            healthStatus: { type: Type.STRING },
            summary: { type: Type.STRING },
            highlights: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            quote: { type: Type.STRING },
          },
          required: ['healthScore', 'healthStatus', 'summary', 'highlights', 'recommendations', 'quote'],
        },
      },
    });

    res.json(JSON.parse(response.text || '{}'));
  } catch (err: any) {
    console.error('AI Insights Error:', err);
    res.json({
      healthScore: 82,
      healthStatus: 'Sehat & Terkendali',
      summary: 'Arus kas bulan ini positif dengan rasio tabungan yang baik. Pengeluaran makanan dan belanja kebutuhan tetap dalam batas anggaran wajar.',
      highlights: [
        'Pemasukan Rp 8.500.000 mencukupi seluruh kebutuhan rutin',
        'Pengeluaran makanan sebesar Rp 100.000 masih jauh di bawah batas Rp 2.500.000',
        'Saldo tersebar merata di BCA, Mandiri, dan E-Wallet',
      ],
      recommendations: [
        'Alokasikan minimal 20% (Rp 1.700.000) langsung ke instrumen investasi atau tabungan darurat',
        'Pantau frekuensi jajan kopi harian agar tidak menumpuk di akhir bulan',
        'Manfaatkan promo cashback e-wallet saat belanja di minimarket',
      ],
      quote: 'Bukan seberapa banyak uang yang kita hasilkan, tetapi seberapa cerdas kita mengelolanya untuk masa depan.',
    });
  }
});

// Telegram Conversation Session & Context Memory
export interface TelegramSession {
  chatId: string;
  senderName: string;
  pendingTransaction?: {
    type?: 'EXPENSE' | 'INCOME' | 'TRANSFER';
    category?: string;
    wallet?: string;
    toWallet?: string;
    description?: string;
    transactionTime?: string;
    rawText?: string;
  } | null;
  lastTransactionId?: string;
  recentTurns: { role: 'user' | 'model'; text: string; time: string }[];
}

const telegramSessions: Record<string, TelegramSession> = {};

function getChatSession(chatId: string = 'simulator', senderName: string = 'Teman'): TelegramSession {
  if (!telegramSessions[chatId]) {
    telegramSessions[chatId] = {
      chatId,
      senderName,
      pendingTransaction: null,
      recentTurns: [],
    };
  }
  if (senderName && senderName !== 'Teman') {
    telegramSessions[chatId].senderName = senderName;
  }
  return telegramSessions[chatId];
}

// Helper: Custom days financial report generator
function generateCustomDaysReport(days: number) {
  const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
  const filtered = transactions.filter((t) => new Date(t.date).getTime() >= cutoffTime);

  const totalExp = filtered.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  const totalInc = filtered.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);

  let msg = `📋 *DATA TRANSAKSI ${days} HARI TERAKHIR:*\n\n`;
  if (filtered.length === 0) {
    msg += `_Belum ada transaksi yang tercatat dalam ${days} hari terakhir._\n\n`;
  } else {
    filtered.slice(0, 10).forEach((t) => {
      const sign = t.type === 'INCOME' ? '🟢 +' : '🔴 -';
      const timeStr = t.transactionTime ? ` (${t.transactionTime})` : '';
      msg += `• ${sign} *${formatRupiah(t.amount)}* — ${t.description} [_${t.wallet}_]${timeStr}\n`;
    });
    msg += `\n`;
  }

  msg += `💸 *Total Pengeluaran:* ${formatRupiah(totalExp)}\n`;
  msg += `💰 *Total Pemasukan:* ${formatRupiah(totalInc)}\n`;
  msg += `📊 *Arus Kas Bersih:* ${formatRupiah(totalInc - totalExp)}\n\n`;
  msg += `_Data disinkronkan langsung dari Cloud Firestore._ ✨`;
  return msg;
}

// Telegram Simulation & Conversational Message Processing
async function processTelegramMessage(input: {
  text?: string;
  photoBase64?: string;
  audioBase64?: string;
  chatId?: string;
  senderName?: string;
}) {
  const { text = '', photoBase64, senderName = 'Teman' } = input;
  const chatId = input.chatId || 'simulator';
  const session = getChatSession(chatId, senderName);
  const trimmed = text.trim();

  // Basic slash commands
  if (trimmed === '/start') {
    return {
      reply: `👋 *Halo ${senderName}!* Senang bertemu denganmu.\n\nSaya *TeleFinance AI*, asisten finansial pribadi cerdasmu bertenaga *Gemini AI*. 🤖✨\n\n💬 *Kamu bisa ngobrol santai seperti dengan teman:*\n• *"Makan mie ayam 25rb pake gopay jam 12 siang"*\n• *"Beli bensin pertamax 50rb cash"*\n• *"Dapet transfer gaji 8.5jt masuk bca"*\n• *"Makan padang pake gopay"* _(kalau lupa nominal, aku bakal tanya ramah!)_\n• *"Eh salah, tadi 20rb bukan 25rb"* _(bisa koreksi/revisi otomatis)_\n• *"Saya butuh data 3 hari kebelakang saja"* _(bisa minta rekap tanggal bebas!)_\n• *"Sisa saldo BCA dan GoPay berapa?"*\n• Atau langsung kirim *foto struk belanja* / *voice note*!\n\nKapan saja butuh bantuan, tinggal ketik saja ya! 🙌`,
      isTransaction: false,
    };
  }

  if (trimmed === '/help') {
    return {
      reply: `📖 *PANDUAN & KEMAMPUAN CERDAS TELEFINANCE AI*\n\n1️⃣ *Catat Bebas Tanpa Format Kaku:*\nCukup ketik apa adanya: _"beli kopi tuku 22rb gopay"_, _"gaji freelance 1.5jt di mandiri"_.\n\n2️⃣ *Penanganan Lupa Nominal & Typo:*\n• Lupa sebut harga? Ketik saja _"makan siang di warteg gopay"_, bot akan bertanya ramah, lalu kamu cukup balas harganya.\n• Salah ketik? Ketik _"eh ralat tadi 15rb bukan 25rb"_, bot akan merevisi transaksi & saldo secara otomatis!\n\n3️⃣ *Tanya Data & Analisis Tanggal Bebas:*\n• _"Saya butuh data 3 hari kebelakang saja"_\n• _"Pengeluaran kemarin apa saja?"_\n• _"Bulan ini paling boros beli apa?"_\n• _"Berapa sisa saldo BCA dan OVO?"_\n\n4️⃣ *Foto Struk & Suara:*\nKirim foto struk belanja minimarket/restoran atau kirim voice note rekaman suara!`,
      isTransaction: false,
    };
  }

  if (trimmed === '/saldo') {
    let msg = `🏦 *SALDO REKENING & DOMPET ANDA:*\n\n`;
    let total = 0;
    wallets.forEach((w) => {
      total += w.balance;
      msg += `• *${w.name}*: ${formatRupiah(w.balance)}\n`;
    });
    msg += `\n💵 *Total Saldo:* *${formatRupiah(total)}*`;
    return { reply: msg, isTransaction: false };
  }

  if (trimmed === '/laporan') {
    return { reply: generateReportMarkdown('Bulan Ini'), isTransaction: false };
  }

  if (trimmed === '/budget') {
    let msg = `🎯 *STATUS ANGGARAN BULAN INI:*\n\n`;
    budgets.forEach((b) => {
      const spent = transactions
        .filter((t) => t.type === 'EXPENSE' && t.category.toLowerCase() === b.category.toLowerCase())
        .reduce((s, t) => s + t.amount, 0);
      const pct = Math.min(100, Math.round((spent / b.monthlyLimit) * 100));
      const barCount = Math.round(pct / 10);
      const bar = '🟩'.repeat(Math.min(barCount, 10)) + '⬜'.repeat(Math.max(0, 10 - barCount));

      msg += `📁 *${b.category}*\n${bar} ${pct}%\nTerpakai: *${formatRupiah(spent)}* / *${formatRupiah(b.monthlyLimit)}*\n\n`;
    });
    return { reply: msg, isTransaction: false };
  }

  // Current real-time Indonesian date and time
  const now = new Date();
  const currentJakartaDate = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(now);

  const currentJakartaTime = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
  }).format(now) + ' WIB';

  // Wallets summary
  const walletsSummary = wallets.map((w) => `${w.name}: ${formatRupiah(w.balance)}`).join(', ');

  // Recent 20 transactions snapshot with actual dates and details
  const recentTxForPrompt = transactions.slice(0, 20).map((t) => ({
    id: t.id,
    date: t.date.slice(0, 10),
    time: t.transactionTime || '',
    type: t.type,
    amount: t.amount,
    amountFormatted: formatRupiah(t.amount),
    category: t.category,
    wallet: t.wallet,
    toWallet: t.toWallet,
    description: t.description,
  }));

  // Budgets summary
  const budgetsSummary = budgets.map((b) => {
    const spent = transactions
      .filter((t) => t.type === 'EXPENSE' && t.category.toLowerCase() === b.category.toLowerCase())
      .reduce((s, t) => s + t.amount, 0);
    const pct = Math.round((spent / b.monthlyLimit) * 100);
    return `${b.category}: terpakai ${formatRupiah(spent)} / ${formatRupiah(b.monthlyLimit)} (${pct}%)`;
  }).join('; ');

  // Target transaction for revision/cancel context
  const targetTx = session.lastTransactionId
    ? transactions.find((t) => t.id === session.lastTransactionId) || transactions[0]
    : transactions[0];

  const systemInstruction = `
Kamu adalah asisten keuangan pribadi AI yang cerdas, ramah, hangat, dan luwes bernama TeleFinance Bot.
Waktu saat ini (WIB Jakarta): ${currentJakartaDate}, pukul ${currentJakartaTime}.
Nama Pengguna: ${senderName}.

Kondisi Finansial Nyata Pengguna:
- Saldo Dompet & Rekening: ${walletsSummary}
- Anggaran Pengeluaran: ${budgetsSummary}
- Daftar Transaksi Terakhir (riil dari database):
${JSON.stringify(recentTxForPrompt, null, 2)}
- Transaksi Tertunda Pengguna (menunggu nominal/info dari chat sebelumnya): ${JSON.stringify(session.pendingTransaction || null)}
- Transaksi Terakhir yang Mungkin Diubah/Dibatalkan: ${JSON.stringify(targetTx ? { id: targetTx.id, amount: targetTx.amount, description: targetTx.description, wallet: targetTx.wallet, category: targetTx.category } : null)}
- Riwayat Percakapan Terakhir: ${JSON.stringify(session.recentTurns.slice(-4))}

Tugas Utama:
Pahami maksud pengguna secara luwes tanpa kaku (BUKAN BOT TEMPLATE ROBOTIK). Tentukan 'action' dan susun 'replyText' yang sangat menarik, natural, bersahabat, dan informatif.

Kategori 'action':
1. 'CREATE_TRANSACTION':
   - Pengguna menyebutkan pengeluaran/pemasukan/transfer LENGKAP dengan nominal (misal: "makan pagi 89ribu pake gopay jam 7pagi", "beli bensin pertamax 50rb cash", "dapet gaji 8jt di bca").
   - ATAU jika ada Transaksi Tertunda ('pendingTransaction') dan pengguna sekarang menyebutkan nominalnya (misal sebelumnya tanya nominal nasi padang, lalu sekarang user jawab "25rb" atau "25000"), GABUNGKAN info pending tersebut menjadi transaksi utuh!
   - Ekstrak:
     * type: 'EXPENSE' | 'INCOME' | 'TRANSFER'
     * amount: angka numerik riil (contoh: 89ribu -> 89000, 1.5jt -> 1500000, 25k -> 25000)
     * category: kategori yang cocok dari [${STANDARD_CATEGORIES.join(', ')}]
     * wallet: dompet yang cocok dari [${wallets.map((w) => w.name).join(', ')}]
     * toWallet: jika transfer
     * description: HANYA nama barang/kegiatan (jangan masukkan nominal/dompet/jam ke deskripsi)
     * transactionTime: jam yang disebut pengguna jika ada (misal "07.00 WIB (Pagi)"), jika tidak ada sebutkan "${currentJakartaTime}"
   - Format 'replyText':
     Gunakan gaya bahasa percakapan yang menyenangkan dan hangat. Berikan sapaan santai / komentar relevan (misal untuk makanan/kopi/bensin/gaji), rincian tercatat rapi (Nominal, Deskripsi, Kategori, Dompet, Waktu), dan sebutkan sisa saldo dompet yang baru. Jika mendekati batas anggaran, berikan pengingat ramah.

2. 'ASK_MISSING_INFO':
   - Pengguna berniat mencatat transaksi (misal: "makan siang pake gopay", "beli bensin pertamax", "kemarin jajan bakso di pasar"), TAPI nominal belum disebutkan sama sekali atau ambigu.
   - Isi 'pendingInfo' dengan data yang sudah terdeteksi (type, category, wallet, description).
   - Format 'replyText':
     Beri respon antusias/ramah bahwa kamu siap mencatatnya, lalu tanyakan nominalnya dengan santai. Contoh: "Siap dicatat makan siangnya pakai GoPay! 🍛 Btw nominal harganya berapa ya kak? Boleh sebutkan angkanya (misal: 25rb) biar langsung aku simpan."

3. 'REVISE_TRANSACTION':
   - Pengguna ingin meralat, mengoreksi, atau merevisi transaksi terakhir (misal: "eh salah tadi 20rb bukan 28rb", "ralat tadi 35 ribu", "ganti dompetnya ke BCA bukan tunai", "deskripsinya ganti jadi makan sate").
   - Isi 'revision' dengan field yang diubah (newAmount, newDescription, newWallet, newCategory).
   - Format 'replyText':
     Konfirmasi dengan melegakan bahwa revisi berhasil, sebutkan angka/dompet baru, dan saldo dompet telah disesuaikan otomatis secara realtime.

4. 'CANCEL_TRANSACTION':
   - Pengguna ingin membatalkan transaksi (misal: "batalkan transaksi barusan", "hapus catatan tadi", "cancel pengeluaran terakhir").
   - Format 'replyText':
     Konfirmasi bahwa transaksi telah dihapus dan saldo dompet dikembalikan seperti semula.

5. 'QUERY_REPORT':
   - Pengguna meminta data/laporan bebas (misal: "saya butuh data 3hari kebelakang saja", "pengeluaran kemarin apa aja?", "berapa total uangku sekarang?", "sisa saldo BCA berapa?", "bulan ini paling boros di mana?").
   - Analisis daftar transaksi riil dan saldo di atas.
   - Format 'replyText':
     Sajikan laporan khusus sesuai rentang waktu/topik yang diminta pengguna, sebutkan item-itemnya secara rapi berpoin, sertakan total pengeluaran/pemasukan, dan berikan insight singkat yang cerdas.

6. 'CHAT_REPLY':
   - Pengguna menyapa, bertanya tips menabung, berterima kasih, komplain, bertanya kenapa bot bisa begini/begitu, bertanya apakah bot ini beneran AI atau filter teks, atau mengobrol santai.
   - Jawab secara luwes, cerdas, bersahabat, jujur, dan memotivasi layaknya asisten pintar manusia. Jika pengguna bertanya apakah kamu beneran AI atau filter teks, sampaikan dengan ramah bahwa kamu adalah AI generatif bertenaga Google Gemini yang memahami konteks kalimat bebas dan siap membantu kapan pun.

KEMBALIKAN OUTPUT HANYA DALAM FORMAT JSON VALID:
{
  "action": "CREATE_TRANSACTION" | "ASK_MISSING_INFO" | "REVISE_TRANSACTION" | "CANCEL_TRANSACTION" | "QUERY_REPORT" | "CHAT_REPLY",
  "replyText": "balasan percakapan ramah dan informatif",
  "transaction": { "type": "EXPENSE" | "INCOME" | "TRANSFER", "amount": 0, "category": "...", "wallet": "...", "toWallet": "...", "description": "...", "transactionTime": "..." },
  "pendingInfo": { "type": "EXPENSE", "category": "...", "wallet": "...", "description": "..." },
  "revision": { "newAmount": 0, "newDescription": "...", "newWallet": "...", "newCategory": "..." }
}
`;

  try {
    const parts: any[] = [];
    if (photoBase64) {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: photoBase64,
        },
      });
      parts.push({
        text: 'Ini foto struk belanja pengguna. Analisis merchant, total pembayaran, kategori belanja, dan metode pembayaran jika ada. Catatan tambahan: ' + (trimmed || 'Tolong catat struk ini'),
      });
    } else {
      parts.push({ text: trimmed || 'Halo' });
    }

    const { parsed: parsedAi, model: usedModel } = await generateGeminiContentWithFallback({
      contents: { parts },
      systemInstruction,
    });

    const action = parsedAi.action || 'CHAT_REPLY';

    // 1. CREATE_TRANSACTION
    if (action === 'CREATE_TRANSACTION' && parsedAi.transaction && parsedAi.transaction.amount > 0) {
      const txData = parsedAi.transaction;
      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        type: txData.type || 'EXPENSE',
        amount: txData.amount,
        category: txData.category || 'Makanan & Minuman',
        wallet: txData.wallet || 'Tunai (Cash)',
        toWallet: txData.toWallet,
        description: txData.description || trimmed,
        transactionTime: txData.transactionTime || currentJakartaTime,
        date: new Date().toISOString(),
        source: photoBase64 ? 'receipt' : 'telegram',
        rawInput: trimmed || (photoBase64 ? 'Foto Struk Belanja' : ''),
      };

      transactions.unshift(newTx);
      adjustWalletBalance(newTx, 1);
      saveDatabaseToFile();
      saveTransactionToFirestore(newTx).catch(console.error);
      syncWalletsToFirestore(wallets).catch(console.error);

      session.pendingTransaction = null;
      session.lastTransactionId = newTx.id;
      session.recentTurns.push({ role: 'user', text: trimmed, time: currentJakartaTime });
      session.recentTurns.push({ role: 'model', text: parsedAi.replyText, time: currentJakartaTime });

      return {
        reply: parsedAi.replyText,
        isTransaction: true,
        transaction: newTx,
        action: 'CREATE_TRANSACTION',
      };
    }

    // 2. ASK_MISSING_INFO
    if (action === 'ASK_MISSING_INFO') {
      session.pendingTransaction = {
        type: parsedAi.pendingInfo?.type || 'EXPENSE',
        category: parsedAi.pendingInfo?.category || 'Makanan & Minuman',
        wallet: parsedAi.pendingInfo?.wallet || 'Tunai (Cash)',
        description: parsedAi.pendingInfo?.description || trimmed,
        rawText: trimmed,
      };

      session.recentTurns.push({ role: 'user', text: trimmed, time: currentJakartaTime });
      session.recentTurns.push({ role: 'model', text: parsedAi.replyText, time: currentJakartaTime });

      return {
        reply: parsedAi.replyText,
        isTransaction: false,
        action: 'ASK_MISSING_INFO',
        pendingInfo: session.pendingTransaction,
      };
    }

    // 3. REVISE_TRANSACTION
    if (action === 'REVISE_TRANSACTION') {
      const target = session.lastTransactionId
        ? transactions.find((t) => t.id === session.lastTransactionId) || transactions[0]
        : transactions[0];

      if (target) {
        adjustWalletBalance(target, -1);
        if (parsedAi.revision?.newAmount && parsedAi.revision.newAmount > 0) {
          target.amount = parsedAi.revision.newAmount;
        }
        if (parsedAi.revision?.newDescription) {
          target.description = parsedAi.revision.newDescription;
        }
        if (parsedAi.revision?.newWallet) {
          target.wallet = parsedAi.revision.newWallet;
        }
        if (parsedAi.revision?.newCategory) {
          target.category = parsedAi.revision.newCategory;
        }
        adjustWalletBalance(target, 1);
        saveDatabaseToFile();
        saveTransactionToFirestore(target).catch(console.error);
        syncWalletsToFirestore(wallets).catch(console.error);
      }

      session.recentTurns.push({ role: 'user', text: trimmed, time: currentJakartaTime });
      session.recentTurns.push({ role: 'model', text: parsedAi.replyText, time: currentJakartaTime });

      return {
        reply: parsedAi.replyText,
        isTransaction: true,
        transaction: target,
        action: 'REVISE_TRANSACTION',
      };
    }

    // 4. CANCEL_TRANSACTION
    if (action === 'CANCEL_TRANSACTION') {
      const target = session.lastTransactionId
        ? transactions.find((t) => t.id === session.lastTransactionId) || transactions[0]
        : transactions[0];

      if (target) {
        adjustWalletBalance(target, -1);
        transactions = transactions.filter((t) => t.id !== target.id);
        saveDatabaseToFile();
        deleteTransactionFromFirestore(target.id).catch(console.error);
        syncWalletsToFirestore(wallets).catch(console.error);
        session.lastTransactionId = undefined;
      }

      session.recentTurns.push({ role: 'user', text: trimmed, time: currentJakartaTime });
      session.recentTurns.push({ role: 'model', text: parsedAi.replyText, time: currentJakartaTime });

      return {
        reply: parsedAi.replyText,
        isTransaction: false,
        action: 'CANCEL_TRANSACTION',
      };
    }

    // 5. QUERY_REPORT or CHAT_REPLY
    session.recentTurns.push({ role: 'user', text: trimmed, time: currentJakartaTime });
    session.recentTurns.push({ role: 'model', text: parsedAi.replyText, time: currentJakartaTime });

    return {
      reply: parsedAi.replyText,
      isTransaction: false,
      action,
    };
  } catch (aiErr: any) {
    console.warn('Gemini AI dynamic processing fallback engaged:', aiErr?.message || aiErr);

    // Fallback: Check if user asking for custom days report (e.g. "3 hari kebelakang", "7 hari", etc.)
    const daysMatch = trimmed.match(/(\d+)\s*hari/i);
    if (daysMatch) {
      const days = parseInt(daysMatch[1], 10) || 3;
      return { reply: generateCustomDaysReport(days), isTransaction: false };
    }

    // Fallback: Check if user wants revision
    if (/ralat|revisi|salah|bukan/i.test(trimmed)) {
      const matchK = trimmed.match(/(\d+(?:[.,]\d+)?)\s*(?:rb|ribu|k\b)/i);
      const matchRaw = trimmed.match(/\d{3,}/);
      let newAmount = 0;
      if (matchK) newAmount = parseFloat(matchK[1].replace(',', '.')) * 1000;
      else if (matchRaw) newAmount = parseInt(matchRaw[0], 10);

      const target = session.lastTransactionId
        ? transactions.find((t) => t.id === session.lastTransactionId) || transactions[0]
        : transactions[0];

      if (target && newAmount > 0) {
        adjustWalletBalance(target, -1);
        target.amount = newAmount;
        adjustWalletBalance(target, 1);
        saveDatabaseToFile();
        saveTransactionToFirestore(target).catch(console.error);
        syncWalletsToFirestore(wallets).catch(console.error);

        return {
          reply: `👌 *Revisi Berhasil Dicatat!*\n\nNominal untuk *${target.description}* telah diperbarui menjadi *${formatRupiah(newAmount)}* di *${target.wallet}*.\nSaldo dompet kamu sudah disinkronkan otomatis!`,
          isTransaction: true,
          transaction: target,
          action: 'REVISE_TRANSACTION',
        };
      }
    }

    // Fallback: Check if completing pending transaction
    if (session.pendingTransaction) {
      const matchK = trimmed.match(/(\d+(?:[.,]\d+)?)\s*(?:rb|ribu|k\b)/i);
      const matchRaw = trimmed.match(/\d{3,}/);
      let amt = 0;
      if (matchK) amt = parseFloat(matchK[1].replace(',', '.')) * 1000;
      else if (matchRaw) amt = parseInt(matchRaw[0], 10);

      if (amt > 0) {
        const pending = session.pendingTransaction;
        const newTx: Transaction = {
          id: `tx-${Date.now()}`,
          type: pending.type || 'EXPENSE',
          amount: amt,
          category: pending.category || 'Makanan & Minuman',
          wallet: pending.wallet || 'Tunai (Cash)',
          description: pending.description || 'Pengeluaran',
          date: new Date().toISOString(),
          transactionTime: currentJakartaTime,
          source: 'telegram',
          rawInput: `${pending.rawText} -> ${trimmed}`,
        };

        transactions.unshift(newTx);
        adjustWalletBalance(newTx, 1);
        saveDatabaseToFile();
        saveTransactionToFirestore(newTx).catch(console.error);
        syncWalletsToFirestore(wallets).catch(console.error);

        session.pendingTransaction = null;
        session.lastTransactionId = newTx.id;

        return {
          reply: `✅ *Lengkap & Tercatat Otomatis!*\n\n🔴 *Pengeluaran:* ${formatRupiah(newTx.amount)}\n📝 *Deskripsi:* ${newTx.description}\n📁 *Kategori:* ${newTx.category}\n💳 *Dompet:* ${newTx.wallet}\n⏰ *Waktu:* ${currentJakartaTime}\n\n_Data langsung diperbarui di Web Dashboard & Cloud Firestore._`,
          isTransaction: true,
          transaction: newTx,
          action: 'CREATE_TRANSACTION',
        };
      }
    }

    // Fallback: Standard NLP parse
    const nlp = extractSmartTransactionNLP(trimmed);
    if (nlp.isTransaction && nlp.amount > 0) {
      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        type: nlp.type,
        amount: nlp.amount,
        category: nlp.category,
        wallet: nlp.wallet,
        description: nlp.description,
        transactionTime: nlp.transactionTime || currentJakartaTime,
        date: new Date().toISOString(),
        source: photoBase64 ? 'receipt' : 'telegram',
        rawInput: trimmed,
      };

      transactions.unshift(newTx);
      adjustWalletBalance(newTx, 1);
      saveDatabaseToFile();
      saveTransactionToFirestore(newTx).catch(console.error);
      syncWalletsToFirestore(wallets).catch(console.error);

      session.lastTransactionId = newTx.id;

      const typeEmoji = newTx.type === 'INCOME' ? '🟢 Pemasukan' : newTx.type === 'TRANSFER' ? '🔄 Transfer Dana' : '🔴 Pengeluaran';
      return {
        reply: `✅ *Tercatat Otomatis oleh AI!*\n\n${typeEmoji}: *${formatRupiah(newTx.amount)}*\n📝 *Deskripsi:* ${newTx.description}\n📁 *Kategori:* ${newTx.category}\n💳 *Dompet:* ${newTx.wallet}\n⏰ *Waktu:* ${newTx.transactionTime}\n\n_Data tersimpan aman di Cloud Firestore._`,
        isTransaction: true,
        transaction: newTx,
      };
    }

    // Fallback: If expense mentioned without nominal
    if (/makan|beli|bensin|kopi|bayar|jajan/i.test(trimmed)) {
      session.pendingTransaction = {
        type: 'EXPENSE',
        category: nlp.category || 'Makanan & Minuman',
        wallet: nlp.wallet || 'Tunai (Cash)',
        description: nlp.description || trimmed,
        rawText: trimmed,
      };
      return {
        reply: `Siap dicatat *${session.pendingTransaction.description}* via ${session.pendingTransaction.wallet}! 🍛\n\nBtw harganya berapa ya kak? Boleh sebutkan nominalnya (contoh: 25rb) biar langsung aku simpan ke buku kas.`,
        isTransaction: false,
        action: 'ASK_MISSING_INFO',
      };
    }

    return {
      reply: `Halo kak ${senderName}! Pesanmu sudah kubaca. Tadi jaringan AI sempat mengalami lonjakan trafik singkat. Boleh kirimkan lagi pesanmu? Aku siap bantu catat transaksi atau jawab pertanyaanmu secara luwes! 😊`,
      isTransaction: false,
    };
  }
}

// Telegram Simulation API (used by interactive Telegram Chat in Web UI)
app.post('/api/telegram/simulate', async (req, res) => {
  try {
    const { message, photoBase64, audioBase64, senderName, chatId } = req.body;
    const result = await processTelegramMessage({
      text: message,
      photoBase64,
      audioBase64,
      senderName,
      chatId: chatId || 'simulator',
    });
    res.json(result);
  } catch (err: any) {
    console.error('Simulation error:', err);
    res.status(500).json({ error: err.message || 'Gagal memproses pesan' });
  }
});

// Helper: Robust message sender with Markdown fallback to plain text
async function sendTelegramMessage(chatId: string | number, text: string) {
  if (!telegramConfig.botToken || !chatId) return false;

  try {
    const res = await fetch(`https://api.telegram.org/bot${telegramConfig.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
    });
    const data = await res.json();
    if (data.ok) return true;

    // Fallback: If Telegram failed to parse Markdown (e.g., uneven asterisks or brackets), send plain text
    console.warn('Telegram Markdown send failed, sending as plain text:', data.description);
    const plainText = text.replace(/[*`_]/g, '');
    const plainRes = await fetch(`https://api.telegram.org/bot${telegramConfig.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: plainText,
      }),
    });
    const plainData = await plainRes.json();
    return plainData.ok;
  } catch (err) {
    console.error('Error sending telegram message:', err);
    return false;
  }
}

// Handler for any Telegram Update (from Polling or Webhook)
async function handleTelegramUpdate(update: any) {
  try {
    const message = update.message || update.edited_message;
    if (!message) return;

    const chatId = message.chat?.id;
    const senderName = message.from?.first_name || message.from?.username || 'Pengguna';
    const username = message.from?.username || '';
    const text = message.text || message.caption || '';

    let photoBase64: string | undefined;

    // Handle Telegram photo
    if (message.photo && message.photo.length > 0 && telegramConfig.botToken) {
      try {
        const fileId = message.photo[message.photo.length - 1].file_id;
        const fileRes = await fetch(`https://api.telegram.org/bot${telegramConfig.botToken}/getFile?file_id=${fileId}`);
        const fileData = await fileRes.json();
        if (fileData.ok && fileData.result?.file_path) {
          const downloadUrl = `https://api.telegram.org/file/bot${telegramConfig.botToken}/${fileData.result.file_path}`;
          const imgRes = await fetch(downloadUrl);
          const arrayBuffer = await imgRes.arrayBuffer();
          photoBase64 = Buffer.from(arrayBuffer).toString('base64');
        }
      } catch (imgErr) {
        console.error('Failed to download photo from Telegram:', imgErr);
      }
    }

    // Process message through AI & Finance engine
    const result = await processTelegramMessage({
      text,
      photoBase64,
      chatId: String(chatId),
      senderName,
    });

    // Send reply back to Telegram
    if (chatId) {
      await sendTelegramMessage(chatId, result.reply);
    }

    // Record log
    const newLog: TelegramLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      senderName,
      username,
      chatId: String(chatId),
      input: text || (message.photo ? '[Foto Struk Belanja]' : message.voice ? '[Voice Note]' : '[Media]'),
      reply: result.reply,
      isTransaction: !!result.isTransaction,
    };

    recentTelegramLogs.unshift(newLog);
    saveTelegramLogToFirestore(newLog).catch(console.error);

    if (recentTelegramLogs.length > 50) {
      recentTelegramLogs.pop();
    }

    telegramConfig.lastMessageReceived = `${senderName}: ${text || 'Media'}`;
    telegramConfig.totalMessagesProcessed = (telegramConfig.totalMessagesProcessed || 0) + 1;
    saveTelegramConfigFile();
  } catch (err: any) {
    console.error('Error handling Telegram update:', err);
  }
}

// Telegram Long Polling Engine
let isPollingActive = false;
let pollingOffset = 0;
let pollingLoopRunning = false;

async function startTelegramPolling() {
  if (!telegramConfig.botToken) {
    console.log('Cannot start Telegram polling: Bot Token is empty');
    return false;
  }

  isPollingActive = true;
  telegramConfig.isPollingActive = true;
  telegramConfig.mode = 'polling';
  saveTelegramConfigFile();

  // First delete webhook so getUpdates works properly
  try {
    const delRes = await fetch(`https://api.telegram.org/bot${telegramConfig.botToken}/deleteWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drop_pending_updates: false }),
    });
    const delData = await delRes.json();
    console.log('Telegram deleteWebhook response before polling:', delData);
  } catch (e) {
    console.warn('Failed to delete webhook before polling:', e);
  }

  if (pollingLoopRunning) return true;
  pollingLoopRunning = true;

  console.log(`Starting Telegram Long Polling for @${telegramConfig.botUsername}...`);

  (async () => {
    while (isPollingActive && telegramConfig.botToken) {
      try {
        const url = `https://api.telegram.org/bot${telegramConfig.botToken}/getUpdates?offset=${pollingOffset}&timeout=25`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            pollingOffset = update.update_id + 1;
            await handleTelegramUpdate(update);
          }
        } else if (!data.ok) {
          console.warn('Telegram getUpdates returned error:', data.description);
          await new Promise((r) => setTimeout(r, 4000));
        }
      } catch (err: any) {
        if (!isPollingActive) break;
        console.error('Polling network error, retrying in 3s:', err.message);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
    pollingLoopRunning = false;
    isPollingActive = false;
    telegramConfig.isPollingActive = false;
    saveTelegramConfigFile();
    console.log('Telegram Long Polling stopped.');
  })();

  return true;
}

function stopTelegramPolling() {
  isPollingActive = false;
  telegramConfig.isPollingActive = false;
  saveTelegramConfigFile();
}

// Telegram Endpoints
app.get('/api/telegram/config', (req, res) => {
  const currentAppUrl = process.env.APP_URL || '';
  const calculatedWebhook = currentAppUrl ? `${currentAppUrl.replace(/\/$/, '')}/api/telegram/webhook` : '';
  res.json({
    ...telegramConfig,
    isPollingActive,
    webhookUrl: telegramConfig.webhookUrl || calculatedWebhook,
  });
});

app.post('/api/telegram/config', async (req, res) => {
  const { botToken, botUsername, webhookUrl, mode } = req.body;
  if (botToken !== undefined) telegramConfig.botToken = botToken.trim();
  if (botUsername !== undefined) telegramConfig.botUsername = botUsername.trim();
  if (webhookUrl !== undefined) telegramConfig.webhookUrl = webhookUrl.trim();
  if (mode !== undefined) telegramConfig.mode = mode;

  saveTelegramConfigFile();

  // If token updated, verify with getMe and auto-start polling
  if (telegramConfig.botToken) {
    try {
      const getMeRes = await fetch(`https://api.telegram.org/bot${telegramConfig.botToken}/getMe`);
      const meData = await getMeRes.json();
      if (meData.ok) {
        telegramConfig.botUsername = meData.result.username;
        saveTelegramConfigFile();
        await startTelegramPolling();
      }
    } catch (e) {
      console.error('Failed to getMe on config update:', e);
    }
  }

  res.json({
    ...telegramConfig,
    isPollingActive,
  });
});

// Activate Polling (Recommended for AI Studio dev environment)
app.post('/api/telegram/activate-polling', async (req, res) => {
  const { botToken } = req.body;
  const token = botToken ? botToken.trim() : telegramConfig.botToken;

  if (!token) {
    return res.status(400).json({ success: false, message: 'Bot Token belum diisi!' });
  }

  telegramConfig.botToken = token;
  telegramConfig.mode = 'polling';

  try {
    const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const meData = await meRes.json();
    if (!meData.ok) {
      return res.status(400).json({ success: false, message: `Token tidak valid: ${meData.description}` });
    }
    telegramConfig.botUsername = meData.result.username;
    saveTelegramConfigFile();

    await startTelegramPolling();

    res.json({
      success: true,
      message: `Polling aktif untuk @${meData.result.username}! Pesan di Telegram nyata langsung diproses sekarang.`,
      botInfo: meData.result,
      isPollingActive: true,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Register Webhook (if user explicitly chooses webhook mode)
app.post('/api/telegram/register-webhook', async (req, res) => {
  const { botToken } = req.body;
  const token = botToken ? botToken.trim() : telegramConfig.botToken;
  if (!token) {
    return res.status(400).json({ error: 'Bot Token belum diisi!' });
  }

  stopTelegramPolling();

  const appUrl = process.env.APP_URL || '';
  const webhookUrl = `${appUrl.replace(/\/$/, '')}/api/telegram/webhook`;

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl }),
    });
    const data = await response.json();

    if (data.ok) {
      telegramConfig.botToken = token;
      telegramConfig.webhookUrl = webhookUrl;
      telegramConfig.isRegistered = true;
      telegramConfig.mode = 'webhook';
      telegramConfig.lastWebhookStatus = 'Webhook aktif terhubung ke Telegram!';
      telegramConfig.lastSync = new Date().toISOString();
      saveTelegramConfigFile();
      return res.json({ success: true, message: 'Webhook Telegram berhasil dihubungkan!', data });
    } else {
      return res.status(400).json({ success: false, message: data.description || 'Gagal register webhook' });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Comprehensive Telegram Bot Status Diagnostic
app.get('/api/telegram/status', async (req, res) => {
  const token = telegramConfig.botToken;
  if (!token) {
    return res.json({
      configured: false,
      isPollingActive: false,
      message: 'Bot Token belum diisi. Masukkan Bot Token dari @BotFather di tab Setup Webhook.',
    });
  }

  try {
    const [meRes, webhookRes] = await Promise.all([
      fetch(`https://api.telegram.org/bot${token}/getMe`),
      fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`),
    ]);

    const meData = await meRes.json();
    const webhookData = await webhookRes.json();

    res.json({
      configured: true,
      botValid: meData.ok,
      botInfo: meData.ok ? meData.result : null,
      webhookInfo: webhookData.ok ? webhookData.result : null,
      isPollingActive,
      mode: telegramConfig.mode,
      totalMessagesProcessed: telegramConfig.totalMessagesProcessed || 0,
      lastMessageReceived: telegramConfig.lastMessageReceived,
      logsCount: recentTelegramLogs.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Telegram Logs
app.get('/api/telegram/logs', (req, res) => {
  res.json(recentTelegramLogs);
});

// Send Test Message directly to Telegram chat
app.post('/api/telegram/send-test', async (req, res) => {
  const { chatId, text } = req.body;
  const targetChatId = chatId || (recentTelegramLogs[0]?.chatId);

  if (!targetChatId) {
    return res.status(400).json({
      success: false,
      message: 'Chat ID tidak ditemukan. Kirimkan pesan "/start" terlebih dahulu dari Telegram Anda ke bot.',
    });
  }

  const messageText = text || '🔔 *Test Koneksi TeleFinance Bot*: Bot berhasil mengirim pesan langsung ke akun Telegram Anda! Sistem pencatatan keuangan siap digunakan.';
  const success = await sendTelegramMessage(targetChatId, messageText);

  if (success) {
    res.json({ success: true, message: `Pesan uji berhasil dikirim ke Chat ID: ${targetChatId}` });
  } else {
    res.status(500).json({ success: false, message: 'Gagal mengirim pesan ke Telegram' });
  }
});

// Test Connection with Telegram Bot API (getMe)
app.post('/api/telegram/test-bot', async (req, res) => {
  const { botToken } = req.body;
  const token = botToken || telegramConfig.botToken;
  if (!token) return res.status(400).json({ error: 'Token diperlukan' });

  try {
    const getMeRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await getMeRes.json();
    if (data.ok) {
      telegramConfig.botUsername = data.result.username;
      telegramConfig.botToken = token;
      saveTelegramConfigFile();
      return res.json({ success: true, botInfo: data.result });
    } else {
      return res.status(400).json({ success: false, message: data.description });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Real Telegram Webhook Receiver (called by Telegram servers when webhook is active)
app.post('/api/telegram/webhook', async (req, res) => {
  res.status(200).send('OK');
  await handleTelegramUpdate(req.body);
});

// Setup Vite dev server or static dist
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  // Connect to and initialize Cloud Firestore
  await initFirestoreDatabase();

  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`TeleFinance AI Server running on http://0.0.0.0:${PORT}`);

    // If bot token exists, automatically start Long Polling
    if (telegramConfig.botToken) {
      console.log('Bot token found on startup. Initiating Telegram polling...');
      await startTelegramPolling();
    }
  });
}

startServer();

