# Multi-Project Routing with Sentry Exporter

## The Challenge

Sentry has a **project-based architecture** where each project has its own OTLP endpoint. When using multiple microservices with an OTEL Collector, you may want each service's telemetry to go to a separate Sentry project for:

- **Team Ownership**: Different teams own different projects
- **Separate Retention/Sampling**: Different rules per service
- **Cost Management**: Track costs per service
- **Access Control**: Project-level permissions

## The Solution: Sentry Exporter

The **Sentry Exporter** is a native OpenTelemetry Collector exporter that routes telemetry to Sentry projects based on resource attributes (like `service.name`). It simplifies multi-project routing compared to the routing connector approach.

**Key benefits:**

- Single configuration (no per-project exporters)
- Organization-level authentication (one token for all projects)
- Automatic project creation (optional)
- Native Sentry protocol support

### Architecture

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   API Gateway    │  │ Products Service │  │  Orders Service  │
│ service.name:    │  │ service.name:    │  │ service.name:    │
│   api-gateway    │  │ products-service │  │  orders-service  │
└────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
         │                     │                     │
         │ OTLP                │ OTLP                │ OTLP
         ▼                     ▼                     ▼
    ┌──────────────────────────────────────────────────────┐
    │           OTEL Collector (Sentry Exporter)           │
    │                                                      │
    │   Routes by service.name → Sentry project slug       │
    │   Auto-creates projects if they don't exist          │
    └────────────────────────┬─────────────────────────────┘
                             │ Native Sentry Protocol
                             ▼
    ┌─────────────────────────────────────────────────────┐
    │                      SENTRY                         │
    │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
    │  │ api-gateway │ │  products-  │ │   orders-   │   │
    │  │   project   │ │   service   │ │   service   │   │
    │  └─────────────┘ └─────────────┘ └─────────────┘   │
    └─────────────────────────────────────────────────────┘
```

## Configuration

### 1. Services Set service.name

Each service sets a unique `service.name`:

**Gateway** (`instrument-otel-gateway.js`):

```javascript
const resource = new Resource({
  [SEMRESATTRS_SERVICE_NAME]: "api-gateway",
});
```

**Products Service** (`instrument-otel-products.js`):

```javascript
const resource = new Resource({
  [SEMRESATTRS_SERVICE_NAME]: "products-service",
});
```

**Orders Service** (`instrument-otel-orders.js`):

```javascript
const resource = new Resource({
  [SEMRESATTRS_SERVICE_NAME]: "orders-service",
});
```

### 2. Collector Routes by service.name

**Sentry Exporter Configuration** (`collector-config-sentry.yaml`):

```yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318
      grpc:
        endpoint: 0.0.0.0:4317

exporters:
  sentry:
    url: "https://sentry.io"
    org_slug: "${env:SENTRY_ORG_SLUG}"
    auth_token: "${env:SENTRY_AUTH_TOKEN}"
    auto_create_projects: true
    routing:
      project_from_attribute: "service.name"

processors:
  batch:

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [sentry]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [sentry]
```

### 3. Environment Configuration

Only two environment variables needed:

```bash
SENTRY_ORG_SLUG=your-org-slug
SENTRY_AUTH_TOKEN=sntrys_eyJ...
```

**Getting these values:**

1. **Organization slug**: Settings → General Settings, or from URL `https://sentry.io/organizations/{org-slug}/`
2. **Auth token**: Settings → Developer Settings → Custom Integrations
   - Create an integration with **Project: Read** and **Project: Write** permissions

## Setup Steps

### 1. Create Custom Integration

1. Go to **Settings → Developer Settings → Custom Integrations**
2. Click **Create New Integration** → choose **Internal Integration**
3. Set permissions:
   - **Project: Read** — required for endpoint resolution
   - **Project: Write** — required for `auto_create_projects`
4. Copy the auth token

### 2. Configure Environment

The collector binary (`otelcol-contrib`) is auto-downloaded when you run `npm run demo:sentry`. The Sentry Exporter is included in the standard [otelcol-contrib](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/sentryexporter) distribution.

Edit `api/.env`:

```bash
SENTRY_ORG_SLUG=your-org-slug
SENTRY_AUTH_TOKEN=sntrys_eyJ...
```

### 3. Run

```bash
npm run demo:sentry
```

This starts:

- OTEL Collector with Sentry Exporter
- Gateway service (port 3000)
- Products service (port 3001)
- Orders service (port 3002)

## Verification

> **💡 Tip:** Use the **frontend UI** (http://localhost:5173) to browse products and create orders, which generates traces across all services.

### Check Sentry Projects

1. Send requests:

   ```bash
   curl http://localhost:3000/api/products
   curl -X POST http://localhost:3000/api/orders \
     -H "Content-Type: application/json" \
     -d '{"userId":1,"items":[{"productId":1,"quantity":1}],"paymentMethod":"credit_card"}'
   ```

2. In Sentry, go to **Explore → Traces**

3. You should see separate projects for each service:
   - `api-gateway`
   - `products-service`
   - `orders-service`

Each project contains traces and logs from its respective service, with proper parent-child span relationships across projects.

## Custom Project Mapping

If your service names don't match desired project slugs, use explicit mapping:

```yaml
exporters:
  sentry:
    # ... required fields
    routing:
      attribute_to_project_mapping:
        orders-service: ecommerce-orders
        products-service: ecommerce-products
        api-gateway: ecommerce-gateway
```

Services not in the mapping fall back to using `service.name` as the project slug.
