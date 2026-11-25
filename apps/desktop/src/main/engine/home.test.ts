// Home reads the registered repos, and only those, from the hub's last read.
import { describe, expect, it } from "vitest";

import type { NowState } from "../../shared/ipc";
import { readHome } from "./home";

const state = (repoPath: string): NowState => ({
  repoPath,
  ready: true,
  error: null,
  cardCount: 0,
  cards: [],
  health: {
    stage: null,
    stageWhy: null,
    counts: { pass: 0, fail: 0, unchecked: 0, na: 0 },
    lastSetup: null,
    hasBacklog: false,
    skills: { count: 0, onLiveCards: [] },
    lastNight: null,
  },
  needsYou: [],
  questions: [],
  running: [],
  recent: [],
});

describe("Home", () => {
  it("reads one line per registered repo, in the sidebar's order", async () => {
    const asked: string[] = [];
    const view = await readHome({
      listRepos: async () => [
        { path: "/b", name: "b" },
        { path: "/a", name: "a" },
      ],
      state: (repoPath) => {
        asked.push(repoPath);
        return state(repoPath);
      },
    });
    expect(view.repos.map((r) => [r.name, r.now.repoPath])).toEqual([
      ["b", "/b"],
      ["a", "/a"],
    ]);
    expect(asked).toEqual(["/b", "/a"]);
  });

  it("has nothing to show with no repos", async () => {
    expect(await readHome({ listRepos: async () => [], state })).toEqual({
      repos: [],
    });
  });
});
