import { ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { errorMessage } from "@/lib/errors";
import { STATUS_META } from "@/lib/status";

import type { ChecklistView } from "../../shared/ipc";
import { DisplayBranchLine } from "./DisplayBranch";

// Checklist: the repo checklist on the display branch — the stage and what
// decides it, and each line with its status and the check that decides it, as
// /setup last recorded them. From CHECKLIST.md it shows one row per section,
// gaps first; from BACKLOG.md's "Repo checklist" (a repo not moved yet) it
// shows the lines by stage. It changes nothing and runs no check; Reload reads
// the file again.

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

/** A check as CHECKLIST.md writes it: prose, with its `code spans` as code. */
function CheckText({ check }: { check: string }) {
  if (!check.includes("`")) return <>{check}</>;
  return (
    <>
      {check
        .split("`")
        .map((part, i) => (i % 2 === 1 ? <code key={i}>{part}</code> : part))}
    </>
  );
}

function LineRow({
  line,
  markdown = false,
}: {
  line: Line;
  /** The check is Markdown (CHECKLIST.md): show its code spans as code. */
  markdown?: boolean;
}) {
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
            {line.id && (
              <code className="mr-2 text-foreground/80">{line.id}</code>
            )}
            {line.check ? (
              <>
                check:{" "}
                {markdown ? (
                  <CheckText check={line.check} />
                ) : (
                  <code>{line.check}</code>
                )}
              </>
            ) : (
              "no check named"
            )}
          </span>
        </span>
        {line.stage && (
          <span className="shrink-0 rounded border border-border px-1.5 text-[11px] text-muted-foreground">
            {line.stage}
          </span>
        )}
        <span className={`shrink-0 text-xs ${meta.text}`}>{meta.label}</span>
      </div>
    </li>
  );
}

/** A section's gaps: its failing and unchecked lines. */
const gapsOf = (group: Group) =>
  count(group.lines, "fail") + count(group.lines, "unchecked");

/** Most gaps first; ties: more fails, then A to Z. */
function byGaps(a: Group, b: Group): number {
  return (
    gapsOf(b) - gapsOf(a) ||
    count(b.lines, "fail") - count(a.lines, "fail") ||
    a.name.localeCompare(b.name)
  );
}

const SECTION_COLUMNS: Line["status"][] = ["pass", "fail", "unchecked", "n/a"];
const SECTION_GRID =
  "grid w-full grid-cols-[1rem_minmax(0,1fr)_repeat(4,5.5rem)] items-center gap-x-3 p-3 text-left text-sm";

/** One section of CHECKLIST.md: its counts in labelled columns, or why it's greyed. */
function SectionHeader({
  group,
  open,
  onToggle,
}: {
  group: Group;
  open: boolean;
  onToggle: () => void;
}) {
  if (group.na !== null || group.lines.length === 0)
    return (
      <h4 className={SECTION_GRID}>
        <span aria-hidden />
        <span className="font-medium">{group.name}</span>
        <span className="col-span-4 text-xs">
          {group.na !== null ? `n/a: ${group.na}` : "not assessed"}
        </span>
      </h4>
    );
  return (
    <h4>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={SECTION_GRID}
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="truncate font-medium">{group.name}</span>
        {SECTION_COLUMNS.map((status) => {
          const n = count(group.lines, status);
          return (
            <span
              key={status}
              className={`text-right text-xs tabular-nums ${n > 0 ? STATUS_META[status].text : "text-muted-foreground"}`}
            >
              <span className={n > 0 ? "font-semibold" : undefined}>{n}</span>{" "}
              {status === "n/a"
                ? "n/a"
                : STATUS_META[status].label.toLowerCase()}
            </span>
          );
        })}
      </button>
    </h4>
  );
}

function GroupCard({
  group,
  bySection = false,
  children,
}: {
  group: Group;
  /** A CHECKLIST.md section: counts in columns, greyed when n/a or empty. */
  bySection?: boolean;
  children: React.ReactNode;
}) {
  const gaps = gapsOf(group);
  const [open, setOpen] = useState(gaps > 0);
  if (bySection) {
    const state =
      group.na !== null
        ? "n/a"
        : group.lines.length === 0
          ? "empty"
          : open
            ? "open"
            : "closed";
    const greyed = state === "n/a" || state === "empty";
    return (
      <Card
        data-section={group.name}
        data-state={state}
        className={
          greyed
            ? "border-dashed bg-transparent text-muted-foreground"
            : undefined
        }
      >
        <SectionHeader
          group={group}
          open={open}
          onToggle={() => setOpen((v) => !v)}
        />
        {open && !greyed && <ul>{children}</ul>}
      </Card>
    );
  }
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
  const [alphabetical, setAlphabetical] = useState(false);

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
  const bySection = view?.source === "CHECKLIST.md";
  const groups = bySection
    ? [...(view?.groups ?? [])].sort(
        alphabetical ? (a, b) => a.name.localeCompare(b.name) : byGaps,
      )
    : (view?.groups ?? []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Checklist</h2>
          <DisplayBranchLine display={view?.display} />
          <p className="text-xs text-muted-foreground">
            {bySection
              ? `What must stay true for this repo, from CHECKLIST.md · last /setup ${view?.lastSetup ?? "not recorded"}`
              : hasChecklist
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
          There&apos;s no BACKLOG.md on{" "}
          {view.display?.name ?? "the default branch"} yet. Run{" "}
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
                {bySection ? "Sections" : "Lines by stage"}
              </h3>
              {bySection ? (
                <div className="flex flex-wrap items-center gap-3">
                  <Totals lines={lines} />
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-pressed={alphabetical}
                    onClick={() => setAlphabetical((v) => !v)}
                  >
                    Alphabetical
                  </Button>
                </div>
              ) : (
                <Totals lines={lines} />
              )}
            </div>
            <div className="space-y-2">
              {groups.map((group) => (
                <GroupCard key={group.name} group={group} bySection={bySection}>
                  {group.lines.map((line, i) => (
                    <LineRow
                      key={`${line.id ?? ""}#${line.status}#${line.text}#${i}`}
                      line={line}
                      markdown={bySection}
                    />
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
