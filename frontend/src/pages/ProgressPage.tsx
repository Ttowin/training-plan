import { useQuery } from "@tanstack/react-query";
import { api } from "../utils/api.js";
import { TerminalHeader } from "../components/TerminalHeader.js";

export function ProgressPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["weeklyVolume"],
    queryFn: () => api.getWeeklyVolume(8),
  });

  const weeks = data?.weeks ?? [];
  const maxVolume = Math.max(...weeks.map((w) => w.totalVolume), 1);

  const allDayNames = Array.from(
    new Set(weeks.flatMap((w) => Object.keys(w.byDay)))
  );

  const DAY_COLORS: Record<string, string> = {
    "Chest & Shoulder Day": "#00ff41",
    "Back Day": "#00ffff",
    "Shoulder & Arm Day": "#ffff00",
    "Leg Day": "#ff0040",
  };

  return (
    <div className="flex flex-col min-h-screen bg-matrix-bg pb-20">
      <TerminalHeader title="Progress" subtitle="VOLUME ANALYTICS" />

      <div className="flex-1 px-4 pt-4 space-y-6 max-w-lg mx-auto w-full">
        {isLoading && (
          <div className="text-matrix-text-muted font-terminal text-sm animate-pulse">
            CRUNCHING DATA...
          </div>
        )}

        {!isLoading && weeks.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <div className="text-matrix-text-muted font-terminal text-4xl">▦</div>
            <div className="text-matrix-text-muted font-terminal text-sm">NO DATA YET</div>
          </div>
        )}

        {weeks.length > 0 && (
          <>
            <div className="text-xs font-terminal text-matrix-text-muted uppercase tracking-widest">
              WEEKLY VOLUME (KG)
            </div>

            {/* Bar chart */}
            <div className="space-y-3">
              {weeks.map((week) => (
                <div key={week.weekStart} className="space-y-1">
                  <div className="flex justify-between text-xs font-terminal text-matrix-text-muted">
                    <span>{week.weekStart}</span>
                    <span>{week.totalVolume.toFixed(0)} kg</span>
                  </div>
                  <div className="h-6 bg-matrix-bg-card rounded overflow-hidden border border-matrix-border">
                    <div
                      className="h-full bg-matrix-green transition-all duration-500 rounded"
                      style={{
                        width: `${(week.totalVolume / maxVolume) * 100}%`,
                        boxShadow: week.totalVolume > 0 ? "0 0 8px #00ff41" : "none",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Per-day breakdown */}
            {allDayNames.length > 0 && (
              <>
                <div className="text-xs font-terminal text-matrix-text-muted uppercase tracking-widest">
                  BY TRAINING DAY
                </div>
                <div className="space-y-4">
                  {allDayNames.map((dayName) => {
                    const color = DAY_COLORS[dayName] ?? "#00ff41";
                    const dayWeeks = weeks.filter((w) => w.byDay[dayName] !== undefined);
                    if (dayWeeks.length === 0) return null;

                    const maxDayVol = Math.max(...dayWeeks.map((w) => w.byDay[dayName] ?? 0), 1);

                    return (
                      <div key={dayName} className="border border-matrix-border/50 rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                          <span className="text-xs font-terminal" style={{ color }}>
                            {dayName}
                          </span>
                        </div>
                        {dayWeeks.map((week) => {
                          const vol = week.byDay[dayName] ?? 0;
                          const prevWeek = dayWeeks[dayWeeks.indexOf(week) - 1];
                          const prevVol = prevWeek?.byDay[dayName] ?? null;
                          const trend = prevVol !== null
                            ? vol > prevVol ? "▲" : vol < prevVol ? "▼" : "="
                            : "";
                          const trendColor =
                            trend === "▲" ? "#00ff41" : trend === "▼" ? "#ff0040" : "#3d7a3d";

                          return (
                            <div key={week.weekStart} className="space-y-0.5">
                              <div className="flex justify-between text-xs font-terminal text-matrix-text-muted">
                                <span>{week.weekStart}</span>
                                <span style={{ color: trendColor }}>
                                  {trend} {vol.toFixed(0)} kg
                                </span>
                              </div>
                              <div className="h-3 bg-matrix-bg rounded overflow-hidden">
                                <div
                                  className="h-full rounded transition-all duration-500"
                                  style={{
                                    width: `${(vol / maxDayVol) * 100}%`,
                                    backgroundColor: color,
                                    boxShadow: vol > 0 ? `0 0 6px ${color}` : "none",
                                    opacity: 0.7,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
