// The display branch: the branch the shell shows, `develop` from whichever of
// local `develop` and `origin/develop` is newer, else the default branch; and
// every reader of the kit's files reading it.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  BACKLOG,
  cardText,
  kitFixture,
  type KitFixture,
} from "../../../test/kit-fixture";
import {
  ChecklistView,
  NowState,
  TasksState,
  type DisplayBranch,
} from "../../shared/ipc";
import { readChecklist } from "../engine/checklist";
import { nowState } from "../engine/now";
import { taskDetail, taskItems, tasksState } from "../engine/tasks";
import {
  defaultBranch,
  displayBranch,
  readBacklog,
  readCardCommits,
  readDoneCard,
  readDoneCards,
  readEvents,
  readLiveCards,
  readNights,
  readNightText,
  readSkills,
} from "./source";
import { EMPTY_SNAPSHOT, readKit } from "./watch";

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" });
}

/** Every ref: what a read must never change (no fetch). */
const refs = (repo: string) =>
  git(repo, "for-each-ref", "--format=%(refname) %(objectname)");

/** BACKLOG.md with `line` as Next up's first item. */
const backlogWith = (line: string) =>
  BACKLOG.replace("1. Export the report as CSV", `1. ${line}`);

const LOCAL: DisplayBranch = {
  name: "develop",
  ref: "refs/heads/develop",
  diverged: false,
};
const ORIGIN: DisplayBranch = {
  name: "develop",
  ref: "refs/remotes/origin/develop",
  diverged: false,
};

let fx: KitFixture;
afterEach(() => fx?.remove());

describe("the display branch", { timeout: 30_000 }, () => {
  it("falls back to the default branch when there's no develop", async () => {
    fx = kitFixture();
    const display = await displayBranch(fx.repo);
    expect(display).toEqual({
      name: "main",
      // The default branch's ref as it's read today: origin's HEAD in a clone.
      ref: await defaultBranch(fx.repo),
      diverged: false,
    });
    expect(display.ref).toMatch(/^(origin\/)?main$/);
  });

  it("reads origin/develop when there's no local develop", async () => {
    fx = kitFixture();
    fx.commitOnDevelop("origin", "BACKLOG.md", backlogWith("From origin"));
    git(fx.repo, "fetch", "-q", "origin");

    expect(await displayBranch(fx.repo)).toEqual(ORIGIN);
    expect((await readBacklog(fx.repo))?.nextUp[0]).toMatch(/^From origin/);
  });

  it("reads local develop ahead of origin/develop without a fetch", async () => {
    fx = kitFixture();
    fx.commitOnDevelop("origin", "BACKLOG.md", backlogWith("From origin"));
    git(fx.repo, "fetch", "-q", "origin");
    fx.commitOnDevelop("local", "BACKLOG.md", backlogWith("From this machine"));

    const before = refs(fx.repo);
    expect(await displayBranch(fx.repo)).toEqual(LOCAL);
    expect((await readBacklog(fx.repo))?.nextUp[0]).toMatch(
      /^From this machine/,
    );
    expect(refs(fx.repo)).toBe(before);
  });

  it("reads origin/develop once it's ahead", async () => {
    fx = kitFixture();
    fx.commitOnDevelop("origin", "BACKLOG.md", backlogWith("First"));
    git(fx.repo, "fetch", "-q", "origin");
    git(fx.repo, "branch", "--no-track", "develop", "origin/develop");
    // The same commit on both: read as local.
    expect(await displayBranch(fx.repo)).toEqual(LOCAL);

    fx.commitOnDevelop("origin", "BACKLOG.md", backlogWith("Second"));
    // Not seen until a fetch: the file source never fetches.
    expect(await displayBranch(fx.repo)).toEqual(LOCAL);
    git(fx.repo, "fetch", "-q", "origin");
    expect(await displayBranch(fx.repo)).toEqual(ORIGIN);
    expect((await readBacklog(fx.repo))?.nextUp[0]).toMatch(/^Second/);
  });

  it("reads local develop, flagged, when the two have diverged", async () => {
    fx = kitFixture();
    fx.commitOnDevelop("origin", "BACKLOG.md", backlogWith("First"));
    git(fx.repo, "fetch", "-q", "origin");
    fx.commitOnDevelop("local", "BACKLOG.md", backlogWith("Mine"));
    fx.commitOnDevelop("origin", "BACKLOG.md", backlogWith("Theirs"));
    git(fx.repo, "fetch", "-q", "origin");

    expect(await displayBranch(fx.repo)).toEqual({ ...LOCAL, diverged: true });
    expect((await readBacklog(fx.repo))?.nextUp[0]).toMatch(/^Mine/);
  });
});

