const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "API error");
  return json.data as T;
}

// Training days
export const api = {
  getTrainingDays: () => request<import("../types").TrainingDay[]>("/training-days"),
  getCurrentDay: () =>
    request<import("../types").TrainingDay & { lastSession: { id: number; session_date: string } | null }>(
      "/training-days/current"
    ),

  // Sessions
  listSessions: (limit = 20, offset = 0) =>
    request<import("../types").TrainingSession[]>(`/sessions?limit=${limit}&offset=${offset}`),
  createSession: (trainingDayId: number, sessionDate: string) =>
    request<import("../types").TrainingSession>("/sessions", {
      method: "POST",
      body: JSON.stringify({ trainingDayId, sessionDate }),
    }),
  getSession: (id: number) =>
    request<import("../types").SessionDetail>(`/sessions/${id}`),
  completeSession: (id: number) =>
    request<import("../types").TrainingSession>(`/sessions/${id}/complete`, { method: "PATCH" }),
  logExercise: (
    sessionId: number,
    data: { exerciseId?: number | null; exerciseName: string; inputRaw: string }
  ) =>
    request<import("../types").SessionExercise>(`/sessions/${sessionId}/exercises`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteExercise: (sessionId: number, exId: number) =>
    request<{ deleted: boolean }>(`/sessions/${sessionId}/exercises/${exId}`, {
      method: "DELETE",
    }),
  getComparison: (sessionId: number) =>
    request<import("../types").ComparisonData>(`/sessions/${sessionId}/comparison`),

  // Progress
  getWeeklyVolume: (weeks = 8) =>
    request<{ weeks: import("../types").WeeklyVolume[] }>(`/progress/volume?weeks=${weeks}`),
};
