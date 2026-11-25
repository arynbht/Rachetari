// The IPC contract shared by main, preload, and renderer. Every channel has a
// zod schema validated on BOTH sides: the main process re-validates each request
// it receives, and the preload re-validates each response before handing it to
// the renderer. The renderer only ever sees the typed `window.rivetari` surface
// (see preload) — never ipcRenderer, fs, git, or the network directly.
import { z } from "zod";

/** Allow-listed channel names. The preload exposes exactly these. */
export const IpcChannel = {
  Ping: "app:ping",
  ReposList: "repos:list",
  ReposAdd: "repos:add",
  ReposRemove: "repos:remove",
  /** Fetch a repo's remotes, so the other machine's card branches appear. */
  ReposFetch: "repos:fetch",
  SettingsLoad: "settings:load",
  SettingsSave: "settings:save",
  NowGet: "now:get",
  NowSelect: "now:select",
  /** Push channel (main → renderer): one repo's Now state after a change. */
  NowUpdate: "now:update",
  NowBadges: "now:badges",
  /** Push channel (main → renderer): how many items wait on you, per repo. */
  NowBadgesUpdate: "now:badgesUpdate",
  /** Push channel (main → renderer): a notification was clicked; show its item. */
  NowFocus: "now:focus",
  /** Home: one line per registered repo, before a repo is picked. */
  HomeGet: "home:get",
  TasksGet: "tasks:get",
  TasksDetail: "tasks:detail",
  /** Push channel (main → renderer): one repo's cards after a change. */
  TasksUpdate: "tasks:update",
  ChecklistGet: "checklist:get",
  DocsList: "docs:list",
  DocsRead: "docs:read",
  HistoryGet: "history:get",
  HistoryNight: "history:night",
  MapGet: "map:get",
  /** Push channel (main → renderer): requests the map's session cancelled. */
  MapBlocked: "map:blocked",
} as const;

export type IpcChannelName = (typeof IpcChannel)[keyof typeof IpcChannel];

// app:ping — a smoke round-trip proving the typed, validated bridge works.
export const PingResponse = z.object({
  reply: z.string(),
  version: z.string(),
});
export type PingResponse = z.infer<typeof PingResponse>;

export const PingRequest = z.object({ message: z.string().min(1).max(200) });
export type PingRequest = z.infer<typeof PingRequest>;

// Repos — local repo folders the user has added (persisted in userData).
export const RepoEntry = z.object({
  /** Absolute path to the repo on disk. */
  path: z.string(),
  /** Display name (folder basename). */
  name: z.string(),
});
export type RepoEntry = z.infer<typeof RepoEntry>;

export const RepoList = z.array(RepoEntry);
export type RepoList = z.infer<typeof RepoList>;

export const RepoRemoveRequest = z.object({ path: z.string().min(1) });
export type RepoRemoveRequest = z.infer<typeof RepoRemoveRequest>;

export const RepoFetchRequest = z.object({ repoPath: z.string().min(1) });
export type RepoFetchRequest = z.infer<typeof RepoFetchRequest>;

// Settings — personal preferences in `userData` (never the repo).
export const Theme = z.enum(["system", "light", "dark"]);
export type Theme = z.infer<typeof Theme>;

export const Settings = z.object({
  /** UI theme; "system" follows the OS preference. */
  theme: Theme,
});
export type Settings = z.infer<typeof Settings>;

/** What the renderer sees: the stored settings. */
export const SettingsView = Settings;
export type SettingsView = z.infer<typeof SettingsView>;

/** A partial update — only the provided fields change. */
export const SettingsSaveRequest = Settings.partial();
export type SettingsSaveRequest = z.infer<typeof SettingsSaveRequest>;

// Now — a repo as it stands, read from its kit files by the file source: the
// health of the repo, what waits on the owner, the cards in progress, and
// what just happened. The watcher pushes a new state on every change.
export const NowRepoRequest = z.object({ repoPath: z.string().min(1) });

/**
 * The branch the shell shows a repo's kit files from: `develop`, from the
 * newer of local `develop` and `origin/develop`, else the default branch.
 */
