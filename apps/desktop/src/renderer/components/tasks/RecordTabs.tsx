import { type ReactNode, useId } from "react";

import { when } from "@/lib/time";

import type {
  TaskCard,
  TaskDetail as TaskDetailView,
  TaskItem,
} from "../../../shared/ipc";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 text-xs">
      <dt className="w-28 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 break-words">{children}</dd>
    </div>
  );
}

/** A titled part of the detail, a region of its own. */
function Part({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="space-y-2">
      <h4 id={id} className="flex items-baseline gap-2 text-sm font-semibold">
        {title}
        {aside && (
          <span className="text-xs font-normal text-muted-foreground">
            {aside}
          </span>
        )}
      </h4>
      {children}
    </section>
  );
}

const STATE_LABEL: Record<TaskCard["criteria"][number]["state"], string> = {
  ticked: "ticked",
  unticked: "unticked",
  untested: "UNTESTED",
};

const STATE_CLASS: Record<TaskCard["criteria"][number]["state"], string> = {
  ticked: "border-emerald-500/50 text-emerald-300",
  unticked: "border-border text-muted-foreground",
  untested: "border-amber-500/50 text-amber-300",
};

function List({ items, none }: { items: string[]; none: string }) {
  return items.length > 0 ? (
    <ul className="list-disc space-y-0.5 pl-5 text-xs">
      {items.map((s) => (
        <li key={s} className="break-words">
          {s}
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-xs text-muted-foreground">{none}</p>
  );
}

/** The Card tab: what the card is for, its criteria, scope, skills and decisions. */
export function CardTab({
  detail,
  item,
  reading,
  card,
  stepCut,
}: {
  detail: TaskDetailView | null;
  item: TaskItem;
  reading: ReactNode;
  card: TaskCard | null;
  stepCut: boolean;
}) {
  return (
    <>
      {detail?.error && (
        <p className="text-sm text-rose-300" role="alert">
          {detail.error}
        </p>
      )}
      {item.status === "drafting" && (
        <p className="text-xs text-muted-foreground">
          Being drafted: no <code>CARD.md</code> has been committed on{" "}
          {item.branch} yet.
        </p>
      )}
      {!detail && reading}
      {card && (
        <>
          <dl className="space-y-1">
            <Field label="Why">{card.why || "—"}</Field>
            <Field label="Source">{card.source ?? "—"}</Field>
            {stepCut && <Field label="Next step">{card.nextStep}</Field>}
          </dl>
          <Part title="Criteria">
            <ul className="space-y-1.5">
              {card.criteria.map((c) => (
                <li key={c.id} className="flex items-start gap-2 text-xs">
                  <span
                    className={`shrink-0 rounded border px-1.5 py-0.5 text-[11px] ${STATE_CLASS[c.state]}`}
                  >
                    {STATE_LABEL[c.state]}
                  </span>
                  <span className="min-w-0 flex-1 break-words">
                    <span className="font-mono text-muted-foreground">
                      {c.id}
                    </span>{" "}
                    {c.text}
                    {c.check && (
                      <span className="block text-muted-foreground">
                        check: <code>{c.check}</code>
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </Part>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <p className="text-xs font-medium">Files in scope</p>
              <List items={card.filesInScope} none="None listed." />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium">Out of scope</p>
              <List items={card.outOfScope} none="None listed." />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium">Constraints</p>
              <List items={card.constraints} none="None listed." />
            </div>
          </div>
          <Part title="Skills">
            <List items={card.skills} none="No skills named." />
          </Part>
          <Part title="Decisions">
            <List items={card.decisions} none="No decisions yet." />
          </Part>
          <Part title="Answered questions">
            <List
              items={card.questions.filter((q) => !q.open).map((q) => q.text)}
              none="No answered questions."
            />
          </Part>
        </>
      )}
    </>
  );
}

/** The Evidence tab: the card's evidence as written. */
export function EvidenceTab({
  detail,
  reading,
  card,
}: {
  detail: TaskDetailView | null;
  reading: ReactNode;
  card: TaskCard | null;
}) {
  return !detail ? (
    reading
  ) : card?.evidence ? (
    <pre className="whitespace-pre-wrap break-words rounded-md bg-background/60 p-3 text-xs">
      {card.evidence}
    </pre>
  ) : (
    <p className="text-xs text-muted-foreground">No evidence written yet.</p>
  );
}

/** The Commits tab: the commits on its branch, or that touched its file. */
export function CommitsTab({
  item,
  detail,
  reading,
}: {
  item: TaskItem;
  detail: TaskDetailView | null;
  reading: ReactNode;
}) {
  return (
    <>
      <p className="text-xs text-muted-foreground">
        {item.source === "done"
          ? "Commits that touched its file"
          : "Commits on its branch, not on the default branch"}
      </p>
      {!detail ? (
        reading
      ) : detail.commits.length > 0 ? (
        <ol className="space-y-1 text-xs">
          {detail.commits.map((c) => (
            <li key={c.sha} className="flex gap-3">
              <span className="w-28 shrink-0 tabular-nums text-muted-foreground">
                {when(c.at)}
              </span>
              <span className="min-w-0 flex-1 break-words">
                {c.subject}
                <span className="ml-1 text-muted-foreground">({c.author})</span>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-xs text-muted-foreground">No commits yet.</p>
      )}
    </>
  );
}
