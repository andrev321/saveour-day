# Security Policy

## Supported Versions

Only the latest release on the `main` branch is actively supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in `saveour-day`, please report it responsibly:

1. **Do not create a public GitHub Issue** for security vulnerabilities.
2. Report vulnerabilities via GitHub Private Vulnerability Reporting (Security tab > "Report a vulnerability").
3. Include detailed steps to reproduce the issue, sample payload/configuration, and expected vs observed behavior.

### Security Invariants & Isolation Architecture

- **Tenant Isolation**: Organizers access and manage only their own sites via Supabase Row-Level Security (RLS) policies.
- **Server-Side Variant Projection**: Guest views and media assets are projected strictly on the server; client-side hiding is never relied upon for privacy or variant restrictions (`ADR-0003`).
- **Media Authorization**: Storage objects are private. Direct image requests must be authorized against published release manifests or authenticated organizer sessions (`ADR-0006`).
- **Guest Session Versioning**: Guest sessions are cryptographically signed and versioned (`access_version`). Changing access mode, rotating tokens, or revoking access immediately invalidates active sessions (`ADR-0005`).
