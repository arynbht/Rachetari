import type { TaskItem } from "../../../shared/ipc";

/** Only the cards waiting on the owner, as one list, each with what to do. */
export function NeedsList({
  items,
  onSelect,
}: {
  items: TaskItem[];
  onSelect: (key: string) => void;
}) {
  const waiting = items.filter((t) => t.needs.length > 0);
  return (
    <section aria-label="Needs me" className="space-y-2">
      <p className="text-xs text-amber-300">
        {waiting.length === 0
          ? "Nothing waits on you. Turn off Needs me to see the whole board."
          : `${waiting.length} ${
              waiting.length === 1 ? "card waits" : "cards wait"
            } on you. Next up, the columns and Done come back when you turn off Needs me.`}
      </p>
      {waiting.length > 0 && (
        <ul className="space-y-2">
          {waiting.map((t) => (
            <li key={t.key}>
              <button
                type="button"
                data-key={t.key}
                onClick={() => onSelect(t.key)}
                className={`flex w-full flex-col gap-1.5 rounded-lg border bg-card px-3 py-2 text-left text-xs hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  t.unreadable ? "border-rose-500/70" : "border-border"
                }`}
              >
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="shrink-0 font-mono text-muted-foreground">
                    {t.id}
                  </span>{" "}
                  <span className="min-w-0 flex-1 text-sm font-medium [overflow-wrap:anywhere]">
                    {t.title}
                  </span>{" "}
                  <span className="shrink-0 text-muted-foreground">
                    {t.status}
                    {t.heldBy ? `, held by ${t.heldBy}` : ""}
                  </span>
                </span>
                {t.needs.map((n) => (
                  <span key={`${n.kind}:${n.todo}`} className="flex gap-2">
                    <span
                      className={`w-36 shrink-0 font-medium ${
                        n.kind === "unreadable"
                          ? "text-rose-300"
                          : "text-amber-300"
                      }`}
                    >
                      {n.label}
                    </span>{" "}
                    <span className="min-w-0 flex-1 break-words">{n.todo}</span>
                  </span>
                ))}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
