import { AlertTriangle, Minus } from 'lucide-react';

export type Priority = 'high' | 'medium' | 'low';

export function PriorityIndicator({ priority }: { priority: Priority }) {
  if (priority === 'high') {
    return (
      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#ef4444] uppercase tracking-wider">
        <span className="w-2 h-2 rounded-full bg-[#ef4444]" /> HIGH
      </div>
    );
  }
  if (priority === 'medium') {
    return (
      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#f59e0b] uppercase tracking-wider">
        <AlertTriangle size={12} strokeWidth={3} /> MEDIUM
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#737373] uppercase tracking-wider">
      <Minus size={12} strokeWidth={3} /> LOW
    </div>
  );
}
