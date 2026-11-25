import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/errors";

import type { TasksState } from "../../shared/ipc";
import { DisplayBranchLine } from "./DisplayBranch";
import { Board } from "./tasks/Board";
import { NeedsList } from "./tasks/NeedsMe";
import { TaskRecord } from "./tasks/Record";
import { SelectedList } from "./tasks/SelectedList";

// The tab shows where each card stands, as a board by stage against the
// line's limits, and one card in full beside a list of the others: what it is
// for, its criteria, what it may touch, its skills, decisions, questions,
// evidence and the commits on its branch. "Needs me" narrows it to the cards
// waiting on the owner. All of it is read from the repo's cards (on every
// card/* branch, this machine's and the remote's), the backlog's "Next up" and
// cards/done/. Nothing here writes.

/**
 * The height that takes an element from where it starts to the bottom of the
 * window, less the main area's padding, kept as the window or the page above
 * it changes. Null until it is on show.
 */
function useFillHeight<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!active || !el) return;
    const measure = () => {
      // A hidden tab has no box; it is measured again once it shows.
      if (el.offsetParent === null) return;
      const top = el.getBoundingClientRect().top;
      setHeight(Math.max(320, Math.floor(window.innerHeight - top - 24)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [active]);
  return { ref, height };
}

export function Tasks({
  repoPath,
  focus,
  onOpenHistory,
}: {
  repoPath: string;
  /** A card to open, from elsewhere (the Now view); `seq` reopens it. */
  focus?: { id: string; seq: number } | null;
  /** Opens the History tab, from the Done band's link. */
  onOpenHistory?: (() => void) | undefined;
}) {
  const [state, setState] = useState<TasksState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [needsOnly, setNeedsOnly] = useState(false);
  const [nextUpOpen, setNextUpOpen] = useState(false);
  // The card that was open, to put focus back on once the board returns.
  const [returnTo, setReturnTo] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const unsubscribe = window.rivetari.tasks.onUpdate((next) => {
      if (active && next.repoPath === repoPath) setState(next);
    });
    // The first read's reply can land after a push that's newer than it.
    window.rivetari.tasks.get(repoPath).then(
      (first) =>
        active &&
        setState((current) =>
          current?.repoPath === repoPath ? current : first,
        ),
      (err: unknown) => active && setError(errorMessage(err)),
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [repoPath]);

  const items = useMemo(() => state?.items ?? [], [state]);

  // A card asked for from elsewhere opens once the board has it.
  const [openedFocus, setOpenedFocus] = useState(0);
  useEffect(() => {
    if (!focus || focus.seq === openedFocus) return;
    const match = items.find(
      (t) => t.id === focus.id && t.source !== "next-up",
    );
    if (!match) return;
    setSelected(match.key);
    setOpenedFocus(focus.seq);
  }, [focus, items, openedFocus]);

  const current = items.find((t) => t.key === selected) ?? null;
  const waiting = items.filter((t) => t.needs.length > 0).length;
  const { ref: paneRef, height } = useFillHeight<HTMLDivElement>(
    current !== null,
  );

  // Opening a card from the board puts focus on its row in the list, where
  // Up and Down go on to the next.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (current && !wasOpen.current)
      rootRef.current
        ?.querySelector<HTMLElement>(
          `[data-row][data-key="${CSS.escape(current.key)}"]`,
        )
        ?.focus();
    wasOpen.current = current !== null;
  }, [current]);

  // Back on the board, focus goes to the card that was open.
  useEffect(() => {
    if (current || !returnTo) return;
    rootRef.current
      ?.querySelector<HTMLElement>(`[data-key="${CSS.escape(returnTo)}"]`)
      ?.focus();
    setReturnTo(null);
  }, [current, returnTo]);

  const closeCard = () => {
    if (!current) return;
    if (current.column === "next") setNextUpOpen(true);
    setReturnTo(current.key);
    setSelected(null);
  };

  return (
    <div
      ref={rootRef}
      className="space-y-3"
      onKeyDown={(event) => {
        if (event.key === "Escape" && current) {
          event.preventDefault();
          closeCard();
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <h2 className="text-lg font-semibold leading-7">Tasks</h2>
            <div>
              <DisplayBranchLine display={state?.display} />
            </div>
          </div>
          {/* With a card open, the list says its own keys: the record keeps
              the room. */}
          {!current && (
            <p className="text-xs text-muted-foreground">
              Every card against the line&apos;s limits. Arrow keys move between
              cards, Enter opens one, Escape brings the board back.
            </p>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          variant={needsOnly ? "default" : "outline"}
          aria-pressed={needsOnly}
          onClick={() => setNeedsOnly((on) => !on)}
        >
          Needs me{" "}
          <span
            className={`rounded-full px-1.5 text-xs font-medium tabular-nums ${
              needsOnly ? "bg-background/30" : "bg-amber-500/20 text-amber-300"
            }`}
          >
            {waiting}
          </span>
        </Button>
      </div>

      {(error ?? state?.error) && (
        <p
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-rose-300"
          role="alert"
        >
          {error ?? state?.error}
        </p>
      )}

      {(state === null || !state.ready) && !error ? (
        <p className="text-sm text-muted-foreground">Reading cards…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No cards in this repository yet. Run <code>/setup</code> once, then
          start one with <code>/card</code> in Claude Code.
        </p>
      ) : current ? (
        <div className="grid grid-cols-[minmax(0,17rem)_minmax(0,1fr)] gap-3">
          <SelectedList
            items={items}
            current={current}
            needsOnly={needsOnly}
            height={height}
            onSelect={setSelected}
            onOpenHistory={onOpenHistory}
          />
          <div
            ref={paneRef}
            data-pane="record"
            className="min-h-0 min-w-0 overflow-y-auto rounded-lg"
            style={height === null ? undefined : { height }}
          >
            {/* key keeps one card's record off another's. */}
            <TaskRecord key={current.key} repoPath={repoPath} item={current} />
          </div>
        </div>
      ) : needsOnly ? (
        <NeedsList items={items} onSelect={setSelected} />
      ) : (
        <Board
          items={items}
          nextUpOpen={nextUpOpen}
          onToggleNextUp={() => setNextUpOpen((open) => !open)}
          onSelect={setSelected}
          onOpenHistory={onOpenHistory}
        />
      )}
    </div>
  );
}
