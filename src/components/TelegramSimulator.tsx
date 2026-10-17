import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Paperclip, 
  Mic, 
  MicOff, 
  Image as ImageIcon, 
  Bot, 
  Sparkles, 
  RotateCcw, 
  CheckCheck, 
  Volume2, 
  ArrowLeft, 
  MoreVertical, 
  ShieldAlert,
  Loader2,
  FileText
} from 'lucide-react';
import { ChatMessage, Transaction } from '../types';
import { api, formatRupiah } from '../services/api';

interface TelegramSimulatorProps {
  onTransactionAdded: (tx: Transaction) => void;
  onRefreshData?: () => void;
  telegramUsername?: string;
  isRegistered?: boolean;
}

export const TelegramSimulator: React.FC<TelegramSimulatorProps> = ({
  onTransactionAdded,
  onRefreshData,
  telegramUsername = 'telefinance_bot',
  isRegistered = false,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'bot',
      text: `👋 *Halo! Selamat Datang di TeleFinance AI Bot* 🤖✨\n\nSaya asisten cerdas pencatat keuangan otomatis bertenaga *Gemini AI*. Balasan saya tidak kaku dan Anda bisa ngobrol bebas:\n\n• *Catat Santai:* \`Makan padang 35rb bca jam 1 siang\`\n• *Lupa Nominal:* Coba ketik \`Makan siang pake gopay\`, saya akan tanya ramah!\n• *Salah Ketik / Revisi:* Coba ketik \`Eh ralat tadi 20rb bukan 25rb\`\n• *Tanya Tanggal Bebas:* Coba ketik \`Saya butuh data 3 hari kebelakang saja\`\n• *Cek Saldo:* \`Berapa sisa uangku di BCA dan GoPay?\`\n• Atau kirim *foto struk belanja* / *pesan suara*!`,
      time: '12:00',
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Voice recording logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());

        // Convert blob to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          await handleVoiceMessage(base64Audio);
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone access denied or not supported, using simulated voice:', err);
      // Fallback: prompt user for voice simulation or alert
      const simulatedVoiceText = prompt(
        'Simulasi Rekaman Suara:\nKetikkan apa yang Anda ucapkan (contoh: "Tadi beli martabak empat puluh ribu pakai gopay"):',
        'Makan siang ayam geprek 25rb bayar pake Gopay'
      );
      if (simulatedVoiceText) {
        handleSendMessage(simulatedVoiceText, undefined, true);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  const handleVoiceMessage = async (base64Audio: string) => {
    const userMsgId = `usr-${Date.now()}`;
    const currentTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        sender: 'user',
        text: '🎤 Pesan Suara (Voice Note)',
        isAudio: true,
        audioDuration: `${recordingSeconds || 2}s`,
        time: currentTime,
      },
    ]);

    setIsLoading(true);

    try {
      const voiceResult = await api.parseVoice(base64Audio, 'audio/webm');
      const botMsgId = `bot-${Date.now()}`;

      if (voiceResult.isTransaction && voiceResult.transaction) {
        onTransactionAdded(voiceResult.transaction);
        setMessages((prev) => [
          ...prev,
          {
            id: botMsgId,
            sender: 'bot',
            text: `🎙️ *Transkripsi Suara:* "${voiceResult.transcript}"\n\n${voiceResult.formattedBotReply || '✅ Transaksi berhasil dicatat!'}`,
            time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            parsedTransaction: voiceResult.transaction,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: botMsgId,
            sender: 'bot',
            text: `🎙️ *Transkripsi Suara:* "${voiceResult.transcript}"\n\n${voiceResult.formattedBotReply || 'Pesan suara berhasil diproses.'}`,
            time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: 'bot',
          text: `⚠️ Maaf, gagal memproses suara AI: ${err.message}. Silakan coba ketik teks.`,
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Photo/Receipt upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      const mimeType = file.type || 'image/jpeg';

      const userMsgId = `usr-${Date.now()}`;
      const currentTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

      setMessages((prev) => [
        ...prev,
        {
          id: userMsgId,
          sender: 'user',
          text: `🧾 Mengirim struk belanja (${file.name})`,
          photoUrl: result,
          time: currentTime,
        },
      ]);

      setIsLoading(true);

      try {
        const parseResult = await api.parseReceipt(base64Data, mimeType, 'Ekstrak transaksi dari struk');
        const botMsgId = `bot-${Date.now()}`;

        if (parseResult.isTransaction && parseResult.amount > 0) {
          const newTx: Transaction = {
            id: `tx-${Date.now()}`,
            type: parseResult.type || 'EXPENSE',
            amount: parseResult.amount,
            category: parseResult.category || 'Belanja & Kebutuhan',
            wallet: parseResult.wallet || 'Bank BCA',
            description: parseResult.description || `Struk Belanja`,
            date: new Date().toISOString(),
            source: 'receipt',
            rawInput: `Struk Belanja: ${parseResult.description}`,
          };

          // Save transaction to server
          await api.createTransaction(newTx);
          onTransactionAdded(newTx);

          setMessages((prev) => [
            ...prev,
            {
              id: botMsgId,
              sender: 'bot',
              text: `🧾 *Struk Berhasil Dianalisis oleh Gemini AI!*\n\n${parseResult.formattedBotReply || `Total: *${formatRupiah(newTx.amount)}*\nKategori: ${newTx.category}\nDompet: ${newTx.wallet}`}`,
              time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
              parsedTransaction: newTx,
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: botMsgId,
              sender: 'bot',
              text: parseResult.formattedBotReply || 'Gambar struk telah dianalisis namun nominal tidak terdeteksi jelas.',
              time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        }
      } catch (err: any) {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-err-${Date.now()}`,
            sender: 'bot',
            text: `⚠️ Gagal membaca struk belanja: ${err.message}`,
            time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle Text Message
  const handleSendMessage = async (textToSend?: string, photoBase64?: string, isAudioSim = false) => {
    const text = (textToSend !== undefined ? textToSend : inputMessage).trim();
    if (!text && !photoBase64) return;

    const userMsgId = `usr-${Date.now()}`;
    const currentTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        sender: 'user',
        text: isAudioSim ? `🎤 [Simulasi Suara]: "${text}"` : text,
        time: currentTime,
      },
    ]);

    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await api.simulateTelegram({
        message: text,
        photoBase64,
        senderName: 'Pengguna',
        chatId: 'simulator',
      });

      if (response.isTransaction && response.transaction) {
        onTransactionAdded(response.transaction);
      }

      if (response.action === 'REVISE_TRANSACTION' || response.action === 'CANCEL_TRANSACTION') {
        onRefreshData?.();
      }

      const botMsgId = `bot-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: botMsgId,
          sender: 'bot',
          text: response.reply,
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          parsedTransaction: response.transaction,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: 'bot',
          text: `⚠️ Maaf, terjadi kendala: ${err.message}`,
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'm-init',
        sender: 'bot',
        text: `🧹 Percakapan telah dibersihkan.\n\nKetik transaksi baru secara bebas atau coba skenario AI berikut:\n\`Makan siang pake gopay\` (Tanpa nominal)\n\`Saya butuh data 3 hari kebelakang saja\`\n\`Eh ralat tadi 20rb bukan 25rb\``,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  // Quick Suggestion Chips demonstrating Gemini AI Natural Understanding
  const quickChips = [
    '🍱 Makan siang padang pake gopay',
    '25 ribu',
    '✏️ Eh ralat tadi 20rb bukan 25rb',
    '📅 Saya butuh data 3 hari kebelakang saja',
    '💳 Berapa sisa saldo BCA dan GoPay?',
    '☕ Kopi kenangan 35rb Gopay jam 8 pagi',
    '⛽ Isi Pertamax 50rb Dana',
    '💼 Gaji freelance 2.5jt Masuk BCA',
    '📊 Pengeluaran kemarin habis berapa ya?',
    '💡 Bisa hematin di mana lagi ya bulan ini?',
    '❌ Batalkan transaksi barusan',
    '/saldo',
    '/laporan',
  ];

  return (
    <div className="py-6 max-w-5xl mx-auto px-4">
      {/* Header Info */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Telegram Interactive Bot Simulator
            </h2>
            <span className="text-xs px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 font-medium">
              Realtime Synced
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Uji coba catat keuangan otomatis via pesan teks, pesan suara (voice note), atau struk belanja.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={clearChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Chat</span>
          </button>
        </div>
      </div>

      {/* Main Telegram Phone Frame */}
      <div className="max-w-md mx-auto bg-slate-950 rounded-[2.5rem] p-3 shadow-2xl shadow-sky-950/40 border-4 border-slate-800 relative">
        {/* Dynamic Island / Speaker notch */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-900 rounded-full z-20 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-slate-700 mr-2"></div>
          <div className="w-10 h-1 bg-slate-800 rounded-full"></div>
        </div>

        {/* Telegram App Container */}
        <div className="rounded-[2rem] overflow-hidden bg-[#0e1621] border border-slate-800/80 flex flex-col h-[650px] relative">
          {/* Telegram App Header Bar */}
          <div className="bg-[#17212b] px-4 pt-7 pb-3 flex items-center justify-between border-b border-[#242f3d] z-10 text-white">
            <div className="flex items-center gap-3">
              <button className="text-slate-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-sky-500/20">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#17212b]"></div>
              </div>
              <div>
                <h3 className="text-sm font-semibold tracking-wide flex items-center gap-1">
                  TeleFinance AI
                  <Sparkles className="w-3 h-3 text-sky-400" />
                </h3>
                <span className="text-[11px] text-sky-400 font-normal">bot • selalu aktif</span>
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-400">
              <button 
                title="Buka Telegram Bot" 
                onClick={() => alert(`Anda dapat menghubungkan bot asli di tab 'Setup Webhook' dengan username @${telegramUsername}`)}
                className="p-1.5 hover:text-white"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Telegram Chat Wallpaper Pattern & Messages */}
          <div 
            className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-slate-700 bg-repeat"
            style={{
              backgroundColor: '#0e1621',
              backgroundImage: `radial-gradient(#1f2937 1px, transparent 1px)`,
              backgroundSize: '24px 24px',
            }}
          >
            {/* Timestamp divider */}
            <div className="flex justify-center my-2">
              <span className="bg-[#17212b]/80 backdrop-blur text-[11px] text-slate-400 px-3 py-0.5 rounded-full border border-slate-800">
                Hari ini
              </span>
            </div>

            {/* Message Bubbles */}
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed relative shadow-md ${
                      isUser
                        ? 'bg-[#2b5278] text-white rounded-br-xs border border-sky-600/30'
                        : 'bg-[#182533] text-slate-100 rounded-bl-xs border border-slate-700/60'
                    }`}
                  >
                    {/* Photo attachment preview if any */}
                    {msg.photoUrl && (
                      <div className="mb-2 rounded-lg overflow-hidden border border-slate-700">
                        <img src={msg.photoUrl} alt="Struk Belanja" className="w-full max-h-48 object-cover" />
                      </div>
                    )}

                    {/* Voice note indicator */}
                    {msg.isAudio && (
                      <div className="flex items-center gap-2 mb-1.5 p-2 rounded-lg bg-black/20">
                        <div className="w-7 h-7 rounded-full bg-sky-500 flex items-center justify-center text-white">
                          <Volume2 className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="h-1.5 bg-sky-400/40 rounded-full overflow-hidden">
                            <div className="h-full bg-sky-400 w-2/3"></div>
                          </div>
                          <span className="text-[10px] text-sky-200 mt-1 block">Voice Note • {msg.audioDuration}</span>
                        </div>
                      </div>
                    )}

                    {/* Text content with simple markdown formatting */}
                    <div className="whitespace-pre-wrap select-text font-normal font-sans">
                      {msg.text.split('\n').map((line, idx) => {
                        // Bold parsing
                        const formattedLine = line.replace(/\*(.*?)\*/g, '<strong>$1</strong>')
                                                  .replace(/`(.*?)`/g, '<code class="bg-black/30 px-1 py-0.5 rounded text-sky-300 font-mono text-[11px]">$1</code>');
                        return (
                          <p 
                            key={idx} 
                            dangerouslySetInnerHTML={{ __html: formattedLine }} 
                            className={line === '' ? 'h-2' : ''}
                          />
                        );
                      })}
                    </div>

                    {/* Quick Interactive Command Buttons from Bot */}
                    {!isUser && msg.parsedTransaction && (
                      <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex flex-wrap gap-1.5">
                        <button
                          onClick={() => handleSendMessage('/saldo')}
                          className="px-2 py-1 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 rounded text-[10px] font-medium transition cursor-pointer"
                        >
                          🏦 Cek Saldo
                        </button>
                        <button
                          onClick={() => handleSendMessage('/laporan')}
                          className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 rounded text-[10px] font-medium transition cursor-pointer"
                        >
                          📊 Laporan Lengkap
                        </button>
                        <button
                          onClick={() => handleSendMessage('/budget')}
                          className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded text-[10px] font-medium transition cursor-pointer"
                        >
                          🎯 Status Budget
                        </button>
                      </div>
                    )}

                    {/* Message Meta (time & ticks) */}
                    <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400">
                      <span>{msg.time}</span>
                      {isUser && <CheckCheck className="w-3.5 h-3.5 text-sky-400" />}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[#182533] text-slate-300 rounded-2xl rounded-bl-xs p-3 text-xs border border-slate-700/60 flex items-center gap-2 shadow-sm">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                  <span className="italic text-slate-400">TeleFinance Bot sedang menganalisis dengan Gemini AI...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips Carousel */}
          <div className="bg-[#17212b] px-3 py-1.5 border-t border-[#242f3d] flex gap-1.5 overflow-x-auto scrollbar-none">
            {quickChips.map((chip, idx) => (
              <button
                key={idx}
                disabled={isLoading}
                onClick={() => handleSendMessage(chip)}
                className="whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] bg-[#242f3d] hover:bg-sky-900/40 text-slate-300 hover:text-sky-300 transition-colors border border-slate-700/60 cursor-pointer disabled:opacity-50"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Footer Bar */}
          <div className="bg-[#17212b] p-2.5 border-t border-[#242f3d] flex items-center gap-2">
            {/* Attachment Button (Receipt Camera) */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              title="Kirim Struk Belanja"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-full transition cursor-pointer"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Text Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex-1 flex items-center"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={isRecording ? `Merekam suara (${recordingSeconds}s)...` : "Ketik pesan (cth: makan 30rb gopay)..."}
                disabled={isRecording || isLoading}
                className="w-full bg-[#242f3d] text-white placeholder-slate-400 text-xs px-3.5 py-2.5 rounded-full border border-slate-700/60 focus:outline-none focus:border-sky-500"
              />
            </form>

            {/* Voice Recording / Stop Button */}
            {isRecording ? (
              <button
                onClick={stopRecording}
                className="p-2 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition animate-pulse cursor-pointer"
                title="Hentikan Rekaman"
              >
                <MicOff className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="p-2 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-full transition cursor-pointer"
                title="Rekam Pesan Suara"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}

            {/* Send Button */}
            <button
              onClick={() => handleSendMessage()}
              disabled={isLoading || !inputMessage.trim()}
              className="p-2 bg-sky-500 text-white rounded-full hover:bg-sky-400 disabled:opacity-40 disabled:hover:bg-sky-500 transition shadow-md shadow-sky-500/20 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Guide Notes below phone */}
      <div className="mt-4 max-w-md mx-auto grid grid-cols-2 gap-2 text-[11px] text-slate-400">
        <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0">
            <Mic className="w-3.5 h-3.5" />
          </div>
          <span>Bisa rekam suara atau kirim foto struk belanja</span>
        </div>
        <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span>Paham singkatan: 25rb, 50k, 1.5jt, dll.</span>
        </div>
      </div>
    </div>
  );
};
