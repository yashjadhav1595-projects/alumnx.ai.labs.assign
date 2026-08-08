
export type Status = 'routed' | 'skipped' | 'triage' | 'error' | 'new' | 'updated';

export function StatusBadge({ status, label }: { status: Status; label?: string }) {
  const styles = {
    routed: "text-[#10b981] border-[#10b981]/20 bg-[#10b981]/10",
    skipped: "text-[#737373] border-[#333333] bg-[#1a1a1a]",
    triage: "text-[#8b5cf6] border-[#8b5cf6]/20 bg-[#8b5cf6]/10",
    error: "text-[#ef4444] border-[#ef4444]/20 bg-[#ef4444]/10",
    new: "text-[#3b82f6] border-[#3b82f6]/20 bg-[#3b82f6]/10",
    updated: "text-[#f59e0b] border-[#f59e0b]/20 bg-[#f59e0b]/10"
  };

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-sm border font-mono text-[10px] uppercase tracking-wider ${styles[status]}`}>
      {label || status}
    </span>
  );
}
