# Workspace Packages (`packages/*`)

Each package in `packages/` is a **deep module** (`codebase-design`): a large amount of domain or UI behaviour hidden behind a small, explicit **Interface**.

## Layout Convention

```
packages/
  <name>/
    package.json
    src/
      index.ts        ← Public entry point (importable via @invitations/<name>)
      <entry>.ts      ← Optional additional entry point (e.g. guest.ts, templates.ts)
      lib/            ← Private implementation subfolder (hidden from outside)
      tests/          ← Co-located package tests (private)
```

## Four Enforced Rules (`npm run lint:boundaries`)

1. **Entry-point boundary (`entrypoint-boundary-from-app` / `entrypoint-boundary-across-packages`)**:
   Code outside a package (`apps/*`, `tests/*`, or another package) may import **only** a package's entry points (`packages/<name>/src/*.ts`), never any file inside a private subfolder (`packages/<name>/src/lib/*`).
2. **Intra-package freedom**:
   A package's own files may import each other freely.
3. **Tests through the entry points (`tests-through-entrypoints`)**:
   Tests exercise a package exclusively through its public entry points—never by reaching into `src/lib/*`.
4. **No cycles & Pure Domain (`no-circular`, `domain-is-pure`)**:
   Zero circular dependencies are permitted anywhere in the repository, and `@invitations/domain` must never depend on `@invitations/ui`, `@invitations/renderer`, or `apps/*`.

## Avoid Barrel Files
Expose focused entry points (declared in `package.json#exports`) rather than re-exporting an entire internal tree through a massive barrel index.
