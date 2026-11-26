// @ts-check
import eslint from "@eslint/js";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

// `max-lines` counts code only: blank lines and comments don't count.
/**
 * @param {number} max
 * @returns {import("eslint").Linter.RuleEntry}
 */
const maxLines = (max) => [
  "error",
  { max, skipBlankLines: true, skipComments: true },
];

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/out/**",
      "**/node_modules/**",
      "**/*.tsbuildinfo",
      "**/coverage/**",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Plain JS/MJS tooling scripts run on Node.
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
        URL: "readonly",
      },
    },
  },
  {
    // Electron main + preload: Node/Electron context, no DOM.
    files: [
      "apps/desktop/src/main/**/*.ts",
      "apps/desktop/src/preload/**/*.ts",
    ],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // Electron renderer: React + browser globals, new JSX transform.
    files: ["apps/desktop/src/renderer/**/*.{ts,tsx}"],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooks,
    },
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...reactPlugin.configs.flat.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // TypeScript covers prop types; the new runtime needs no React in scope.
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
    },
  },
  {
    // Size limits for every linted file (T-0043).
    rules: {
      complexity: ["error", 20],
      "max-lines": maxLines(500),
    },
  },
  {
    // Tests (unit and e2e): longer files allowed, no complexity limit.
    files: ["**/*.{test,spec,e2e}.{ts,tsx,js,mjs,cjs}"],
    rules: {
      complexity: "off",
      "max-lines": maxLines(800),
    },
  },
  // Exceptions: code over the limits on the day they were set, each held at its
  // size then plus room (complexity +2, lines +50) so it can't grow. Each names
  // the Next up line that will shrink it; delete the block when that lands.
  {
    // Shrink Checklist (Checklist.tsx) under the lint limits (complexity 31).
    files: ["apps/desktop/src/renderer/components/Checklist.tsx"],
    rules: { complexity: ["error", 33] },
  },
  {
    // Shrink Now (Now.tsx) under the lint limits (complexity 28).
    files: ["apps/desktop/src/renderer/components/Now.tsx"],
    rules: { complexity: ["error", 30] },
  },
  {
    // Shrink checkOnce (live-shell.mjs) under the lint limits (complexity 26).
    files: ["apps/desktop/scripts/live-shell.mjs"],
    rules: { complexity: ["error", 28] },
  },
  {
    // Shrink needsYouItems (now.ts) under the lint limits (complexity 25).
    files: ["apps/desktop/src/main/engine/now.ts"],
    rules: { complexity: ["error", 27] },
  },
);
