# OTEL E-Commerce App - Architecture Modes

```
================================================================================
                    OTEL E-COMMERCE APP - ARCHITECTURE MODES
================================================================================


MODE 1: DIRECT (Single Service → Sentry)
────────────────────────────────────────
Command: npm run start

  ┌─────────────────────────────────────────────────────────────────────────┐
  │                         SINGLE PROCESS                                  │
  │  ┌───────────────────────────────────────────────────────────────────┐  │
  │  │                    server.js (port 3000)                          │  │
  │  │                                                                   │  │
  │  │   /api/products ──► Products Routes ──► Database                  │  │
  │  │   /api/orders   ──► Orders Routes   ──► Database                  │  │
  │  │                                                                   │  │
  │  └───────────────────────────────────────────────────────────────────┘  │
  │                              │                                          │
  │                    ┌─────────┴─────────┐                                │
  │                    │  OTEL SDK         │                                │
  │                    │  (instrument-otel.js)                              │
  │                    └─────────┬─────────┘                                │
  └──────────────────────────────┼──────────────────────────────────────────┘
                                 │
                                 │ OTLP/HTTP (traces + logs)
                                 │ Auth: Per-project DSN in headers
                                 │ (OTEL_EXPORTER_OTLP_*_HEADERS)
                                 ▼
                    ┌─────────────────────────┐
                    │      Sentry OTLP        │
                    │   (single project)      │
                    └─────────────────────────┘

  Config:
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=https://<org>.sentry.io/api/<project>/otlp/v1/traces
    OTEL_EXPORTER_OTLP_TRACES_HEADERS=sentry-auth=<DSN>



MODE 2: SENTRY EXPORTER (Microservices → Collector → Sentry)
────────────────────────────────────────────────────────────
Command: npm run sentry:all

  ┌─────────────────────────────────────────────────────────────────────────┐
  │                       SEPARATE PROCESSES                                │
  │                                                                         │
  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
  │  │   API Gateway   │  │    Products     │  │     Orders      │         │
  │  │   (port 3000)   │  │   (port 3001)   │  │   (port 3002)   │         │
  │  │                 │  │                 │  │                 │         │
  │  │ service.name:   │  │ service.name:   │  │ service.name:   │         │
  │  │ "api-gateway"   │  │ "products-      │  │ "orders-        │         │
  │  │                 │  │  service"       │  │  service"       │         │
  │  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘         │
  │           │                    │                    │                  │
  │           │   OTEL SDK         │   OTEL SDK         │   OTEL SDK       │
  │           │   (instrument-     │   (instrument-     │   (instrument-   │
  │           │    otel-gateway)   │    otel-products)  │    otel-orders)  │
  │           │                    │                    │                  │
  └───────────┼────────────────────┼────────────────────┼──────────────────┘
              │                    │                    │
              │                    │                    │
              └────────────────────┼────────────────────┘
                                   │
                                   │ OTLP/HTTP to localhost:4318
                                   │ (no auth needed)
                                   ▼
              ┌────────────────────────────────────────────┐
              │           OTEL COLLECTOR                   │
              │           (localhost:4318)                 │
              │                                            │
              │  receivers:  otlp (http + grpc)            │
              │  processors: batch                         │
              │  exporters:  sentry (native)               │
              │                                            │
              │  Routing: service.name → project slug      │
              │  Auth: Org-level token (single token)      │
              └────────────────────┬───────────────────────┘
                                   │
                                   │ Native Sentry Protocol
                                   │ (auto-routes by service.name)
                                   ▼
         ┌─────────────────────────────────────────────────────────┐
         │                     SENTRY                              │
         │                                                         │
         │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
         │  │ api-gateway │  │  products-  │  │   orders-   │     │
         │  │   project   │  │   service   │  │   service   │     │
         │  │             │  │   project   │  │   project   │     │
         │  └─────────────┘  └─────────────┘  └─────────────┘     │
         │                                                         │
         │  (auto-created if auto_create_projects: true)          │
         └─────────────────────────────────────────────────────────┘

  Config (collector-config-sentry.yaml):
    exporters:
      sentry:
        org_slug: ${SENTRY_ORG_SLUG}
        auth_token: ${SENTRY_AUTH_TOKEN}
        auto_create_projects: true
        routing:
          project_from_attribute: "service.name"



KEY DIFFERENCES
───────────────
┌──────────────────────┬─────────────────────────┬─────────────────────────────┐
│                      │  DIRECT MODE            │  SENTRY EXPORTER MODE       │
├──────────────────────┼─────────────────────────┼─────────────────────────────┤
│ Architecture         │  Monolith               │  Microservices              │
│ Processes            │  1                      │  3 services + 1 collector   │
│ Sentry Projects      │  1                      │  N (one per service)        │
│ Authentication       │  Per-project DSN        │  Org-level token            │
│ Routing              │  N/A (single project)   │  By service.name attribute  │
│ Collector Required   │  No                     │  Yes                        │
│ Trace Propagation    │  N/A (single service)   │  traceparent/tracestate     │
│ Protocol to Sentry   │  OTLP/HTTP              │  Native Sentry exporter     │
└──────────────────────┴─────────────────────────┴─────────────────────────────┘


REQUEST FLOW (Sentry Exporter Mode)
───────────────────────────────────

  Browser                Gateway              Products           Collector        Sentry
     │                      │                    │                   │              │
     │  GET /api/products   │                    │                   │              │
     │─────────────────────>│                    │                   │              │
     │                      │                    │                   │              │
     │                      │ GET /api/products  │                   │              │
     │                      │ + traceparent      │                   │              │
     │                      │ + tracestate       │                   │              │
     │                      │───────────────────>│                   │              │
     │                      │                    │                   │              │
     │                      │                    │──── trace span ──>│              │
     │                      │                    │     (products-    │              │
     │                      │                    │      service)     │              │
     │                      │                    │                   │              │
     │                      │<───────────────────│                   │              │
     │                      │                    │                   │              │
     │                      │─────── trace span ────────────────────>│              │
     │                      │        (api-gateway)                   │              │
     │                      │                    │                   │              │
     │<─────────────────────│                    │                   │──── batch ──>│
     │     response         │                    │                   │   (routes    │
     │                      │                    │                   │    by svc)   │
     │                      │                    │                   │              │

  Result: Single distributed trace visible across all Sentry projects
          with proper parent-child span relationships
```
