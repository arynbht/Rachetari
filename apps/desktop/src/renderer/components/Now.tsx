import { CircleAlert } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { errorMessage } from "@/lib/errors";
import { span, useNow, when } from "@/lib/time";

import type {
  NeedsYouItem,
  NowHealth,
  NowQuestionGroup,
  NowRunning,
  NowState,
} from "../../shared/ipc";
import { openQuestionsText } from "../../shared/open-questions";
import { AcceptAll, AnswerQuestion } from "./AnswerControls";
import { CiBadge } from "./CiBadge";
import { useCiState } from "./CiLine";
import { DisplayBranchLine } from "./DisplayBranch";

// The repo as it stands now: what's in progress, everything that waits on the
// owner, what just happened, and the repo's health. All of it is the main
// process's reading of the repo's kit files (CARD.md on card/* branches,
// BACKLOG.md, nights/, skills/INDEX.md). Nothing here writes: each item says
// what to change and where, and the watcher shows the change once it lands.

export const KIND_LABEL: Record<NeedsYouItem["kind"], string> = {
  approve: "Card to approve",
  question: "Question to answer",
  held: "Held overnight",
  merge: "PR waiting to merge",
  unreadable: "Card can't be read",
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 text-xs">
      <dt className="w-28 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 break-words">{children}</dd>
    </div>
  );
}

function ItemCard({
  item,
  onOpenTask,
}: {
  item: NeedsYouItem;
  onOpenTask: (id: string) => void;
}) {
  const headingId = `now-item-${item.id}-heading`;
  return (
    <article
      id={`now-item-${item.id}`}
      aria-labelledby={headingId}
      tabIndex={-1}
      className="space-y-3 rounded-lg border border-amber-500/40 bg-card p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <header className="flex items-start gap-3">
        <CircleAlert
          className="mt-0.5 h-4 w-4 shrink-0 text-amber-400"
          aria-hidden
        />
        <h4 id={headingId} className="min-w-0 flex-1 text-sm font-medium">
          <span className="font-mono text-xs text-muted-foreground">
            {item.id}
          </span>{" "}
          {item.title}
        </h4>
        <span className="shrink-0 text-xs text-amber-400">
          {KIND_LABEL[item.kind]}
        </span>
      </header>
      <dl className="space-y-1">
        <Field label="Why">{item.why}</Field>
        <Field label="What to do">{item.todo}</Field>
      </dl>
      {item.kind !== "unreadable" && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onOpenTask(item.id)}
        >
          Open {item.id} in Tasks
        </Button>
      )}
    </article>
  );
}

