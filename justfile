# Perennial — living, citation-verified literature reviews.
# Single source of truth for commands. See TOOLS.md for details.

# List available recipes
default:
    @just --list

# (internal) Fail with guidance until the pnpm workspace is bootstrapped (M0)
_bootstrapped:
    @if [ ! -f package.json ]; then \
        echo "perennial: package.json not found — this repo is still a docs-only scaffold."; \
        echo "Bootstrap the pnpm workspace first (DESIGN.md, milestone M0), then re-run."; \
        exit 1; \
    fi

# Enable corepack and install workspace dependencies
setup: _bootstrapped
    corepack enable
    pnpm install

# Start the Next.js dev server (plus package watchers)
dev: _bootstrapped
    pnpm dev

# Start local Postgres (pgvector/pg16) via docker compose
db-up: _bootstrapped
    docker compose up -d postgres

# Stop local docker compose services
db-down: _bootstrapped
    docker compose down

# Apply Drizzle migrations from packages/db
migrate: _bootstrapped
    pnpm -F @perennial/db migrate

# Run Vitest unit tests across the workspace
test: _bootstrapped
    pnpm test

# Run Playwright end-to-end tests
e2e: _bootstrapped
    pnpm e2e

# Lint all packages with ESLint
lint: _bootstrapped
    pnpm lint

# Format the repo with Prettier
format: _bootstrapped
    pnpm format

# Type-check all packages (tsc --noEmit)
typecheck: _bootstrapped
    pnpm typecheck

# Production build of all packages and the web app
build: _bootstrapped
    pnpm build

# Full gate: lint + typecheck + test + build (what CI runs)
ci: lint typecheck test build
