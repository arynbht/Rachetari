import { useEffect, useState } from "react";

import type { CiState } from "../../shared/ipc";

// The repo on show's CI, on its own line under the display branch's: the
// branch's last run read through gh ("CI on develop: passed · a1b1ca7"), or
// why it can't be read. Nothing before the first read, or when the repo has
// no GitHub origin. None of it is an alert: the repo's own error box stays
// the only one.

/** The CI state main last told, kept current by its pushes. */
export function useCiState(): CiState {
  const [state, setState] = useState<CiState>(null);
  useEffect(() => {
    let mounted = true;
    let pushed = false;
    const off = window.rachetari.ci.onState((next) => {
      pushed = true;
      setState(next);
    });
    window.rachetari.ci.state().then(
      // A push that landed first is newer: it stays.
      (read) => mounted && !pushed && setState(read),
      () => undefined,
    );
    return () => {
      mounted = false;
      off();
    };
  }, []);
  return state;
}

const LINE = "mt-1 text-xs font-medium text-muted-foreground";

export function CiLine() {
  const state = useCiState();
  if (!state || state.gh === "no-github") return null;
  if (state.gh === "missing" || state.gh === "signed-out")
    return <p className={LINE}>CI unknown: gh not signed in</p>;
  if (state.gh === "error")
    return (
      <p className={LINE}>CI state couldn&apos;t be read: {state.message}</p>
    );
  const branch = state.branch;
  if (!branch) return null;
  const run = branch.run;
  return (
    <p className={LINE}>
      CI on {branch.name}:{" "}
      {run ? (
        <>
          <span className={run.state === "failed" ? "text-amber-400" : ""}>
            {run.state}
          </span>{" "}
          <span aria-hidden>·</span> {run.sha7}
        </>
      ) : (
        "no runs yet"
      )}
    </p>
  );
}
