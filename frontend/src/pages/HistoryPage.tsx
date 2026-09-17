import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../utils/api.js";
import { TerminalHeader } from "../components/TerminalHeader.js";
import type { TrainingSession } from "../types/index.js";

function SessionCard({
  session,
  onDelete,
  isDeleting,
}: {
  session: TrainingSession & { day_name: string };
  onDelete: (id: number) => void;
  isDeleting: boolean;
}) {
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isComplete = !!session.completed_at;

  return (
    <div
      className="border border-matrix-border rounded-lg bg-matrix-bg-card overflow-hidden"
      data-testid={`session-card-${session.id}`}
    >
      <button
        onClick={() => navigate(`/session/${session.id}`)}
        className="w-full text-left p-4 hover:bg-matrix-green/5 transition-colors space-y-2"
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
          <div
            className={`text-xs font-terminal px-2 py-0.5 rounded border ${
              isComplete
                ? "text-matrix-green border-matrix-green/30"
                : "text-matrix-yellow border-matrix-yellow/30"
            }`}
          >
            {isComplete ? "DONE" : "ACTIVE"}
          </div>
        </div>
        {session.completed_at && (
          <div className="text-xs text-matrix-text-muted font-terminal">
            {new Date(session.started_at).toLocaleTimeString()} →{" "}
            {new Date(session.completed_at).toLocaleTimeString()}
          </div>
        )}
        <div className="text-[11px] font-terminal text-matrix-text-muted">
          {isComplete ? "Tap to view or edit logged data" : "Tap to resume session"}
        </div>
      </button>

      {!showDeleteConfirm ? (
        <div className="border-t border-matrix-border px-4 py-2">
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            data-testid={`delete-session-${session.id}`}
            className="text-xs font-terminal text-matrix-red hover:text-matrix-red/80 uppercase tracking-widest"
          >
            ✕ Delete session
          </button>
        </div>
      ) : (
        <div className="border-t border-matrix-border px-4 py-3 space-y-2 bg-matrix-bg">
          <div className="text-xs font-terminal text-matrix-text-muted text-center">
            DELETE THIS SESSION PERMANENTLY?
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 py-2 rounded-lg border border-matrix-border font-terminal text-xs text-matrix-text-muted"
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={() => onDelete(session.id)}
              disabled={isDeleting}
              data-testid={`confirm-delete-session-${session.id}`}
              className="flex-1 py-2 rounded-lg bg-matrix-red/20 border border-matrix-red font-terminal text-xs text-matrix-red"
            >
              {isDeleting ? "DELETING..." : "DELETE"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function HistoryPage() {
  const qc = useQueryClient();
  const { data: sessions, isLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => api.listSessions(50),
  });

  const deleteSession = useMutation({
    mutationFn: (id: number) => api.deleteSession(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["currentDay"] });
      qc.invalidateQueries({ queryKey: ["weeklyVolume"] });
    },
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
            onDelete={(id) => deleteSession.mutate(id)}
            isDeleting={deleteSession.isPending}
          />
        ))}
      </div>
    </div>
  );
}
