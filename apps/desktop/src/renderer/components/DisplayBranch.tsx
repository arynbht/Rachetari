import { CircleAlert } from "lucide-react";

import type { DisplayBranch } from "../../shared/ipc";
import { ShellStatus } from "./ShellStatus";

// The line under a view's title that names the branch its files were read
// from: "showing develop" or "showing main", with a warning when this
// machine's develop and origin/develop have diverged. Nothing until the first
// read lands. The shell's own status (ShellStatus) shares the line.

export function DisplayBranchLine({
  display,
}: {
  display: DisplayBranch | null | undefined;
}) {
  if (!display) return null;
  return (
    <>
      <ShellStatus>showing {display.name}</ShellStatus>
      {display.diverged && (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-400">
          <CircleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Local develop and origin/develop have diverged: showing this
          machine&apos;s develop.
        </p>
      )}
    </>
  );
}
