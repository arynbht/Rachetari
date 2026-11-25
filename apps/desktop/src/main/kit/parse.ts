// Parsers for the kit's files: CARD.md, BACKLOG.md, a night report and
// skills/INDEX.md. Pure functions over text; the file source (source.ts) reads
// the text from the repo.

export type CriterionState = "ticked" | "unticked" | "untested";

export interface Criterion {
  id: string;
  text: string;
  check: string | null;
  state: CriterionState;
}

export interface Question {
  text: string;
  open: boolean;
}

export interface Card {
  id: string;
  title: string;
  status: string;
  /** The machine holding it, or null for "nobody". */
  heldBy: string | null;
  created: string | null;
  source: string | null;
  why: string;
  criteria: Criterion[];
  filesInScope: string[];
  outOfScope: string[];
  constraints: string[];
  skills: string[];
  nextStep: string;
  decisions: string[];
  questions: Question[];
  evidence: string;
  /** The draft PR's number, once "Draft PR opened: #N" is filled in. */
  pr: number | null;
}

const HEADER = /^# (T-\d{4,}) · (.+)$/;

/** Split markdown into its `## ` sections, by heading. */
function sections(text: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  let current: string[] | null = null;
  for (const line of text.split(/\r?\n/)) {
    const heading = /^## (.+)$/.exec(line);
    if (heading?.[1]) {
      current = [];
      out.set(heading[1].trim(), current);
    } else if (current) current.push(line);
  }
  return out;
}

/** The `- ` items of a section, without the dash; template placeholders dropped. */
function bullets(lines: string[] | undefined): string[] {
  return (lines ?? [])
    .map((l) => /^- (.+)$/.exec(l)?.[1]?.trim())
    .filter((l): l is string => Boolean(l) && !/^<.*>$/.test(l ?? ""));
}

/** The prose of a section: its non-empty lines that aren't the template's hints. */
function prose(lines: string[] | undefined): string {
  return (lines ?? [])
    .map((l) => l.trim())
    .filter((l) => l && !/^<.*>$/.test(l))
    .join(" ");
}

function field(text: string, name: string): string | null {
  const m = new RegExp(
    `(?:^|·)\\s*${name}:\\s*([^·\\n]*?)\\s*(?:<!--.*)?(?:·|$)`,
    "m",
  ).exec(text);
  return m?.[1]?.trim() || null;
}

/** Parse a CARD.md; null when it isn't one (no `# T-NNNN · title` and `Status:`). */
export function parseCard(text: string): Card | null {
  const first = text.split(/\r?\n/, 1)[0] ?? "";
  const header = HEADER.exec(first);
  const status = field(text, "Status");
  if (!header?.[1] || !header[2] || !status) return null;
  const s = sections(text);
  const held = field(text, "Held by");

  const criteria: Criterion[] = [];
  for (const line of s.get("Acceptance criteria") ?? []) {
    const m = /^- \[( |x|X)\] (A\d+): (.*)$/.exec(line);
    if (!m?.[2] || m[3] === undefined) continue;
    const [text, check] = m[3].split(" · check: ");
    criteria.push({
      id: m[2],
      text: (text ?? "").trim(),
      check: check
        ? check
            .replace(/\s*UNTESTED\s*$/, "")
            .replace(/^`|`$/g, "")
            .trim()
        : null,
      state: /\bUNTESTED\b/.test(m[3])
        ? "untested"
        : m[1] === " "
          ? "unticked"
          : "ticked",
    });
  }

  const questions: Question[] = [];
  for (const line of s.get("Questions for me") ?? []) {
    const m = /^- \[( |x|X)\] (.+)$/.exec(line);
    if (!m?.[2]) continue;
    const q = m[2].trim();
    if (q === "(none)" || /^<.*>$/.test(q)) continue;
    questions.push({ text: q, open: m[1] === " " });
  }

  const pr = /Draft PR opened: #(\d+)/.exec(s.get("Done")?.join("\n") ?? "");
  const evidence = /```[^\n]*\n([\s\S]*?)\n```/.exec(
    s.get("Done")?.join("\n") ?? "",
  );

  return {
    id: header[1],
    title: header[2].trim(),
    status,
    heldBy: !held || held === "nobody" || /^<.*>$/.test(held) ? null : held,
    created: field(text, "Created"),
    source: field(text, "Source"),
    why: prose(s.get("Why")),
    criteria,
    filesInScope: bullets(s.get("Files in scope")),
    outOfScope: bullets(s.get("Out of scope")),
    constraints: bullets(s.get("Constraints")),
    skills: bullets(s.get("Skills")),
    nextStep: prose(s.get("Next step")),
    decisions: bullets(s.get("Decisions")),
    questions,
    evidence:
      evidence?.[1] && evidence[1].trim() !== "<commands and results>"
        ? evidence[1]
        : "",
    pr: pr?.[1] ? Number(pr[1]) : null,
  };
}

export interface ParkedLine {
  date: string | null;
  tag: string | null;
  what: string;
  seenOn: string | null;
  where: string | null;
}

export type CheckStatus = "pass" | "fail" | "unchecked" | "n/a";

export interface ChecklistLine {
  text: string;
  status: CheckStatus;
  check: string | null;
  /** Marked `new` by a /setup re-run. */
  isNew: boolean;
}

