import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Terminal, Loader2, Sparkles } from 'lucide-react';

export default function ChatPanel({ candidateId }: { candidateId: string }) {
  const [messages, setMessages] = useState<{role: 'system' | 'user', text: string, data?: any}[]>([
    { role: 'system', text: 'Ask the Inbox: Ask questions about routed tasks, unclassified emails, or general sales pipeline.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const query = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: query }]);
    setIsLoading(true);

    try {
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const res = await axios.post(`${API_BASE}/api/chat`, {
        candidate_id: candidateId,
        query: query
      });
      
      setMessages(prev => [...prev, { 
        role: 'system', 
        text: res.data.answer, 
        data: res.data.supporting_data 
      }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'system', text: 'Error connecting to analytical backend.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#111111] text-[#f5f5f5] font-sans border-t border-[#333333]">
      <div className="px-6 py-3 border-b border-[#333333] flex items-center gap-2 bg-[#1a1a1a]">
         <Sparkles size={14} className="text-[#a3a3a3]" />
         <h2 className="text-xs font-mono uppercase tracking-widest text-[#a3a3a3]">Ask The Inbox</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-6" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className="flex flex-col gap-4">
            
            <div className="flex gap-3">
              <div className={`mt-0.5 shrink-0 ${m.role === 'user' ? 'text-[#f59e0b]' : 'text-[#737373]'}`}>
                {m.role === 'user' ? '>' : <Terminal size={14} />}
              </div>
              <div className="flex flex-col gap-2 w-full">
                 {m.role === 'system' && i > 0 && (
                   <>
                     <div className="h-px w-full bg-[#333333] mb-1"></div>
                     <div className="font-mono text-[10px] uppercase tracking-widest text-[#737373]">
                       RESULT
                     </div>
                   </>
                 )}
                 <div className={`text-sm ${m.role === 'user' ? 'text-[#f5f5f5] font-mono' : 'text-[#d4d4d4]'} leading-relaxed whitespace-pre-wrap`}>
                   {m.text}
                 </div>
              </div>
            </div>

            {m.data && Object.keys(m.data).length > 0 && (
              <div className="ml-6 pl-4 border-l border-[#333333]">
                <div className="font-mono text-[10px] uppercase tracking-widest text-[#737373] mb-2">
                  SUPPORTING DATA
                </div>
                <pre className="text-[11px] font-mono bg-[#1a1a1a] p-3 rounded-sm text-[#a3a3a3] overflow-x-auto border border-[#333333]">
                  {JSON.stringify(m.data, null, 2)}
                </pre>
              </div>
            )}
            
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 text-[#a3a3a3]">
             <div className="mt-0.5 shrink-0"><Terminal size={14} /></div>
             <div className="text-sm flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Querying...
             </div>
          </div>
        )}
      </div>
      
      <div className="p-4 border-t border-[#333333] bg-[#111111] shrink-0">
        <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#333333] p-2 rounded-sm focus-within:border-[#525252] transition-colors">
          <span className="text-[#f59e0b] font-mono ml-2">{'>'}</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type query here..."
            className="w-full bg-transparent border-none text-sm text-[#f5f5f5] font-mono focus:outline-none focus:ring-0 placeholder:text-[#525252]"
            disabled={isLoading}
          />
        </div>
      </div>
      
    </div>
  );
}
