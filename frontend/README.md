# OTEL E-commerce Frontend

React e-commerce app with Sentry SDK for distributed tracing and error tracking.

## Setup

```bash
npm install
cp .env.example .env  # Add VITE_SENTRY_DSN and VITE_API_URL
npm run dev           # Open http://localhost:5173
```

## Features

- **Distributed Tracing:** Frontend traces connect to backend via `traceparent` header
- **Error Tracking:** Errors reported with `Sentry.captureException()`
- **Session Replay:** Debug user interactions

View traces in Sentry: **Explore** → **Traces**
