import { ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { errorMessage } from "@/lib/errors";
import { STATUS_META } from "@/lib/status";

import type { ChecklistView } from "../../shared/ipc";

// Checklist: the repo checklist in BACKLOG.md on the default branch — the
// stage and what decides it, and each line with its status and the check
// that decides it, as /setup last recorded them. It changes nothing and runs
// no check; Reload reads the file again.

type Line = ChecklistView["groups"][number]["lines"][number];
type Group = ChecklistView["groups"][number];

const count = (lines: Line[], status: Line["status"]) =>
  lines.filter((l) => l.status === status).length;

/** The recorded totals, labelled so they read without the colours. */
function Totals({ lines }: { lines: Line[] }) {
  const items: [string, number, string][] = [
    ["Pass", count(lines, "pass"), STATUS_META.pass.text],
    ["Fail", count(lines, "fail"), STATUS_META.fail.text],
    ["Unchecked", count(lines, "unchecked"), STATUS_META.unchecked.text],
    ["N/A", count(lines, "n/a"), STATUS_META["n/a"].text],
    ["Total", lines.length, "text-foreground"],
  ];
  return (
    <dl
      aria-label="Checklist totals"
      className="flex flex-wrap gap-x-4 gap-y-1 text-xs tabular-nums"
    >
      {items.map(([label, n, text]) => (
        <div key={label} className="flex gap-1">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className={`font-medium ${text}`}>{n}</dd>
        </div>
      ))}
    </dl>
  );
}

function LineRow({ line }: { line: Line }) {
  const meta = STATUS_META[line.status];
  return (
    <li className="border-t border-border/60 px-4 py-2">
      <div className="flex items-center gap-3">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">
            {line.text}
            {line.isNew && (
              <span className="ml-2 rounded border border-sky-500/50 px-1 text-[11px] font-normal text-sky-300">
                new
              </span>
            )}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {line.check ? (
              <>
                check: <code>{line.check}</code>
              </>
            ) : (
              "no check named"
            )}
          </span>
        </span>
        <span className={`shrink-0 text-xs ${meta.text}`}>{meta.label}</span>
      </div>
    </li>
  );
}

function GroupCard({
  group,
  children,
}: {
  group: Group;
  children: React.ReactNode;
}) {
  const gaps = count(group.lines, "fail") + count(group.lines, "unchecked");
  const [open, setOpen] = useState(gaps > 0);
  return (
    <Card>
      <h4>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center gap-3 p-3 text-left text-sm"
        >
          {open ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span className="flex-1 font-medium">{group.name}</span>
          <span className="text-xs tabular-nums text-muted-foreground">
            {count(group.lines, "pass")} pass
            {count(group.lines, "fail") > 0 &&
              ` · ${count(group.lines, "fail")} fail`}
            {count(group.lines, "unchecked") > 0 &&
              ` · ${count(group.lines, "unchecked")} unchecked`}
          </span>
        </button>
      </h4>
      {open && <ul>{children}</ul>}
    </Card>
  );
}

export function Checklist({ repoPath }: { repoPath: string }) {
  const [view, setView] = useState<ChecklistView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Counts reads, so only the latest one (a Reload, or the first read) lands.
  const loadSeq = useRef(0);

  const load = useCallback(() => {
    const seq = ++loadSeq.current;
    const active = () => seq === loadSeq.current;
    setLoading(true);
    window.rivetari.checklist.get(repoPath).then(
      (next) => {
        if (!active()) return;
        setView(next);
        setError(null);
        setLoading(false);
      },
      (err: unknown) => {
        if (!active()) return;
        setError(errorMessage(err));
        setLoading(false);
      },
    );
    return () => {
      if (active()) loadSeq.current++;
    };
  }, [repoPath]);

  useEffect(() => load(), [load]);

  const lines = (view?.groups ?? []).flatMap((g) => g.lines);
  const hasChecklist = Boolean(view && (view.groups.length > 0 || view.stage));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Checklist</h2>
          <p className="text-xs text-muted-foreground">
            {hasChecklist
              ? `What must stay true for this repo, from "Repo checklist" in BACKLOG.md · last /setup ${view?.lastSetup ?? "not recorded"}`
              : 'What must stay true for this repo, from "Repo checklist" in BACKLOG.md.'}
          </p>
        </div>
        <Button variant="secondary" onClick={() => load()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Reload
        </Button>
      </div>

      {error && (
        <p
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-rose-300"
          role="alert"
        >
          {error}
        </p>
      )}

      {!view ? (
        loading && (
          <p className="text-sm text-muted-foreground">Reading the backlog…</p>
        )
      ) : !view.hasBacklog ? (
        <p className="text-sm text-muted-foreground">
          There&apos;s no BACKLOG.md on the default branch yet. Run{" "}
          <code>/setup</code> in Claude Code to write the checklist and state
          the stage.
        </p>
      ) : !hasChecklist ? (
        <p className="text-sm text-muted-foreground">
          BACKLOG.md has no &quot;Repo checklist&quot; yet. Run{" "}
          <code>/setup</code> in Claude Code to draft one.
        </p>
      ) : (
        <>
          <section aria-labelledby="checklist-stage" className="space-y-2">
            <h3 id="checklist-stage" className="text-sm font-semibold">
              Stage
            </h3>
            <Card className="space-y-1 p-3 text-sm">
              <p className="font-medium">{view.stage ?? "No stage written"}</p>
              {view.stageWhy && (
                <p className="text-xs text-muted-foreground">
                  What decides it: {view.stageWhy}
                </p>
              )}
            </Card>
          </section>

          <section aria-labelledby="checklist-lines" className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id="checklist-lines" className="text-sm font-semibold">
                Lines by stage
              </h3>
              <Totals lines={lines} />
            </div>
            <div className="space-y-2">
              {view.groups.map((group) => (
                <GroupCard key={group.name} group={group}>
                  {group.lines.map((line) => (
                    <LineRow key={`${line.status}#${line.text}`} line={line} />
                  ))}
                </GroupCard>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