export interface Checklist {
  stage: string | null;
  /** What decides the stage, as written after the stage's name. */
  stageWhy: string | null;
  lastSetup: string | null;
  groups: { name: string; lines: ChecklistLine[] }[];
}

export interface Backlog {
  nextUp: string[];
  parked: ParkedLine[];
  checklist: Checklist;
}

function parkedLine(line: string): ParkedLine {
  const m =
    /^(\d{4}-\d\d-\d\d)?\s*(?:\[([a-z]+)\])?\s*(.*?)(?: · seen on ([^·]+?))?(?: · (.+))?$/.exec(
      line,
    );
  return {
    date: m?.[1] ?? null,
    tag: m?.[2] ?? null,
    what: (m?.[3] ?? line).trim(),
    seenOn: m?.[4]?.trim() ?? null,
    where: m?.[5]?.trim() ?? null,
  };
}

function checklistLine(line: string): ChecklistLine | null {
  const na = /^- n\/a:?\s*(.+)$/.exec(line);
  if (na?.[1])
    return { text: na[1].trim(), status: "n/a", check: null, isNew: false };
  const m = /^- \[( |x|X)\] (.+)$/.exec(line);
  if (!m?.[2]) return null;
  let rest = m[2];
  let status: CheckStatus = m[1] === " " ? "fail" : "pass";
  const unchecked = /^unchecked:\s*(.+)$/.exec(rest);
  if (unchecked?.[1]) {
    status = "unchecked";
    rest = unchecked[1];
  }
  const [text, check] = rest.split(" · check: ");
  const isNew = /\snew$/.test(check ?? text ?? "");
  const clean = (s: string) => s.replace(/\snew$/, "").trim();
  if (/^<.*>$/.test(clean(text ?? ""))) return null;
  return {
    text: clean(text ?? ""),
    status,
    check: check ? clean(check).replace(/^`|`$/g, "") : null,
    isNew,
  };
}

/** Parse a BACKLOG.md: "Next up", "Parked" and "Repo checklist". */
export function parseBacklog(text: string): Backlog {
  const s = sections(text);
  const nextUp = (s.get("Next up") ?? [])
    .map((l) => /^\d+\.\s+(.+)$/.exec(l)?.[1]?.trim())
    .filter((l): l is string => Boolean(l) && !/^<.*>/.test(l ?? ""));
  const parked = bullets(s.get("Parked"))
    .filter((l) => !/^\d{4}-\d\d-\d\d \[[a-z]+\] Example:/.test(l))
    .map(parkedLine);

  const checklist: Checklist = {
    stage: null,
    stageWhy: null,
    lastSetup: null,
    groups: [],
  };
  let group: { name: string; lines: ChecklistLine[] } | null = null;
  for (const line of s.get("Repo checklist") ?? []) {
    const stage = /^Stage:\s*([^—–-]+?)\s*(?:[—–-]\s*(.+))?$/.exec(line);
    if (stage?.[1]) {
      checklist.stage = stage[1].trim();
      checklist.stageWhy = stage[2]?.trim() ?? null;
      continue;
    }
    const setup = /^Last `?\/setup`?:\s*(.+)$/.exec(line);
    if (setup?.[1]) {
      checklist.lastSetup = setup[1].trim();
      continue;
    }
    const heading = /^### (.+)$/.exec(line);
    if (heading?.[1]) {
      group = { name: heading[1].trim(), lines: [] };
      checklist.groups.push(group);
      continue;
    }
    const item = checklistLine(line);
    if (!item) continue;
    if (!group) {
      group = { name: "Checklist", lines: [] };
      checklist.groups.push(group);
    }
    group.lines.push(item);
  }
  return { nextUp, parked, checklist };
}

export interface NightCounts {
  merged: number;
  held: number;
  blocked: number;
}

/** Count a night report's rows by result: merged, held or blocked. */
export function parseNight(text: string): NightCounts {
  const counts: NightCounts = { merged: 0, held: 0, blocked: 0 };
  for (const line of text.split(/\r?\n/)) {
    if (!/^\|/.test(line) || /^\|\s*-/.test(line)) continue;
    const cells = line.split("|").map((c) => c.trim().toLowerCase());
    if (cells.some((c) => c.startsWith("merged"))) counts.merged++;
    else if (cells.some((c) => c.startsWith("held"))) counts.held++;
    else if (cells.some((c) => c.startsWith("blocked"))) counts.blocked++;
  }
  return counts;
}

export interface SkillRow {
  area: string;
  name: string;
  whenToUse: string;
}

/** The "Taken" rows of skills/INDEX.md (the first table whose first column is Area). */
export function parseSkills(text: string): SkillRow[] {
  const rows: SkillRow[] = [];
  let inTable = false;
  for (const line of text.split(/\r?\n/)) {
    if (/^\|\s*Area\s*\|\s*Skill\s*\|/.test(line)) {
      if (rows.length > 0) break; // only the first table: the taken skills
      inTable = true;
      continue;
    }
    if (!inTable) continue;
    if (!/^\|/.test(line)) {
      if (rows.length > 0) break;
      continue;
    }
    if (/^\|\s*-/.test(line)) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    const name = /\[([^\]]+)\]/.exec(cells[1] ?? "")?.[1] ?? cells[1] ?? "";
    if (cells[0] && name)
      rows.push({ area: cells[0], name, whenToUse: cells[2] ?? "" });
  }
  return rows;
}
