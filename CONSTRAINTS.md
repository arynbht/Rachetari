Status: draft, written by /setup

# Constraints

What the code and config already do. Everything here is read from the repo as it stands
(the skeleton from T-0001 and the kit from T-0002), not a wish list.

## Workspace and dependencies

- One pnpm workspace (`pnpm@10.32.1`, Node 22 per `.nvmrc`): `packages/*` and `apps/*`.
- Package names stay as Rivetari had them: `@arynbht/rivetari` (packages/cli),
  `-engine`, `-runtime`. The desktop shell is `@arynbht/rachetari-desktop`
  (apps/desktop), renamed at the owner's request.
- The lockfile is committed and CI installs with `--frozen-lockfile`. Dependency versions
  come from Rivetari's lockfile at `32f4b88`; a dependency arrives only with the code that
  needs it, at the version Rivetari used.
- `pnpm.onlyBuiltDependencies` allows install scripts for `esbuild` and `electron` only.

## Layering (`.dependency-cruiser.mjs`, run by `pnpm boundaries`)

- `packages/engine` never imports `packages/runtime` or `packages/cli`.
- Only `packages/runtime`, `packages/cli` and `apps/desktop/src/main` import the runtime.
- No circular imports.

## TypeScript

- `tsconfig.base.json`: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, ES2023, `NodeNext`
  modules (so relative imports end in `.js`). Composite project references; `tsc --build`
  is both the build and the typecheck.
- Tests (`*.test.ts`) are excluded from the build.

## Style

- Prettier: 80 columns, double quotes, semicolons, trailing commas (`.prettierrc.json`).
- ESLint: `@eslint/js` and `typescript-eslint` recommended; React rules for the desktop
  renderer.
- LF line endings everywhere (`.gitattributes`, `.editorconfig`), two-space indent.
- Kept exactly as written, never reformatted: `SCOPE.md`, `kit/**`, `inventory/**`
  (`.prettierignore`).

## Tests

- Vitest, files named `*.test.ts` beside the code. Packages under `packages/runtime` and
  the CLI commands run in a single fork, because they drive real git repos and child
  processes.
- Coverage is reported on every full run; there is no floor yet.

## CI (`.github/workflows/ci.yml`)

- `ci` is the one aggregate check. On a PR, lint, typecheck and tests run on Ubuntu and
  Windows, scoped to the affected packages by `scripts/ci-scope.mjs`; gitleaks scans the
  PR's commits. Draft PRs run too.
- Main and nightly run every check on both OSes (`build-test`).

## What must not change without a card that says so

- The files transplanted from Rivetari: each is copied verbatim, then cut in a separate
  commit, and listed in `EXTRACTED.md`.
- The kit files and `SCOPE.md` (exactly as the owner wrote them).
- Package names and internal names such as `window.rachetari`.
