# OpenTelemetry E-commerce API

Express API demonstrating OpenTelemetry integration with Sentry.

**See [QUICKSTART.md](QUICKSTART.md) for setup instructions.**

## Two Modes

### Mode 1: Direct
Single monolithic service:
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
Microservices routing to separate Sentry projects:
```
┌──────────────────┐
│   API Gateway    │
│   (port 3000)    │────┐
└──────────────────┘    │
                        │
┌──────────────────┐    │
│ Products Service │    │
│   (port 3001)    │────┤ OTLP
└──────────────────┘    │
                        │
┌──────────────────┐    │
│  Orders Service  │    │
│   (port 3002)    │────┘
└──────────────────┘
         │
         ▼
┌────────────────────┐
│  OTEL Collector    │
└────────┬───────────┘
         │ OTLP/HTTP
         ▼
┌─────────────────┐
│ Sentry Project  │
└─────────────────┘
```

**Run:** `npm run collector:all`

## API Endpoints

All requests go through port 3000 in both modes.

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

Both modes use port 3000:

```bash
# Products endpoint
curl http://localhost:3000/api/products

# Create order
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "items": [{"productId": 1, "quantity": 1}], "paymentMethod": "credit_card"}'

# Load test (generates multiple traces)
npm test
```

**Collector Mode:** Check traces in separate Products and Orders Sentry projects.

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

**Example trace structure:**
```
POST /api/orders
  ├─ order.create (custom span)
  │   ├─ SELECT users (auto-instrumented)
  │   ├─ SELECT products (auto-instrumented)
  │   ├─ inventory.check (custom span)
  │   ├─ BEGIN/INSERT/COMMIT (auto-instrumented)
  │   ├─ inventory.reserve (custom span)
  │   └─ payment.process (custom span)
```

**Collector Mode:** In the Orders Sentry project, you'll also see the gateway span as the parent.

**Built-in error scenarios:**
- 404 (invalid IDs)
- 400 (validation errors)
- 409 (insufficient inventory)
- 422 (payment failures, ~10% rate)
- 500 (database errors)

## Configuration

### Direct Mode
Requires in `.env`:
- `DATABASE_URL` - PostgreSQL connection
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` - Sentry OTLP endpoint
- `OTEL_EXPORTER_OTLP_TRACES_HEADERS` - Sentry auth header

### Collector Mode
Requires in `.env`:
- `DATABASE_URL` - PostgreSQL connection
- `SENTRY_PRODUCTS_TRACES_ENDPOINT` - Products project endpoint
- `SENTRY_PRODUCTS_LOGS_ENDPOINT` - Products project logs endpoint
- `SENTRY_PRODUCTS_AUTH` - Products project auth
- `SENTRY_ORDERS_TRACES_ENDPOINT` - Orders project endpoint
- `SENTRY_ORDERS_LOGS_ENDPOINT` - Orders project logs endpoint
- `SENTRY_ORDERS_AUTH` - Orders project auth

Routing configured in `collector-config.yaml`.

See `.env.example` for full configuration examples.

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
- `instrument-otel-gateway.js` - Gateway service (collector mode)
- `instrument-otel-products.js` - Products service (collector mode)
- `instrument-otel-orders.js` - Orders service (collector mode)
- `collector-config.yaml` - Collector configuration
- `src/services/` - Manual instrumentation examples

## Collector Commands

```bash
npm run collector:all      # Start all services
npm run collector:start    # Start collector only
npm run collector:stop     # Stop collector
npm run collector:health   # Health check
npm run collector:logs     # View logs
```

## Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Quick setup guide
- **[../docs/MULTI_PROJECT_ROUTING.md](../docs/MULTI_PROJECT_ROUTING.md)** - Multi-project routing explained
- **[../README.md](../README.md)** - Main project documentation

## License

MIT
