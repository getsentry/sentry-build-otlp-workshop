# Python Service - Sentry OTLP Integration Demo 🐍

This Python microservice demonstrates how to use Sentry's OTLP integration for Python applications. It showcases the simplicity of Sentry's approach compared to the Node.js services.

## Key Difference: Python's OTLP Integration

Unlike the Node.js services which require manual OTLP configuration, **Python's Sentry SDK handles everything automatically**.

📚 **[Read the full comparison: WHY_PYTHON_IS_SIMPLER.md](WHY_PYTHON_IS_SIMPLER.md)**

### Node.js Approach (Manual Configuration)
```javascript
// Need to manually configure OTLP endpoints
const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
  headers: { 'x-sentry-auth': process.env.OTEL_EXPORTER_OTLP_TRACES_HEADERS }
});
```

### Python Approach (Automatic!)
```python
# Just enable OTLPIntegration - everything is automatic!
import sentry_sdk
from sentry_sdk.integrations.otlp import OTLPIntegration

sentry_sdk.init(
    dsn="https://...@sentry.io/...",  # Just the DSN!
    integrations=[OTLPIntegration()]  # That's it!
)
```

The `OTLPIntegration` automatically:
- Extracts the OTLP endpoint from your DSN
- Sets up the SpanExporter
- Configures context propagation for distributed tracing
- Links traces to Sentry events (errors, logs, etc.)

## What This Service Does

This service provides inventory management endpoints:

- **GET /api/inventory** - Get all products with stock levels
- **PUT /api/inventory/:id** - Update product stock quantity
- **GET /api/inventory/alerts** - Get low stock alerts
- **GET /api/distributed-trace** - Test distributed tracing across services
- **GET /api/error** - Trigger test errors for Sentry
- **GET /health** - Health check with database connectivity test

## Installation

### Prerequisites

- Python 3.7+
- PostgreSQL database (same as Node.js services)
- Sentry account with a project

### Setup

1. **Install Python dependencies (with virtual environment):**

   The setup script automatically creates a virtual environment and installs all dependencies:

   ```bash
   # From project root
   npm run python:install

   # Or directly
   cd python-service
   ./setup.sh
   ```

   **Note**: This uses a Python virtual environment (best practice!) to avoid conflicts with system Python. The `venv/` directory is created automatically and git-ignored.

2. **Configure environment:**
   ```bash
   # From project root
   npm run python:setup

   # Or directly
   cp python-service/.env.example python-service/.env
   ```

3. **Edit `python-service/.env`:**
   ```bash
   # Get your DSN from: Sentry → Settings → Projects → Client Keys (DSN)
   SENTRY_DSN=https://YOUR_KEY@YOUR_ORG.ingest.us.sentry.io/YOUR_PROJECT_ID

   # Use the same database as the Node.js services
   DATABASE_URL=postgresql://...

   # Service configuration
   OTEL_SERVICE_NAME=python-inventory-service
   PORT=3003
   ```

That's it! Unlike the Node.js services, you only need the DSN - no manual OTLP endpoint configuration required.

## Running the Service

### Standalone Mode (Direct to Sentry)

```bash
# From project root
npm run python

# Or directly
cd python-service
./run.sh
```

The run script automatically activates the virtual environment and starts the service.

The service will:
- Start on port 3003 (configurable via PORT env var)
- Automatically send traces and logs to Sentry via OTLP
- Connect to the same PostgreSQL database as other services

### With Collector (Optional)

You can optionally route the Python service through the OTEL Collector for consistency with other services. This requires additional configuration in `api/.env`:

```bash
# In api/.env, add Python collector routing (optional)
SENTRY_PYTHON_LOGS_ENDPOINT=https://...
SENTRY_PYTHON_TRACES_ENDPOINT=https://...
SENTRY_PYTHON_AUTH=sentry sentry_key=...
```

However, **direct-to-Sentry is recommended** for Python as it's simpler and showcases the key advantage of Python's OTLP integration.

## Testing the Service

### Test Endpoints

```bash
# Health check
curl http://localhost:3003/health

# Get all inventory
curl http://localhost:3003/api/inventory

# Get low stock alerts
curl http://localhost:3003/api/inventory/alerts?threshold=10

# Update product stock
curl -X PUT http://localhost:3003/api/inventory/1 \
  -H "Content-Type: application/json" \
  -d '{"stock_quantity": 50}'

# Test distributed tracing (calls other services)
curl http://localhost:3003/api/distributed-trace

# Trigger error (for Sentry testing)
curl http://localhost:3003/api/error?type=division
```

