import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

import { kitFixture, type KitFixture } from "../test/kit-fixture";
import { closeApp, launchApp, type LaunchedApp } from "./helpers";

// main decides which repo a request is about from its own registered list.
// A renderer that sends another folder's path, as a compromised one could,
// is refused before anything there is read or written; the registered repo
// still answers as before.

/** The part of the bridge these requests use, as the renderer sees it. */
interface Bridge {
  docs: {
    list(repoPath: string): Promise<unknown[]>;
    read(repoPath: string, path: string): Promise<{ markdown: string }>;
  };
  checklist: {
    get(repoPath: string): Promise<{ repoPath: string }>;
  };
  repos: {
    fetch(repoPath: string): Promise<void>;
  };
}

test.describe("registered repos", () => {
  let launched: LaunchedApp | undefined;
  let fx: KitFixture | undefined;
  const cleanup: string[] = [];

  test.afterEach(async () => {
    if (launched) await closeApp(launched);
    launched = undefined;
    fx?.remove();
    fx = undefined;
    for (const dir of cleanup.splice(0))
      rmSync(dir, { recursive: true, force: true });
  });

  test("main refuses a repo path that isn't registered", async () => {
    fx = kitFixture();
    const repo = fx.repo;
    const other = mkdtempSync(join(tmpdir(), "rivetari-e2e-unregistered-"));
    cleanup.push(other);
    writeFileSync(join(other, "secret.md"), "# not for the app\n");
    launched = await launchApp({
      repos: [{ path: repo, name: "sample-repo" }],
    });
    const { page } = launched;

    // The registered repo answers.
    const listed = await page.evaluate(
      (repoPath) =>
        (window as unknown as { rivetari: Bridge }).rivetari.docs
          .list(repoPath)
          .then((docs) => docs.length),
      repo,
    );
    expect(listed).toBeGreaterThanOrEqual(0);
    const checklist = await page.evaluate(
      (repoPath) =>
        (window as unknown as { rivetari: Bridge }).rivetari.checklist.get(
          repoPath,
        ),
      repo,
    );
    expect(checklist.repoPath).toBe(repo);

    // Another folder is refused, for a read and for a write.
    const read = await page.evaluate(
      (repoPath) =>
        (window as unknown as { rivetari: Bridge }).rivetari.docs
          .read(repoPath, "secret.md")
          .then(
            (doc) => `read: ${doc.markdown}`,
            (err: unknown) => `refused: ${String(err)}`,
          ),
      other,
    );
    expect(read).toContain("refused");
    expect(read).toContain("isn't one of the registered repos");

    const fetched = await page.evaluate(
      (repoPath) =>
        (window as unknown as { rivetari: Bridge }).rivetari.repos
          .fetch(repoPath)
          .then(
            () => "fetched",
            (err: unknown) => `refused: ${String(err)}`,
          ),
      other,
    );
    expect(fetched).toContain("isn't one of the registered repos");
    expect(readdirSync(other)).toEqual(["secret.md"]);

    // A path that climbs out of the registered repo isn't that repo either.
    const climbed = await page.evaluate(
      (repoPath) =>
        (window as unknown as { rivetari: Bridge }).rivetari.docs
          .read(repoPath, "secret.md")
          .then(
            () => "read",
            (err: unknown) => `refused: ${String(err)}`,
          ),
      join(repo, "..", other.split(/[\\/]/).pop()!),
    );
    expect(climbed).toContain("isn't one of the registered repos");
  });
});
