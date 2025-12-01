# OpenTelemetry E-commerce API

Express API demonstrating OpenTelemetry integration with Sentry. See [QUICKSTART.md](QUICKSTART.md) for setup.

## Two Modes

**Direct Mode:** `npm start` - Single monolithic service → Sentry
**Collector Mode:** `npm run collector:all` - Microservices with OTEL Collector routing to separate Sentry projects

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

```bash
# Products
curl http://localhost:3000/api/products

# Create order
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "items": [{"productId": 1, "quantity": 1}], "paymentMethod": "credit_card"}'

# Load test
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

**Trace structure example:**

```
POST /api/orders
  ├─ order.create (custom)
  │   ├─ SELECT users (auto)
  │   ├─ SELECT products (auto)
  │   ├─ inventory.check (custom)
  │   ├─ BEGIN/INSERT/COMMIT (auto)
  │   ├─ inventory.reserve (custom)
  │   └─ payment.process (custom)
```

**Error scenarios:** 404, 400, 409, 422, 500

## Configuration

See `.env.example` for configuration. Required variables:

**Direct Mode:**

- `DATABASE_URL`
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`
- `OTEL_EXPORTER_OTLP_TRACES_HEADERS`

**Collector Mode:**

- `DATABASE_URL`
- `SENTRY_PRODUCTS_*` variables (traces endpoint, logs endpoint, auth)
- `SENTRY_ORDERS_*` variables (traces endpoint, logs endpoint, auth)

Routing logic is in `collector-config.yaml`.

## Key Scripts

```bash
npm start              # Direct mode
npm run collector:all  # Collector mode (all services)
npm run collector:stop # Stop collector
npm run collector:logs # View collector logs
npm test               # Load test
```
