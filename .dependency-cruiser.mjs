export default {
  forbidden: [
    {
      name: "engine-stays-below-runtime-and-cli",
      severity: "error",
      from: { path: "^packages/engine/" },
      to: { path: "^(packages/(runtime|cli)/|@arynbht/rivetari(-runtime)?$)" },
    },
    {
      // The desktop's main process reads tasks through the runtime's watcher;
      // its renderer and preload stay off it.
      name: "only-cli-imports-runtime",
      severity: "error",
      from: {
        path: "^(packages|apps)/",
        pathNot: "^(packages/(runtime|cli)/|apps/desktop/src/main/)",
      },
      to: { path: "^(packages/runtime/|@arynbht/rivetari-runtime$)" },
    },
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: ["node_modules", "/dist/"] },
    exclude: { path: ["/dist/", "/out/", "/coverage/", "\\.d\\.ts$"] },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.base.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
      extensions: [".ts", ".tsx", ".js", ".mjs", ".cjs", ".json"],
    },
  },
};
