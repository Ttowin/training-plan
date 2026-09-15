import { computeVolume } from "../utils/shorthandParser.js";
import type { Exercise, SessionExercise } from "../types/index.js";
import type { SetInput } from "./SetBySetCard.js";

interface Props {
  exercise: Exercise;
  loggedSets: SessionExercise[];
  lastWeekSets: SetInput[];
  cueCount: number;
  onOpen: () => void;
}

export function ExerciseOverviewRow({ exercise, loggedSets, lastWeekSets, cueCount, onOpen }: Props) {
  const isLogged = loggedSets.length > 0;
  const loggedVolume = loggedSets.reduce((acc, e) => acc + computeVolume(e.weight_kg, e.reps ?? 0, e.sets ?? 1), 0);
  const lastVolume = lastWeekSets.reduce((acc, s) => acc + (s.weight ?? 0) * s.reps, 0);
  const improved = isLogged && lastVolume > 0 && loggedVolume > lastVolume;
  const declined = isLogged && lastVolume > 0 && loggedVolume < lastVolume;

  const repsLabel =
    exercise.reps_min && exercise.reps_max
      ? exercise.reps_min === exercise.reps_max
        ? `${exercise.reps_min}`
        : `${exercise.reps_min}-${exercise.reps_max}`
      : "?";

  return (
    <button
      type="button"
      onClick={onOpen}
      data-testid={`exercise-overview-${exercise.id}`}
      className={`w-full text-left flex items-center gap-3 rounded-lg border px-3 py-3 transition-colors ${
        isLogged
          ? declined
            ? "border-matrix-red/60 bg-matrix-bg-card"
            : "border-matrix-green/70 bg-matrix-bg-card"
          : "border-matrix-border bg-matrix-bg-card hover:border-matrix-green"
      }`}
    >
      <span
        className={`w-5 text-center font-terminal text-xs ${isLogged ? "text-matrix-green" : "text-matrix-text-muted"}`}
        aria-hidden
      >
        {isLogged ? "■" : "□"}
      </span>

      <div className="flex-1 min-w-0">
        <div className="font-terminal text-sm text-matrix-green truncate">{exercise.name}</div>
        <div className="text-[11px] font-terminal text-matrix-text-muted truncate">
          {exercise.default_sets}×{repsLabel}
          {exercise.equipment ? ` · ${exercise.equipment}` : ""}
          {cueCount > 0 ? ` · ✦${cueCount}` : ""}
        </div>
      </div>

      <div className="flex-shrink-0 text-right">
        {isLogged ? (
          <div
            className={`text-xs font-terminal ${improved ? "text-matrix-green" : declined ? "text-matrix-red" : "text-matrix-cyan"}`}
            data-testid={`exercise-overview-${exercise.id}-status`}
          >
            {improved && "▲ "}
            {declined && "▼ "}
            {loggedSets.length} set{loggedSets.length === 1 ? "" : "s"}
            <div className="text-matrix-text-muted">vol {loggedVolume.toFixed(0)}</div>
          </div>
        ) : (
          <span
            className="text-xs font-terminal text-matrix-text-muted"
            data-testid={`exercise-overview-${exercise.id}-status`}
          >
            log ▸
          </span>
        )}
      </div>

      <span className="text-matrix-text-muted font-terminal text-xs" aria-hidden>
        ▸
      </span>
    </button>
  );
}
