import { CircleAlert } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

import type { ShellStatus as ShellStatusT } from "../../shared/ipc";
import { span, useNow } from "../lib/time";

// The shell's own state, on the display branch's line: the commit the live
// shell runs ("running abc1234") before it, the repo on show's background
// fetch ("fetched 40 s ago", or why it failed) after it, and a warning when
// the live shell is behind develop. None of it is an alert: the repo's own
// error box stays the only one.

/** The status main last told, kept current by its pushes. */
function useShellStatus(): ShellStatusT | null {
  const [status, setStatus] = useState<ShellStatusT | null>(null);
  useEffect(() => {
    let mounted = true;
    const off = window.rivetari.shell.onStatus(setStatus);
    window.rivetari.shell.status().then(
      // A push that landed first is newer: it stays.
      (read) => mounted && setStatus((pushed) => pushed ?? read),
      () => undefined,
    );
    return () => {
      mounted = false;
      off();
    };
  }, []);
  return status;
}

/** git's own words on one line, without the command line before them. */
const oneLine = (message: string) =>
  message
    .replace(/^Command failed: [^\n]*\n(?=[\s\S]*\S)/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .join(" ");

const Dot = () => <span aria-hidden>·</span>;

export function ShellStatus({ children }: { children: ReactNode }) {
  const status = useShellStatus();
  const live = status?.live ?? null;
  const fetch = status?.fetch ?? null;
  const now = useNow(Boolean(fetch?.fetchedAt));

  return (
    <>
      <p className="flex flex-wrap items-baseline gap-x-1.5 text-xs font-medium text-muted-foreground">
        {live && (
          <>
            <span>running {live.running}</span>
            <Dot />
          </>
        )}
        <span>{children}</span>
        {fetch && (
          <>
            <Dot />
            <span>
              {fetch.fetchedAt
                ? `fetched ${span(now - Date.parse(fetch.fetchedAt))} ago`
                : "not fetched yet"}
            </span>
          </>
        )}
        {fetch?.error && (
          <>
            <Dot />
            <span className="text-amber-400">
              fetch failed: {oneLine(fetch.error)}
            </span>
          </>
        )}
      </p>
      {live?.behind && (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-400">
          <CircleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {live.behind}
        </p>
      )}
    </>
  );
}
