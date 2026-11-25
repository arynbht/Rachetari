// Checklist adapter: the repo checklist in BACKLOG.md on the display branch,
// read fresh each time it's asked for (Reload reads it again). Read-only.
import { displayBranch, readBacklog } from "../kit/source";
import type { ChecklistView } from "../../shared/ipc";

export async function readChecklist(repoPath: string): Promise<ChecklistView> {
  const display = await displayBranch(repoPath);
  const backlog = await readBacklog(repoPath, display);
  const checklist = backlog?.checklist;
  return {
    repoPath,
    hasBacklog: backlog !== null,
    stage: checklist?.stage ?? null,
    stageWhy: checklist?.stageWhy ?? null,
    lastSetup: checklist?.lastSetup ?? null,
    groups: checklist?.groups ?? [],
    display,
  };
}