describe("the readers on the display branch", { timeout: 30_000 }, () => {
  it("reads the backlog, nights, skills and done cards from local develop", async () => {
    fx = kitFixture();
    const { repo } = fx;
    fx.commitOnDevelop("local", "BACKLOG.md", backlogWith("Only on develop"));
    fx.commitOnDevelop(
      "local",
      "nights/2026-11-25.md",
      "# Night 2026-11-25\n\n| Card | Result | Checks | Review | Minutes |\n| --- | --- | --- | --- | --- |\n| T-0011 | merged into develop | 3 pass | no blocking | 12 |\n",
    );
    fx.commitOnDevelop(
      "local",
      "skills/INDEX.md",
      "# Area skills\n\n| Area | Skill | When to use it | Upstream | Commit | License | Used on a real task |\n| --- | --- | --- | --- | --- | --- | --- |\n| testing | [test-driven-development](testing/test-driven-development/) | Adding logic | addyosmani/agent-skills | `301b02b1` | MIT | yes |\n",
    );
    fx.commitOnDevelop(
      "local",
      "cards/done/T-0011.md",
      cardText({
        id: "T-0011",
        title: "feat: closed on develop",
        status: "done",
      }),
    );
    fx.commitOnDevelop(
      "local",
      "cards/done/T-0001.md",
      cardText({ id: "T-0001", title: "develop's copy", status: "done" }),
    );

    expect((await readBacklog(repo))?.nextUp[0]).toMatch(/^Only on develop/);
    expect((await readNights(repo)).map((n) => n.date)).toEqual([
      "2026-11-25",
      "2026-11-24",
    ]);
    expect(await readNightText(repo, "2026-11-25")).toMatch(/T-0011/);
    expect((await readSkills(repo)).length).toBe(1);

    // Done files from develop, then the default branch; develop's copy wins.
    const done = await readDoneCards(repo);
    expect(done.map((d) => [d.id, d.title])).toEqual([
      ["T-0011", "feat: closed on develop"],
      ["T-0002", "feat: add the report page"],
      ["T-0001", "develop's copy"],
    ]);
    expect(await readDoneCard(repo, "cards/done/T-0011.md")).toMatchObject({
      id: "T-0011",
    });
    expect(await readDoneCard(repo, "cards/done/T-0002.md")).toMatchObject({
      id: "T-0002",
    });
    expect(
      (await readCardCommits(repo, { path: "cards/done/T-0011.md" })).map(
        (c) => c.subject,
      ),
    ).toEqual(["docs: update cards/done/T-0011.md on develop"]);

    // The events on develop's cards/ and nights/.
    const subjects = (await readEvents(repo)).map((e) => e.subject);
    expect(subjects).toContain("docs: update cards/done/T-0011.md on develop");
    expect(subjects).toContain("docs: update nights/2026-11-25.md on develop");

    // readKit reads the display branch once and hands it on.
    const kit = await readKit(repo);
    expect(kit.display).toEqual(LOCAL);
    expect(kit.backlog?.nextUp[0]).toMatch(/^Only on develop/);
    expect(kit.done.map((d) => d.id)).toContain("T-0011");
    expect(kit.nights[0]?.date).toBe("2026-11-25");
  });

  it("counts a card done on develop as done, not broken", async () => {
    fx = kitFixture();
    const { repo } = fx;
    // A card branch whose CARD.md was committed, then moved away.
    git(repo, "checkout", "-q", "-b", "card/T-0014", "main");
    writeFileSync(
      join(repo, "CARD.md"),
      cardText({ id: "T-0014", title: "feat: T-0014", status: "in progress" }),
    );
    git(repo, "add", "CARD.md");
    git(repo, "commit", "-q", "-m", "chore(card): T-0014");
    git(repo, "rm", "-q", "CARD.md");
    git(repo, "commit", "-q", "-m", "chore(card): T-0014 done");
    git(repo, "checkout", "-q", "card/T-0003");
    // Before it's on develop, it's broken.
    const broken = (await readLiveCards(repo)).find(
      (c) => c.branch === "card/T-0014",
    );
    expect(broken?.error).toMatch(/^unreadable: CARD.md was removed/);

    fx.commitOnDevelop(
      "local",
      "cards/done/T-0014.md",
      cardText({ id: "T-0014", title: "feat: T-0014", status: "done" }),
    );
    const cards = await readLiveCards(repo);
    expect(cards.map((c) => c.branch)).not.toContain("card/T-0014");
    const items = taskItems(await readKit(repo)).filter(
      (i) => i.id === "T-0014",
    );
    expect(items).toEqual([
      expect.objectContaining({ column: "done", source: "done" }),
    ]);
  });

  it("lists a develop card's own commits only", async () => {
    fx = kitFixture();
    const { repo } = fx;
    fx.commitOnDevelop("local", "BACKLOG.md", backlogWith("On develop"));
    git(repo, "checkout", "-q", "-b", "card/T-0015", "develop");
    git(repo, "commit", "-q", "--allow-empty", "-m", "feat: T-0015's own");
    git(repo, "checkout", "-q", "card/T-0003");

    expect(
      (await readCardCommits(repo, { ref: "card/T-0015" })).map(
        (c) => c.subject,
      ),
    ).toEqual(["feat: T-0015's own"]);
    const kit = await readKit(repo);
    const detail = await taskDetail(repo, kit, "branch:card/T-0015");
    expect(detail.commits.map((c) => c.subject)).toEqual([
      "feat: T-0015's own",
    ]);
    // Its events are its own too, not develop's.
    const ofCard = kit.events.filter((e) => e.cardId === "T-0015");
    expect(ofCard.map((e) => e.subject)).toEqual(["feat: T-0015's own"]);
  });

  it("Now, Tasks and Checklist carry the display branch", async () => {
    fx = kitFixture();
    const { repo } = fx;
    // Null before the first read.
    expect(nowState(repo, EMPTY_SNAPSHOT, false, null).display).toBeNull();
    expect(tasksState(repo, EMPTY_SNAPSHOT, false, null).display).toBeNull();

    const onMain = await readKit(repo);
    expect(NowState.parse(nowState(repo, onMain, true, null)).display).toEqual(
      expect.objectContaining({ name: "main", diverged: false }),
    );

    fx.commitOnDevelop("local", "BACKLOG.md", backlogWith("On develop"));
    const kit = await readKit(repo);
    expect(NowState.parse(nowState(repo, kit, true, null)).display).toEqual(
      LOCAL,
    );
    expect(TasksState.parse(tasksState(repo, kit, true, null)).display).toEqual(
      LOCAL,
    );
    const checklist = ChecklistView.parse(await readChecklist(repo));
    expect(checklist.display).toEqual(LOCAL);
    expect(checklist.hasBacklog).toBe(true);
  });
});
