import { PriorityIndicator, type Priority } from './PriorityIndicator';
import { ConfidenceMeter } from './ConfidenceMeter';
import { StatusBadge } from './StatusBadge';

interface TaskProps {
  task: any;
  isSelected: boolean;
  onSelect: () => void;
}

export function TaskRow({ task, isSelected, onSelect }: TaskProps) {
  const isLog = task.status !== undefined;
  
  if (isLog && task.status === 'skipped') {
    return (
      <div 
        onClick={onSelect}
        className={`group cursor-pointer grid grid-cols-[100px_1fr_150px_100px] gap-4 p-4 border-b border-[#333333] transition-colors ${
          isSelected ? 'bg-[#1a1a1a] border-l-2 border-l-[#f59e0b]' : 'hover:bg-[#1a1a1a]/50 border-l-2 border-l-transparent'
        }`}
      >
        <div className="flex items-center">
           <div className="flex items-center gap-1.5 text-xs font-semibold text-[#737373] uppercase tracking-wider">
             <span className="w-2 h-2 rounded-full bg-[#737373]" /> SKIPPED
           </div>
        </div>
        <div className="flex flex-col gap-1 overflow-hidden">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#737373] group-hover:text-[#a3a3a3] transition-colors truncate">
            {task.category?.replace('_', ' ').toUpperCase() || 'NOISE DETECTED'}
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-[#525252] overflow-hidden whitespace-nowrap">
            <span className="truncate">Ignored</span>
            <span className="text-[#333333] shrink-0">•</span>
            <span className="text-[#525252] shrink-0">{task.email_id}</span>
          </div>
        </div>
        <div className="flex flex-col items-start gap-1 overflow-hidden">
          <div className="text-xs text-[#525252] bg-[#1a1a1a] border border-[#333333] px-2 py-0.5 rounded-sm truncate max-w-full">
            Not created
          </div>
        </div>
        <div className="flex items-center justify-end">
          <span className="text-[10px] font-mono text-[#525252]">—</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={onSelect}
      className={`group cursor-pointer grid grid-cols-[100px_1fr_150px_100px] gap-4 p-4 border-b border-[#333333] transition-colors ${
        isSelected ? 'bg-[#1a1a1a] border-l-2 border-l-[#f59e0b]' : 'hover:bg-[#1a1a1a]/50 border-l-2 border-l-transparent'
      }`}
    >
      <div className="flex items-center">
        <PriorityIndicator priority={task.priority as Priority || 'low'} />
      </div>
      
      <div className="flex flex-col gap-1 overflow-hidden">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#f5f5f5] group-hover:text-white transition-colors truncate">
          {task.title || <span className="text-[#a3a3a3] italic font-normal">UNCLASSIFIED EMAIL</span>}
          {task.is_updated ? (
            <StatusBadge status="updated" />
          ) : (
            !task.status && <StatusBadge status="new" />
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-[#a3a3a3] overflow-hidden whitespace-nowrap">
          <span className={`truncate ${!task.company_name && 'text-[#737373] italic'}`}>{task.company_name || 'Company not identified'}</span>
          <span className="text-[#525252] shrink-0">•</span>
          <span className={`truncate shrink-0 ${!task.category && 'text-[#737373] italic'}`}>{task.category?.replace('_', ' ').toUpperCase() || 'Unclassified'}</span>
          <span className="text-[#525252] shrink-0">•</span>
          <span className={`text-[#737373] shrink-0 ${!task.source_email_id && 'italic'}`}>{task.source_email_id || 'No email ID'}</span>
        </div>
      </div>

      <div className="flex flex-col items-start gap-1 overflow-hidden">
        <div className={`text-xs px-2 py-0.5 rounded-sm truncate max-w-full ${task.assignee_id ? 'text-[#f5f5f5] bg-[#262626]' : 'text-[#737373] bg-[#1a1a1a] italic'}`}>
          {task.assignee_id || 'Awaiting assignment'}
        </div>
        <div className={`text-[10px] font-mono uppercase tracking-wide ${task.due_date ? 'text-[#a3a3a3]' : 'text-[#737373] italic'}`}>
          {task.due_date ? `Due ${task.due_date}` : 'No deadline'}
        </div>
      </div>

      <div className="flex items-center justify-end">
        {task.confidence !== undefined ? (
          <ConfidenceMeter score={task.confidence} />
        ) : (
          <span className="text-[10px] font-mono text-[#737373] italic">Not available</span>
        )}
      </div>
    </div>
  );
}
