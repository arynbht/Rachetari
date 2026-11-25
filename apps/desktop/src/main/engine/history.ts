// History adapter: the finished cards in cards/done/ and the night reports in
// nights/, both on the default branch, through the file source. A night is
// read by its date from the list, never by a path the renderer sends.
import { readDoneCards, readNightText, readNights } from "../kit/source";
import type { HistoryNight, HistoryView } from "../../shared/ipc";

export async function readHistory(repoPath: string): Promise<HistoryView> {
  const [done, nights] = await Promise.all([
    readDoneCards(repoPath),
    readNights(repoPath),
  ]);
  return {
    repoPath,
    done,
    nights: nights.map(({ date, path, merged, held, blocked }) => ({
      date,
      path,
      merged,
      held,
      blocked,
    })),
  };
}

export async function readNight(
  repoPath: string,
  date: string,
): Promise<HistoryNight> {
  const known = (await readNights(repoPath)).some((n) => n.date === date);
  const markdown = known ? await readNightText(repoPath, date) : null;
  if (markdown === null)
    throw new Error(`there is no night report for ${date}`);
  return { date, markdown };
}
