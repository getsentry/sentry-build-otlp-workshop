# OTEL E-Commerce Demo

Full-stack e-commerce app demonstrating OpenTelemetry backend sending traces to Sentry. Supports both standalone backend and distributed tracing with Sentry SDK-instrumented frontend.

## What This Shows

**Backend (OpenTelemetry)**: Sends traces to Sentry via OTLP
- Auto-instrumentation (HTTP, Express, PostgreSQL)
- Manual instrumentation (custom spans, events, cache)
- Two export modes: Direct to Sentry or via Collector

**Frontend (Optional)**: Sentry SDK for distributed tracing
- React Router tracing
- `traceparent` header propagation connects frontend → backend traces
- Creates unified trace view across Browser → API → Database

**Demo works standalone (backend only) or full-stack (frontend + backend)**

## Architecture

```
┌─────────────────┐
│  React Frontend │ (Sentry SDK)
│  Port: 5173     │
└────────┬────────┘
         │ HTTP + traceparent header
         ▼
┌─────────────────────────┐
│    Express API          │ (OpenTelemetry)
│    Port: 3000           │
│  ┌──────────────────┐   │
│  │ In-Memory Cache  │   │
│  └──────────────────┘   │
└────────┬────────────────┘
         │
    ┌────┴────┬─────────┐
    ▼         ▼         ▼
┌────────┐ ┌───────┐ ┌───────┐
│  Neon  │ │Payment│ │Sentry │
│Postgres│ │  API  │ │(OTLP) │
└────────┘ └───────┘ └───────┘
```

## Prerequisites

- Node.js 18+
- Free Neon account (https://neon.tech)
- Sentry project with OTLP enabled

## Quick Start

### Backend

```bash
cd api
npm install

# Configure (creates .env from template)
cp .env.example .env

# Setup database (Neon.tech account required)
# This auto-adds DATABASE_URL to .env
npx neondb -y

# Edit .env: Add Sentry OTLP endpoints

# Initialize database and start
npm run db:setup
npm start
```

See [api/QUICKSTART.md](api/QUICKSTART.md) for details.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Add Sentry DSN
npm run dev
```

### Test

1. Open http://localhost:5173
2. Browse products, create orders
3. View traces in Sentry → Explore → Traces

## Switching Modes

```bash
# Direct: App → Sentry
cd api && npm run mode:direct && npm start

# Collector: App → Collector → Sentry
cd api && npm run mode:collector && npm run collector:start && npm start
```

## License

MIT
