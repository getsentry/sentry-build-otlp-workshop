# OTEL E-Commerce Demo

Full-stack e-commerce app demonstrating OpenTelemetry integration with Sentry.

## Integration Modes

| Mode                | Architecture                               | Sentry Projects  | Auth             |
| ------------------- | ------------------------------------------ | ---------------- | ---------------- |
| **Direct**          | Monolith → Sentry                          | 1                | Per-project DSN  |
| **Collector**       | Microservices → Routing Connector → Sentry | N (pre-created)  | Per-project DSNs |
| **Sentry Exporter** | Microservices → Sentry Exporter → Sentry   | N (auto-created) | Org-level token  |

**Frontend**: React app with Sentry SDK for distributed tracing and error tracking

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed diagrams.

**Direct Mode** — Single service, single project:

```
┌─────────────────┐
│  Express API    │ ───OTLP/HTTP───▶ Sentry Project
└─────────────────┘
```

**Collector Mode** — Routing connector with per-project DSNs:

```
Services ──OTLP──▶ Collector (Routing Connector) ──▶ Products Project
                                                 ──▶ Orders Project
```

**Sentry Exporter Mode** — Native exporter with auto-routing:

```
Services ──OTLP──▶ Collector (Sentry Exporter) ──▶ Auto-created projects
                                                   (api-gateway, products-service, orders-service)
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

See [QUICKSTART.md](QUICKSTART.md) for detailed setup instructions.

| Mode                | Required Configuration                               |
| ------------------- | ---------------------------------------------------- |
| **Direct**          | OTLP endpoint + auth header from one project         |
| **Collector**       | OTLP endpoints + auth headers from multiple projects |
| **Sentry Exporter** | Org slug + Custom Integration token                  |

### 3. Run

```bash
npm run demo:direct      # Direct Mode - single project
npm run demo:collector   # Collector Mode - routing connector
npm run demo:sentry      # Sentry Exporter - auto-routing
```

All modes run on http://localhost:3000

**Test:**

```bash
npm run test:api
```

### 4. Frontend (Optional)

Add your `VITE_SENTRY_DSN` to `frontend/.env`, then:

```bash
npm run frontend  # Open http://localhost:5173
```

## Key Files

| Mode                | Key Files                                                         |
| ------------------- | ----------------------------------------------------------------- |
| **Direct**          | `instrument-otel.js`, `src/server.js`                             |
| **Collector**       | `collector-config.yaml`, `scripts/run-collector.js`               |
| **Sentry Exporter** | `collector-config-sentry.yaml`, `scripts/run-collector-sentry.js` |

**Shared (Collector & Sentry Exporter):**

- `instrument-otel-gateway.js` - Gateway service instrumentation
- `instrument-otel-products.js` - Products service instrumentation
- `instrument-otel-orders.js` - Orders service instrumentation

## Collector Binary

Both Collector Mode and Sentry Exporter Mode use the standard `otelcol-contrib` binary, which is **auto-downloaded** when you run `npm run demo:collector` or `npm run demo:sentry`. No manual build step required.

The Sentry Exporter is included in the upstream [opentelemetry-collector-contrib](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/sentryexporter) distribution.
