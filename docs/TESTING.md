# Testing

Run commands from the repository root with Node.js 24 and npm 11. Install the locked dependency set with `npm ci`. In Windows PowerShell, use `npm.cmd` if script execution policy blocks `npm`.

## Local checks

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run build:admin
npx playwright install --with-deps chromium webkit
npm run test:e2e
```

| Check | Coverage and limits |
| --- | --- |
| Typecheck/lint | Shared packages and both applications |
| `npm test` | Domain logic, PGlite SQL/RLS, API handlers, media lifecycle, and other unit/integration checks |
| PostgreSQL concurrency | Requires `TEST_DATABASE_URL` pointing to a disposable test database |
| Builds | Guest site and admin application |
| Playwright | UI, access/RSVP flows with controlled responses, responsive layouts, themes, and accessibility interactions |
| Staging smoke | Real Storage, persistence, publication, code access, RSVP, and calendar |

Never point `TEST_DATABASE_URL` at staging or production: tests create roles and schemas. CI supplies PostgreSQL 17 and runs Chromium plus selected WebKit flows.

`build:demo` is a historical script name: it builds the full guest application. Local browser tests can use `E2E_SITE_URL` and `E2E_ADMIN_URL`. Test configuration is in the root Playwright files.

## Manual staging smoke workflow

The GitHub Actions **Staging smoke** workflow is manually triggered and uses the `staging` environment:

- Variable `STAGING_ADMIN_URL`: canonical staging admin origin.
- Variable `STAGING_SITE_URL`: canonical staging guest origin.
- Secret `STAGING_PANEL_STORAGE_STATE`: Playwright storage state for a dedicated test account.

Both hosts must contain `staging`. The workflow creates a disposable site and soft-deletes its own site afterward. It does not send emails. Protected Vercel deployments need an authorized test-access arrangement.

Storage state contains authentication material: keep it in the environment secret, never documentation, source control, or shared artifacts. Renew it when the test session expires.

## What still needs manual verification

Controlled HTTP/API tests do not prove real email delivery. Test account confirmation, password recovery, guest OTP, and optional reminders separately with authorized mailboxes. Use the acceptance list in [Deployment](PLATFORM-DEPLOYMENT.md).

A successful build or HTTP 200 does not prove the complete authenticated workflow. Report what was tested and what remains unknown rather than carrying forward old passing counts.

## Documentation-only changes

Check relative links, code fences, script names, environment-variable names, and consistency with source. Do not claim application tests were rerun unless they actually were. Historical test results belong in dated reports.
