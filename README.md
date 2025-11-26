# OTEL E-Commerce Demo

Full-stack e-commerce app demonstrating OpenTelemetry backend integration with Sentry, including a multi-project routing workaround for the OTEL Collector.

## What This Shows

**Two Integration Modes:**

1. **Direct Mode (OTEL SDK → Sentry)**: Standard integration
   - Single service sending directly to a single Sentry project
   - Auto-instrumentation (HTTP, Express, PostgreSQL)
   - Manual instrumentation (custom spans, events, cache)

2. **Collector Mode (Multi-Project Routing)**: Advanced workaround
   - Multiple microservices → OTEL Collector → Multiple Sentry projects
   - Demonstrates routing by `service.name` attribute
   - Solves Sentry's project-based architecture constraint

**Frontend (Optional)**: Sentry SDK for distributed tracing & error tracking
- React Router tracing
- `traceparent` header propagation connects frontend → backend traces
- Creates unified trace view across Browser → API → Database
- Intentional PayPal error demonstrating caught error reporting with `Sentry.captureException()`

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

**Collector Mode (Multi-Project):**
```
┌──────────────────┐  ┌──────────────────┐
│ Products Service │  │  Orders Service  │
│   (port 3001)    │  │   (port 3002)    │
│ service.name:    │  │ service.name:    │
│ products-service │  │ orders-service   │
└────────┬─────────┘  └─────────┬────────┘
         │ OTLP                 │ OTLP
         ▼                      ▼
    ┌────────────────────────────────┐
    │   OTEL Collector               │
    │   (Routing Connector)          │
    └────┬──────────────────┬────────┘
         │                  │
         ▼                  ▼
┌─────────────────┐  ┌─────────────────┐
│  Sentry Project │  │  Sentry Project │
│   (Products)    │  │    (Orders)     │
└─────────────────┘  └─────────────────┘
```

## Prerequisites

- Node.js 18+
- Free Neon account (https://neon.tech)
- Sentry project with OTLP enabled

## Quick Start

### Setup

```bash
# Install dependencies
cd api && npm install

# Configure environment
cp .env.example .env
# Edit .env and add your Sentry OTLP configuration

# Setup database (Neon.tech account required)
npx neondb -y  # Auto-creates database and adds URL to .env
npm run db:setup
```

### Mode 1: Direct (OTEL SDK → Sentry)

Standard single-service integration:

```bash
cd api
npm start  # or: npm run direct
```

Test:
```bash
curl http://localhost:3000/api/products
```

### Mode 2: Collector (Multi-Project Routing)

Advanced multi-service with routing. **Requires 3 Sentry projects.**

**Setup:** See [api/COLLECTOR_SETUP.md](api/COLLECTOR_SETUP.md) for detailed instructions on creating Sentry projects and getting OTLP endpoints.

Quick start (after setup):

```bash
# Terminal 1: Start collector
cd api
npm run collector:start

# Terminal 2: Start products service
cd api
npm run collector:products

# Terminal 3: Start orders service
cd api
npm run collector:orders
```

Test:
```bash
curl http://localhost:3001/api/products
curl -X POST http://localhost:3002/api/orders \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "items": [{"productId": 1, "quantity": 2}], "paymentMethod": "credit_card"}'
```

### Frontend (Optional)

```bash
cd frontend
npm install
cp .env.example .env
# Add Sentry DSN
npm run dev
```

Open http://localhost:5173 and view:
- **Traces:** Sentry → Explore → Traces
- **Errors:** Sentry → Issues (trigger by selecting PayPal payment in checkout)

See [frontend/ERROR_TESTING.md](frontend/ERROR_TESTING.md) for error testing guide.

## Documentation

- **[api/COLLECTOR_SETUP.md](api/COLLECTOR_SETUP.md)** - Step-by-step guide to set up collector mode with multiple Sentry projects
- **[docs/MULTI_PROJECT_ROUTING.md](docs/MULTI_PROJECT_ROUTING.md)** - Detailed explanation of the multi-project routing constraint and solution
- **[api/collector-config.yaml](api/collector-config.yaml)** - Collector configuration with routing connector
- **[api/QUICKSTART.md](api/QUICKSTART.md)** - Quick setup instructions for direct mode

## Key Files

**Direct Mode:**
- `api/instrument-otel.js` - OTEL SDK instrumentation
- `api/src/server.js` - Main application server

**Collector Mode:**
- `api/collector-config.yaml` - Routing connector configuration
- `api/instrument-otel-products.js` - Products service instrumentation
- `api/instrument-otel-orders.js` - Orders service instrumentation
- `api/src/server-products.js` - Products service server
- `api/src/server-orders.js` - Orders service server

## License

MIT
