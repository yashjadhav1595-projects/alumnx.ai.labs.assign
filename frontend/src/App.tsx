import { useState, useEffect } from 'react';
import axios from 'axios';
import { Play, Loader2, Search } from 'lucide-react';
import ChatPanel from './ChatPanel';
import { TaskRow } from './components/TaskRow';
import { RoutingExplanation } from './components/RoutingExplanation';

const CANDIDATE_ID = "priya.sharma@gmail.com";
const API_BASE = "http://localhost:8000";

export default function App() {
  const [jsonInput, setJsonInput] = useState('');
  const [emails, setEmails] = useState<any[]>([]);
  const [isIngesting, setIsIngesting] = useState(false);
  
  const [tasks, setTasks] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const [ingestStats, setIngestStats] = useState<any>(null);
  const [filter, setFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTasksAndLogs();
  }, []);

  const fetchTasksAndLogs = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/tasks?candidate_id=${CANDIDATE_ID}`);
      setTasks(res.data.tasks || []);
      setLogs(res.data.logs || []);
    } catch (e) {
      console.error(e);
    }
  };

  const generateSample = () => {
    const sample = [
      {
        email_id: "em_00142",
        thread_id: "th_0091",
        message_index: 0,
        from_name: "Suresh Kulkarni",
        from_email: "s.kulkarni@meridiansteel.co.in",
        to: "sales@company.com",
        cc: ["procurement@meridiansteel.co.in"],
        subject: "RFP - Enterprise Document Management System",
        body: "Dear Team,\n\nPlease find attached our RFP for a document management system...",
        received_at: "2026-08-01T09:14:22+05:30",
        attachments: ["RFP_DMS_2026.pdf"],
        is_reply: false
      },
      {
        email_id: "em_00143",
        thread_id: "th_0092",
        message_index: 0,
        from_name: "Ankit Bose",
        from_email: "ankit@railyardlogistics.in",
        to: "sales@company.com",
        cc: [],
        subject: "Quick demo request",
        body: "Hi, we're a 30-person logistics startup in Pune... can we get a demo sometime next week? Nothing urgent. — Ankit Bose, Founder, Railyard Logistics",
        received_at: "2026-08-01T11:02:00+05:30",
        attachments: [],
        is_reply: false
      },
      {
        email_id: "em_00144",
        thread_id: "th_0093",
        message_index: 0,
        from_name: "Nandita Reddy",
        from_email: "nandita@saassummit.in",
        to: "marketing@company.com",
        cc: [],
        subject: "Sponsorship confirmation needed",
        body: "We're finalising sponsors for the India SaaS Summit in Bengaluru. Gold tier is ₹4,00,000 and includes a keynote slot. We need confirmation by tomorrow EOD as we're going to print.",
        received_at: "2026-08-02T16:45:00+05:30",
        attachments: [],
        is_reply: false
      },
      {
        email_id: "em_00145",
        thread_id: "th_0091",
        message_index: 1,
        from_name: "Auto-reply",
        from_email: "s.kulkarni@meridiansteel.co.in",
        to: "sales@company.com",
        cc: [],
        subject: "Out of Office",
        body: "I am out of office until 14th August with limited access to email. For urgent matters please contact my colleague at raghav@northbridge.in. — Sent from Outlook",
        received_at: "2026-08-03T08:00:00+05:30",
        attachments: [],
        is_reply: true
      },
      {
        email_id: "em_00146",
        thread_id: "th_0094",
        message_index: 0,
        from_name: "Farhan Qureshi",
        from_email: "f.qureshi@halcyon.com",
        to: "sales@company.com",
        cc: [],
        subject: "Meeting follow up",
        body: "Hi — we met at your booth in Mumbai. Two things: (1) we'd like to evaluate your platform for our 800-person org, budget TBD but likely significant, and (2) our CMO wants to co-host a webinar with your team in September. Can you loop in the right people?",
        received_at: "2026-08-04T10:00:00+05:30",
        attachments: [],
        is_reply: false
      }
    ];
    setJsonInput(JSON.stringify(sample, null, 2));
    setEmails(sample);
  };

  const processEmails = async () => {
    if (!emails.length) return;
    setIsIngesting(true);
    setIngestStats(null);
    try {
      const res = await axios.post(`${API_BASE}/ingest`, {
        candidate_id: CANDIDATE_ID,
        emails: emails
      });
      setIngestStats(res.data);
      await fetchTasksAndLogs();
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsIngesting(false);
    }
  };
  
  let streamItems = [...tasks, ...logs.filter(l => l.status === 'skipped')];
  
  if (filter !== 'ALL') {
    if (filter === 'SKIPPED') {
      streamItems = streamItems.filter(i => i.status === 'skipped');
    } else if (filter === 'UPDATED') {
      streamItems = streamItems.filter(i => i.is_updated);
    } else if (filter === 'TRIAGE') {
      streamItems = streamItems.filter(i => i.category === 'triage' || i.assignee_id === 'u_triage');
    } else {
      streamItems = streamItems.filter(i => i.priority?.toLowerCase() === filter.toLowerCase());
    }
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    streamItems = streamItems.filter(i => 
      (i.title || '').toLowerCase().includes(q) ||
      (i.company_name || '').toLowerCase().includes(q) ||
      (i.source_email_id || '').toLowerCase().includes(q) ||
      (i.email_id || '').toLowerCase().includes(q) ||
      (i.assignee_id || '').toLowerCase().includes(q) ||
      (i.category || '').toLowerCase().includes(q)
    );
  }
  
  const pWeight: Record<string, number> = { high: 4, medium: 3, low: 2 };
  streamItems.sort((a, b) => {
    const aW = a.status === 'skipped' ? 0 : (pWeight[a.priority] || 1);
    const bW = b.status === 'skipped' ? 0 : (pWeight[b.priority] || 1);
    return bW - aW;
  });

  const updatedTasks = tasks.filter(t => t.is_updated).length;
  const skippedCount = logs.filter(l => l.status === 'skipped').length;
  const triageCount = tasks.filter(t => t.category === 'triage' || t.assignee_id === 'u_triage').length;

  return (
    <div className="h-screen w-full flex flex-col bg-[#111111] text-[#f5f5f5] font-sans overflow-hidden">
      
      {/* Global Header (64-72px) */}
      <header className="h-[68px] px-6 border-b border-[#333333] bg-[#111111] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#f5f5f5] text-[#111111] flex items-center justify-center font-bold font-mono">
              AL
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-wide uppercase leading-tight">Sales Inbox</h1>
              <div className="text-[10px] font-mono text-[#a3a3a3] uppercase tracking-widest leading-tight">Task Router</div>
            </div>
          </div>
          
          <div className="h-8 w-px bg-[#333333]"></div>
          
          <div className="flex items-center gap-4 text-[10px] font-mono uppercase tracking-widest text-[#a3a3a3]">
            <span className="text-[#f5f5f5]">RUN 04</span>
            <span><span className="text-[#f5f5f5]">{ingestStats?.processed || 0}</span> PROCESSED</span>
            <span><span className="text-[#10b981]">{tasks.length}</span> TASKS</span>
            <span><span className="text-[#f59e0b]">{updatedTasks}</span> UPDATED</span>
            <span><span className="text-[#737373]">{skippedCount}</span> SKIPPED</span>
            <span><span className="text-[#8b5cf6]">{triageCount}</span> TRIAGE</span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-[10px] font-mono text-[#a3a3a3] uppercase flex items-center gap-2">
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></div> SYSTEM ONLINE</span>
          </div>
          <button
            onClick={processEmails}
            disabled={isIngesting || emails.length === 0}
            className="flex items-center gap-2 bg-[#f5f5f5] text-[#111111] hover:bg-[#d4d4d4] px-4 py-1.5 rounded-sm font-semibold text-xs uppercase tracking-widest transition-colors disabled:opacity-50"
          >
            {isIngesting ? <><Loader2 size={14} className="animate-spin" /> Processing</> : <><Play size={14} /> Process Inbox</>}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 62% Left Pane: Workspace */}
        <div className="w-[62%] border-r border-[#333333] flex flex-col h-full bg-[#111111]">
          
          {/* Ingestion Section */}
          <div className="p-6 border-b border-[#333333] shrink-0">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-mono uppercase tracking-widest text-[#737373]">Raw JSON Ingestion</h2>
              <button 
                onClick={generateSample}
                className="text-[10px] font-mono uppercase tracking-widest text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors"
              >
                [ Load Sample ]
              </button>
            </div>
            <textarea
              value={jsonInput}
              onChange={(e) => {
                 setJsonInput(e.target.value);
                 try { setEmails(JSON.parse(e.target.value)); } catch {}
              }}
              placeholder="Paste inbox.json here..."
              className="w-full h-32 max-h-[220px] bg-[#1a1a1a] border border-[#333333] p-3 font-mono text-[11px] text-[#a3a3a3] focus:outline-none focus:border-[#525252] rounded-sm resize-y"
            />
          </div>

          {/* Processing Summary */}
          {ingestStats && (
            <div className="px-6 py-4 border-b border-[#333333] flex items-center justify-between shrink-0 bg-[#171717]">
              <div className="flex gap-8">
                <div className="flex flex-col">
                  <span className="text-lg font-semibold text-[#f5f5f5]">{ingestStats.processed}</span>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#737373]">PROCESSED</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-semibold text-[#10b981]">{ingestStats.tasks_created}</span>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#737373]">CREATED</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-semibold text-[#f59e0b]">{ingestStats.tasks_updated}</span>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#737373]">UPDATED</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-semibold text-[#737373]">{ingestStats.skipped}</span>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#737373]">SKIPPED</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-semibold text-[#8b5cf6]">{triageCount}</span>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#737373]">TRIAGE</span>
                </div>
              </div>
            </div>
          )}

          {/* Operational Stream */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-6 py-3 bg-[#1a1a1a] border-b border-[#333333] shrink-0">
              <div className="flex justify-between items-center mb-3">
                 <h2 className="text-xs font-mono uppercase tracking-widest text-[#a3a3a3]">Operational Stream</h2>
                 <div className="text-[10px] font-mono text-[#737373]">{tasks.length} Processed · {updatedTasks} Updated · {skippedCount} Skipped</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-1 text-[10px] font-mono uppercase tracking-widest">
                  {['ALL', 'HIGH', 'MEDIUM', 'LOW', 'TRIAGE', 'UPDATED', 'SKIPPED'].map(f => (
                    <button 
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-2 py-1 rounded-sm transition-colors ${filter === f ? 'bg-[#333333] text-[#f5f5f5]' : 'text-[#737373] hover:bg-[#262626] hover:text-[#a3a3a3]'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 bg-[#111111] border border-[#333333] px-2 py-1 rounded-sm focus-within:border-[#525252]">
                   <Search size={12} className="text-[#737373]" />
                   <input 
                     type="text" 
                     placeholder="Search tasks, companies..." 
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="bg-transparent text-[10px] font-mono text-[#f5f5f5] w-48 focus:outline-none placeholder:text-[#525252]"
                   />
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {streamItems.length === 0 ? (
                <div className="p-12 text-center text-[#737373] font-mono text-xs uppercase tracking-widest border border-dashed border-[#333333] m-6 rounded-lg">
                  No matching tasks.
                </div>
              ) : (
                <div className="flex flex-col">
                  {streamItems.map(item => (
                    <TaskRow 
                      key={item.task_id || item.id} 
                      task={item} 
                      isSelected={(selectedItem?.task_id === item.task_id) || (selectedItem?.id === item.id)}
                      onSelect={() => setSelectedItem(item)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 38% Right Pane: Context & Chat */}
        <div className="w-[38%] flex flex-col h-full bg-[#171717]">
          
          {/* Top 60%: Routing Explanation */}
          <div className="h-[60%] border-b border-[#333333] overflow-y-auto">
            <RoutingExplanation 
              item={selectedItem} 
              hasTasks={tasks.length > 0 || logs.length > 0} 
              tasksCreated={tasks.length}
              skipped={skippedCount}
              updated={updatedTasks}
            />
          </div>

          {/* Bottom 40%: Chat Interface */}
          <div className="h-[40%] flex flex-col bg-[#111111] shrink-0">
            <ChatPanel candidateId={CANDIDATE_ID} />
          </div>

        </div>
      </div>
    </div>
  );
}
