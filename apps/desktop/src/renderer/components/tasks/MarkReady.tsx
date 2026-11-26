import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/errors";

import type { TaskItem } from "../../../shared/ipc";

/** Whether the button shows: a draft card that has a branch. */
export function canMarkReady(item: TaskItem): boolean {
  return (
    item.source === "card" && item.status === "draft" && item.branch !== null
  );
}

/** One diff line, coloured by what it does to the file. */
function DiffLine({ line }: { line: string }) {
  const tone =
    line.startsWith("+") && !line.startsWith("+++")
      ? "text-emerald-400"
      : line.startsWith("-") && !line.startsWith("---")
        ? "text-rose-300"
        : "text-muted-foreground";
  return <div className={tone}>{line || " "}</div>;
}

const FOCUSABLE = "button:not([disabled]), [tabindex='0']";

/**
 * The diff mark ready would commit, read before anything is written. Confirm
 * hands the diff back exactly as shown; a refusal, from either step, shows its
 * reason here and the dialog stays open.
 */
function MarkReadyDialog({
  repoPath,
  branch,
  onClose,
}: {
  repoPath: string;
  branch: string;
  onClose: () => void;
}) {
  const titleId = useId();
  const bodyId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const [diff, setDiff] = useState<string | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    window.rachetari.card.markReadyPreview(repoPath, branch).then(
      (res) => {
        if (!live) return;
        if (res.ok) setDiff(res.diff);
        else setRefusal(res.reason);
      },
      (err: unknown) => live && setRefusal(errorMessage(err)),
    );
    return () => {
      live = false;
    };
  }, [repoPath, branch]);

  // Focus moves in on open: to Cancel, the safe choice.
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
  }, []);

  const confirm = () => {
    if (diff === null || busy) return;
    setBusy(true);
    // The buttons go disabled; keep focus inside the dialog.
    ref.current?.focus();
    setRefusal(null);
    window.rachetari.card.markReadyApply(repoPath, branch, diff).then(
      (res) => {
        if (res.ok) onClose();
        else {
          setRefusal(res.reason);
          setBusy(false);
        }
      },
      (err: unknown) => {
        setRefusal(errorMessage(err));
        setBusy(false);
      },
    );
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      // Not while the commit is running: its result must be seen.
      if (!busy) onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const items = Array.from(
      ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
    );
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="flex max-h-full w-full max-w-xl flex-col gap-3 rounded-lg border border-border bg-card p-4 text-card-foreground shadow-lg focus:outline-none"
      >
        <h2 id={titleId} className="text-base font-semibold">
          Mark ready
        </h2>
        <div id={bodyId} className="min-h-0 space-y-2 overflow-y-auto">
          <p className="text-xs text-muted-foreground">
            Confirm commits exactly this change to CARD.md on {branch}. Nothing
            is written until you do.
          </p>
          {diff === null && refusal === null && (
            <p className="text-xs text-muted-foreground">Reading the diff…</p>
          )}
          {diff !== null && (
            <pre
              data-mark-ready="diff"
              className="overflow-x-auto rounded-md border border-border/60 bg-background p-2 font-mono text-xs leading-5"
              tabIndex={0}
              aria-label="Diff of CARD.md"
            >
              {diff.split("\n").map((line, i) => (
                <DiffLine key={i} line={line} />
              ))}
            </pre>
          )}
          {refusal !== null && (
            <p
              role="alert"
              data-mark-ready="refusal"
              className="break-words rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
            >
              {refusal}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            className="focus-visible:ring-2 focus-visible:ring-ring"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={confirm} disabled={diff === null || busy}>
            {busy ? "Committing…" : "Confirm"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** The "Mark ready" button for a draft card, and the dialog it opens. */
export function MarkReady({
  repoPath,
  item,
}: {
  repoPath: string;
  item: TaskItem;
}) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  if (!canMarkReady(item) || item.branch === null) return null;

  const close = () => {
    setOpen(false);
    // Focus returns to the button once the dialog is gone.
    queueMicrotask(() => button.current?.focus());
  };

  return (
    <>
      <Button
        ref={button}
        variant="outline"
        size="sm"
        className="shrink-0"
        onClick={() => setOpen(true)}
      >
        Mark ready
      </Button>
      {open && (
        <MarkReadyDialog
          repoPath={repoPath}
          branch={item.branch}
          onClose={close}
        />
      )}
    </>
  );
}
