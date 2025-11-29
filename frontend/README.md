# OTEL E-commerce Frontend

React e-commerce app with Sentry SDK integration for distributed tracing and error tracking.

## Prerequisites

- Node.js 18+
- Backend API running (see `../api/README.md`)
- Sentry account

## Setup

### 1. Install

```bash
npm install
```

### 2. Configure

```bash
cp .env.example .env
```

Add your configuration to `.env`:

```bash
# Sentry configuration
VITE_SENTRY_DSN=https://your-public-key@your-org.ingest.sentry.io/project-id

# Backend API URL (default: http://localhost:3000/api)
VITE_API_URL=http://localhost:3000/api
```

### 3. Start

```bash
npm run dev
```

Open http://localhost:5173

## Features

**Distributed Tracing:**
- Frontend traces connect to backend OTEL traces via `traceparent` header
- View full traces in Sentry: Browser → API Gateway → Microservices → Database

**Error Tracking:**
- Caught errors reported with `Sentry.captureException()`
- Session replay for debugging
- Example: PayPal payment flow triggers intentional error

## Viewing in Sentry

- **Traces:** Sentry → Explore → Traces
- **Errors:** Sentry → Issues

## License

MIT
