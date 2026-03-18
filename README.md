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
- Supabase CLI

### Installation

```bash
# Install dependencies
pnpm install

# Start local Supabase
pnpm supabase:start

# Run development server
pnpm dev
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Development

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