export const DisplayBranch = z.object({
  /** What the header names: "develop", or the default branch, e.g. "main". */
  name: z.string(),
  /** The ref it was read from, e.g. refs/heads/develop. */
  ref: z.string(),
  /** Local develop and origin/develop have diverged: local is shown. */
  diverged: z.boolean(),
});
export type DisplayBranch = z.infer<typeof DisplayBranch>;
export const NowSelectRequest = z.object({
  repoPath: z.string().min(1).nullable(),
});

export const NowHealth = z.object({
  /** The checklist's stage and what decides it, or null with no backlog. */
  stage: z.string().nullable(),
  stageWhy: z.string().nullable(),
  counts: z.object({
    pass: z.number(),
    fail: z.number(),
    unchecked: z.number(),
    na: z.number(),
  }),
  lastSetup: z.string().nullable(),
  hasBacklog: z.boolean(),
  skills: z.object({
    /** Skills listed in skills/INDEX.md. */
    count: z.number(),
    /** Skills named under "Skills" on the live cards. */
    onLiveCards: z.array(z.string()),
  }),
  lastNight: z
    .object({
      date: z.string(),
      merged: z.number(),
      held: z.number(),
      blocked: z.number(),
    })
    .nullable(),
});
export type NowHealth = z.infer<typeof NowHealth>;

export const NeedsYouItem = z.object({
  kind: z.enum(["approve", "question", "held", "merge", "unreadable"]),
  /** The card's id (or the branch, for a card that can't be read). */
  id: z.string(),
  title: z.string(),
  branch: z.string().nullable(),
  /** Why it waits: the question, the night's finding, the PR. */
  why: z.string(),
  /** Exactly what to do, and where. */
  todo: z.string(),
  /** When it started waiting, as far as the files say (ISO), or null. */
  at: z.string().nullable(),
});
export type NeedsYouItem = z.infer<typeof NeedsYouItem>;

export const NowRunning = z.object({
  id: z.string(),
  title: z.string(),
  branch: z.string(),
  heldBy: z.string().nullable(),
  nextStep: z.string(),
  /** When the card's branch last had a commit (ISO), or null. */
  lastCommitAt: z.string().nullable(),
});
export type NowRunning = z.infer<typeof NowRunning>;

export const RecentEvent = z.object({
  sha: z.string(),
  at: z.string(),
  author: z.string(),
  subject: z.string(),
  cardId: z.string().nullable(),
});
export type RecentEvent = z.infer<typeof RecentEvent>;

export const NowCardLine = z.object({
  id: z.string(),
  title: z.string(),
  /** The card's Status, or "unreadable". */
  status: z.string(),
  heldBy: z.string().nullable(),
  branch: z.string(),
});
export type NowCardLine = z.infer<typeof NowCardLine>;

/** One open question on a card, split into the template's parts. */
export const NowQuestion = z.object({
  /** Its place among the card's open questions, from 1. */
  n: z.number().int().positive(),
  ask: z.string(),
  /** What the card recommends, or null when it doesn't say. */
  recommended: z.string().nullable(),
  options: z.array(z.string()),
});
export type NowQuestion = z.infer<typeof NowQuestion>;

/** A live card with at least one open question, and those questions. */
export const NowQuestionGroup = z.object({
  id: z.string(),
  title: z.string(),
  branch: z.string(),
  questions: z.array(NowQuestion),
});
export type NowQuestionGroup = z.infer<typeof NowQuestionGroup>;

export const NowState = z.object({
  repoPath: z.string(),
  ready: z.boolean(),
  error: z.string().nullable(),
  /** Live cards on card/* branches, readable or not. */
  cardCount: z.number(),
  cards: z.array(NowCardLine),
  health: NowHealth,
  needsYou: z.array(NeedsYouItem),
  /** Each live card's open questions, in card-id order. */
  questions: z.array(NowQuestionGroup),
  running: z.array(NowRunning),
  recent: z.array(RecentEvent),
  /**
   * The branch it was read from, null before the first read. Optional in the
   * type only, so a NowState built by hand without it still checks; the
   * engine always sets it.
   */
  display: DisplayBranch.nullable().optional(),
});
export type NowState = z.infer<typeof NowState>;