### Verify in Sentry

After making requests, check your Sentry project:

1. **Traces**: Navigate to Performance → Traces
   - You'll see spans for database queries, HTTP calls, etc.
   - Service name will be `python-inventory-service`

2. **Errors**: Navigate to Issues
   - Trigger errors using `/api/error` endpoint
   - Errors will be linked to traces automatically

3. **Distributed Tracing**:
   - Call `/api/distributed-trace` to see trace propagation
   - Traces will connect across Python → Node.js services

## Architecture Integration

### With Direct Mode (Recommended)

```
┌─────────────────────────┐
│  Python Service         │
│  (Port 3003)            │
│  OTLPIntegration        │
└────────┬────────────────┘
         │ OTLP/HTTP
         │ (automatic!)
         ▼
┌─────────────────────────┐
│  Sentry Project         │
│  (Python/Inventory)     │
└─────────────────────────┘
```

### With Collector Mode (Optional)

```
┌─────────────────────────┐
│  Python Service         │
│  (Port 3003)            │
│  service.name:          │
│  python-inventory-svc   │
└────────┬────────────────┘
         │ OTLP
         ▼
┌────────────────────────────────┐
│   OTEL Collector               │
│   (Routing Connector)          │
└────────┬───────────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Sentry Project         │
│  (Python/Inventory)     │
└─────────────────────────┘
```

## Key Files

- `src/instrument.py` - OpenTelemetry & Sentry initialization
- `src/app.py` - Flask application with instrumented endpoints
- `.env.example` - Environment configuration template
- `requirements.txt` - Python dependencies
- `setup.sh` - Setup script (creates venv and installs dependencies)
- `run.sh` - Run script (activates venv and starts service)

## Instrumentation Details

### Automatic Instrumentation

The service uses OpenTelemetry auto-instrumentation for:
- **Flask** - HTTP requests/responses
- **Requests** - Outgoing HTTP calls
- **psycopg2** - Database queries (via OpenTelemetry)

### Manual Instrumentation

For custom business logic, manual spans are created:

```python
from opentelemetry import trace

tracer = trace.get_tracer(__name__)

with tracer.start_as_current_span("my_operation") as span:
    span.set_attribute("custom.attribute", value)
    # Your code here
    span.set_status(Status(StatusCode.OK))
```

## Troubleshooting

### "SENTRY_DSN not set"

Make sure you've:
1. Copied `.env.example` to `.env`
2. Added your Sentry DSN to `.env`
3. Restarted the service

### Database Connection Issues

The Python service uses the same PostgreSQL database as the Node.js services. Make sure:
1. Database is initialized: `npm run db:init`
2. Schema is set up: `npm run db:setup`
3. `DATABASE_URL` in `.env` matches the Node.js services

### No Traces in Sentry

Check:
1. DSN is correct in `.env`
2. Service is running (check logs for "✓ Sentry OTLP Integration initialized")
3. You're looking at the correct Sentry project
4. Traces sample rate is set (default: 100% in development)

### "externally-managed-environment" Error

If you see this error when trying to install packages, it's because modern Python installations protect the system Python. The solution is to use a virtual environment (which our setup script does automatically):

```bash
# Use the setup script (recommended)
./setup.sh

# Or manually create a virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Import Errors

Make sure dependencies are installed in the virtual environment:
```bash
# Use setup script
./setup.sh

# Or activate venv manually and install
source venv/bin/activate
pip install -r requirements.txt
```

## Comparison with Node.js Services

| Feature | Python (OTLPIntegration) | Node.js (Manual OTLP) |
|---------|-------------------------|----------------------|
| Configuration | Just DSN | DSN + OTLP endpoints + auth headers |
| Setup Complexity | Simple | Moderate |
| OTLP Exporter | Automatic | Manual |
| Propagator | Automatic | Manual |
| Trace Linking | Automatic | Manual |
| Recommended Mode | Direct to Sentry | Collector or Direct |

## Resources

- [Sentry Python OTLP Integration Docs](https://docs.sentry.io/platforms/python/integrations/otlp/)
- [OpenTelemetry Python Docs](https://opentelemetry.io/docs/languages/python/)
- [Flask Instrumentation](https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/flask/flask.html)

## Next Steps

1. Customize the service for your use case
2. Add more OpenTelemetry instrumentation
3. Integrate with other microservices
4. Set up alerting in Sentry for low stock
5. Add custom attributes and metrics
