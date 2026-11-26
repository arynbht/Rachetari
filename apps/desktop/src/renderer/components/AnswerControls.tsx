import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/errors";

import type {
  AnswerSpec,
  NowQuestion,
  NowQuestionGroup,
} from "../../shared/ipc";

// The buttons that answer a card's open questions from the Questions panel, and
// the diff dialog they share. Every action asks the main process for a preview
// (nothing is written), shows that diff, and only a confirm applies it. A
// refusal from the write path is shown with its reason and nothing is applied.

export type Stage =
  | { at: "idle" }
  | { at: "reading" }
  | { at: "review"; diff: string }
  | { at: "applying"; diff: string }
  | { at: "refused"; reason: string };

/**
 * The question as the card's line has it, in the template's shape, which is
 * what the write path names a question by.
 */
export function questionLine(q: NowQuestion): string {
  if (q.recommended === null) return q.ask;
  const options =
    q.options.length > 0 ? ` Options: ${q.options.join("; ")}.` : "";
  return `${q.ask} — Recommended: ${q.recommended}.${options}`;
}

/** The diff dialog: reviewing a preview, or the reason a write was refused. */
export function DiffDialog({
  title,
  stage,
  onConfirm,
  onClose,
}: {
  title: string;
  stage: Stage;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const open = stage.at !== "idle" && stage.at !== "reading";

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  const diff = stage.at === "review" || stage.at === "applying";
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        if (stage.at !== "applying") onClose();
      }}
      className="w-[min(40rem,90vw)] rounded-lg border border-border bg-card p-4 text-foreground backdrop:bg-black/60"
    >
      <h3 id={titleId} className="text-sm font-semibold">
        {title}
      </h3>
      {diff && (
        <>
          <p className="mt-2 text-xs text-muted-foreground">
            This change to CARD.md is committed only when you confirm.
          </p>
          <pre
            tabIndex={0}
            aria-label="Diff of CARD.md"
            className="mt-2 max-h-72 overflow-auto rounded bg-muted p-2 font-mono text-xs"
          >
            {stage.diff}
          </pre>
        </>
      )}
      {stage.at === "refused" && (
        <p role="alert" className="mt-2 text-sm text-rose-300">
          Not applied: {stage.reason}
        </p>
      )}
      <div className="mt-3 flex justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={stage.at === "applying"}
          onClick={onClose}
        >
          {diff ? "Cancel" : "Close"}
        </Button>
        {diff && (
          <Button
            type="button"
            size="sm"
            disabled={stage.at === "applying"}
            onClick={onConfirm}
          >
            {stage.at === "applying" ? "Committing…" : "Confirm and commit"}
          </Button>
        )}
      </div>
    </dialog>
  );
}

/** Preview, then (on confirm) apply, one answer to one card's questions. */
function useAnswer(repoPath: string, branch: string) {
  const [stage, setStage] = useState<Stage>({ at: "idle" });
  const [spec, setSpec] = useState<AnswerSpec | null>(null);

  const start = async (next: AnswerSpec) => {
    setSpec(next);
    setStage({ at: "reading" });
    try {
      const p = await window.rivetari.card.answerPreview(
        repoPath,
        branch,
        next,
      );
      setStage(
        p.ok
          ? { at: "review", diff: p.diff }
          : { at: "refused", reason: p.reason },
      );
    } catch (err) {
      setStage({ at: "refused", reason: errorMessage(err) });
    }
  };

  const confirm = async () => {
    if (stage.at !== "review" || !spec) return;
    setStage({ at: "applying", diff: stage.diff });
    try {
      const r = await window.rivetari.card.answerApply(
        repoPath,
        branch,
        spec,
        stage.diff,
      );
      setStage(r.ok ? { at: "idle" } : { at: "refused", reason: r.reason });
    } catch (err) {
      setStage({ at: "refused", reason: errorMessage(err) });
    }
  };

  return {
    stage,
    start,
    confirm,
    close: () => setStage({ at: "idle" }),
    busy: stage.at === "reading" || stage.at === "applying",
  };
}

const small = "h-7 px-2.5 text-xs";

function HeldNote({ by }: { by: string }) {
  return (
    <span className="text-xs font-normal text-amber-400">
      Held by {by}: can&apos;t be answered here
    </span>
  );
}

/** "Accept all recommended" for one card's group. */
export function AcceptAll({
  repoPath,
  group,
  heldBy,
}: {
  repoPath: string;
  group: NowQuestionGroup;
  /** Who holds the card, or null; a held card can't be answered. */
  heldBy: string | null;
}) {
  const a = useAnswer(repoPath, group.branch);
  if (!group.questions.some((q) => q.recommended !== null)) return null;
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={small}
        disabled={a.busy || heldBy !== null}
        onClick={() => void a.start({ kind: "acceptAll" })}
      >
        Accept all recommended
        <span className="sr-only"> for {group.id}</span>
      </Button>
      {heldBy !== null && <HeldNote by={heldBy} />}
      <DiffDialog
        title={`Accept all recommended answers on ${group.id}`}
        stage={a.stage}
        onConfirm={() => void a.confirm()}
        onClose={a.close}
      />
    </>
  );
}

/** "Accept recommended" and a free-text "Answer" box for one question. */
export function AnswerQuestion({
  repoPath,
  group,
  question,
  heldBy,
}: {
  repoPath: string;
  group: NowQuestionGroup;
  question: NowQuestion;
  /** Who holds the card, or null; a held card can't be answered. */
  heldBy: string | null;
}) {
  const a = useAnswer(repoPath, group.branch);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState("");
  const inputId = useId();
  const line = questionLine(question);
  const ref = `question ${question.n} on ${group.id}`;

  return (
    <div className="space-y-2 pt-1">
      <div className="flex flex-wrap gap-2">
        {question.recommended !== null && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={small}
            disabled={a.busy || heldBy !== null}
            onClick={() => void a.start({ kind: "accept", question: line })}
          >
            Accept recommended
            <span className="sr-only"> for {ref}</span>
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={small}
          disabled={heldBy !== null}
          aria-expanded={typing}
          onClick={() => setTyping((t) => !t)}
        >
          Answer<span className="sr-only"> {ref}</span>
        </Button>
        {heldBy !== null && <HeldNote by={heldBy} />}
      </div>
      {typing && (
        <form
          className="space-y-1"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim())
              void a.start({ kind: "text", question: line, text: text.trim() });
          }}
        >
          <label htmlFor={inputId} className="block text-xs">
            Your answer to {ref}
          </label>
          <textarea
            id={inputId}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button
            type="submit"
            size="sm"
            className={small}
            disabled={a.busy || !text.trim()}
          >
            Review answer
          </Button>
        </form>
      )}
      <DiffDialog
        title={`Answer ${ref}`}
        stage={a.stage}
        onConfirm={() => void a.confirm()}
        onClose={a.close}
      />
    </div>
  );
}
