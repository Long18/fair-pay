# FairPay

A modern expense-sharing web application built with React and Supabase.

## About

FairPay helps users track shared expenses with friends and groups. Split bills, track payments, and settle debts easily — with a polished mobile-first UI and real-time sync.

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Framework**: Refine v5
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime, Edge Functions)
- **UI**: shadcn/ui (Radix UI + Tailwind CSS)
- **Build**: Vite
- **PWA**: Service worker with auto-update flow

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- (Optional, local backend only) Docker Desktop + Supabase CLI

### Installation

```bash
# Install dependencies
pnpm install

# Configure env (preferred filename for this repo)
cp .env.example .env.local
# Set at least VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
# Remote hosted project: paste project URL + anon key and skip local Supabase.
# Local Supabase: requires Docker Desktop. Migrations expect core tables from
# supabase/baseline.sql (not applied by supabase start alone). Prefer a hosted
# project for agents; for a full local DB see supabase/scripts/sync/sync-full.sh
# or apply baseline.sql then copy keys from `pnpm supabase:status`.

# Run development server
pnpm dev
```

See [AGENTS.md](AGENTS.md) for the agent-oriented validation recipe (`test:mcp`, scoped vitest, etc.) and local Supabase caveats.

### Environment Variables

Copy `.env.example` to **`.env.local`** (preferred) or `.env` and configure:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Local Supabase (`pnpm supabase:start`) is **optional** when using a hosted project. A cold local stack also needs [`supabase/baseline.sql`](supabase/baseline.sql) applied (migrations start from mid-history and will fail without it).## Development

```bash
# Development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Type checking
pnpm type-check

# Database migrations
pnpm db:reset
```

## Features

- Expense tracking (group & 1-on-1)
- Multiple split methods (equal, exact amounts)
- Payment recording & settlement
- Real-time balance updates
- Receipt attachments with zoomable image viewer
- Recurring expenses with automated cycle processing
- Google OAuth authentication
- Multi-language support (EN/VI)
- Dynamic OG image previews with per-user settlement status
- Haptic feedback on supported devices
- Build versioning with auto-refresh flow
- Comprehensive RLS security policies
- Admin dashboard with user journey tracking

## License

MIT
