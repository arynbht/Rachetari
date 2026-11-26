import { CircleAlert } from "lucide-react";
import {
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { Card } from "@/components/ui/card";
import { errorMessage } from "@/lib/errors";

import type {
  TaskCard,
  TaskDetail as TaskDetailView,
  TaskItem,
} from "../../../shared/ipc";
import { MarkReady } from "./MarkReady";
import { CardTab, CommitsTab, EvidenceTab } from "./RecordTabs";

/** The PR as the header says it: its number and where it stands. */
function prLine(item: TaskItem): string {
  if (item.pr === null) return "none";
  if (item.column === "done") return `#${item.pr}, merged`;
  if (item.column === "pr") return `#${item.pr}, waiting to merge`;
  return `#${item.pr}, draft`;
}

/** A header field: its label, then its value. */
function HeaderField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  );
}

/** The open questions, in Now's Questions panel shape, and what to do. */
function OpenQuestions({
  questions,
  todo,
}: {
  questions: TaskDetailView["openQuestions"];
  todo: string | undefined;
}) {
  const id = useId();
  const count = `${questions.length} open question${questions.length === 1 ? "" : "s"}`;
  return (
    <div
      role="group"
      aria-labelledby={id}
      className="rounded-lg border border-amber-500/40 bg-amber-500/[0.06]"
    >
      <h4 id={id} className="px-3 pt-2.5 text-sm font-semibold text-amber-300">
        {count}
      </h4>
      <ol className="divide-y divide-amber-500/15">
        {questions.map((q) => (
          <li key={q.n} className="flex gap-3 px-3 py-2">
            <span
              className="w-4 shrink-0 text-right font-mono text-xs leading-5 text-muted-foreground"
              aria-hidden
            >
              {q.n}.
            </span>
            <div className="min-w-0 flex-1 space-y-0.5 break-words">
              <p className="text-sm">{q.ask}</p>
              {q.recommended !== null ? (
                <p className="text-xs">
                  <span className="font-medium text-emerald-400">
                    Recommended:
                  </span>{" "}
                  {q.recommended}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No recommendation written
                </p>
              )}
              {q.options.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Other options: {q.options.join("; ")}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
      {todo && (
        <p className="border-t border-amber-500/15 px-3 py-2 text-xs text-muted-foreground">
          {todo}
        </p>
      )}
    </div>
  );
}

/** The record's header: the card's id and title, where it stands, its next step. */
function RecordHeader({
  item,
  stepRef,
  card,
  repoPath,
}: {
  repoPath: string;
  item: TaskItem;
  stepRef: RefObject<HTMLElement>;
  card: TaskCard | null;
}) {
  return (
    <div
      data-record="header"
      className="shrink-0 space-y-2 border-b border-border/60 px-4 py-3"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 break-words text-base font-semibold leading-6">
          <span className="font-mono text-sm text-muted-foreground">
            {item.id}
          </span>{" "}
          {item.title}
        </h3>
        <MarkReady repoPath={repoPath} item={item} />
      </div>
      <dl className="grid grid-cols-[4.5rem_minmax(0,1fr)_3.5rem_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-xs leading-5">
        <HeaderField label="Status">{item.status}</HeaderField>
        <HeaderField label="Held by">{item.heldBy ?? "nobody"}</HeaderField>
        <HeaderField label="PR">{prLine(item)}</HeaderField>
        <HeaderField label="Branch">
          {item.branch ?? (item.source === "done" ? "cards/done/" : "—")}
        </HeaderField>
        <dt className="text-muted-foreground">Next step</dt>
        <dd
          ref={stepRef}
          data-next-step
          className="col-span-3 line-clamp-2 min-w-0 break-words"
        >
          {card?.nextStep || "—"}
        </dd>
      </dl>
    </div>
  );
}

/** What else the card waits on the owner for, one line each. */
function RecordWaits({ waits }: { waits: TaskItem["needs"] }) {
  return (
    <ul data-record="waits" className="space-y-1">
      {waits.map((n) => (
        <li
          key={`${n.kind}:${n.todo}`}
          className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/[0.06] px-3 py-2 text-xs"
        >
          <CircleAlert
            className="mt-0.5 size-3.5 shrink-0 text-amber-300"
            aria-hidden
          />
          <span className="min-w-0 flex-1 break-words">
            <span className="font-medium text-amber-300">{n.label}:</span>{" "}
            {n.todo}
          </span>
        </li>
      ))}
    </ul>
  );
}

const RECORD_TABS = [
  { id: "card", label: "Card" },
  { id: "evidence", label: "Evidence" },
  { id: "commits", label: "Commits" },
] as const;
type RecordTab = (typeof RECORD_TABS)[number]["id"];

/**
 * One card in full, read again whenever the board's copy of it changes: a
 * header that stays put, what waits on the owner pinned under it, then the
 * card, its evidence and its commits as tabs.
 */
export function TaskRecord({
  repoPath,
  item,
}: {
  repoPath: string;
  item: TaskItem;
}) {
  const [detail, setDetail] = useState<TaskDetailView | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Each card opens on Card (the record is keyed by card).
  const [tab, setTab] = useState<RecordTab>("card");
  const tabRefs = useRef<Partial<Record<RecordTab, HTMLButtonElement | null>>>(
    {},
  );
  const tabsId = useId();
  const version = `${item.key}#${item.status}#${item.updated ?? ""}`;

  useEffect(() => {
    let live = true;
    window.rivetari.tasks.detail(repoPath, item.key).then(
      (next) => {
        if (!live) return;
        setDetail(next);
        setError(null);
      },
      (err: unknown) => live && setError(errorMessage(err)),
    );
    return () => {
      live = false;
    };
  }, [repoPath, item.key, version]);

  const card = detail?.card ?? null;
  const open = detail?.openQuestions ?? [];

  // The header shows two lines of the next step; when it cuts it short, the
  // Card tab has it in full.
  const stepRef = useRef<HTMLElement>(null);
  const [stepCut, setStepCut] = useState(false);
  useLayoutEffect(() => {
    const el = stepRef.current;
    if (!el) return;
    const measure = () => setStepCut(el.scrollHeight > el.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [card?.nextStep]);

  // What else it waits on the owner for: one line each, above the questions.
  const waits = item.needs.filter(
    (n) => n.kind !== "question" || open.length === 0,
  );
  const answerTodo = item.needs.find((n) => n.kind === "question")?.todo;

  const onTabKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const at = RECORD_TABS.findIndex((t) => t.id === tab);
    const last = RECORD_TABS.length - 1;
    const to =
      event.key === "ArrowRight"
        ? at === last
          ? 0
          : at + 1
        : event.key === "ArrowLeft"
          ? at === 0
            ? last
            : at - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (to === null) return;
    event.preventDefault();
    const next = RECORD_TABS[to]?.id;
    if (!next) return;
    setTab(next);
    tabRefs.current[next]?.focus();
  };

  const reading = (
    <p className="text-xs text-muted-foreground">
      {error ? "Couldn't read the card." : "Reading…"}
    </p>
  );

  return (
    <Card
      className="flex h-full flex-col overflow-hidden"
      role="region"
      aria-label={`${item.id} record`}
      onKeyDown={(event) => {
        // Escape inside the record (on a tab, say) stays in it; the board
        // comes back from the list.
        if (event.key === "Escape" && event.target !== event.currentTarget)
          event.stopPropagation();
      }}
    >
      <RecordHeader
        item={item}
        stepRef={stepRef}
        card={card}
        repoPath={repoPath}
      />

      <div
        data-record="body"
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3"
      >
        {error && (
          <p className="text-sm text-rose-300" role="alert">
            {error}
          </p>
        )}
        {waits.length > 0 && <RecordWaits waits={waits} />}
        {open.length > 0 && (
          <OpenQuestions questions={open} todo={answerTodo} />
        )}

        {item.source === "next-up" ? (
          <p className="text-xs text-muted-foreground">
            A line in the backlog&apos;s &quot;Next up&quot;, not a card yet.
            Start it with <code>/card</code> in Claude Code.
          </p>
        ) : (
          <div className="space-y-3">
            <div
              role="tablist"
              aria-label={`${item.id} record tabs`}
              onKeyDown={onTabKey}
              className="flex gap-4 border-b border-border/60 text-sm"
            >
              {RECORD_TABS.map((t) => (
                <button
                  key={t.id}
                  ref={(el) => {
                    tabRefs.current[t.id] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`${tabsId}-${t.id}`}
                  aria-selected={tab === t.id}
                  aria-controls={`${tabsId}-panel`}
                  tabIndex={tab === t.id ? 0 : -1}
                  onClick={() => setTab(t.id)}
                  className={`-mb-px border-b-2 px-0.5 pb-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    tab === t.id
                      ? "border-sky-400 text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div
              role="tabpanel"
              id={`${tabsId}-panel`}
              aria-labelledby={`${tabsId}-${tab}`}
              tabIndex={0}
              className="space-y-4 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {tab === "card" && (
                <CardTab
                  detail={detail}
                  item={item}
                  reading={reading}
                  card={card}
                  stepCut={stepCut}
                />
              )}
              {tab === "evidence" && (
                <EvidenceTab detail={detail} reading={reading} card={card} />
              )}
              {tab === "commits" && (
                <CommitsTab item={item} detail={detail} reading={reading} />
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
