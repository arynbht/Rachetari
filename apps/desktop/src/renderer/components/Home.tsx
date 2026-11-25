import { RefreshCw } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useId, useState } from "react";

import { KIND_LABEL } from "@/components/Now";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { errorMessage } from "@/lib/errors";

import type { HomeRepo, HomeView, RepoEntry } from "../../shared/ipc";

// Home: the landing view before a repo is picked, one card per registered
// repo. Each says which cards are live and who holds them, what needs the
// owner, the stage the checklist puts it at and its section with the most
// gaps, and how its last night went, all read by main from the repo's kit
// files. Everything follows the Now watchers as they change. Nothing here
// acts: opening a repo is where things get done.

/** The first few things a repo waits on; its Now view has the rest. */
const NEEDS_SHOWN = 3;

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="font-medium">{label}</dt>
      <dd className="space-y-0.5">{children}</dd>
    </div>
  );
}

/**
 * The checklist section with the most gaps, beside the stage: only a
 * CHECKLIST.md checklist has sections; BACKLOG.md's is by stage.
 */
function MostGaps({ now }: { now: HomeRepo["now"] }) {
  const sections = now.health.sections ?? null;
  if (!now.ready) return <p className="text-muted-foreground">Reading…</p>;
  if (!now.health.hasBacklog)
    return <p className="text-muted-foreground">no checklist yet</p>;
  if (!sections)
    return (
      <p className="text-muted-foreground">
        no sections yet: the checklist is in BACKLOG.md
      </p>
    );
  const worst = sections.worst;
  if (!worst) return <p className="text-muted-foreground">no gaps</p>;
  return (
    <p className="tabular-nums">
      <span className="font-medium">{worst.name}</span>
      <span className={worst.fail > 0 ? "text-rose-300" : undefined}>
        {" "}
        · {worst.fail} failing
      </span>
      <span className={worst.unchecked > 0 ? "text-amber-300" : undefined}>
        {" "}
        · {worst.unchecked} unchecked
      </span>
    </p>
  );
}

function RepoCard({ repo, onOpen }: { repo: HomeRepo; onOpen: () => void }) {
  const titleId = useId();
  const now = repo.now;
  const night = now.health.lastNight;
  return (
    <Card className="space-y-3 p-4" role="article" aria-labelledby={titleId}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 id={titleId} className="truncate text-sm font-semibold">
            {repo.name}
          </h3>
          <p className="truncate text-xs text-muted-foreground">
            {repo.repoPath}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onOpen}>
          Open {repo.name}
        </Button>
      </div>

      {now.error && (
        <p className="text-xs text-rose-300" role="alert">
          {now.error}
        </p>
      )}

      <dl className="grid gap-3 text-xs sm:grid-cols-2">
        <Fact label="Live cards">
          {!now.ready ? (
            <p className="text-muted-foreground">Reading…</p>
          ) : now.cards.length === 0 ? (
            <p className="text-muted-foreground">no live cards</p>
          ) : (
            <ul>
              {now.cards.map((c) => (
                <li key={c.branch}>
                  {c.id} · {c.status} · {c.heldBy ?? "nobody"}
                </li>
              ))}
            </ul>
          )}
        </Fact>
        <Fact label="Needs you">
          {!now.ready ? (
            <p className="text-muted-foreground">Reading…</p>
          ) : now.needsYou.length === 0 ? (
            <p className="text-muted-foreground">nothing waiting</p>
          ) : (
            <>
              <ul>
                {now.needsYou.slice(0, NEEDS_SHOWN).map((n) => (
                  <li key={`${n.id}#${n.kind}`} className="text-amber-300">
                    {KIND_LABEL[n.kind]}: {n.id}
                    <span className="text-muted-foreground"> · {n.why}</span>
                  </li>
                ))}
              </ul>
              {now.needsYou.length > NEEDS_SHOWN && (
                <p className="text-muted-foreground">
                  and {now.needsYou.length - NEEDS_SHOWN} more
                </p>
              )}
            </>
          )}
        </Fact>
        <Fact label="Stage">
          {!now.ready ? (
            <p className="text-muted-foreground">Reading…</p>
          ) : now.health.hasBacklog ? (
            <p>{now.health.stage ?? "no stage written yet"}</p>
          ) : (
            <p className="text-muted-foreground">
              no BACKLOG.md yet: run <code>/setup</code>
            </p>
          )}
        </Fact>
        <Fact label="Most gaps">
          <MostGaps now={now} />
        </Fact>
        <Fact label="Last night">
          {!now.ready ? (
            <p className="text-muted-foreground">Reading…</p>
          ) : night ? (
            <p>
              {night.date} · {night.merged} merged · {night.held} held
            </p>
          ) : (
            <p className="text-muted-foreground">no night report yet</p>
          )}
        </Fact>
      </dl>
    </Card>
  );
}

export function Home({
  repos,
  onOpenRepo,
}: {
  /** The sidebar's list: Home reads again when it changes. */
  repos: RepoEntry[];
  onOpenRepo: (repoPath: string) => void;
}) {
  const [view, setView] = useState<HomeView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const listKey = repos.map((r) => r.path).join("\n");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setView(await window.rivetari.home.get());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, listKey]);

  // Each repo follows its watcher between reads.
  useEffect(() => {
    return window.rivetari.now.onUpdate((state) =>
      setView((prev) =>
        prev
          ? {
              repos: prev.repos.map((r) =>
                r.repoPath === state.repoPath ? { ...r, now: state } : r,
              ),
            }
          : prev,
      ),
    );
  }, []);

  const waiting =
    view?.repos.reduce((n, r) => n + r.now.needsYou.length, 0) ?? 0;
  const live = view?.repos.reduce((n, r) => n + r.now.cards.length, 0) ?? 0;

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Home</h2>
          {view && view.repos.length > 0 && (
            <p className="text-xs text-muted-foreground tabular-nums">
              {view.repos.length}{" "}
              {view.repos.length === 1 ? "repository" : "repositories"} · {live}{" "}
              live {live === 1 ? "card" : "cards"} · {waiting} waiting on you
            </p>
          )}
        </div>
        {repos.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            disabled={loading}
            onClick={() => void load()}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        )}
      </div>

      {error && (
        <p className="text-sm text-rose-300" role="alert">
          {error}
        </p>
      )}

      {repos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No repositories yet. Add a local folder on the left to get started.
        </p>
      ) : loading && !view ? (
        <p className="text-sm text-muted-foreground">Reading the repos…</p>
      ) : view ? (
        <div className="space-y-3">
          {view.repos.map((repo) => (
            <RepoCard
              key={repo.repoPath}
              repo={repo}
              onOpen={() => onOpenRepo(repo.repoPath)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