/** A card's text with its `code` spans set as code. */
function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/`([^`]+)`/).map((part, i) =>
        i % 2 === 1 ? (
          <code
            key={i}
            className="rounded bg-muted px-1 font-mono text-[0.92em]"
          >
            {part}
          </code>
        ) : (
          part
        ),
      )}
    </>
  );
}

/**
 * Every open question on the live cards, one row each, grouped by card. It
 * only reads: "Copy all" puts them on the clipboard in the format
 * docs/open-questions.md uses, and the answers go in each card's CARD.md.
 */
function QuestionsPanel({
  repoPath,
  groups,
  held,
}: {
  repoPath: string;
  groups: NowQuestionGroup[];
  /** Who holds each card, by branch. */
  held: ReadonlyMap<string, string | null>;
}) {
  const [said, setSaid] = useState("");
  const clear = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(clear.current), []);

  const copyAll = async () => {
    window.clearTimeout(clear.current);
    try {
      await navigator.clipboard.writeText(openQuestionsText(groups));
      setSaid("Copied");
      clear.current = window.setTimeout(() => setSaid(""), 4000);
    } catch (err) {
      setSaid(`Couldn't copy: ${errorMessage(err)}`);
    }
  };

  return (
    <section aria-labelledby="now-questions" className="space-y-2">
      <div className="flex items-center gap-3">
        <h3 id="now-questions" className="text-sm font-semibold">
          Questions
        </h3>
        {groups.length > 0 && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-xs"
            onClick={() => void copyAll()}
          >
            Copy all
          </Button>
        )}
        <span role="status" className="text-xs text-muted-foreground">
          {said}
        </span>
      </div>
      {groups.length > 0 ? (
        <div className="space-y-3">
          {groups.map((g) => {
            const headingId = `now-questions-${g.branch.replace(/\W/g, "-")}`;
            return (
              <Card
                key={g.branch}
                role="group"
                aria-labelledby={headingId}
                className="overflow-hidden"
              >
                <h4
                  id={headingId}
                  className="flex items-center gap-2 border-b border-border/60 px-4 py-2 text-sm font-medium"
                >
                  <span className="font-mono text-xs text-muted-foreground">
                    {g.id}
                  </span>{" "}
                  · {g.title}
                  <span className="ml-auto">
                    <AcceptAll
                      repoPath={repoPath}
                      group={g}
                      heldBy={held.get(g.branch) ?? null}
                    />
                  </span>
                </h4>
                <ol className="divide-y divide-border/60">
                  {g.questions.map((q) => (
                    <li key={q.n} className="flex gap-3 px-4 py-2.5">
                      <span
                        className="w-4 shrink-0 text-right font-mono text-xs leading-5 text-muted-foreground"
                        aria-hidden
                      >
                        {q.n}.
                      </span>
                      <div className="min-w-0 flex-1 space-y-1 break-words">
                        <p className="text-sm">
                          <Inline text={q.ask} />
                        </p>
                        {q.recommended !== null ? (
                          <p className="text-xs">
                            <span className="font-medium text-emerald-400">
                              Recommended:
                            </span>{" "}
                            <Inline text={q.recommended} />
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            No recommendation written
                          </p>
                        )}
                        {q.options.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Other options:{" "}
                            {q.options.map((o, i) => (
                              <span key={i}>
                                {i > 0 && "; "}
                                <Inline text={o} />
                              </span>
                            ))}
                          </p>
                        )}
                        <AnswerQuestion
                          repoPath={repoPath}
                          group={g}
                          question={q}
                          heldBy={held.get(g.branch) ?? null}
                        />
                      </div>
                    </li>
                  ))}
                </ol>
              </Card>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          No card has an open question.
        </p>
      )}
    </section>
  );
}

function RunningRow({ card, now }: { card: NowRunning; now: number }) {
  const ci = useCiState();
  const parts = [
    card.heldBy ? `held by ${card.heldBy}` : "held by nobody",
    card.lastCommitAt
      ? `last commit ${span(now - Date.parse(card.lastCommitAt))} ago`
      : "no commit yet",
  ];
  return (
    <li className="space-y-0.5 px-4 py-2.5">
      <p className="flex items-center gap-2 text-sm">
        <span className="shrink-0 font-mono text-xs text-muted-foreground">
          {card.id}
        </span>
        <span className="truncate">{card.title}</span>
        <span className="ml-auto shrink-0">
          <CiBadge branch={card.branch} state={ci} />
        </span>
      </p>
      <p className="text-xs text-sky-400">{parts.join(" · ")}</p>
      {card.nextStep && (
        <p className="text-xs">
          <span className="text-muted-foreground">Next: </span>
          {card.nextStep}
        </p>
      )}
    </li>
  );
}

function HealthStrip({ health }: { health: NowHealth | null }) {
  const cell = "space-y-0.5 p-3";
  return (
    <section aria-labelledby="now-health" className="space-y-2">
      <h3 id="now-health" className="text-sm font-semibold">
        Health
      </h3>
      <Card className="grid grid-cols-1 divide-border text-xs sm:grid-cols-3">
        <div className={cell}>
          <p className="font-medium">Stage</p>
          {health ? (
            health.hasBacklog ? (
              <>
                <p>{health.stage ?? "No stage written yet"}</p>
                <p className="text-muted-foreground">
                  {health.counts.pass} pass · {health.counts.fail} fail ·{" "}
                  {health.counts.unchecked} unchecked
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">
                No BACKLOG.md yet: run <code>/setup</code>.
              </p>
            )
          ) : (
            <p className="text-muted-foreground">Reading…</p>
          )}
        </div>
        <div className={cell}>
          <p className="font-medium">Skills</p>
          {health ? (
            <>
              <p>
                {health.skills.count}{" "}
                {health.skills.count === 1 ? "skill" : "skills"} in the index
              </p>
              <p className="text-muted-foreground">
                On live cards:{" "}
                {health.skills.onLiveCards.length > 0
                  ? health.skills.onLiveCards.join(", ")
                  : "none"}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">Reading…</p>
          )}
        </div>
        <div className={cell}>
          <p className="font-medium">Last night</p>
          {health ? (
            health.lastNight ? (
              <>
                <p>{health.lastNight.date}</p>
                <p className="text-muted-foreground">
                  {health.lastNight.merged} merged · {health.lastNight.held}{" "}
                  held
                  {health.lastNight.blocked > 0 &&
                    ` · ${health.lastNight.blocked} blocked`}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">No night report yet.</p>
            )
          ) : (
            <p className="text-muted-foreground">Reading…</p>
          )}
        </div>
      </Card>
    </section>
  );
}

export function Now({
  repoPath,
  focus,
  onOpenTask,
}: {
  repoPath: string;
  /** An item to bring into view (a clicked notification); `seq` repeats it. */
  focus: { id: string; seq: number } | null;
  onOpenTask: (id: string) => void;
}) {
  const [state, setState] = useState<NowState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const unsubscribe = window.rivetari.now.onUpdate((next) => {
      if (active && next.repoPath === repoPath) setState(next);
    });
    window.rivetari.now.get(repoPath).then(
      (first) => active && setState((current) => current ?? first),
      (err: unknown) => active && setError(errorMessage(err)),
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [repoPath]);

  const focused = useRef(0);
  useEffect(() => {
    if (!focus || focus.seq === focused.current) return;
    const el = document.getElementById(`now-item-${focus.id}`);
    if (!el) return;
    focused.current = focus.seq;
    el.scrollIntoView({ block: "center" });
    el.focus();
  }, [focus, state]);

  const running = state?.running ?? [];
  const now = useNow(running.length > 0);
  const ready = state?.ready ?? false;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Now</h2>
        <DisplayBranchLine display={state?.display} />
        <p className="text-xs text-muted-foreground">
          What&apos;s in progress, what waits on you and what just happened,
          read from the repo&apos;s cards and backlog. Each item says what to
          change and where; this view only reads.
        </p>
      </div>

      <HealthStrip health={ready ? (state?.health ?? null) : null} />

      {(error ?? state?.error) && (
        <p
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-rose-300"
          role="alert"
        >
          {error ?? state?.error}
        </p>
      )}

      {!ready && !error ? (
        <p className="text-sm text-muted-foreground">Reading cards…</p>
      ) : state?.cardCount === 0 && state.needsYou.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No cards in this repository yet. Run <code>/setup</code> once, then
          start one with <code>/card</code> in Claude Code.
        </p>
      ) : (
        <>
          <section aria-labelledby="now-needs-you" className="space-y-2">
            <h3 id="now-needs-you" className="text-sm font-semibold">
              Needs you
              {state && state.needsYou.length > 0 && (
                <span className="ml-2 text-xs font-normal text-amber-400">
                  {state.needsYou.length} waiting
                </span>
              )}
            </h3>
            {state && state.needsYou.length > 0 ? (
              <ul className="space-y-3">
                {state.needsYou.map((item) => (
                  <li key={`${item.id}-${item.kind}`}>
                    <ItemCard item={item} onOpenTask={onOpenTask} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">
                Nothing waits on you.
              </p>
            )}
          </section>

          <QuestionsPanel
            repoPath={repoPath}
            groups={state?.questions ?? []}
            held={new Map(state?.cards.map((c) => [c.branch, c.heldBy]))}
          />

          <section aria-labelledby="now-running" className="space-y-2">
            <h3 id="now-running" className="text-sm font-semibold">
              Running
            </h3>
            {running.length > 0 ? (
              <Card>
                <ul className="divide-y divide-border/60">
                  {running.map((c) => (
                    <RunningRow key={c.branch} card={c} now={now} />
                  ))}
                </ul>
              </Card>
            ) : (
              <p className="text-xs text-muted-foreground">
                No card is in progress.
              </p>
            )}
          </section>

          <section aria-labelledby="now-recent" className="space-y-2">
            <h3 id="now-recent" className="text-sm font-semibold">
              Recent
            </h3>
            {state && state.recent.length > 0 ? (
              <Card>
                <ol className="divide-y divide-border/60">
                  {state.recent.map((e) => (
                    <li key={e.sha}>
                      <button
                        type="button"
                        onClick={() => e.cardId && onOpenTask(e.cardId)}
                        disabled={!e.cardId}
                        className="flex w-full items-start gap-3 px-4 py-2 text-left text-xs hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:hover:bg-transparent"
                      >
                        <span className="w-28 shrink-0 tabular-nums text-muted-foreground">
                          {when(e.at)}
                        </span>
                        <span className="w-16 shrink-0 font-mono text-sky-400">
                          {e.cardId ?? ""}
                        </span>
                        <span className="min-w-0 flex-1 break-words">
                          {e.subject}
                          <span className="ml-1 text-muted-foreground">
                            ({e.author})
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              </Card>
            ) : (
              <p className="text-xs text-muted-foreground">
                Nothing has happened on these cards yet.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
