# Issue Tracker Configuration

Issues and implementation tickets for this repository are tracked in two supported ways:

1. **Local Markdown Tickets (Default for autonomous agent sessions)**:
   - Stored under `.scratch/tickets/` as numbered Markdown files (e.g., `.scratch/tickets/001-deepen-media-pipeline.md`).
   - Each ticket declares its `Status`, `Blocked by` edges, `What it delivers`, and `Acceptance criteria`.
2. **GitHub Issues (`andrev321/saveour-day`)**:
   - Accessible via the `github` MCP server (`@modelcontextprotocol/server-github` configured in `~/.gemini/config/mcp_config.json`) or the `gh` CLI when publishing external specs or tracking repository-wide issues.
