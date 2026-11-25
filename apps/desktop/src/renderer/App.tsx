import { FolderPlus, House, Settings as SettingsIcon, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Settings } from "@/components/Settings";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/errors";
import { applyTheme } from "@/lib/theme";

type View = "now" | "tasks" | "checklist" | "history" | "map";

// Now opens first when a repo is picked, and Tasks sits beside it.
const TABS: { id: View; label: string }[] = [
  { id: "now", label: "Now" },
  { id: "tasks", label: "Tasks" },
  { id: "checklist", label: "Checklist" },
  { id: "history", label: "History" },
  { id: "map", label: "Map" },
];

/** The view a repo opens on. */
const DEFAULT_VIEW: View = "now";

import type { RepoEntry, Theme } from "../shared/ipc";

/** The screen tab bar as an ARIA tablist: roving tabindex + arrow-key nav. */
function TabBar({
  view,
  onSelect,
}: {
  view: View;
  onSelect: (v: View) => void;
}) {
  const refs = useRef<Partial<Record<View, HTMLButtonElement | null>>>({});

  function onKeyDown(e: React.KeyboardEvent): void {
    const i = TABS.findIndex((t) => t.id === view);
    let next = i;
    if (e.key === "ArrowRight") next = (i + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    else return;
    e.preventDefault();
    const target = TABS[next];
    if (!target) return;
    onSelect(target.id);
    refs.current[target.id]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="Repository views"
      onKeyDown={onKeyDown}
      className="flex gap-4 border-b border-border text-sm"
    >
      {TABS.map((t) => (
        <button
          key={t.id}
          ref={(el) => {
            refs.current[t.id] = el;
          }}
          type="button"
          role="tab"
          id={`tab-${t.id}`}
          aria-selected={view === t.id}
          aria-controls={`panel-${t.id}`}
          tabIndex={view === t.id ? 0 : -1}
          onClick={() => onSelect(t.id)}
          className={`-mb-px rounded-t-sm border-b-2 px-1 pb-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            view === t.id
              ? "border-sky-500 text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/**
 * A view that isn't built yet. It says so, and which card brings it, so it
 * can never be mistaken for a view with nothing to show.
 */
function NotBuiltYet({ what, card }: { what: string; card: string }) {
  return (
    <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
      {what} isn&apos;t built yet. It arrives with card {card}.
    </p>
  );
}

export function App() {
  // The preload exposes `window.rivetari`; if it failed to load, surface a clear
  // message instead of letting every handler throw into a blank screen.
  const bridgeReady = typeof window.rivetari !== "undefined";
  const [repos, setRepos] = useState<RepoEntry[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>(DEFAULT_VIEW);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // The applied theme setting; drives the OS-preference listener below.
  const [theme, setTheme] = useState<Theme>("dark");
  // Views the user has opened for the current repo. A view stays mounted once
  // opened (just hidden), so switching tabs doesn't reset its state (a picked
  // task, a draft in progress, the map's place). Reset when the repo changes.
  const [opened, setOpened] = useState<Set<View>>(
    () => new Set<View>([DEFAULT_VIEW]),
  );

  function showView(next: View): void {
    setView(next);
    setOpened((prev) => (prev.has(next) ? prev : new Set(prev).add(next)));
  }

  useEffect(() => {
    if (!bridgeReady) return;
    window.rivetari.repos.list().then(setRepos, (err: unknown) => {
      setError(errorMessage(err));
    });
    // Apply the saved theme as early as possible (index.html defaults to dark).
    window.rivetari.settings.load().then(
      (s) => {
        setTheme(s.theme);
        applyTheme(s.theme);
      },
      () => {
        // Settings unreadable — keep the default dark theme.
      },
    );
  }, [bridgeReady]);

  // Re-apply "system" theme when the OS preference changes while the app is open.
  useEffect(() => {
    applyTheme(theme);
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (): void => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  async function handleAdd(): Promise<void> {
    setError(null);
    try {
      setRepos(await window.rivetari.repos.add());
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function handleRemove(path: string): Promise<void> {
    setError(null);
    try {
      setRepos(await window.rivetari.repos.remove(path));
      if (selected === path) setSelected(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  function handleSelect(path: string): void {
    setSettingsOpen(false);
    setSelected(path);
    setError(null);
    setView(DEFAULT_VIEW);
    setOpened(new Set<View>([DEFAULT_VIEW])); // fresh state for the new repo
  }

  const selectedRepo = repos.find((r) => r.path === selected) ?? null;

  if (!bridgeReady) {
    return (
      <div className="flex h-screen items-center justify-center p-6 text-center">
        <p className="max-w-sm text-sm text-rose-300" role="alert">
          The application bridge failed to load (preload error). Restart the
          app.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-card/30">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-sm font-semibold tracking-tight">Rivetari</h1>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void handleAdd()}
          >
            <FolderPlus className="h-4 w-4" />
            Add
          </Button>
        </div>
        <div className="px-2 pb-1">
          <Button
            size="sm"
            variant={!selected && !settingsOpen ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => {
              setSettingsOpen(false);
              setSelected(null);
            }}
            aria-current={!selected && !settingsOpen ? "page" : undefined}
          >
            <House className="h-4 w-4" />
            Home
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 pb-2">
          {repos.length === 0 ? (
            <p className="px-2 py-4 text-xs text-muted-foreground">
              No repositories yet. Add a local folder to audit it.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {repos.map((repo) => (
                <li key={repo.path}>
                  <div
                    className={`group flex items-center gap-2 rounded-md px-2 py-1.5 ${
                      repo.path === selected
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelect(repo.path)}
                      aria-current={repo.path === selected ? "true" : undefined}
                      className="min-w-0 flex-1 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      title={repo.path}
                    >
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm">{repo.name}</span>
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {repo.path}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleRemove(repo.path)}
                      aria-label={`Remove ${repo.name}`}
                      className="shrink-0 rounded p-1 text-muted-foreground opacity-0 hover:bg-background hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </nav>
        <div className="px-2 pb-2">
          <Button
            size="sm"
            variant={settingsOpen ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => setSettingsOpen(true)}
            aria-current={settingsOpen ? "page" : undefined}
          >
            <SettingsIcon className="h-4 w-4" />
            Settings
          </Button>
        </div>
        <p className="px-4 pb-3 text-xs text-muted-foreground">
          GitHub sign-in isn&apos;t built: it&apos;s shelved (see SHELVED.md).
        </p>
      </aside>

      {/* relative makes main the containing block for anything absolutely
          placed inside it, like the sr-only table captions: otherwise they sit
          outside its scroll, stretch the window and give it a second scrollbar. */}
      <main className="relative flex-1 overflow-y-auto">
        {settingsOpen ? (
          <Settings onThemeChange={setTheme} />
        ) : selectedRepo ? (
          // The map needs room to breathe; other tabs read best narrower.
          <div
            className={`mx-auto space-y-5 p-6 ${
              view === "map" ? "max-w-7xl" : "max-w-4xl"
            }`}
          >
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold">
                {selectedRepo.name}
              </h2>
              <p className="truncate text-xs text-muted-foreground">
                {selectedRepo.path}
              </p>
            </div>

            {error && (
              <p
                className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-rose-300"
                role="alert"
              >
                {error}
              </p>
            )}

            <TabBar view={view} onSelect={showView} />

            {/* Each panel stays mounted once opened (hidden when inactive), so
                switching tabs preserves its state; `opened` resets per repo. */}
            {opened.has("now") && (
              <div
                id="panel-now"
                role="tabpanel"
                aria-labelledby="tab-now"
                tabIndex={0}
                hidden={view !== "now"}
              >
                <NotBuiltYet what="The Now view" card="T-0008" />
              </div>
            )}

            {opened.has("tasks") && (
              <div
                id="panel-tasks"
                role="tabpanel"
                aria-labelledby="tab-tasks"
                tabIndex={0}
                hidden={view !== "tasks"}
              >
                <NotBuiltYet what="The Tasks view" card="T-0009" />
              </div>
            )}

            {opened.has("checklist") && (
              <div
                id="panel-checklist"
                role="tabpanel"
                aria-labelledby="tab-checklist"
                tabIndex={0}
                hidden={view !== "checklist"}
              >
                <NotBuiltYet what="The Checklist view" card="T-0010" />
              </div>
            )}

            {opened.has("history") && (
              <div
                id="panel-history"
                role="tabpanel"
                aria-labelledby="tab-history"
                tabIndex={0}
                hidden={view !== "history"}
              >
                <NotBuiltYet what="The History view" card="T-0011" />
              </div>
            )}

            {opened.has("map") && (
              <div
                id="panel-map"
                role="tabpanel"
                aria-labelledby="tab-map"
                tabIndex={0}
                hidden={view !== "map"}
              >
                <NotBuiltYet what="The Map" card="T-0012" />
              </div>
            )}
          </div>
        ) : (
          <NotBuiltYet what="Home" card="T-0013" />
        )}
      </main>
    </div>
  );
}
