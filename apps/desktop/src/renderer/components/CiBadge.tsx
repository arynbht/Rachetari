import type { CiState } from "../../shared/ipc";

// A card's PR checks, as a small link to the PR: "CI passed", "CI failed" or
// "CI running". The text carries the state; colour only backs it. Nothing when
// the card has no open PR, its checks aren't known, or gh can't be read. Not
// an alert: it is a status, and the views' own errors stay the only alerts.

const LABEL = {
  passed: "CI passed",
  failed: "CI failed",
  running: "CI running",
} as const;

const TONE = {
  passed: "text-emerald-300",
  failed: "text-amber-400",
  running: "text-sky-300",
} as const;

export function CiBadge({
  branch,
  state,
}: {
  branch: string | null;
  state: CiState;
}) {
  if (!branch || !state || state.gh !== "ok") return null;
  const pr = state.prs.find((p) => p.branch === branch);
  if (!pr || pr.state === "none") return null;
  return (
    <a
      href={pr.url}
      target="_blank"
      rel="noreferrer"
      className={`inline-block whitespace-nowrap rounded text-xs font-medium underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${TONE[pr.state]}`}
    >
      {LABEL[pr.state]}
    </a>
  );
}
