# OpenTelemetry E-commerce API

Express API demonstrating OpenTelemetry instrumentation sending traces to Sentry.

**See [QUICKSTART.md](QUICKSTART.md) for setup instructions.**

## Architecture

```
┌─────────────────┐
│   Express API   │
└────────┬────────┘
         │
    ┌────┴────┐
    │  OTEL   │ (Auto + Manual Instrumentation)
    │   SDK   │
    └────┬────┘
         │
    ┌────┴────┐
    │  OTLP   │ (HTTP Exporter)
    │ Exporter│
    └────┬────┘
         │
    ┌────┴────┐
    │ Sentry  │
    │ Platform│
    └─────────┘
```

Two export modes:
- **Direct**: App → Sentry (default)
- **Collector**: App → Collector → Sentry

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

Key environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection | (required) |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` | Sentry OTLP endpoint | (required) |
| `OTEL_EXPORTER_OTLP_TRACES_HEADERS` | Sentry auth header | (required) |
| `OTEL_MODE` | `direct` or `collector` | `direct` |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` |

## Development

**Enable debug logging:**
Uncomment in `instrument-otel.js`:
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

**Code locations:**
- Auto-instrumentation: `instrument-otel.js`
- Manual instrumentation: `src/services/`
- Cache: `src/utils/cache.js`

## Switching Modes

```bash
# Check current mode
npm run mode:status

# Direct Mode (App → Sentry)
npm run mode:direct && npm start

# Collector Mode (App → Collector → Sentry)
npm run mode:collector && npm run collector:start && npm start

# Collector commands
npm run collector:stop     # Stop collector
npm run collector:health   # Health check
npm run collector:logs     # View logs
```

See [QUICKSTART.md](QUICKSTART.md) for setup details.

## License

MIT
