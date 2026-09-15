export interface ProposalExercise {
  name: string;
  reps_min: number | null;
  reps_max: number | null;
  default_sets: number;
  equipment?: string | null;
}

export interface LastEntry {
  weight: number | null;
  reps: number;
  sets: number;
}

export interface LogResult {
  method: string;
  summary: string;
  volume: number;
  detail?: string;
}

export interface LoggerProps {
  exercise: ProposalExercise;
  lastWeek: LastEntry | null;
  onLog: (result: LogResult) => void;
}

export function formatNum(n: number): string {
  return Number.isInteger(n) ? n.toString() : n.toFixed(1);
}