export const NowBadges = z.array(
  z.object({ repoPath: z.string(), count: z.number().int() }),
);
export type NowBadges = z.infer<typeof NowBadges>;

/** now:focus push payload — the item a clicked notification was about. */
export const NowFocus = z.object({ repoPath: z.string(), id: z.string() });
export type NowFocus = z.infer<typeof NowFocus>;

// Home — one line per registered repo, from the Now watchers' last read:
// its live cards, what needs the owner, its stage and its last night.
export const HomeRepo = z.object({
  repoPath: z.string(),
  name: z.string(),
  now: NowState,
});
export type HomeRepo = z.infer<typeof HomeRepo>;

export const HomeView = z.object({ repos: z.array(HomeRepo) });
export type HomeView = z.infer<typeof HomeView>;

// Tasks — every card where it stands (a board by status, or a list), and one
// card in full. Read from the same watcher as Now; nothing here writes.
export const TaskColumn = z.enum([
  "next",
  "draft",
  "ready",
  "progress",
  "blocked",
  "pr",
  "done",
]);
export type TaskColumn = z.infer<typeof TaskColumn>;

export const TaskItem = z.object({
  /** Stable across reads: the branch, the done file, or the Next up line. */
  key: z.string(),
  /** T-NNNN, or "Next up 1" for a backlog line that isn't a card yet. */
  id: z.string(),
  title: z.string(),
  column: TaskColumn,
  /** The card's Status as written, "unreadable", or "next up". */
  status: z.string(),
  heldBy: z.string().nullable(),
  branch: z.string().nullable(),
  /** The branch's last commit, or when the done card landed (ISO), or null. */
  updated: z.string().nullable(),
  pr: z.number().nullable(),
  unreadable: z.boolean(),
  /** Where it was read: a card branch, cards/done/, or "Next up" in BACKLOG.md. */
  source: z.enum(["card", "done", "next-up"]),
  /**
   * What it waits on the owner for, from the same items as Now's Needs you
   * (matched by branch): empty when nothing waits on the owner.
   */
  needs: z.array(
    z.object({
      kind: NeedsYouItem.shape.kind,
      /** Short, for the board: "Needs your approval", "1 open question". */
      label: z.string(),
      /** Exactly what to do, and where, as Needs you says it. */
      todo: z.string(),
    }),
  ),
});
export type TaskItem = z.infer<typeof TaskItem>;

export const TasksState = z.object({
  repoPath: z.string(),
  ready: z.boolean(),
  error: z.string().nullable(),
  items: z.array(TaskItem),
  /** The branch it was read from, null before the first read. */
  display: DisplayBranch.nullable(),
});
export type TasksState = z.infer<typeof TasksState>;

export const TasksRequest = z.object({ repoPath: z.string().min(1) });
export const TaskDetailRequest = z.object({
  repoPath: z.string().min(1),
  key: z.string().min(1),
});

export const TaskCard = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  heldBy: z.string().nullable(),
  created: z.string().nullable(),
  source: z.string().nullable(),
  why: z.string(),
  criteria: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      check: z.string().nullable(),
      state: z.enum(["ticked", "unticked", "untested"]),
    }),
  ),
  filesInScope: z.array(z.string()),
  outOfScope: z.array(z.string()),
  constraints: z.array(z.string()),
  skills: z.array(z.string()),
  nextStep: z.string(),
  decisions: z.array(z.string()),
  questions: z.array(z.object({ text: z.string(), open: z.boolean() })),
  evidence: z.string(),
  pr: z.number().nullable(),
});
export type TaskCard = z.infer<typeof TaskCard>;

export const TaskDetail = z.object({
  item: TaskItem,
  /** The card, or null when it can't be read (see `error`) or isn't a card yet. */
  card: TaskCard.nullable(),
  error: z.string().nullable(),
  commits: z.array(RecentEvent),
  /**
   * The card's open questions, split as Now's Questions panel shows them;
   * empty for a Next up line, a branch being drafted and an unreadable card.
   */
  openQuestions: z.array(NowQuestion),
});
export type TaskDetail = z.infer<typeof TaskDetail>;

