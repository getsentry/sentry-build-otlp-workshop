# OTEL E-Commerce Demo

A full-stack e-commerce application demonstrating distributed tracing between Sentry SDK (frontend) and OpenTelemetry (backend), with data flowing to Sentry.

## Project Structure

```
otel-ecommerce/
├── api/                              # Node.js backend with OpenTelemetry
│   ├── src/                          # API source code
│   ├── instrumentation.js            # OTEL SDK configuration
│   ├── collector-config.yaml         # OTEL Collector config
│   └── README.md                     # Backend setup guide
├── frontend/                         # React frontend with Sentry SDK
│   ├── src/                          # React app source
│   └── README.md                     # Frontend setup guide
├── DISTRIBUTED_TRACING_PLAN.md       # Implementation & demo plan
└── README.md                         # This file
```

## What This Demonstrates

1. **Backend**: OpenTelemetry instrumentation sending traces to Sentry via OTLP
   - Automatic instrumentation (HTTP, Express, PostgreSQL, Redis)
   - Manual instrumentation (custom spans, events, attributes)
   - Two modes: Direct to Sentry or via OTEL Collector

2. **Frontend**: Sentry SDK capturing browser performance
   - React Router tracing
   - API call tracking with `traceparent` header propagation

3. **Distributed Tracing**: Connected traces across frontend and backend
   - Browser → API → Database → Cache
   - Single unified trace view in Sentry
   - Error propagation across services

## Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Sentry account with OTLP enabled

### 1. Start Backend

```bash
cd api
npm install
cp .env.example .env
# Edit .env with your Sentry credentials
docker compose up -d
npm run db:setup
npm start
```

Backend runs on: `http://localhost:3000`

### 2. Start Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Add Sentry SDK configuration (see DISTRIBUTED_TRACING_PLAN.md)
npm run dev
```

Frontend runs on: `http://localhost:5173` or `http://localhost:5174`

### 3. Test Distributed Tracing

1. Open frontend in browser
2. Browse products and create an order
3. Check Sentry → Explore → Traces
4. See unified trace: Browser → API → Database → Redis

## Demo Flows

### Backend Only (OTEL)
- Shows OpenTelemetry traces sent to Sentry via OTLP
- Direct mode or Collector mode
- Run: `cd api && npm test`

### Full Distributed Tracing
- Shows Sentry SDK (frontend) + OTEL (backend) connected
- Single trace ID spans both systems
- See: `DISTRIBUTED_TRACING_PLAN.md`

## Key Files

- `api/instrumentation.js` - OTEL SDK setup with mode switching
- `api/collector-config.yaml` - OTEL Collector configuration
- `frontend/src/sentry.js` - Sentry SDK setup (to be added)
- `DISTRIBUTED_TRACING_PLAN.md` - Full demo implementation plan

## Features

**Backend:**
- Express API with real e-commerce logic
- PostgreSQL database with products, orders, users
- Redis caching layer
- Payment simulation with random failures
- Comprehensive error scenarios
- Manual instrumentation examples

**Frontend:**
- Clean, modern React UI
- Product browsing and detail pages
- Shopping cart functionality
- Order placement with error handling
- Gradient design with real product images

## Architecture

```
┌─────────────────┐
│  React Frontend │ (Sentry SDK)
│  Port: 5173     │
└────────┬────────┘
         │ HTTP + traceparent header
         ▼
┌─────────────────┐
│  Express API    │ (OpenTelemetry)
│  Port: 3000     │
└────────┬────────┘
         │
    ┌────┴────┬─────────┐
    ▼         ▼         ▼
┌────────┐ ┌──────┐ ┌───────┐
│Postgres│ │Redis │ │Payment│
│ :5432  │ │:6379 │ │  API  │
└────────┘ └──────┘ └───────┘
         │
         ▼
┌─────────────────┐
│     Sentry      │
│  (OTLP + SDK)   │
└─────────────────┘
```

## Documentation

- [Backend README](api/README.md) - API setup, endpoints, OTEL configuration
- [Frontend README](frontend/README.md) - React app setup and structure
- [Distributed Tracing Plan](DISTRIBUTED_TRACING_PLAN.md) - Implementation guide & demo script
- [Backend QUICKSTART](api/QUICKSTART.md) - 5-minute setup guide

## Contributing

This is a demo application. Feel free to:
- Add more instrumentation examples
- Enhance the UI
- Add additional microservices
- Experiment with sampling strategies

## License

MIT
