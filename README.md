# OTEL E-Commerce Demo

Full-stack e-commerce app demonstrating OpenTelemetry backend integration with Sentry.

## What This Shows

**Two Integration Modes:**

1. **Direct Mode**: Single monolithic service
   - Express API sending directly to a single Sentry project
   - Auto-instrumentation (HTTP, Express, PostgreSQL)
   - Manual instrumentation (custom spans, events)

2. **Collector Mode**: Microservices with multi-project routing
   - API Gateway + Products + Orders microservices
   - Collector routes each service to separate Sentry projects
   - Demonstrates workaround for Sentry's project-based architecture

**Frontend**: React app with Sentry SDK
- Distributed tracing connects frontend → backend traces
- `traceparent` header propagation
- Error tracking with `Sentry.captureException()`

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
- Sentry account with OTLP enabled

## Quick Start

### 1. Install & Configure

```bash
cd api
npm install
cp .env.example .env
```

### 2. Setup Database

```bash
npx neondb -y  # Auto-creates Neon database
npm run db:setup
```

### 3. Configure Sentry

Add your Sentry OTLP endpoint to `.env` (see [api/QUICKSTART.md](api/QUICKSTART.md) for details)

### Mode 1: Direct

Single monolithic Express API → Sentry

**Run:**
```bash
cd api
npm start
```

**Test:**
```bash
curl http://localhost:3000/api/products
```

Traces appear in your Sentry project.

### Mode 2: Collector (Multi-Project Routing)

Microservices with OTEL Collector routing to separate Sentry projects.

**Requirements:**
- Create **2 Sentry projects** (Products, Orders)
- Get OTLP endpoints for both projects
- Configure `.env` with credentials for both (see [api/QUICKSTART.md](api/QUICKSTART.md))

**Run:**
```bash
cd api
npm run collector:all
```

This starts 4 services:
- **OTEL Collector** (ports 4317, 4318) - routes by `service.name`
- **Gateway** (port 3000) - API entry point
- **Products Service** (port 3001) - routes to Products Sentry project
- **Orders Service** (port 3002) - routes to Orders Sentry project

**Test:**
```bash
# Products endpoint → Products Sentry Project
curl http://localhost:3000/api/products

# Orders endpoint → Orders Sentry Project
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "items": [{"productId": 1, "quantity": 2}], "paymentMethod": "credit_card"}'
```

**See:** [docs/MULTI_PROJECT_ROUTING.md](docs/MULTI_PROJECT_ROUTING.md) for detailed explanation of the routing workaround

### Frontend (Optional)

React app with Sentry SDK for distributed tracing.

```bash
cd frontend
npm install
cp .env.example .env
# Add VITE_SENTRY_DSN and VITE_API_URL
npm run dev
```

Open http://localhost:5173

Frontend traces connect to backend traces via `traceparent` header, creating unified traces across Browser → Gateway → Microservices → Database.

## Documentation

- **[api/QUICKSTART.md](api/QUICKSTART.md)** - Quick setup instructions
- **[api/README.md](api/README.md)** - API documentation and configuration
- **[docs/MULTI_PROJECT_ROUTING.md](docs/MULTI_PROJECT_ROUTING.md)** - Multi-project routing explained
- **[api/collector-config.yaml](api/collector-config.yaml)** - Collector configuration
- **[frontend/README.md](frontend/README.md)** - Frontend setup instructions

## Key Files

**Direct Mode:**
- `api/instrument-otel.js` - OTEL SDK instrumentation
- `api/src/server.js` - Main application server

**Collector Mode:**
- `api/collector-config.yaml` - Collector configuration
- `api/instrument-otel-gateway.js` - Gateway instrumentation
- `api/instrument-otel-products.js` - Products service instrumentation
- `api/instrument-otel-orders.js` - Orders service instrumentation
- `api/src/server-gateway.js` - Gateway server
- `api/src/server-products.js` - Products service server
- `api/src/server-orders.js` - Orders service server

## License

MIT
