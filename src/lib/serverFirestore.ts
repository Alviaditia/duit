import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  writeBatch,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read Firebase config from firebase-applet-config.json
let firebaseConfig: any = {};
try {
  const configPath = path.resolve(__dirname, '../../firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
} catch (e) {
  console.warn('Could not read firebase-applet-config.json:', e);
}

export const firebaseApp = initializeApp(firebaseConfig);
export const firestore =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId)
    : getFirestore(firebaseApp);

export async function testFirestore(): Promise<boolean> {
  try {
    const testRef = doc(firestore, 'test', 'connection');
    await setDoc(testRef, { timestamp: new Date().toISOString(), status: 'online' });
    console.log('✅ Connected to Cloud Firestore database:', firebaseConfig.firestoreDatabaseId || 'default');
    return true;
  } catch (err: any) {
    console.error('Firestore connection check:', err?.message || err);
    return false;
  }
}

// Collections helper
export const COLLECTIONS = {
  TRANSACTIONS: 'transactions',
  WALLETS: 'wallets',
  BUDGETS: 'budgets',
  TELEGRAM_LOGS: 'telegram_logs',
  APP_SETTINGS: 'app_settings',
};

// Save a single transaction to Firestore
export async function saveTransactionToFirestore(tx: any) {
  try {
    const ref = doc(firestore, COLLECTIONS.TRANSACTIONS, tx.id);
    await setDoc(ref, tx, { merge: true });
  } catch (err) {
    console.error(`Failed to save transaction ${tx.id} to Firestore:`, err);
  }
}

// Delete a transaction from Firestore
export async function deleteTransactionFromFirestore(id: string) {
  try {
    const ref = doc(firestore, COLLECTIONS.TRANSACTIONS, id);
    await deleteDoc(ref);
  } catch (err) {
    console.error(`Failed to delete transaction ${id} from Firestore:`, err);
  }
}

// Save a wallet to Firestore
export async function saveWalletToFirestore(wallet: any) {
  try {
    const ref = doc(firestore, COLLECTIONS.WALLETS, wallet.id);
    await setDoc(ref, wallet, { merge: true });
  } catch (err) {
    console.error(`Failed to save wallet ${wallet.id} to Firestore:`, err);
  }
}

// Save all wallets to Firestore
export async function syncWalletsToFirestore(wallets: any[]) {
  try {
    for (const w of wallets) {
      await saveWalletToFirestore(w);
    }
  } catch (err) {
    console.error('Failed to sync wallets:', err);
  }
}

// Save a budget to Firestore
export async function saveBudgetToFirestore(budget: any) {
  try {
    const ref = doc(firestore, COLLECTIONS.BUDGETS, budget.id);
    await setDoc(ref, budget, { merge: true });
  } catch (err) {
    console.error(`Failed to save budget ${budget.id} to Firestore:`, err);
  }
}

// Save Telegram log to Firestore
export async function saveTelegramLogToFirestore(log: any) {
  try {
    const ref = doc(firestore, COLLECTIONS.TELEGRAM_LOGS, log.id);
    await setDoc(ref, log);
  } catch (err) {
    console.error('Failed to save telegram log to Firestore:', err);
  }
}

// Save Telegram Config to Firestore
export async function saveTelegramConfigToFirestore(config: any) {
  try {
    const ref = doc(firestore, COLLECTIONS.APP_SETTINGS, 'telegram_config');
    await setDoc(ref, config, { merge: true });
  } catch (err) {
    console.error('Failed to save telegram config to Firestore:', err);
  }
}

// Load all data from Firestore
export async function loadAllDataFromFirestore(): Promise<{
  transactions?: any[];
  wallets?: any[];
  budgets?: any[];
  telegramConfig?: any;
  telegramLogs?: any[];
}> {
  try {
    const result: any = {};

    // 1. Transactions
    const txSnap = await getDocs(collection(firestore, COLLECTIONS.TRANSACTIONS));
    if (!txSnap.empty) {
      result.transactions = txSnap.docs.map((d) => d.data());
      // Sort newest first
      result.transactions.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    // 2. Wallets
    const wSnap = await getDocs(collection(firestore, COLLECTIONS.WALLETS));
    if (!wSnap.empty) {
      result.wallets = wSnap.docs.map((d) => d.data());
    }

    // 3. Budgets
    const bSnap = await getDocs(collection(firestore, COLLECTIONS.BUDGETS));
    if (!bSnap.empty) {
      result.budgets = bSnap.docs.map((d) => d.data());
    }

    // 4. Telegram Config
    const configSnap = await getDoc(doc(firestore, COLLECTIONS.APP_SETTINGS, 'telegram_config'));
    if (configSnap.exists()) {
      result.telegramConfig = configSnap.data();
    }

    // 5. Telegram Logs
    const logSnap = await getDocs(collection(firestore, COLLECTIONS.TELEGRAM_LOGS));
    if (!logSnap.empty) {
      result.telegramLogs = logSnap.docs.map((d) => d.data());
      result.telegramLogs.sort((a: any, b: any) => String(b.id).localeCompare(String(a.id)));
      result.telegramLogs = result.telegramLogs.slice(0, 50);
    }

    return result;
  } catch (err) {
    console.error('Error loading data from Firestore:', err);
    return {};
  }
}
