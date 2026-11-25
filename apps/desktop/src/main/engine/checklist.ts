// Checklist adapter: the repo checklist in BACKLOG.md on the default branch,
// read fresh each time it's asked for (Reload reads it again). Read-only.
import { readBacklog } from "../kit/source";
import type { ChecklistView } from "../../shared/ipc";

export async function readChecklist(repoPath: string): Promise<ChecklistView> {
  const backlog = await readBacklog(repoPath);
  const checklist = backlog?.checklist;
  return {
    repoPath,
    hasBacklog: backlog !== null,
    stage: checklist?.stage ?? null,
    stageWhy: checklist?.stageWhy ?? null,
    lastSetup: checklist?.lastSetup ?? null,
    groups: checklist?.groups ?? [],
  };
}
