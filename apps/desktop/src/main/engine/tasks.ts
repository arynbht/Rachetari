// Tasks adapter: every card where it stands, from the snapshot the Now hub
// already reads (so no repo is polled twice), and one card in full. A card is
// looked up by the key the board gave it, never by a path the renderer sends,
// so a record can only be read from the repo's own cards. Nothing here writes.
import type { KitSnapshot } from "../kit/watch";
import { cardRef, readCardCommits, readDoneCard } from "../kit/source";
import type {
  TaskColumn,
  TaskDetail,
  TaskItem,
  TasksState,
} from "../../shared/ipc";

/** The board column a card's Status puts it in. */
export function columnOf(status: string, pr: number | null): TaskColumn {
  switch (status.trim().toLowerCase()) {
    case "draft":
      return "draft";
    case "ready":
      return "ready";
    case "in progress":
      return "progress";
    case "blocked":
      return "blocked";
    case "done":
      return pr === null ? "done" : "pr";
    default:
      // A status the template doesn't list: a person has to look at it.
      return "blocked";
  }
}

/** Every card in the repo, in board order within each column. */
export function taskItems(snapshot: KitSnapshot): TaskItem[] {
  const nextUp = (snapshot.backlog?.nextUp ?? []).map((line, i): TaskItem => ({
    key: `next-up:${i + 1}`,
    id: `Next up ${i + 1}`,
    title: line,
    column: "next",
    status: "next up",
    heldBy: null,
    branch: null,
    updated: null,
    pr: null,
    unreadable: false,
    source: "next-up",
  }));
  const live = snapshot.cards.map((c): TaskItem =>
    c.card
      ? {
          key: `branch:${c.branch}`,
          id: c.card.id,
          title: c.card.title,
          column: columnOf(c.card.status, c.card.pr),
          status: c.card.status,
          heldBy: c.card.heldBy,
          branch: c.branch,
          updated: c.lastCommitAt,
          pr: c.card.pr,
          unreadable: false,
          source: "card",
        }
      : c.drafting
        ? {
            key: `branch:${c.branch}`,
            id: /T-\d{4,}/.exec(c.branch)?.[0] ?? c.branch,
            title: "Being drafted: no CARD.md committed yet",
            column: "draft",
            status: "drafting",
            heldBy: null,
            branch: c.branch,
            updated: c.lastCommitAt,
            pr: null,
            unreadable: false,
            source: "card",
          }
        : {
            key: `branch:${c.branch}`,
            id: /T-\d{4,}/.exec(c.branch)?.[0] ?? c.branch,
            title: "CARD.md can't be read",
            column: "blocked",
            status: "unreadable",
            heldBy: null,
            branch: c.branch,
            updated: c.lastCommitAt,
            pr: null,
            unreadable: true,
            source: "card",
          },
  );
  // A card whose branch is still live is shown from its branch, not twice.
  const liveIds = new Set(live.map((i) => i.id));
  const done = snapshot.done
    .filter((d) => !liveIds.has(d.id))
    .map((d): TaskItem => ({
      key: `done:${d.path}`,
      id: d.id,
      title: d.title,
      column: "done",
      status: d.status,
      heldBy: null,
      branch: null,
      updated: d.closedAt,
      pr: d.pr,
      unreadable: d.status === "unreadable",
      source: "done",
    }));
  return [...nextUp, ...live, ...done];
}

export function tasksState(
  repoPath: string,
  snapshot: KitSnapshot,
  ready: boolean,
  error: string | null,
): TasksState {
  return { repoPath, ready, error, items: taskItems(snapshot) };
}

/** One card in full: the card, and the commits on its branch (or to its done file). */
export async function taskDetail(
  repoPath: string,
  snapshot: KitSnapshot,
  key: string,
): Promise<TaskDetail> {
  const item = taskItems(snapshot).find((i) => i.key === key);
  if (!item) throw new Error(`there is no card ${key} in this repo now`);

  if (item.source === "next-up")
    return {
      item,
      card: null,
      error: null,
      commits: [],
    };

  if (item.source === "done") {
    const path = key.slice("done:".length);
    const card = await readDoneCard(repoPath, path);
    return {
      item,
      card,
      error: card ? null : `unreadable: ${path} isn't a card`,
      commits: await readCardCommits(repoPath, { path }),
    };
  }

  const live = snapshot.cards.find((c) => `branch:${c.branch}` === key);
  if (!live) throw new Error(`there is no card ${key} in this repo now`);
  const ref = await cardRef(repoPath, live);
  return {
    item,
    card: live.card,
    error: live.card || live.drafting ? null : (live.error ?? "unreadable"),
    commits: ref ? await readCardCommits(repoPath, { ref }) : [],
  };
}
