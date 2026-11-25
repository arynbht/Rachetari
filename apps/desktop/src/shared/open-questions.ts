// The text "Copy all" puts on the clipboard: open questions in the format
// docs/open-questions.md uses, one section per card. Pure and import-free, so
// the renderer and the unit tests share it.

/** The parts of a `NowQuestionGroup` (shared/ipc.ts) this text needs. */
export interface OpenQuestionGroup {
  id: string;
  title: string;
  questions: {
    n: number;
    ask: string;
    recommended: string | null;
    options: string[];
  }[];
}

/** End a sentence with one period, never two. */
const stop = (s: string) => (/[.!?]$/.test(s) ? s : `${s}.`);

function line(q: OpenQuestionGroup["questions"][number]): string {
  if (q.recommended === null) return `${q.n}. ${q.ask}`;
  const options =
    q.options.length > 0
      ? ` Other options: ${stop(q.options.map((o) => o.replace(/\.$/, "")).join("; "))}`
      : "";
  return `${q.n}. ${q.ask} — Recommended: ${stop(q.recommended)}${options}`;
}

/**
 * Per card: `## T-NNNN · title`, a blank line, one numbered line per question,
 * a blank line and `Answer:`; one blank line between cards.
 */
export function openQuestionsText(groups: OpenQuestionGroup[]): string {
  return groups
    .map(
      (g) =>
        `## ${g.id} · ${g.title}\n\n${g.questions.map(line).join("\n")}\n\nAnswer:\n`,
    )
    .join("\n");
}
