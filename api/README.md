# OpenTelemetry E-commerce API

Express API demonstrating two OpenTelemetry integration patterns with Sentry.

**See [QUICKSTART.md](QUICKSTART.md) for setup instructions.**

## Two Modes

### Mode 1: Direct (OTEL SDK → Sentry)
Standard single-service integration:
```
┌─────────────────┐
│   Express API   │
│  (Port 3000)    │
└────────┬────────┘
         │ OTLP/HTTP
         ▼
┌─────────────────┐
│ Sentry Project  │
└─────────────────┘
```

**Run:** `npm start`

### Mode 2: Collector (Multi-Project Routing)
Multiple services routed to separate Sentry projects:
```
┌──────────────────┐  ┌──────────────────┐
│ Products Service │  │  Orders Service  │
│   (port 3001)    │  │   (port 3002)    │
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

**Setup:** Requires creating 3 Sentry projects and configuring OTLP endpoints. See [COLLECTOR_SETUP.md](COLLECTOR_SETUP.md) for detailed instructions.

**Run:**
```bash
npm run collector:start      # Terminal 1
npm run collector:products   # Terminal 2
npm run collector:orders     # Terminal 3
```

## API Endpoints

**Products**
```bash
GET  /api/products           # List all
GET  /api/products/:id       # Get by ID
GET  /api/products/search?q= # Search
```

**Orders**
```bash
POST /api/orders             # Create order
GET  /api/orders/:id         # Get by ID
GET  /api/orders/user/:id    # User's orders
```

**Health**
```bash
GET  /health                 # Health check
```

## Testing

```bash
# Quick test
curl http://localhost:3000/api/products

# Create order
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "items": [{"productId": 1, "quantity": 1}], "paymentMethod": "credit_card"}'

# Load test (generates ~40 traces)
npm test
```

## Instrumentation

**Auto-instrumented:**
- HTTP requests
- Express routes
- PostgreSQL queries

**Manually instrumented:**
- Custom spans (order creation, inventory, payment)
- Custom attributes (user/order IDs, SKUs)
- Events (cache hits, payment failures)
- Errors with full context

**Example trace in Sentry:**
```
POST /api/orders
  ├─ order.create
  │   ├─ SELECT users (Postgres)
  │   ├─ SELECT products (Postgres)
  │   ├─ inventory.check
  │   ├─ BEGIN/INSERT/COMMIT (Transaction)
  │   ├─ inventory.reserve
  │   └─ payment.process
```

**Built-in error scenarios:**
- 404 (invalid IDs)
- 400 (validation errors)
- 409 (insufficient inventory)
- 422 (payment failures, ~10% rate)
- 500 (database errors)

## Configuration

**Direct Mode requires:**
- `DATABASE_URL` - Neon PostgreSQL connection
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` - Sentry OTLP endpoint
- `OTEL_EXPORTER_OTLP_TRACES_HEADERS` - Sentry auth header

**Collector Mode requires:**
- `DATABASE_URL` - Neon PostgreSQL connection
- `SENTRY_PRODUCTS_OTLP_ENDPOINT` & `SENTRY_PRODUCTS_AUTH`
- `SENTRY_ORDERS_OTLP_ENDPOINT` & `SENTRY_ORDERS_AUTH`
- `SENTRY_DEFAULT_OTLP_ENDPOINT` & `SENTRY_DEFAULT_AUTH`

See `.env.example` for detailed configuration.

## Development

**Enable debug logging:**
Uncomment in the instrumentation files:
```javascript
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
```

**Trigger specific errors:**
```bash
# 404
curl http://localhost:3000/api/products/99999

# 409 (insufficient inventory)
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "items": [{"productId": 1, "quantity": 99999}], "paymentMethod": "credit_card"}'
```

**Key Files:**
- `instrument-otel.js` - Direct mode instrumentation
- `instrument-otel-products.js` - Products service (collector mode)
- `instrument-otel-orders.js` - Orders service (collector mode)
- `collector-config.yaml` - Routing connector configuration
- `src/services/` - Manual instrumentation examples

## Collector Commands

```bash
npm run collector:start    # Start collector
npm run collector:stop     # Stop collector
npm run collector:health   # Health check
npm run collector:logs     # View logs
npm run collector:help     # Show usage instructions
```

## Documentation

- **[COLLECTOR_SETUP.md](COLLECTOR_SETUP.md)** - Complete setup guide for collector mode (creating Sentry projects, getting OTLP endpoints)
- **[../docs/MULTI_PROJECT_ROUTING.md](../docs/MULTI_PROJECT_ROUTING.md)** - Detailed explanation of the multi-project routing pattern and Sentry's project constraint
- **[QUICKSTART.md](QUICKSTART.md)** - Quick setup for direct mode

## License

MIT
