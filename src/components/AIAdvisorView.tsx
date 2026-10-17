import React, { useState, useEffect } from 'react';
import { 
  BrainCircuit, 
  Sparkles, 
  TrendingUp, 
  Lightbulb, 
  Quote, 
  RefreshCw, 
  CheckCircle2, 
  Send,
  MessageSquare,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { AIInsights } from '../types';
import { api } from '../services/api';

export const AIAdvisorView: React.FC = () => {
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userQuestion, setUserQuestion] = useState('');
  const [chatLog, setChatLog] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    {
      role: 'ai',
      text: 'Halo! Saya asisten penasehat keuangan AI Anda. Anda dapat berkonsultasi seputar strategi menabung, investasi pemula, cara menghemat pengeluaran, atau evaluasi anggaran bulanan Anda.',
    },
  ]);
  const [isAsking, setIsAsking] = useState(false);

  const fetchInsights = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAIInsights();
      setInsights(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuestion.trim()) return;

    const q = userQuestion.trim();
    setUserQuestion('');
    setChatLog((prev) => [...prev, { role: 'user', text: q }]);
    setIsAsking(true);

    try {
      const result = await api.parseText(`Tolong jawab pertanyaan konsultasi keuangan ini dalam bahasa Indonesia yang ramah, taktis, dan aplikatif: "${q}"`);
      setChatLog((prev) => [
        ...prev,
        {
          role: 'ai',
          text: result.formattedBotReply || result.chatResponse || 'Terima kasih atas pertanyaannya. Menjaga rasio tabungan di atas 20% adalah langkah utama dalam membangun kestabilan finansial.',
        },
      ]);
    } catch (err: any) {
      setChatLog((prev) => [
        ...prev,
        {
          role: 'ai',
          text: 'Maaf, terjadi kendala saat memproses jawaban AI. Silakan coba kembali.',
        },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-purple-400" />
            Penasehat Keuangan AI Gemini
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Analisis kondisi finansial otomatis bertenaga Google Gemini 3.8 Flash.
          </p>
        </div>

        <button
          onClick={fetchInsights}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 border border-purple-500/30 transition cursor-pointer self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Perbarui Analisis</span>
        </button>
      </div>

      {/* Main Score & Summary Card */}
      {insights && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Health Score Gauge (1 Col) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-sm">
            <span className="text-xs font-medium text-slate-400 mb-2">Skor Kesehatan Finansial</span>

            <div className="relative w-36 h-36 flex items-center justify-center my-2">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="transparent"
                  stroke="#1e293b"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="transparent"
                  stroke="#38bdf8"
                  strokeWidth="8"
                  strokeDasharray={264}
                  strokeDashoffset={264 - (264 * insights.healthScore) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-extrabold text-white">{insights.healthScore}</span>
                <span className="text-[10px] text-slate-400 font-medium">dari 100</span>
              </div>
            </div>

            <span className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <ShieldCheck className="w-3.5 h-3.5" /> {insights.healthStatus}
            </span>
          </div>

          {/* AI Summary & Quote (2 Cols) */}
          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-sm space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sky-400 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                Ringkasan Eksekutif AI
              </div>
              <p className="text-slate-200 text-sm leading-relaxed">
                {insights.summary}
              </p>
            </div>

            {/* Motivational Quote */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 flex items-start gap-3">
              <Quote className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-300 italic leading-relaxed">
                "{insights.quote}"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Highlights & Recommendations */}
      {insights && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Key Highlights */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Temuan & Highlight Keuangan
            </h4>
            <div className="space-y-2.5">
              {insights.highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs text-slate-300 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{h}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tactical Recommendations */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              Rekomendasi Aksi Hemat Spesifik
            </h4>
            <div className="space-y-2.5">
              {insights.recommendations.map((r, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs text-slate-300 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{r}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Interactive AI Chat Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div>
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-sky-400" />
            Tanya AI Keuangan (Konsultasi Bebas)
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Tanyakan apa saja seputar pengelolaan uang, dana darurat, atau tips hemat.
          </p>
        </div>

        {/* Chat History */}
        <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800/80 max-h-72 overflow-y-auto space-y-3 scrollbar-thin">
          {chatLog.map((chat, idx) => (
            <div
              key={idx}
              className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                  chat.role === 'user'
                    ? 'bg-sky-600 text-white rounded-br-xs'
                    : 'bg-slate-800 text-slate-200 rounded-bl-xs border border-slate-700/60'
                }`}
              >
                {chat.text}
              </div>
            </div>
          ))}

          {isAsking && (
            <div className="flex justify-start">
              <div className="bg-slate-800 text-slate-400 rounded-2xl rounded-bl-xs p-3 text-xs border border-slate-700/60 italic flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-purple-400" />
                Gemini AI sedang menyusun saran terbaik...
              </div>
            </div>
          )}
        </div>

        {/* Question Form */}
        <form onSubmit={handleAskQuestion} className="flex gap-2">
          <input
            type="text"
            value={userQuestion}
            onChange={(e) => setUserQuestion(e.target.value)}
            placeholder="Contoh: Berapa persen dari gaji yang sebaiknya saya alokasikan untuk investasi saham/reksadana?"
            disabled={isAsking}
            className="flex-1 bg-slate-950 text-white text-xs px-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-purple-500"
          />
          <button
            type="submit"
            disabled={isAsking || !userQuestion.trim()}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold disabled:opacity-40 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Kirim</span>
          </button>
        </form>
      </div>
    </div>
  );
};
