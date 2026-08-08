export function ConfidenceMeter({ score }: { score: number }) {
  // Convert 0.0-1.0 to 0-100%
  const percentage = Math.round(score * 100);
  
  let colorClass = "bg-[#10b981]";
  let textClass = "text-[#10b981]";
  
  if (percentage < 60) {
    colorClass = "bg-[#8b5cf6]"; // Triage color for low confidence
    textClass = "text-[#8b5cf6]";
  } else if (percentage < 80) {
    colorClass = "bg-[#f59e0b]";
    textClass = "text-[#f59e0b]";
  }

  return (
    <div className="flex flex-col items-end gap-1 shrink-0">
      <div className={`text-[10px] font-mono tracking-widest ${textClass}`}>
        {percentage}%
      </div>
      <div className="w-16 h-[2px] bg-[#333333] rounded-full overflow-hidden">
        <div 
          className={`h-full ${colorClass} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
