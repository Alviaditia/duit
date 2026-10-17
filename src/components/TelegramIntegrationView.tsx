import React, { useState, useEffect } from 'react';
import { 
  Settings2, 
  Bot, 
  Copy, 
  Check, 
  ExternalLink, 
  Zap, 
  ShieldCheck, 
  AlertCircle, 
  Key, 
  Terminal,
  Radio,
  RefreshCw,
  Send,
  HelpCircle,
  Activity,
  CheckCircle2,
  Flame
} from 'lucide-react';
import { TelegramConfig, TelegramLog } from '../types';
import { api } from '../services/api';

export const TelegramIntegrationView: React.FC = () => {
  const [config, setConfig] = useState<TelegramConfig | null>(null);
  const [botToken, setBotToken] = useState('');
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isActivatingPolling, setIsActivatingPolling] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isRegisteringWebhook, setIsRegisteringWebhook] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [botInfo, setBotInfo] = useState<any>(null);
  const [logs, setLogs] = useState<TelegramLog[]>([]);
  const [diagnostic, setDiagnostic] = useState<any>(null);

  useEffect(() => {
    loadConfig();
    fetchLogs();
    fetchDiagnostic();

    // Auto refresh logs every 4 seconds to show incoming Telegram messages live
    const interval = setInterval(() => {
      fetchLogs();
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const loadConfig = async () => {
    try {
      const cfg = await api.getTelegramConfig();
      setConfig(cfg);
      if (cfg.botToken) setBotToken(cfg.botToken);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLogs = async () => {
    try {
      const data = await api.getTelegramLogs();
      setLogs(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDiagnostic = async () => {
    try {
      const diag = await api.getTelegramStatus();
      setDiagnostic(diag);
      if (diag?.botInfo) setBotInfo(diag.botInfo);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyWebhook = () => {
    if (!config?.webhookUrl) return;
    navigator.clipboard.writeText(config.webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Activate Long Polling (Bulletproof connection)
  const handleActivatePolling = async () => {
    if (!botToken.trim()) {
      setStatusMessage({ type: 'error', text: 'Masukkan Bot Token dari @BotFather terlebih dahulu.' });
      return;
    }
    setIsActivatingPolling(true);
    setStatusMessage(null);
    try {
      const res = await api.activateTelegramPolling(botToken.trim());
      if (res.success) {
        setBotInfo(res.botInfo);
        setStatusMessage({
          type: 'success',
          text: `🎉 Sukses! Mode Polling aktif untuk @${res.botInfo.username}. Sekarang coba kirim /start di Telegram asli, bot akan merespon langsung!`,
        });
        await loadConfig();
        await fetchDiagnostic();
        await fetchLogs();
      } else {
        setStatusMessage({ type: 'error', text: res.message || 'Gagal mengaktifkan polling bot' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Gagal menghubungi Telegram API' });
    } finally {
      setIsActivatingPolling(false);
    }
  };

  // Test token with getMe
  const handleTestBot = async () => {
    if (!botToken.trim()) {
      setStatusMessage({ type: 'error', text: 'Masukkan Bot Token terlebih dahulu.' });
      return;
    }
    setIsTesting(true);
    setStatusMessage(null);
    try {
      const res = await api.testTelegramBot(botToken.trim());
      if (res.success) {
        setBotInfo(res.botInfo);
        setStatusMessage({
          type: 'success',
          text: `Bot valid! Terhubung ke @${res.botInfo.username} (${res.botInfo.first_name}).`,
        });
      } else {
        setStatusMessage({ type: 'error', text: res.message || 'Token bot tidak valid' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Gagal menghubungi Telegram' });
    } finally {
      setIsTesting(false);
    }
  };

  // Send Test Message to user
  const handleSendTestMessage = async () => {
    setIsSendingTest(true);
    try {
      const res = await api.sendTestMessage();
      if (res.success) {
        setStatusMessage({ type: 'success', text: '🔔 Pesan test berhasil dikirim ke akun Telegram Anda!' });
        fetchLogs();
      } else {
        setStatusMessage({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-sky-400" />
          Koneksi & Integrasi Telegram Bot Nyata
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Hubungkan bot Telegram Anda agar bisa mencatat pengeluaran & melihat saldo langsung dari aplikasi Telegram di HP Anda.
        </p>
      </div>

      {/* FIREBASE CLOUD PERSISTENCE BANNER */}
      <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-1.5 text-xs">
        <div className="flex items-center gap-2 font-bold text-amber-300">
          <Flame className="w-4 h-4 text-amber-400 fill-amber-400/20" />
          <span>Cloud Database Firestore Aktif — Data Transaksi & Konfigurasi Tersimpan Permanen</span>
        </div>
        <p className="text-slate-300 leading-relaxed pl-6">
          Seluruh histori transaksi, saldo dompet, riwayat chat, dan konfigurasi bot Telegram Anda tersimpan langsung di <strong>Google Cloud Firestore</strong>. Data Anda tidak akan hilang meskipun tab ditutup atau preview di-refresh.
        </p>
      </div>

      {/* 24/7 SERVER RUNTIME VS PREVIEW EXPLANATION */}
      <div className="bg-slate-900/90 border border-sky-500/30 rounded-2xl p-5 space-y-3.5 text-xs shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 font-bold text-sky-300 text-sm">
            <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
              <Activity className="w-4 h-4" />
            </div>
            <span>Kenapa Bot Ter-pause Saat Web Ditutup & Membalas Kembali Saat Web Dibuka?</span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20">
            Penjelasan Runtime
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-300 leading-relaxed">
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <h4 className="font-semibold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              1. Mekanisme Sandbox Preview (Saat Ini)
            </h4>
            <p className="text-[11px] text-slate-400">
              Web ini berjalan di lingkungan <strong>Dev Sandbox Google AI Studio</strong>. Demi efisiensi daya komputasi cloud, container sandbox akan <em>otomatis sleep / di-pause</em> beberapa menit setelah tab browser ditutup atau tidak ada interaksi.
            </p>
            <p className="text-[11px] text-slate-400">
              <strong>Pesan Telegram Anda TIDAK hilang!</strong> Telegram menyimpan semua pesan di antrean awan (*message queue*). Begitu Anda membuka web ini lagi, server langsung bangun (*wake-up*) dan seketika membalas seluruh pesan di Telegram.
            </p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <h4 className="font-semibold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              2. Cara Agar Bot Aktif 24 Jam Non-Stop
            </h4>
            <ul className="text-[11px] text-slate-400 space-y-1.5 list-disc pl-4">
              <li>
                <strong>Solusi Termudah Tanpa Setting (Saat Ini):</strong> Cukup biarkan tab browser web ini tetap terbuka di background (bisa di laptop atau browser HP). Bot akan terus aktif 24 jam menjawab pesan Telegram tanpa perlu daftar hosting apa pun.
              </li>
              <li>
                <strong>Ingin 24 Jam di Cloud (Render / Koyeb)?</strong> File konfigurasi otomatis (<strong>render.yaml</strong> & <strong>Procfile</strong>) sudah <em>selesai saya buatkan 100%</em> di sistem!
              </li>
              <li className="text-amber-300 font-medium pt-1">
                ⚠️ <em>Kenapa AI tidak bisa mendaftarkan akun Render/Koyeb langsung?</em> Karena platform tersebut mewajibkan verifikasi akun email/Google pribadi Anda. Tapi Anda <strong>tidak perlu mengetik setting apa pun</strong> — cukup login dengan Google/GitHub di Render.com, sambungkan repository, dan Render akan otomatis membaca file yang sudah saya siapkan!
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Status Feedback Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-xs ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
              : statusMessage.type === 'info'
              ? 'bg-sky-950/60 border-sky-500/40 text-sky-300'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Connection Setup Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Token Configuration Form (2 Cols) */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-sky-400" />
              Langkah 1: Masukkan Token Bot Telegram
            </h3>
            {config?.isPollingActive ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                Polling Aktif (Online)
              </span>
            ) : (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                Belum Terhubung
              </span>
            )}
          </div>

          {/* Bot Token Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
              <span>Telegram Bot API Token (dari @BotFather):</span>
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1"
              >
                Buka @BotFather <ExternalLink className="w-3 h-3" />
              </a>
            </label>
            <input
              type="text"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              placeholder="Contoh: 7123456789:AAHkL7891abcdefghij-1234..."
              className="w-full bg-slate-950 text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 font-mono focus:outline-none focus:border-sky-500"
            />
            <p className="text-[11px] text-slate-400">
              Format: kombinasi angka dan huruf yang diberikan oleh BotFather setelah perintah <code>/newbot</code>.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {/* Primary Action Button: Activate Polling */}
            <button
              onClick={handleActivatePolling}
              disabled={isActivatingPolling || !botToken.trim()}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-md shadow-emerald-500/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              <span>{isActivatingPolling ? 'Mengaktifkan...' : '🚀 Aktifkan Mode Polling (DIREKOMENDASIKAN)'}</span>
            </button>

            <button
              onClick={handleTestBot}
              disabled={isTesting || !botToken.trim()}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>Cek Token (@getMe)</span>
            </button>
          </div>

          {/* Connected Bot Card */}
          {botInfo && (
            <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    {botInfo.first_name}
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  </h4>
                  <span className="text-[11px] text-sky-400">@{botInfo.username}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`https://t.me/${botInfo.username}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-white flex items-center gap-1.5 transition"
                >
                  <span>Chat @{botInfo.username}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  onClick={handleSendTestMessage}
                  disabled={isSendingTest}
                  title="Kirim pesan test langsung"
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3 h-3 text-emerald-400" />
                  <span>Kirim Pesan Uji</span>
                </button>
              </div>
            </div>
          )}

          {/* Webhook Endpoint for Production / Advanced */}
          <div className="pt-3 border-t border-slate-800/80 space-y-2">
            <details className="text-xs text-slate-400 cursor-pointer">
              <summary className="font-medium text-slate-300 hover:text-white">
                Opsi Lanjutan: Webhook URL Publik (Opsional untuk Server Production)
              </summary>
              <div className="mt-2 p-3 bg-slate-950 rounded-xl space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={config?.webhookUrl || ''}
                    className="flex-1 bg-slate-900 text-slate-200 text-xs px-3 py-2 rounded-lg border border-slate-800 font-mono select-all focus:outline-none"
                  />
                  <button
                    onClick={handleCopyWebhook}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Tersalin' : 'Salin'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Catatan: Di server dev yang terproteksi login Google, Webhook sering gagal menerima update. Gunakan <strong>Mode Polling</strong> di atas yang otomatis berjalan stabil.
                </p>
              </div>
            </details>
          </div>
        </div>

        {/* Right: Step by Step Guide from @BotFather */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            Langkah Mendapatkan Token di @BotFather
          </h3>

          <div className="space-y-3.5 text-xs text-slate-300">
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-sky-400 font-bold flex items-center justify-center shrink-0 text-[10px]">
                1
              </span>
              <div>
                <p className="font-semibold text-white">Buka aplikasi Telegram Anda</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Cari username <strong className="text-sky-300">@BotFather</strong> (dengan ikon centang verifikasi biru).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-sky-400 font-bold flex items-center justify-center shrink-0 text-[10px]">
                2
              </span>
              <div>
                <p className="font-semibold text-white">Ketik /newbot</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Beri nama bot (misal: <em>Keuangan Saya</em>), lalu tentukan username yang diakhiri kata <code>bot</code> (misal: <em>keuanganku_ai_bot</em>).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-sky-400 font-bold flex items-center justify-center shrink-0 text-[10px]">
                3
              </span>
              <div>
                <p className="font-semibold text-white">Salin Token & Klik Aktifkan Polling</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Salin API Token yang diberikan, tempelkan ke kolom di sebelah kiri, lalu klik <strong>Aktifkan Mode Polling</strong>.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
            ✨ Setelah polling aktif, langsung buka bot Anda di Telegram dan ketik <code>/start</code>. Bot akan membalas secara instan!
          </div>
        </div>
      </div>

      {/* LIVE TELEGRAM ACTIVITY LOGS */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Live Feed Aktivitas Telegram Nyata
            </h3>
            <p className="text-xs text-slate-400">
              Setiap pesan yang Anda kirimkan di Telegram (seperti <code>/start</code>, pesan teks transaksi, atau foto struk) akan tercatat di sini secara real-time.
            </p>
          </div>

          <button
            onClick={fetchLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Segarkan Log</span>
          </button>
        </div>

        {logs.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 bg-slate-950/60 rounded-xl border border-slate-800/80">
            {config?.isPollingActive
              ? '🟢 Bot sedang standby menunggu pesan. Buka Telegram dan kirimkan "/start" ke bot Anda!'
              : '⚠️ Mode Polling belum diaktifkan. Masukkan token bot di atas dan klik "Aktifkan Mode Polling".'}
          </div>
        ) : (
          <div className="space-y-2.5 max-h-80 overflow-y-auto scrollbar-thin">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl flex flex-col sm:flex-row sm:items-start justify-between gap-2 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{log.senderName}</span>
                    {log.username && <span className="text-slate-400">(@{log.username})</span>}
                    <span className="text-[10px] text-slate-400">{log.timestamp}</span>
                    {log.isTransaction && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                        Transaksi
                      </span>
                    )}
                  </div>
                  <p className="text-sky-300 font-medium">📩 Pesan: "{log.input}"</p>
                  <p className="text-slate-400 text-[11px] line-clamp-2">🤖 Balasan: {log.reply.slice(0, 120)}...</p>
                </div>

                <span className="text-[10px] font-mono text-slate-400 self-end sm:self-start">
                  Chat ID: {log.chatId}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
