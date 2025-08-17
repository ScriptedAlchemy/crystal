# Crystal Main (Electron Backend)

This package contains the Electron main process for Crystal. It provides the backend runtime, IPC handlers, database access, Git/worktree orchestration, task queues, and optional HTTP server mode.

- Full architecture guide: ../docs/CRYSTAL_ARCHITECTURE.md

## Scripts (use pnpm)

- pnpm dev: TypeScript compile in watch mode (outputs to dist)
- pnpm build: Clean, compile, copy SQL assets, and bundle MCP bridge
- pnpm server: Run Express server (server.ts) for HTTP-mode
- pnpm start:server: Start web server entry (server-web.ts)
- pnpm server:web: Start web server in test mode on PORT=3030
- pnpm lint: Lint TypeScript sources
- pnpm typecheck: Type-only compile without emit
- pnpm test: Run tests (Vitest)
- pnpm test:watch: Run tests in watch mode
- pnpm test:coverage: Run tests with coverage

Note: In Electron app mode, this package is launched by the Electron runtime; in HTTP mode, you can use the server scripts above to expose APIs without Electron.

## Environment variables

- NODE_ENV: Development vs production toggles
- PORT: Port for HTTP server (default 3030)
- REDIS_URL: If set, TaskQueue uses Bull + Redis; otherwise falls back to in-process SimpleQueue in Electron environments

## Key directories

- src/services: Core services (SessionManager, GitStatusManager, RunCommandManager, etc.)
- src/ipc: All electron ipcMain route registrations
- src/database: SQLite schema and migrations
- src/handlers: HTTP route handlers for server mode
- src/index.ts: Main Electron entrypoint
- src/server.ts: Express server entrypoint

See ../docs/CRYSTAL_ARCHITECTURE.md for diagrams and in-depth flow descriptions.