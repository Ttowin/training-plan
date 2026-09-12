import { useEffect, useState } from "react";

interface Props {
  title: string;
  subtitle?: string;
}

export function TerminalHeader({ title, subtitle }: Props) {
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="border-b border-matrix-border bg-matrix-bg-card px-4 py-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-matrix-green-dim text-xs font-terminal">SYS://</span>
          <span className="text-matrix-green font-terminal text-sm tracking-widest uppercase font-bold">
            {title}
          </span>
        </div>
        <span className="text-matrix-text-muted text-xs font-terminal">{time}</span>
      </div>
      {subtitle && (
        <p className="text-xs text-matrix-text-muted font-terminal">{subtitle}</p>
      )}
      <div className="flex gap-1 mt-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-0.5 flex-1 bg-matrix-border" />
        ))}
        <div className="h-0.5 w-8 bg-matrix-green" />
      </div>
    </div>
  );
}
