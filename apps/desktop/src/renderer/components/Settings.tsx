import { useEffect, useState } from "react";

import { Card } from "@/components/ui/card";
import { errorMessage } from "@/lib/errors";
import { applyTheme } from "@/lib/theme";

import type { SettingsView, Theme } from "../../shared/ipc";

const inputClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Field(props: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={props.htmlFor}
        className="text-xs font-medium text-muted-foreground"
      >
        {props.label}
      </label>
      {props.children}
      {props.hint && (
        <p className="text-xs text-muted-foreground">{props.hint}</p>
      )}
    </div>
  );
}

export function Settings({
  onThemeChange,
}: {
  onThemeChange: (theme: Theme) => void;
}) {
  const [view, setView] = useState<SettingsView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    window.rivetari.settings.load().then(
      (v) => active && setView(v),
      (err: unknown) => active && setError(errorMessage(err)),
    );
    return () => {
      active = false;
    };
  }, []);

  async function patch(
    changes: Parameters<typeof window.rivetari.settings.save>[0],
  ): Promise<void> {
    setError(null);
    try {
      setView(await window.rivetari.settings.save(changes));
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  function handleThemeChange(theme: Theme): void {
    applyTheme(theme); // live preview
    onThemeChange(theme); // keep App's system-change listener in sync
    void patch({ theme });
  }

  if (error && !view) {
    return (
      <p className="text-sm text-rose-400" role="alert">
        {error}
      </p>
    );
  }
  if (!view) {
    return <p className="text-sm text-muted-foreground">Loading settings…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-6">
      <h2 className="text-xl font-semibold">Settings</h2>

      {error && (
        <p className="text-sm text-rose-400" role="alert">
          {error}
        </p>
      )}

      <Card className="space-y-4 p-4">
        <h3 className="text-sm font-semibold">General</h3>
        <Field label="Theme" htmlFor="setting-theme">
          <select
            id="setting-theme"
            className={inputClass}
            value={view.theme}
            onChange={(e) => handleThemeChange(e.target.value as Theme)}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </Field>
      </Card>
    </div>
  );
}
