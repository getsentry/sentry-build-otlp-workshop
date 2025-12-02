# OTEL E-Commerce Demo

Full-stack e-commerce app demonstrating OpenTelemetry backend integration with Sentry.

## Two Integration Modes

1. **Direct Mode**: Single monolithic Express API sending telemetry directly to one Sentry project
2. **Collector Mode**: Microservices (Gateway + Products + Orders) with OTEL Collector routing each service to separate Sentry projects

**Frontend**: React app with Sentry SDK for distributed tracing and error tracking

## Architecture

**Direct Mode:**

```
┌─────────────────┐
│  Express API    │
│  (Port 3000)    │
└────────┬────────┘
         │ OTLP/HTTP
         ▼
┌─────────────────┐
│ Sentry Project  │
└─────────────────┘
```

**Collector Mode (Multi-Project Routing):**

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   API Gateway    │  │ Products Service │  │  Orders Service  │
│   (port 3000)    │  │   (port 3001)    │  │   (port 3002)    │
│                  │  │ service.name:    │  │ service.name:    │
│                  │  │ products-service │  │ orders-service   │
└────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
         │                     │                     │
         │ OTLP                │ OTLP                │ OTLP
         ▼                     ▼                     ▼
    ┌──────────────────────────────────────────────────────┐
    │           OTEL Collector (Routing Connector)         │
    └────┬──────────────────────────┬──────────────────────┘
         │                          │
         ▼                          ▼
┌─────────────────┐        ┌─────────────────┐
│ Sentry Project  │        │ Sentry Project  │
│   (Products)    │        │    (Orders)     │
└─────────────────┘        └─────────────────┘
```

## Prerequisites

- Node.js 18+
- PostgreSQL database (recommend https://neon.tech)
- [Free or Paid Sentry account](https://sentry.io/signup/)

## Quick Start

### 1. Install & Setup

```bash
npm run install:all               # Install all dependencies
cp api/.env.example api/.env      # Configure API environment
cp frontend/.env.example frontend/.env  # Configure frontend environment
npm run db:init                   # Auto-creates Neon database
npm run db:setup                  # Initialize database
```

### 2. Configure Sentry

Add your Sentry OTLP endpoint(s) to `api/.env` (see [api/QUICKSTART.md](api/QUICKSTART.md))

### 3. Run

**Direct Mode** (single Sentry project):

```bash
npm run demo:direct
```

**Collector Mode** (multi-project routing):

```bash
npm run demo:collector
```

Both modes run on http://localhost:3000

**Test:**

```bash
# Load test (creates products, orders, payments, errors)
npm run test:api

# Or test manually with curl
curl http://localhost:3000/api/products
```

### 4. Frontend (Optional)

Frontend `.env` was already configured in step 1. Add your `VITE_SENTRY_DSN` to `frontend/.env`, then:

```bash
npm run frontend  # Open http://localhost:5173
```

## Key Files

**Direct Mode:**

- `api/instrument-otel.js` - OTEL SDK instrumentation
- `api/src/server.js` - Main application server

**Collector Mode:**

- `api/collector-config.yaml` - Collector routing configuration
- `api/instrument-otel-gateway.js` - Gateway instrumentation
- `api/instrument-otel-products.js` - Products service instrumentation
- `api/instrument-otel-orders.js` - Orders service instrumentation
