import { ConfidenceMeter } from './ConfidenceMeter';
import { PriorityIndicator, type Priority } from './PriorityIndicator';
import { User, AlertTriangle, ArrowRight } from 'lucide-react';

export function RoutingExplanation({ 
  item, 
  hasTasks,
  tasksCreated,
  skipped,
  updated
}: { 
  item: any, 
  hasTasks?: boolean,
  tasksCreated?: number,
  skipped?: number,
  updated?: number
}) {
  if (!item) {
    if (hasTasks) {
      return (
        <div className="h-full flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
             <div className="w-12 h-12 rounded-full border border-[#333333] bg-[#1a1a1a] flex items-center justify-center">
                <ArrowRight className="text-[#525252]" />
             </div>
             <div>
                <h3 className="font-mono text-sm uppercase tracking-widest text-[#f5f5f5]">SELECT A TASK</h3>
                <p className="text-xs text-[#737373] mt-2 max-w-xs leading-relaxed">
                  Select an item from the operational stream to view its complete routing decision and context.
                </p>
             </div>
          </div>
          <div className="shrink-0 p-6 border-t border-[#333333] bg-[#111111]">
             <div className="font-mono text-[10px] uppercase tracking-widest text-[#737373] mb-4">LATEST ACTIVITY</div>
             <div className="flex justify-between items-center bg-[#1a1a1a] border border-[#333333] p-4 rounded-sm">
                <div className="flex flex-col">
                   <span className="text-[#10b981] font-semibold text-lg">{tasksCreated || 0}</span>
                   <span className="text-[10px] font-mono text-[#737373]">CREATED</span>
                </div>
                <div className="flex flex-col">
                   <span className="text-[#f59e0b] font-semibold text-lg">{updated || 0}</span>
                   <span className="text-[10px] font-mono text-[#737373]">UPDATED</span>
                </div>
                <div className="flex flex-col">
                   <span className="text-[#737373] font-semibold text-lg">{skipped || 0}</span>
                   <span className="text-[10px] font-mono text-[#737373]">SKIPPED</span>
                </div>
             </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="h-full flex items-center justify-center text-[#737373] text-sm font-mono border border-dashed border-[#333333] rounded-lg m-6">
        AWAITING INBOX PAYLOAD
      </div>
    );
  }

  const isLog = item.status !== undefined;
  
  if (isLog && item.status === 'skipped') {
    return (
      <div className="bg-[#1a1a1a] border border-[#333333] rounded-sm overflow-hidden flex flex-col h-full">
        <div className="p-4 border-b border-[#333333] flex justify-between items-start bg-[#111111]">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-[#737373] mb-1">
              SKIPPED
            </div>
            <h3 className="font-sans font-semibold text-lg text-[#f5f5f5]">
              {item.category ? item.category.replace('_', ' ').toUpperCase() : 'NOISE DETECTED'}
            </h3>
          </div>
        </div>
        <div className="p-5 flex-1 overflow-y-auto space-y-6">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-[#737373] mb-2 border-b border-[#333333] pb-1">
              REASON
            </div>
            <ul className="list-disc pl-4 text-sm text-[#d4d4d4] space-y-1">
               <li>{item.skip_reason || "Unsolicited vendor spam or out-of-office."}</li>
            </ul>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-[#737373] mb-2 border-b border-[#333333] pb-1">
              ACTION
            </div>
            <ul className="list-disc pl-4 text-sm text-[#737373] font-mono space-y-1">
               <li>No task created.</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (item.category === 'triage' || item.assignee_id === 'u_triage') {
    return (
      <div className="bg-[#1a1a1a] border border-[#8b5cf6] rounded-sm overflow-hidden flex flex-col h-full">
        <div className="p-4 border-b border-[#8b5cf6]/30 flex justify-between items-start bg-[#8b5cf6]/10">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-[#8b5cf6] mb-1 flex items-center gap-1.5">
              <AlertTriangle size={12} /> NEEDS HUMAN REVIEW
            </div>
            <h3 className="font-sans font-semibold text-lg text-[#f5f5f5]">
              TRIAGE REQUIRED
            </h3>
          </div>
          {item.confidence && (
            <ConfidenceMeter score={item.confidence} />
          )}
        </div>
        <div className="p-5 flex-1 overflow-y-auto space-y-6">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-[#737373] mb-2 border-b border-[#333333] pb-1">
              CONFLICTING INTENTS / REASON
            </div>
            <ul className="list-disc pl-4 text-sm text-[#d4d4d4] space-y-1">
               <li>{item.description}</li>
            </ul>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-[#737373] mb-2 border-b border-[#333333] pb-1">
              SOURCE EMAIL
            </div>
            <div className="text-sm font-mono text-[#a3a3a3] space-y-1 bg-[#111111] p-3 rounded-sm border border-[#333333]">
              <div>Thread: <span className="text-[#f5f5f5]">{item.thread_id}</span></div>
              <div>Message: <span className="text-[#f5f5f5]">{item.source_email_id || item.email_id}</span></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1a1a1a] border border-[#333333] rounded-sm overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-[#333333] flex justify-between items-start bg-[#111111]">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-[#737373] mb-1 flex gap-2 items-center">
            {item.is_updated ? (
               <><span className="text-[#f59e0b] px-1.5 py-0.5 bg-[#f59e0b]/10 rounded-sm">UPDATED TASK</span></>
            ) : (
               <span className="px-1.5 py-0.5 bg-[#333333] rounded-sm text-[#a3a3a3]">NEW TASK</span>
            )}
          </div>
          <h3 className="font-sans font-semibold text-lg text-[#f5f5f5] mt-1">
            {item.title || (item.category ? item.category.replace('_', ' ').toUpperCase() : 'UNCATEGORIZED')}
          </h3>
          <div className="mt-2 flex gap-3 items-center">
            <div className="flex items-center gap-2 text-sm font-mono text-[#a3a3a3]">
              <span className="uppercase text-[10px] tracking-widest">ASSIGNED TO</span>
              <User size={14} className="ml-1" /> <span className="text-[#f5f5f5] bg-[#262626] px-1.5 py-0.5 rounded-sm">{item.assignee_id}</span>
            </div>
            <div className="text-[#333333]">•</div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#a3a3a3]">
              {item.category?.replace('_', ' ')}
            </div>
          </div>
        </div>
        {item.confidence !== undefined && (
          <ConfidenceMeter score={item.confidence} />
        )}
      </div>

      <div className="p-5 flex-1 overflow-y-auto space-y-6">
        
        {item.is_updated && item.previous_state ? (
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-[#737373] mb-2 border-b border-[#333333] pb-1">
              THREAD RECONCILIATION
            </div>
            <div className="grid grid-cols-2 gap-4 bg-[#111111] p-3 rounded-sm border border-[#333333]">
               <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-[#737373] mb-2">PREVIOUS (th_{item.previous_state.thread_id || '??'})</div>
                  <div className="text-xs font-mono text-[#a3a3a3] space-y-1">
                     <div>Value: {item.previous_state.deal_value_inr ? `₹${item.previous_state.deal_value_inr.toLocaleString('en-IN')}` : 'None'}</div>
                     <div>Due: {item.previous_state.due_date || 'None'}</div>
                     <div>Pri: {item.previous_state.priority}</div>
                  </div>
               </div>
               <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-[#f59e0b] mb-2">UPDATED (th_{item.thread_id})</div>
                  <div className="text-xs font-mono text-[#f5f5f5] space-y-1">
                     <div>Value: {item.deal_value_inr ? `₹${item.deal_value_inr.toLocaleString('en-IN')}` : 'None'}</div>
                     <div>Due: {item.due_date || 'None'}</div>
                     <div>Pri: {item.priority}</div>
                  </div>
               </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 bg-[#111111] p-3 rounded-sm border border-[#333333]">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-[#737373] mb-2">
                PRIORITY
              </div>
              <PriorityIndicator priority={item.priority as Priority || 'low'} />
            </div>
            
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-[#737373] mb-2">
                DEAL VALUE
              </div>
              <div className="text-sm font-mono text-[#d4d4d4] flex items-center gap-1">
                {item.deal_value_inr ? `₹${item.deal_value_inr.toLocaleString('en-IN')}` : 'Not specified'}
              </div>
            </div>
          </div>
        )}

        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-[#737373] mb-2 border-b border-[#333333] pb-1">
            ROUTING DECISION & EVIDENCE
          </div>
          <ul className="list-disc pl-4 text-sm text-[#d4d4d4] space-y-1">
             <li>{item.description}</li>
          </ul>
        </div>

        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-[#737373] mb-2 border-b border-[#333333] pb-1">
            SOURCE EMAIL
          </div>
          <div className="text-sm font-mono text-[#a3a3a3] space-y-1 bg-[#111111] p-3 rounded-sm border border-[#333333]">
            <div>Thread: <span className="text-[#f5f5f5]">{item.thread_id}</span></div>
            <div>Message: <span className="text-[#f5f5f5]">{item.source_email_id || item.email_id}</span></div>
          </div>
        </div>

      </div>
    </div>
  );
}
