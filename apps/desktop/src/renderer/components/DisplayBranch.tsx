import { CircleAlert } from "lucide-react";

import type { DisplayBranch } from "../../shared/ipc";

// The line under a view's title that names the branch its files were read
// from: "showing develop" or "showing main", with a warning when this
// machine's develop and origin/develop have diverged. Nothing until the first
// read lands.

export function DisplayBranchLine({
  display,
}: {
  display: DisplayBranch | null | undefined;
}) {
  if (!display) return null;
  return (
    <>
      <p className="text-xs font-medium text-muted-foreground">
        showing {display.name}
      </p>
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
