import type { TrainingDay } from "../types/index.js";

interface Props {
  days: TrainingDay[];
  selectedId: number;
  onSelect: (day: TrainingDay) => void;
}

const DAY_ICONS: Record<number, string> = {
  1: "◈",
  2: "◉",
  3: "◊",
  4: "◆",
};

export function CycleSelector({ days, selectedId, onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2" data-testid="cycle-selector">
      {days.map((day) => (
        <button
          key={day.id}
          onClick={() => onSelect(day)}
          data-testid={`cycle-option-${day.id}`}
          className={`
            relative p-3 rounded-lg border font-terminal text-left transition-all duration-150
            ${selectedId === day.id
              ? "border-matrix-green bg-matrix-green-dark text-matrix-green shadow-matrix-sm"
              : "border-matrix-border bg-matrix-bg-card text-matrix-text-muted hover:border-matrix-green/50 hover:text-matrix-green"
            }
          `}
        >
          <div className="text-lg mb-1">{DAY_ICONS[day.order_idx] ?? "◇"}</div>
          <div className="text-xs leading-tight">{day.name}</div>
          <div className="text-xs mt-1 opacity-60">
            {day.muscle_targets.map((t) => t.muscle).join(", ")}
          </div>
          {selectedId === day.id && (
            <span className="absolute top-2 right-2 text-matrix-green text-xs">●</span>
          )}
        </button>
      ))}
    </div>
  );
}
