# Crystal Frontend (React)

This package contains the React-based UI for Crystal. It communicates with the Electron main process through window.electron and window.electronAPI bridges and manages app state with Zustand stores.

- Full architecture guide: ../docs/CRYSTAL_ARCHITECTURE.md

## Scripts (use pnpm)

- pnpm dev: Start Vite dev server
- pnpm build: Build production assets
- pnpm preview: Preview the production build
- pnpm lint: Lint TypeScript/TSX sources
- pnpm typecheck: Type-only compile without emit
- pnpm test: Run tests (Vitest)

## Development notes

- Many features depend on Electron APIs exposed via window.electron/window.electronAPI. Running the UI purely in the browser (vite dev/preview) will limit functionality that requires filesystem, Git, terminal, or IPC.
- For a full experience, run the Electron app which injects the preload bridge, or connect to a backend that provides compatible endpoints.
- State management uses Zustand stores (e.g., sessionStore, navigationStore, githubStore, errorStore). See the architecture doc for details.

## Key directories

- src/components: UI components and views
- src/stores: Zustand state stores
- src/utils: Frontend utilities (API wrappers, formatting)
- src/main.tsx: React entrypoint

See ../docs/CRYSTAL_ARCHITECTURE.md for system diagrams and data flow.