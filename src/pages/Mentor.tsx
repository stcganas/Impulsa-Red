import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  Send, 
  User, 
  Bot, 
  Loader2, 
  ChevronLeft,
  MessageSquare,
  Lightbulb,
  Target,
  TrendingUp
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useUser } from "../contexts/UserContext";
import { supabase } from "../lib/supabase";

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export default function Mentor() {
  const navigate = useNavigate();
  const { user, loading: userLoading } = useUser();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: `¡Hola ${user?.name || 'Líder'}! Soy tu Mentor IA. Estoy aquí para ayudarte a escalar tu red de referidos y alcanzar ese 70% de comisión. ¿En qué puedo apoyarte hoy?`,
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userLoading && !user) {
      navigate("/login");
    }
  }, [user, userLoading, navigate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e?: any) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch("/api/mentor/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ 
          message: input,
          context: {
            name: user?.name,
            level: user?.level,
            plan: user?.plan,
            balance: user?.wallet_balance,
            referralsCount: user?.referrals_count
          }
        }),
      });

      if (response && response.ok) {
        const data = await response.json();
        
        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          text: data.reply || "Lo siento, tuve un pequeño error. ¿Podrías repetir eso?",
          sender: 'bot',
          timestamp: new Date()
        };

        setMessages(prev => [...prev, botMsg]);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error del servidor: ${response.status}`);
      }
    } catch (error: any) {
      console.error("Mentor Error:", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: error.message === 'Failed to fetch' 
          ? "No pude conectarme con el servidor. Por favor, verifica tu conexión o intenta más tarde."
          : "Lo siento, tuve un problema al procesar tu mensaje. Intenta de nuevo.",
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    { text: "¿Cómo consigo más referidos?", icon: Target },
    { text: "Estrategia para Plan Élite", icon: TrendingUp },
    { text: "¿Cómo subir de nivel rápido?", icon: Lightbulb },
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 text-white px-6 pt-12 pb-6 flex items-center gap-4 relative overflow-hidden shrink-0">
        <div className="absolute top-[-50%] right-[-10%] w-[60%] h-[200%] bg-blue-600/20 blur-[60px] rounded-full pointer-events-none" />
        
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center relative z-10"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Mentor IA</h1>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-slate-400">En línea ahora</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-fixed">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={cn(
                "flex w-full",
                msg.sender === 'user' ? "justify-end" : "justify-start"
              )}
            >
              <div className={cn(
                "flex gap-3 max-w-[85%]",
                msg.sender === 'user' ? "flex-row-reverse" : "flex-row"
              )}>
                <div className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                  msg.sender === 'user' ? "bg-slate-900 text-white" : "bg-blue-600 text-white"
                )}>
                  {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                
                <div className={cn(
                  "p-4 rounded-3xl text-sm font-medium shadow-sm",
                  msg.sender === 'user' 
                    ? "bg-slate-900 text-white rounded-tr-none" 
                    : "bg-white text-slate-800 border border-slate-100 rounded-tl-none"
                )}>
                  {msg.text}
                  <div className={cn(
                    "text-[10px] mt-2 opacity-50",
                    msg.sender === 'user' ? "text-right" : "text-left"
                  )}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white p-4 rounded-3xl rounded-tl-none border border-slate-100 shadow-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pensando...</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 bg-white border-t border-slate-100 shrink-0">
        {messages.length === 1 && (
          <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-2">
            {suggestions.map((s) => (
              <button
                key={s.text}
                onClick={() => {
                  setInput(s.text);
                  // Trigger send after state update? Better to just call handleSend with the text
                }}
                className="px-4 py-2 rounded-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 whitespace-nowrap flex items-center gap-2 hover:bg-blue-50 hover:border-blue-100 hover:text-blue-600 transition-all"
              >
                <s.icon className="w-3 h-3" />
                {s.text}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSend} className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu pregunta aquí..."
              className="w-full pl-6 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <MessageSquare className="w-5 h-5 text-slate-300" />
            </div>
          </div>
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
          >
            <Send className="w-6 h-6" />
          </button>
        </form>
      </div>
    </div>
  );
}
