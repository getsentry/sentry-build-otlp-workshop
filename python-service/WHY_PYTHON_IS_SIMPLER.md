# Why Python's OTLP Integration is Simpler

This document explains the key difference between Python and Node.js when using Sentry's OTLP integration.

## The Problem: Manual OTLP Configuration

When using OpenTelemetry with Sentry, you typically need to configure:
1. OTLP trace endpoint URL
2. OTLP logs endpoint URL
3. Authentication headers
4. Exporters
5. Context propagation
6. Trace/event linking

This is a lot of manual configuration!

## Node.js Approach (Manual)

In the Node.js services (`api/instrument-otel.js`), you need to manually configure everything:

```javascript
// api/.env - Multiple environment variables required
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=https://o123.ingest.us.sentry.io/api/456/integration/otlp/v1/traces
OTEL_EXPORTER_OTLP_TRACES_HEADERS=x-sentry-auth=sentry sentry_key=abc123...
OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=https://o123.ingest.us.sentry.io/api/456/integration/otlp/v1/logs
OTEL_EXPORTER_OTLP_LOGS_HEADERS=x-sentry-auth=sentry sentry_key=abc123...
```

```javascript
// Instrumentation code
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-http');

// Manual exporter configuration
const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
  headers: {
    'x-sentry-auth': process.env.OTEL_EXPORTER_OTLP_TRACES_HEADERS,
  },
});

const logExporter = new OTLPLogExporter({
  url: process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT,
  headers: {
    'x-sentry-auth': process.env.OTEL_EXPORTER_OTLP_LOGS_HEADERS,
  },
});

// Manual span processor setup
const spanProcessor = new BatchSpanProcessor(traceExporter);
sdk.addSpanProcessor(spanProcessor);

// And more configuration for logs, propagation, etc...
```

**Total configuration**: ~4 environment variables + ~50 lines of code

## Python Approach (Automatic!)

Python's `OTLPIntegration` handles ALL of this automatically:

```python
# python-service/.env - Just ONE variable!
SENTRY_DSN=https://abc123@o123.ingest.us.sentry.io/456
```

```python
# Instrumentation code - Just 6 lines!
import sentry_sdk
from sentry_sdk.integrations.otlp import OTLPIntegration

sentry_sdk.init(
    dsn=os.getenv('SENTRY_DSN'),
    integrations=[OTLPIntegration()],  # That's it!
)
```

**Total configuration**: 1 environment variable + 6 lines of code

## What the OTLPIntegration Does Automatically

When you enable `OTLPIntegration()`, it automatically:

1. **Extracts OTLP endpoints from DSN**
   - Parses your DSN to get organization and project IDs
   - Constructs the OTLP trace endpoint: `https://[org].ingest.us.sentry.io/api/[project]/integration/otlp/v1/traces`
   - Constructs the OTLP logs endpoint: `https://[org].ingest.us.sentry.io/api/[project]/integration/otlp/v1/logs`

2. **Configures authentication**
   - Extracts the auth key from DSN
   - Sets up proper headers automatically

3. **Sets up exporters**
   - Creates and configures `OTLPSpanExporter`
   - Creates and configures `OTLPLogExporter`

4. **Configures propagation**
   - Sets up trace context propagation for distributed tracing
   - Ensures traces connect across services

5. **Links traces to events**
   - Automatically links OpenTelemetry traces to Sentry errors
   - Connects logs to traces
   - Associates all telemetry data

## Side-by-Side Comparison

| Task | Node.js | Python |
|------|---------|--------|
| Environment Variables | 4+ variables | 1 variable (DSN) |
| Endpoint Configuration | Manual | Automatic |
| Header Configuration | Manual | Automatic |
| Exporter Setup | Manual (~30 LOC) | Automatic |
| Propagator Setup | Manual (~10 LOC) | Automatic |
| Trace/Event Linking | Manual (~10 LOC) | Automatic |
| **Total Setup** | **~50 LOC** | **~6 LOC** |

## Why This Matters for Your Workshop

This demonstration is powerful because it shows:

1. **Evolution of Sentry's OTLP Support**: Python's integration represents Sentry's vision for how simple OTLP integration should be.

2. **Language-Specific Best Practices**: Shows how SDKs can be optimized for each language ecosystem.

3. **Developer Experience**: Highlights how reducing configuration complexity makes adoption easier.

4. **Future Direction**: Other language SDKs may adopt similar simplified approaches.

## When to Use Each Approach

**Python Direct (OTLPIntegration)**:
- ✅ Simplest setup
- ✅ Production-ready
- ✅ Recommended for most Python services
- ✅ Best for demonstrating ease of use

**Node.js + Collector**:
- ✅ More control over telemetry routing
- ✅ Central configuration point
- ✅ Better for complex microservices architectures
- ✅ Can route multiple services to different projects

## The Demo Value

This demo effectively shows:
1. **Baseline (Node.js)**: Standard OTLP setup with manual configuration
2. **Advanced (Collector)**: Multi-project routing with centralized config
3. **Future (Python)**: Simplified approach that "just works"

This progression demonstrates Sentry's commitment to improving the developer experience while maintaining flexibility for complex use cases.
