import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/errors";

import type { ChecklistView } from "../../shared/ipc";
import { ChecklistBody, Subtitle } from "./ChecklistParts";
import { DisplayBranchLine } from "./DisplayBranch";

// Checklist: the repo checklist on the display branch — the stage and what
// decides it, and each line with its status and the check that decides it, as
// /setup last recorded them. From CHECKLIST.md it shows one row per section,
// gaps first; from BACKLOG.md's "Repo checklist" (a repo not moved yet) it
// shows the lines by stage. It changes nothing and runs no check; Reload reads
// the file again.

export function Checklist({ repoPath }: { repoPath: string }) {
  const [view, setView] = useState<ChecklistView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alphabetical, setAlphabetical] = useState(false);

  // Counts reads, so only the latest one (a Reload, or the first read) lands.
  const loadSeq = useRef(0);

  const load = useCallback(() => {
    const seq = ++loadSeq.current;
    const active = () => seq === loadSeq.current;
    setLoading(true);
    window.rachetari.checklist.get(repoPath).then(
      (next) => {
        if (!active()) return;
        setView(next);
        setError(null);
        setLoading(false);
      },
      (err: unknown) => {
        if (!active()) return;
        setError(errorMessage(err));
        setLoading(false);
      },
    );
    return () => {
      if (active()) loadSeq.current++;
    };
  }, [repoPath]);

  useEffect(() => load(), [load]);

  const hasChecklist = Boolean(view && (view.groups.length > 0 || view.stage));
  const bySection = view?.source === "CHECKLIST.md";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Checklist</h2>
          <DisplayBranchLine display={view?.display} />
          <Subtitle
            view={view}
            bySection={bySection}
            hasChecklist={hasChecklist}
          />
        </div>
        <Button variant="secondary" onClick={() => load()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Reload
        </Button>
      </div>

      {error && (
        <p
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-rose-300"
          role="alert"
        >
          {error}
        </p>
      )}

      <ChecklistBody
        view={view}
        loading={loading}
        hasChecklist={hasChecklist}
        alphabetical={alphabetical}
        onToggleAlphabetical={() => setAlphabetical((v) => !v)}
      />
    </div>
  );
}
