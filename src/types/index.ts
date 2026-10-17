export interface Transaction {
  id: string;
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
  amount: number;
  category: string;
  wallet: string;
  toWallet?: string;
  description: string;
  date: string;
  transactionTime?: string;
  source: 'telegram' | 'voice' | 'receipt' | 'web';
  rawInput?: string;
  notes?: string;
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
  month: string;
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

export interface AIInsights {
  healthScore: number;
  healthStatus: string;
  summary: string;
  highlights: string[];
  recommendations: string[];
  quote: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  time: string;
  photoUrl?: string;
  isAudio?: boolean;
  audioDuration?: string;
  parsedTransaction?: Transaction;
}