// Checklist — the repo checklist on the display branch, from CHECKLIST.md
// (by section) or else BACKLOG.md's "Repo checklist" (by stage): the stage and
// what decides it, and each line with its status and its check, as /setup last
// recorded them. Read on demand; nothing here runs a check.
export const ChecklistStatus = z.enum(["pass", "fail", "unchecked", "n/a"]);
export type ChecklistStatus = z.infer<typeof ChecklistStatus>;

export const ChecklistView = z.object({
  repoPath: z.string(),
  /** Whether the display branch has a BACKLOG.md at all. */
  hasBacklog: z.boolean(),
  stage: z.string().nullable(),
  stageWhy: z.string().nullable(),
  lastSetup: z.string().nullable(),
  groups: z.array(
    z.object({
      name: z.string(),
      lines: z.array(
        z.object({
          text: z.string(),
          status: ChecklistStatus,
          check: z.string().nullable(),
          isNew: z.boolean(),
          /** The catalog id (CHECKLIST.md only), or null. */
          id: z.string().nullable(),
          /** The `stage:` tag (CHECKLIST.md only), or null. */
          stage: z.string().nullable(),
        }),
      ),
      /** Why the whole section doesn't apply (CHECKLIST.md only), or null. */
      na: z.string().nullable(),
    }),
  ),
  /** The branch it was read from, null before the first read. */
  display: DisplayBranch.nullable(),
  /** The file the checklist was read from: CHECKLIST.md, else BACKLOG.md. */
  source: z.enum(["CHECKLIST.md", "BACKLOG.md"]).nullable(),
});
export type ChecklistView = z.infer<typeof ChecklistView>;

export const ChecklistRequest = z.object({ repoPath: z.string().min(1) });

// Docs — the repo's Markdown files, shown in History and rendered (with Mermaid).
export const DocEntry = z.object({ path: z.string(), name: z.string() });
export type DocEntry = z.infer<typeof DocEntry>;
export const DocList = z.array(DocEntry);

export const DocsListRequest = z.object({ repoPath: z.string().min(1) });
export const DocsReadRequest = z.object({
  repoPath: z.string().min(1),
  path: z.string().min(1),
});
export const DocContent = z.object({
  path: z.string(),
  markdown: z.string(),
});
export type DocContent = z.infer<typeof DocContent>;

// History — the finished cards in cards/done/ and the night reports in
// nights/, both on the default branch. Read on demand; nothing here writes.
export const HistoryRequest = z.object({ repoPath: z.string().min(1) });
export const HistoryNightRequest = z.object({
  repoPath: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d\d-\d\d$/),
});

export const HistoryView = z.object({
  repoPath: z.string(),
  done: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      /** The card's Status as written (the outcome), or "unreadable". */
      status: z.string(),
      pr: z.number().nullable(),
      closedAt: z.string().nullable(),
      path: z.string(),
    }),
  ),
  nights: z.array(
    z.object({
      date: z.string(),
      path: z.string(),
      merged: z.number(),
      held: z.number(),
      blocked: z.number(),
    }),
  ),
});
export type HistoryView = z.infer<typeof HistoryView>;

export const HistoryNight = z.object({
  date: z.string(),
  markdown: z.string(),
});
export type HistoryNight = z.infer<typeof HistoryNight>;

// Map — the floorplan skill's static map (floorplan/index.html), shown in a
// webview whose session cancels every request outside floorplan/.

/** The map webview's session, which main guards; the renderer's webview names it. */
export const MAP_PARTITION = "rivetari-map";

export const MapGetRequest = z.object({ repoPath: z.string().min(1) });

export const MapView = z.object({
  repoPath: z.string(),
  /** The repo's floorplan/ directory, whether or not a map is in it. */
  dir: z.string(),
  /** file:// URL of floorplan/index.html, or null when there's no map yet. */
  url: z.string().nullable(),
});
export type MapView = z.infer<typeof MapView>;

/** map:blocked push payload — every request cancelled since the map was opened. */
export const MapBlocked = z.object({
  repoPath: z.string(),
  urls: z.array(z.string()),
});
export type MapBlocked = z.infer<typeof MapBlocked>;
