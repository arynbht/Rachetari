// Parsers for the kit's files: CARD.md, BACKLOG.md, CHECKLIST.md, a night
// report and skills/INDEX.md. Pure functions over text; the file source (source.ts) reads
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
  /**
   * Who approves the draft, as the `Created:` line's `Gate:` says (e.g.
   * "needs you" or "low"), or null when that line has none.
   */
  gate: string | null;
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

/** A question line's parts, in the template's shape. */
export interface QuestionParts {
  ask: string;
  /** What the card recommends, or null when it doesn't say. */
  recommended: string | null;
  /** The other options, as the line separates them with `;`. */
  options: string[];
}

const RECOMMENDED = /^(.*?)\s+(?:[—–]\s+)?Recommended:\s*(.*)$/;
const OPTIONS = /\.?\s+(?:Other options|Options):\s*/;
const noStop = (s: string) => s.trim().replace(/\.$/, "").trim();

/**
 * Split a question line written in the template's shape,
 * `<question> — Recommended: <answer>. Options: <other>; <other>.`, into its
 * parts. `Other options:` reads like `Options:`, and a `Recommended:` without
 * the `—` still splits. A line with no `Recommended:` is all question.
 */
export function questionParts(text: string): QuestionParts {
  const m = RECOMMENDED.exec(text.trim());
  if (!m?.[1] || m[2] === undefined)
    return { ask: text.trim(), recommended: null, options: [] };
  const at = OPTIONS.exec(m[2]);
  const recommended = at ? m[2].slice(0, at.index) : m[2];
  const options = at ? m[2].slice(at.index + at[0].length) : undefined;
  return {
    ask: m[1].trim(),
    recommended: noStop(recommended) || null,
    options:
      options === undefined
        ? []
        : noStop(options)
            .split(";")
            .map((o) => o.trim())
            .filter(Boolean),
  };
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

const QUESTION = /^- \[( |x|X)\] (.+)$/;
/** A line that ends a question: blank, a list item (`-`, `*`, `+`, `1.`, `1)`) or a heading. */
const QUESTION_END = /^\s*(?:$|[-*+](?:\s|$)|\d+[.)](?:\s|$)|#{1,6}(?:\s|$))/;

/**
 * The questions of "Questions for me". A question is its `- [ ]`/`- [x]` line
 * and the lines that continue its paragraph (a wrapped question, as Prettier
 * keeps it, indented under the box), each trimmed and joined with one space.
 * A blank line, a list item or a heading ends it, and nothing after that folds
 * in until the next box. The template's placeholders are dropped.
 */
function questionsOf(lines: string[]): Question[] {
  const found: Question[] = [];
  let current: Question | null = null;
  for (const line of lines) {
    const m = QUESTION.exec(line);
    if (m?.[2]) {
      current = { text: m[2].trim(), open: m[1] === " " };
      found.push(current);
    } else if (current && !QUESTION_END.test(line)) {
      current.text = `${current.text} ${line.trim()}`;
    } else current = null;
  }
  // The template's placeholders: `<…>` alone, or its shape with `<question>`.
  return found.filter(
    (q) =>
      q.text !== "(none)" &&
      !/^<.*>$/.test(q.text) &&
      !/^<[^>]*>$/.test(questionParts(q.text).ask),
  );
}

/** Parse a CARD.md; null when it isn't one (no `# T-NNNN · title` and `Status:`). */
export function parseCard(text: string): Card | null {
  const first = text.split(/\r?\n/, 1)[0] ?? "";
  const header = HEADER.exec(first);
  const status = field(text, "Status");
  if (!header?.[1] || !header[2] || !status) return null;
  const s = sections(text);
  const held = field(text, "Held by");
  const createdLine = /^Created:.*$/m.exec(text)?.[0] ?? "";

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

  const questions = questionsOf(s.get("Questions for me") ?? []);

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
    gate: field(createdLine, "Gate"),
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
  /** The catalog id (CHECKLIST.md only), e.g. `ci.workflow.present`, or null. */
  id: string | null;
  /** The `stage:` tag (CHECKLIST.md only), e.g. "building", or null. */
  stage: string | null;
  check: string | null;
  /** Marked `new` by a /setup re-run. */
  isNew: boolean;
}

export interface ChecklistGroup {
  name: string;
  /** Why the whole section doesn't apply (CHECKLIST.md's `- n/a:` with no id). */
  na: string | null;
  lines: ChecklistLine[];
}

export interface Checklist {
  /** The file it was read from; null when the repo has neither. */
  source: "CHECKLIST.md" | "BACKLOG.md" | null;
  stage: string | null;
  /** What decides the stage, as written after the stage's name. */
  stageWhy: string | null;
  lastSetup: string | null;
  groups: ChecklistGroup[];
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

/** A line of BACKLOG.md's "Repo checklist": no ids, no stage tags. */
function checklistLine(line: string): ChecklistLine | null {
  const na = /^- n\/a:?\s*(.+)$/.exec(line);
  if (na?.[1])
    return {
      text: na[1].trim(),
      status: "n/a",
      id: null,
      stage: null,
      check: null,
      isNew: false,
    };
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
    id: null,
    stage: null,
    check: check ? clean(check).replace(/^`|`$/g, "") : null,
    isNew,
  };
}

/** A catalog id: lowercase and dotted, no spaces (`ci.workflow.present`). */
const CATALOG_ID = /^`([a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)+)`\s*/;
const STAGE_TAG = /\s*·\s*stage:\s*([^·\s]+)\s*$/;
/** A template placeholder: `<…>`, after a `` `<id>` `` if it has one. */
const placeholder = (s: string) =>
  /^<.*>$/.test(s.trim().replace(/^`<[^`]*>`\s*/, ""));

/** Take a leading catalog id off a claim: [id, the rest]. */
function leadingId(rest: string): [string | null, string] {
  const m = CATALOG_ID.exec(rest);
  return m?.[1] ? [m[1], rest.slice(m[0].length)] : [null, rest];
}

/** Take a trailing `· stage: <tag>` off a part of a line: [tag, the rest]. */
function trailingStage(part: string): [string | null, string] {
  const m = STAGE_TAG.exec(part);
  return m?.[1] && !placeholder(m[1])
    ? [m[1], part.slice(0, m.index)]
    : [null, part];
}

type FileLine =
  | { kind: "line"; line: ChecklistLine }
  | { kind: "section-na"; reason: string };

const CHECK_SEP = " · check: ";

/**
 * A line of CHECKLIST.md (T-0029's format). The catalog id is the first
 * backticked token of the claim, right after the marker, on either side of
 * `unchecked:` and after `n/a:`; the stage tag sits on either side of
 * `· check:`; `new` ends the line. A `- n/a:` with no id is the section's own.
 */
function checklistFileLine(line: string): FileLine | null {
  const na = /^- n\/a:\s*(.+)$/.exec(line);
  if (na?.[1]) {
    const [id, reason] = leadingId(na[1].trim());
    if (placeholder(reason)) return null;
    if (!id) return { kind: "section-na", reason: reason.trim() };
    const [stage, text] = trailingStage(reason);
    return {
      kind: "line",
      line: {
        text: text.trim(),
        status: "n/a",
        id,
        stage,
        check: null,
        isNew: false,
      },
    };
  }
  const m = /^- \[( |x|X)\] (.+)$/.exec(line);
  if (!m?.[2]) return null;
  let status: CheckStatus = m[1] === " " ? "fail" : "pass";
  let rest = m[2].trim();
  const isNew = /\snew$/.test(rest);
  if (isNew) rest = rest.replace(/\s+new$/, "");
  let [id, after] = leadingId(rest);
  const unchecked = /^unchecked:\s*/.exec(after);
  if (unchecked) {
    status = "unchecked";
    after = after.slice(unchecked[0].length);
    if (!id) [id, after] = leadingId(after);
  }
  const at = after.indexOf(CHECK_SEP);
  let claim = at < 0 ? after : after.slice(0, at);
  let check: string | null = at < 0 ? null : after.slice(at + CHECK_SEP.length);
  let stage: string | null;
  [stage, claim] = trailingStage(claim);
  if (!stage && check !== null) [stage, check] = trailingStage(check);
  claim = claim.trim();
  if (!claim || placeholder(claim)) return null;
  check = check?.trim() || null;
  return {
    kind: "line",
    line: {
      text: claim,
      status,
      id,
      stage,
      // As written, code spans and all: the view shows them as code.
      check,
      isNew,
    },
  };
}

const STAGE_LINE = /^Stage:\s*([^—–-]+?)\s*(?:[—–-]\s*(.+))?$/;
const SETUP_LINE = /^Last `?\/setup`?:\s*(.+)$/;

/**
 * Parse a CHECKLIST.md (T-0029's format): the stage and what decides it, the
 * last /setup, and one group per `## <section>` in file order, an empty one
 * included. The indented format block and `<…>` placeholders are skipped.
 */
export function parseChecklist(text: string): Checklist {
  const checklist: Checklist = {
    source: "CHECKLIST.md",
    stage: null,
    stageWhy: null,
    lastSetup: null,
    groups: [],
  };
  let group: ChecklistGroup | null = null;
  for (const line of text.split(/\r?\n/)) {
    const heading = /^## (.+)$/.exec(line);
    if (heading?.[1]) {
      group = { name: heading[1].trim(), na: null, lines: [] };
      checklist.groups.push(group);
      continue;
    }
    if (!group) {
      const stage = STAGE_LINE.exec(line);
      if (stage?.[1] && !placeholder(stage[1])) {
        checklist.stage = stage[1].trim();
        checklist.stageWhy = stage[2]?.trim() ?? null;
      }
      const setup = SETUP_LINE.exec(line);
      if (setup?.[1] && !setup[1].startsWith("<"))
        checklist.lastSetup = setup[1].trim();
      continue;
    }
    const item = checklistFileLine(line);
    if (item?.kind === "line") group.lines.push(item.line);
    else if (item?.kind === "section-na") group.na = item.reason;
  }
  return checklist;
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

  const repoChecklist = s.get("Repo checklist");
  const checklist: Checklist = {
    source: repoChecklist ? "BACKLOG.md" : null,
    stage: null,
    stageWhy: null,
    lastSetup: null,
    groups: [],
  };
  let group: ChecklistGroup | null = null;
  for (const line of repoChecklist ?? []) {
    const stage = STAGE_LINE.exec(line);
    if (stage?.[1]) {
      checklist.stage = stage[1].trim();
      checklist.stageWhy = stage[2]?.trim() ?? null;
      continue;
    }
    const setup = SETUP_LINE.exec(line);
    if (setup?.[1]) {
      checklist.lastSetup = setup[1].trim();
      continue;
    }
    const heading = /^### (.+)$/.exec(line);
    if (heading?.[1]) {
      group = { name: heading[1].trim(), na: null, lines: [] };
      checklist.groups.push(group);
      continue;
    }
    const item = checklistLine(line);
    if (!item) continue;
    if (!group) {
      group = { name: "Checklist", na: null, lines: [] };
      checklist.groups.push(group);
    }
    group.lines.push(item);
  }
  return { nextUp, parked, checklist };
}

export interface NightRow {
  /** The card the row is about (its first T-NNNN), or null. */
  card: string | null;
  result: "merged" | "held" | "blocked";
  /** The row's result cell as written, e.g. "held: test failed twice". */
  text: string;
}

export interface NightCounts {
  merged: number;
  held: number;
  blocked: number;
  rows: NightRow[];
}

/** A night report's rows by result: merged, held or blocked. */
export function parseNight(text: string): NightCounts {
  const counts: NightCounts = { merged: 0, held: 0, blocked: 0, rows: [] };
  for (const line of text.split(/\r?\n/)) {
    if (!/^\|/.test(line) || /^\|\s*-/.test(line)) continue;
    const cells = line.split("|").map((c) => c.trim());
    const card = cells.map((c) => /\bT-\d{4,}\b/.exec(c)?.[0]).find(Boolean);
    for (const result of ["merged", "held", "blocked"] as const) {
      const cell = cells.find((c) => c.toLowerCase().startsWith(result));
      if (!cell) continue;
      counts[result]++;
      counts.rows.push({ card: card ?? null, result, text: cell });
      break;
    }
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
