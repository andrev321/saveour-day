// @ts-check
// Deep-module enforcement for dependency-cruiser (`setup-ts-deep-modules`).
//
// Each package under `packages/<name>/src` is a DEEP MODULE: a lot of behaviour
// behind a small interface. A package's PUBLIC SURFACE is its ENTRY POINTS:
// the files at `packages/<name>/src/<entry>.ts(x)`. Implementation lives in
// SUBFOLDERS (`packages/<name>/src/lib/*`) and is private.

const PACKAGES_ROOT = "packages";

/**
 * A package's private internals: anything nested inside a subfolder of `packages/<pkg>/src/`.
 * The package's root `src/*.ts(x)` files are its entry points and are NOT matched here:
 * they stay importable from outside.
 */
const PACKAGE_INTERNALS = `^${PACKAGES_ROOT}/[^/]+/src/[^/]+/`;

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "entrypoint-boundary-from-app",
      comment:
        "App/root/test code may import a package's entry points (packages/<pkg>/src/*.ts), but nothing inside its private subfolders (packages/<pkg>/src/<subfolder>/*).",
      severity: "error",
      from: { pathNot: `^${PACKAGES_ROOT}/` },
      to: { path: PACKAGE_INTERNALS },
    },
    {
      name: "entrypoint-boundary-across-packages",
      comment:
        "A package's own files import each other freely, but may reach OTHER packages only through their entry points, never their internals.",
      severity: "error",
      from: {
        path: `^${PACKAGES_ROOT}/([^/]+)/src/`,
        pathNot: `^${PACKAGES_ROOT}/[^/]+/src/tests/`,
      },
      to: {
        path: PACKAGE_INTERNALS,
        pathNot: `^${PACKAGES_ROOT}/$1/src/`,
      },
    },
    {
      name: "tests-through-entrypoints",
      comment:
        "Tests exercise a package through its entry points like everyone else: they may never import a package's private subfolder internals.",
      severity: "error",
      from: { path: `(^tests/|^${PACKAGES_ROOT}/([^/]+)/src/tests/)` },
      to: {
        path: PACKAGE_INTERNALS,
        pathNot: `^${PACKAGES_ROOT}/$2/src/tests/`,
      },
    },
    {
      name: "no-circular",
      comment: "No dependency cycles across modules.",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "domain-is-pure",
      comment:
        "@invitations/domain is the pure core and must not depend on @invitations/ui, @invitations/renderer, or apps/*.",
      severity: "error",
      from: { path: `^${PACKAGES_ROOT}/domain/` },
      to: { path: `(^${PACKAGES_ROOT}/(ui|renderer)/|^apps/)` },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "default"],
    },
  },
};
