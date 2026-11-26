// Answering a card's open questions (T-0054): a pure text change that ticks the
// box and writes the answer under the question, handed to card-commit.ts, which
// owns every write rule (preview first, held-by, dirty worktree, behind origin,
// fast-forward push). Nothing here touches git.
import {
  AnswerApplyRequest,
  AnswerPreview,
  AnswerPreviewRequest,
  AnswerResult,
  type AnswerSpec,
  IpcChannel,
} from "../../shared/ipc";
import { questionParts } from "../kit/parse";
import {
  applyCardCommit,
  type CardEdit,
  previewCardCommit,
  registerMarkReady,
} from "./card-commit";

const OPEN_BOX = /^- \[ \] (.+)$/;
const ANY_BOX = /^- \[[ xX]\] /;
// Same ending rule as parse.ts: blank, a list item or a heading.
const QUESTION_END = /^\s*(?:$|[-*+](?:\s|$)|\d+[.)](?:\s|$)|#{1,6}(?:\s|$))/;

interface Found {
  /** Index of the `- [ ]` line. */
  at: number;
  /** Index of the question's last line. */
  last: number;
  text: string;
}

/** The open questions in "Questions for me", with where each sits in `lines`. */
function openQuestions(lines: string[]): Found[] {
  const found: Found[] = [];
  let inSection = false;
  let current: Found | null = null;
  lines.forEach((raw, i) => {
    const line = raw.replace(/\r$/, "");
    if (/^## /.test(line)) {
      inSection = /^## Questions for me\s*$/.test(line);
      current = null;
      return;
    }
    if (!inSection) return;
    if (ANY_BOX.test(line)) {
      const open = OPEN_BOX.exec(line);
      current = open?.[1] ? { at: i, last: i, text: open[1].trim() } : null;
      if (current) found.push(current);
    } else if (current && !QUESTION_END.test(line)) {
      current.text = `${current.text} ${line.trim()}`;
      current.last = i;
    } else current = null;
  });
  // The template's placeholders are not questions.
  return found.filter(
    (q) =>
      q.text !== "(none)" &&
      !/^<.*>$/.test(q.text) &&
      !/^<[^>]*>$/.test(questionParts(q.text).ask),
  );
}

/** Tick each picked question and write its answer under it, keeping line endings. */
function write(text: string, picks: { q: Found; answer: string }[]): string {
  const lines = text.split("\n");
  // Bottom first, so earlier line numbers stay true.
  for (const { q, answer } of [...picks].sort((a, b) => b.q.at - a.q.at)) {
    const cr = lines[q.last]?.endsWith("\r") ? "\r" : "";
    lines[q.at] = (lines[q.at] ?? "").replace("- [ ] ", "- [x] ");
    lines.splice(q.last + 1, 0, `  Answer: ${answer}${cr}`);
  }
  return lines.join("\n");
}

const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();

/**
 * Pure: a card's text and an answer to the new text, or the reason it can't be
 * made. Accept-all skips questions that have no "Recommended:".
 */
export function answerCard(
  text: string,
  answer: AnswerSpec,
): string | { refuse: string } {
  const open = openQuestions(text.split("\n"));
  if (answer.kind === "acceptAll") {
    const picks = open.flatMap((q) => {
      const rec = questionParts(q.text).recommended;
      return rec ? [{ q, answer: oneLine(rec) }] : [];
    });
    if (!picks.length)
      return { refuse: "no open question has a Recommended answer" };
    return write(text, picks);
  }
  const q = open.find((o) => o.text === oneLine(answer.question));
  if (!q) return { refuse: "that question is not open on the card" };
  if (answer.kind === "accept") {
    const rec = questionParts(q.text).recommended;
    if (!rec) return { refuse: "that question has no Recommended answer" };
    return write(text, [{ q, answer: oneLine(rec) }]);
  }
  const typed = oneLine(answer.text);
  if (!typed) return { refuse: "the answer is empty" };
  return write(text, [{ q, answer: typed }]);
}

/** The commit that answers: its edit is `answerCard`. */
export function answerEdit(answer: AnswerSpec): CardEdit {
  return {
    message:
      answer.kind === "acceptAll"
        ? "docs(card): accept the recommended answers"
        : "docs(card): answer a question",
    edit: (text) => answerCard(text, answer),
  };
}

/** The answer IPC handlers, without electron; the repo comes only through `registered`. */
export function answerHandlers(registered: (asked: string) => Promise<string>) {
  return {
    async preview(raw: unknown): Promise<AnswerPreview> {
      const { repoPath, branch, answer } = AnswerPreviewRequest.parse(raw);
      return AnswerPreview.parse(
        await previewCardCommit(
          await registered(repoPath),
          branch,
          answerEdit(answer),
        ),
      );
    },
    async apply(raw: unknown): Promise<AnswerResult> {
      const { repoPath, branch, answer, diff } = AnswerApplyRequest.parse(raw);
      return AnswerResult.parse(
        await applyCardCommit(
          await registered(repoPath),
          branch,
          answerEdit(answer),
          diff,
        ),
      );
    },
  };
}

/** Register the two answer channels on electron's `ipcMain` (or any `handle`). */
export function registerAnswer(
  ipc: {
    handle(channel: string, fn: (e: unknown, raw: unknown) => unknown): void;
  },
  registered: (asked: string) => Promise<string>,
): void {
  const h = answerHandlers(registered);
  ipc.handle(IpcChannel.CardAnswerPreview, (_e, raw) => h.preview(raw));
  ipc.handle(IpcChannel.CardAnswerApply, (_e, raw) => h.apply(raw));
}

/** Every shell write to CARD.md: mark ready (T-0053) and answers, in one registration. */
export function registerCardWrites(
  ipc: Parameters<typeof registerAnswer>[0],
  registered: (asked: string) => Promise<string>,
): void {
  registerMarkReady(ipc, registered);
  registerAnswer(ipc, registered);
}
