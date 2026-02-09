
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Incident } from '../types.ts';
import { chatWithAgent } from '../services/geminiService.ts';

interface ReasoningChatViewProps {
  isDarkMode: boolean;
  userLocation: [number, number];
  customDirective?: string;
  tacticalContext?: Incident[];
}

const ReasoningChatView: React.FC<ReasoningChatViewProps> = ({ isDarkMode, userLocation, customDirective, tacticalContext }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'agent',
      content: "Neural Reasoning Core online. My decisions are now grounded in the NoSQL Tactical Database. How can I assist with your safety analysis?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatWithAgent(input, userLocation, customDirective, tacticalContext);
      
      const groundingLinks = response.groundingResults
        .filter(chunk => chunk.maps)
        .map(chunk => ({
          title: chunk.maps.title || "Tactical Location",
          uri: chunk.maps.uri
        }));

      const agentMsg: ChatMessage = {
        role: 'agent',
        content: response.text,
        timestamp: new Date(),
        groundingLinks: groundingLinks.length > 0 ? groundingLinks : undefined
      };

      setMessages(prev => [...prev, agentMsg]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'agent',
        content: "Error: Database link interrupted. Re-synchronizing...",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex-1 flex flex-col h-full overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
      {/* Header */}
      <div className={`px-8 py-4 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-white'}`}>
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-lg ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-600 text-white'}`}>
            <i className="fa-solid fa-brain"></i>
          </div>
          <div>
            <h2 className={`font-black uppercase tracking-tighter text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Strategic Reasoning Core</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">NoSQL Database Synced</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <p className="text-[9px] font-black text-slate-500 uppercase">Context Nodes</p>
            <p className="text-[10px] font-bold text-indigo-400">{tacticalContext?.length || 0} Persisted</p>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>
      </div>

      {/* Message Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`flex items-center gap-2 mb-2 px-1 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                {msg.role === 'user' ? 'Operator' : 'Krimini Core'}
              </span>
              <span className="text-[8px] font-bold text-slate-400">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            
            <div className={`max-w-[85%] md:max-w-[70%] p-4 rounded-2xl shadow-sm border ${
              msg.role === 'user' 
                ? isDarkMode 
                  ? 'bg-indigo-600 border-indigo-500 text-white' 
                  : 'bg-indigo-600 border-indigo-700 text-white'
                : isDarkMode 
                  ? 'bg-slate-900 border-slate-800 text-slate-200' 
                  : 'bg-white border-slate-200 text-slate-800'
            }`}>
              <p className={`text-sm leading-relaxed ${msg.role === 'agent' ? 'font-medium' : ''}`}>
                {msg.content}
              </p>

              {msg.groundingLinks && msg.groundingLinks.length > 0 && (
                <div className="mt-4 pt-4 border-t border-current/10 space-y-2">
                  <div className="text-[9px] font-black uppercase tracking-widest opacity-60">Tactical Map Links</div>
                  <div className="flex flex-wrap gap-2">
                    {msg.groundingLinks.map((link, li) => (
                      <a 
                        key={li} 
                        href={link.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border flex items-center gap-2 transition-all hover:scale-105 active:scale-95 ${
                          isDarkMode ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20' : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                        }`}
                      >
                        <i className="fa-solid fa-location-dot text-[8px]"></i>
                        {link.title}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex flex-col items-start animate-pulse">
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Querying Database...</span>
            </div>
            <div className={`w-12 h-8 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-slate-100 border border-slate-200'}`}>
              <div className="flex gap-1">
                <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce"></div>
                <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Section */}
      <div className={`p-6 border-t transition-colors duration-300 ${isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-white'}`}>
        <form onSubmit={handleSend} className="max-w-4xl mx-auto relative group">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search tactical records or analyze trends..."
            className={`w-full py-4 pl-6 pr-20 rounded-2xl border-2 text-sm font-bold transition-all outline-none focus:ring-4 ${
              isDarkMode 
                ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500 focus:ring-indigo-500/10' 
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:ring-indigo-600/5'
            }`}
          />
          <button 
            type="submit"
            disabled={!input.trim() || isLoading}
            className={`absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
              !input.trim() || isLoading
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-50'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
            }`}
          >
            <i className="fa-solid fa-paper-plane"></i>
          </button>
        </form>
        <div className="flex justify-center mt-3">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">Strategic Intelligence Powered by Gemini 3 Pro</p>
        </div>
      </div>
    </div>
  );
};

export default ReasoningChatView;
