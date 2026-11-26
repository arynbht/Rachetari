import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  copyOldUserData,
  copyRivetariUserData,
  oldUserDataDir,
} from "./migrate";

// The rename moves Electron's userData folder; the person's repos and settings
// are copied across from the old one, once, and the old one is left alone.

let parent = "";
let oldDir = "";
let newDir = "";

beforeEach(() => {
  parent = mkdtempSync(join(tmpdir(), "rachetari-migrate-"));
  oldDir = join(parent, "rivetari-desktop");
  newDir = join(parent, "rachetari-desktop");
});

afterEach(() => {
  rmSync(parent, { recursive: true, force: true });
});

function write(dir: string, file: string, text: string): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, file), text);
}

const read = (dir: string, file: string) =>
  readFileSync(join(dir, file), "utf8");

describe("copyOldUserData", () => {
  it("copies the old repos and settings when the new folder has neither", () => {
    write(oldDir, "repos.json", '[{"path":"/a","name":"a"}]');
    write(oldDir, "settings.json", '{"theme":"light"}');
    write(oldDir, "Preferences", "{}");

    expect(copyOldUserData(newDir, oldDir)).toEqual([
      "repos.json",
      "settings.json",
    ]);
    expect(read(newDir, "repos.json")).toBe('[{"path":"/a","name":"a"}]');
    expect(read(newDir, "settings.json")).toBe('{"theme":"light"}');
    expect(existsSync(join(newDir, "Preferences"))).toBe(false);
    // The old folder is left as it was.
    expect(read(oldDir, "repos.json")).toBe('[{"path":"/a","name":"a"}]');
    expect(read(oldDir, "settings.json")).toBe('{"theme":"light"}');
  });

  it("copies just the one file the old folder has", () => {
    write(oldDir, "repos.json", "[]");

    expect(copyOldUserData(newDir, oldDir)).toEqual(["repos.json"]);
    expect(existsSync(join(newDir, "settings.json"))).toBe(false);
  });

  it("does nothing when the new folder already has data", () => {
    write(oldDir, "repos.json", "[old]");
    write(oldDir, "settings.json", "{old}");
    write(newDir, "settings.json", "{new}");

    expect(copyOldUserData(newDir, oldDir)).toEqual([]);
    expect(read(newDir, "settings.json")).toBe("{new}");
    expect(existsSync(join(newDir, "repos.json"))).toBe(false);
  });

  it("does nothing when the old folder is missing", () => {
    expect(copyOldUserData(newDir, oldDir)).toEqual([]);
    expect(existsSync(newDir)).toBe(false);
  });

  it("runs once: a second start finds the new folder has data", () => {
    write(oldDir, "repos.json", "[]");
    expect(copyOldUserData(newDir, oldDir)).toEqual(["repos.json"]);
    expect(copyOldUserData(newDir, oldDir)).toEqual([]);
  });
});

describe("oldUserDataDir", () => {
  it("is the folder beside, with Rachetari spelled Rivetari", () => {
    expect(oldUserDataDir(join(parent, "Rachetari"))).toBe(
      join(parent, "Rivetari"),
    );
    expect(oldUserDataDir(join(parent, "rachetari-desktop"))).toBe(
      join(parent, "rivetari-desktop"),
    );
  });

  it("is null for a folder not named after the app", () => {
    expect(oldUserDataDir(join(parent, "e2e-userdata"))).toBeNull();
  });
});

describe("copyRivetariUserData", () => {
  it("copies from the Rivetari folder beside the userData folder", () => {
    write(oldDir, "repos.json", "[]");
    copyRivetariUserData(newDir);
    expect(read(newDir, "repos.json")).toBe("[]");
  });
});
