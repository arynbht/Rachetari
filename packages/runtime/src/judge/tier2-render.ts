// Judge tier 2, rendering: the review as the Markdown a PR carries.
import type { Finding, Tier2Result } from "./tier2.js";

/** Marker in every review body, so later rounds can be counted. */
export const REVIEW_MARKER = "<!-- rivetari-judge-review";

/** What the marker line carries besides the round, for a later review to read. */
export interface ReviewMarks {
  /** The reviewed head's tree, so a head with the same tree can carry this verdict. */
  tree?: string | undefined;
  /** Set on a review that carried an earlier verdict instead of reviewing. */
  carried?: { from: string; url?: string | undefined } | undefined;
}

const where = (f: Finding) =>
  f.file ? `\`${f.file}${f.line ? `:${f.line}` : ""}\`` : "";

function headingLabel(
  result: Tier2Result,
  verdict: "approve" | "request-changes" | "needs-human",
  marks: ReviewMarks,
): string {
  if (verdict === "approve") return "approve";
  if (verdict === "needs-human") return "needs a human";
  return marks.carried
    ? "request changes"
    : `${result.blocking.length} blocking`;
}

function carriedLines(marks: ReviewMarks): string[] {
  const carried = marks.carried;
  if (!carried) return [];
  return [
    "",
    `Carried from \`${carried.from.slice(0, 12)}\`${carried.url ? ` (${carried.url})` : ""}: this head's tree${marks.tree ? ` \`${marks.tree.slice(0, 12)}\`` : ""} is identical to the one reviewed there, so its verdict holds unchanged and no new review ran.`,
  ];
}

function needsHumanLines(result: Tier2Result): string[] {
  const unverified = result.unverified ?? [];
  const why =
    result.blocking.length > 0
      ? "Two review rounds have run and blocking findings remain, so this goes to a person instead of another automated round."
      : result.unreviewed.length > 0
        ? "Some changed files weren't shown to the reviewer (listed at the end), so a person has to look at them: the judge doesn't approve what it hasn't seen."
        : `Acceptance the reviewer couldn't verify, so a person decides it: ${unverified.map((u) => `${u.id} (${u.note})`).join("; ")}.`;
  return ["", why];
}

function blockingLines(result: Tier2Result): string[] {
  if (result.blocking.length === 0) return [];
  const lines = ["", "#### Blocking"];
  for (const f of result.blocking) {
    lines.push(
      "",
      `**${f.kind}${f.acceptance_id ? ` (${f.acceptance_id})` : ""}: ${f.title}** ${where(f)}`,
      f.detail,
      ...(f.repro ? [`- **Repro:** ${f.repro}`] : []),
      ...(f.fix ? [`- **Fix:** ${f.fix}`] : []),
    );
  }
  return lines;
}

function acceptanceLines(result: Tier2Result): string[] {
  if (result.acceptance.length === 0) return [];
  return [
    "",
    "#### Acceptance",
    ...result.acceptance.map(
      (a) => `- ${a.id}: ${a.status}${a.note ? ` — ${a.note}` : ""}`,
    ),
    ...(result.before
      ? [
          `- before proof: ${result.before.shows_defect ? "shows the defect" : "doesn't show the defect"}${result.before.note ? ` — ${result.before.note}` : ""}`,
        ]
      : []),
  ];
}

function suggestionLines(result: Tier2Result): string[] {
  if (result.suggestions.length === 0) return [];
  return [
    "",
    `<details><summary>${result.suggestions.length} suggestion(s), non-blocking</summary>`,
    "",
    ...result.suggestions.map(
      (f) =>
        `- ${f.title} ${where(f)}${f.downgraded ? ` _(downgraded: ${f.downgraded})_` : ""}${f.fix ? ` — ${f.fix}` : ""}`,
    ),
    "",
    "</details>",
  ];
}

function notShownLines(result: Tier2Result): string[] {
  const { omitted, trimmed } = result.packed;
  return [
    ...(omitted.length > 0
      ? [
          "",
          `_Not reviewed: ${omitted.map((o) => `\`${o.path}\` (${o.why}${o.stats ? `, ${o.stats}` : ""})`).join(", ")}._`,
        ]
      : []),
    ...(trimmed?.length
      ? [
          "",
          `_Shown in part: ${trimmed.map((t) => `\`${t.path}\``).join(", ")}._`,
        ]
      : []),
  ];
}

/** The review as Markdown: blocking findings first, then one block of suggestions. */
export function renderReview(
  result: Tier2Result,
  round: number,
  verdict: "approve" | "request-changes" | "needs-human",
  marks: ReviewMarks = {},
): string {
  return [
    `${REVIEW_MARKER} round=${round}${marks.tree ? ` verdict=${verdict} tree=${marks.tree}` : ""}${marks.carried ? ` carried=${marks.carried.from}` : ""} -->`,
    `### Rivetari judge · round ${round} · ${headingLabel(result, verdict, marks)}`,
    ...carriedLines(marks),
    ...(verdict === "needs-human" ? needsHumanLines(result) : []),
    ...blockingLines(result),
    ...acceptanceLines(result),
    ...suggestionLines(result),
    ...notShownLines(result),
    "",
    `_${result.model}${result.effort ? ` (${result.effort} effort)` : ""} · ${result.calls} call(s) · ${result.usage.tokens} tokens · $${result.usage.costUsd.toFixed(2)} · Claude reviews, humans merge._`,
  ].join("\n");
}
