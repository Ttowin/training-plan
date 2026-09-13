import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../utils/api.js";
import { TerminalHeader } from "../components/TerminalHeader.js";
import type { TrainingSession } from "../types/index.js";

function SessionCard({ session }: { session: TrainingSession & { day_name: string } }) {
  const navigate = useNavigate();
  const isComplete = !!session.completed_at;

  return (
    <button
      onClick={() => navigate(`/session/${session.id}`)}
      className="w-full text-left border border-matrix-border rounded-lg p-4 bg-matrix-bg-card hover:border-matrix-green/50 transition-colors space-y-2"
      data-testid={`session-card-${session.id}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-terminal text-matrix-text-muted mb-1">
            {session.session_date}
          </div>
          <div className="font-terminal text-sm text-matrix-green">
            {session.day_name}
          </div>
        </div>
        <div className={`text-xs font-terminal px-2 py-0.5 rounded border ${isComplete ? "text-matrix-green border-matrix-green/30" : "text-matrix-yellow border-matrix-yellow/30"}`}>
          {isComplete ? "DONE" : "ACTIVE"}
        </div>
      </div>
      {session.completed_at && (
        <div className="text-xs text-matrix-text-muted font-terminal">
          {new Date(session.started_at).toLocaleTimeString()} →{" "}
          {new Date(session.completed_at).toLocaleTimeString()}
        </div>
      )}
    </button>
  );
}

export function HistoryPage() {
  const { data: sessions, isLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => api.listSessions(50),
  });

  return (
    <div className="flex flex-col min-h-screen bg-matrix-bg pb-20">
      <TerminalHeader title="Training Log" subtitle="SESSION HISTORY" />

      <div className="flex-1 px-4 pt-4 space-y-3 max-w-lg mx-auto w-full">
        {isLoading && (
          <div className="text-matrix-text-muted font-terminal text-sm animate-pulse">
            LOADING LOG...
          </div>
        )}

        {!isLoading && (!sessions || sessions.length === 0) && (
          <div className="text-center py-16 space-y-3">
            <div className="text-matrix-text-muted font-terminal text-4xl">◈</div>
            <div className="text-matrix-text-muted font-terminal text-sm">
              NO SESSIONS LOGGED
            </div>
            <div className="text-xs text-matrix-text-muted font-terminal opacity-60">
              Start your first session from the home screen
            </div>
          </div>
        )}

        {sessions?.map((sess) => (
          <SessionCard
            key={sess.id}
            session={sess as TrainingSession & { day_name: string }}
          />
        ))}
      </div>
    </div>
  );
}
