// A fake `gh` for the desktop's unit tests and e2e, run as
// [process.execPath, this file, ...args]. It answers the shell's reads from a
// JSON file and never touches the network. Driven by env:
//   FAKE_GH_MODE  ok (default) | signed-out | fail | bad-json | hang
//   FAKE_GH_DATA  a JSON file, read at each call:
//                 { runs: { <branch>: [run] }, allRuns: [run], pulls: [pull] }
//   FAKE_GH_LOG   a file each call's arguments are appended to, one JSON line
//   FAKE_GH_PIDS  (hang) a file this process and its child's pids are written to
import { spawn } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { setInterval } from "node:timers";

const args = process.argv.slice(2);
const env = process.env;
if (env.FAKE_GH_LOG)
  appendFileSync(env.FAKE_GH_LOG, `${JSON.stringify(args)}\n`);

const mode = env.FAKE_GH_MODE || "ok";

/** The value after a flag, or undefined. */
function flag(name) {
  const at = args.indexOf(name);
  return at === -1 ? undefined : args[at + 1];
}

function data() {
  if (!env.FAKE_GH_DATA) return {};
  return JSON.parse(readFileSync(env.FAKE_GH_DATA, "utf8"));
}

function answer() {
  const { runs = {}, allRuns = [], pulls = [] } = data();
  if (args[0] === "api") return pulls;
  if (args[0] === "run" && args[1] === "list") {
    const limit = Number(flag("--limit") ?? 20);
    const branch = flag("--branch");
    const list = branch === undefined ? allRuns : (runs[branch] ?? []);
    return list.slice(0, limit);
  }
  process.stderr.write(`unknown command "${args.join(" ")}" for "gh"\n`);
  process.exit(1);
}

if (mode === "signed-out") {
  process.stderr.write(
    "To get started with GitHub CLI, please run:  gh auth login\n" +
      "Alternatively, populate the GH_TOKEN environment variable with a GitHub API authentication token.\n",
  );
  process.exit(4);
} else if (mode === "fail") {
  process.stderr.write("HTTP 502: Bad Gateway (https://api.github.com/)\n");
  process.stderr.write("second line\n");
  process.exit(1);
} else if (mode === "bad-json") {
  process.stdout.write("<html>not json</html>\n");
} else if (mode === "hang") {
  // Never answers, and holds a child that never does either.
  const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
    stdio: "ignore",
  });
  if (env.FAKE_GH_PIDS)
    writeFileSync(env.FAKE_GH_PIDS, `${process.pid} ${child.pid}`);
  setInterval(() => {}, 1000);
} else {
  process.stdout.write(`${JSON.stringify(answer())}\n`);
}
