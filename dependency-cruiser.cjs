module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "domain-stays-pure",
      comment: "packages/domain must not reach contracts, apps, or any runtime package.",
      severity: "error",
      from: { path: "^packages/domain" },
      to: { pathNot: "^packages/domain" },
    },
    {
      name: "contracts-cannot-import-apps",
      severity: "error",
      from: { path: "^packages/contracts" },
      to: { path: "^apps" },
    },
    {
      name: "api-modules-cannot-cross-import",
      comment:
        "Siblings share through workflows, models, lib or domain — never each other. " +
        "Shared orchestration belongs in workflows/.",
      severity: "error",
      from: { path: "^apps/api/src/modules/([^/]+)/" },
      to: { path: "^apps/api/src/modules/(?!$1/)[^/]+/" },
    },
    {
      name: "workflows-cannot-import-modules",
      comment: "Workflows are imported by modules, never the reverse.",
      severity: "error",
      from: { path: "^apps/api/src/workflows" },
      to: { path: "^apps/api/src/modules" },
    },
    {
      name: "no-dumping-ground-folders",
      severity: "error",
      from: {},
      to: { path: "(^|/)(utils|helpers|misc|temp)/" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: ["node_modules", "\\.next", "dist", "coverage", "\\.test\\.ts$"] },
    tsConfig: { fileName: "tsconfig.base.json" },
    tsPreCompilationDeps: true,
  },
};
