# Quick Start

Get running in 5 minutes.

## Prerequisites

- Node.js 18+
- Free Neon account (https://neon.tech)
- Sentry project with OTLP enabled

## Setup

### 1. Install

```bash
npm install
```

### 2. Configure Environment

**Option A: Auto-setup with neondb (Recommended)**

```bash
# Create .env from example
cp .env.example .env

# Auto-create Neon database and add DATABASE_URL to .env
npx neondb -y
```

The `neondb` command will open your browser to login/create a Neon account, create a PostgreSQL database, and automatically add the `DATABASE_URL` to your `.env` file.

**Option B: Manual setup**

```bash
# Create .env from example
cp .env.example .env

# Get DATABASE_URL from Neon Console: https://console.neon.tech
# Projects > Your Project > Connection Details
# Add it to .env manually
```

### 3. Add Sentry Configuration

Edit `.env` and add your Sentry OTLP endpoints (get from Sentry: Project Settings > Client Keys):

```bash
# Update these values in .env
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=https://YOUR-ORG.ingest.sentry.io/api/PROJECT-ID/integration/otlp/v1/traces
OTEL_EXPORTER_OTLP_TRACES_HEADERS=x-sentry-auth=sentry sentry_key=YOUR_PUBLIC_KEY

# Optional: For logs
OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=https://YOUR-ORG.ingest.sentry.io/api/PROJECT-ID/integration/otlp/v1/logs
OTEL_EXPORTER_OTLP_LOGS_HEADERS=x-sentry-auth=sentry sentry_key=YOUR_PUBLIC_KEY
```

### 4. Initialize Database

```bash
npm run db:setup
```

Creates tables and seeds sample data.

### 5. Start

```bash
npm start
```

You should see `📡 Mode: DIRECT` and `📡 Server listening on port 3000`.

### 6. Test

```bash
# Quick test
curl http://localhost:3000/api/products

# Or run load test (generates ~40 traces)
npm test
```

### 7. View in Sentry

Go to your Sentry project → **Explore** → **Traces**

## Switching Modes

### Check Current Mode

```bash
npm run mode:status
```

### Direct Mode (Default)

App sends directly to Sentry.

```bash
npm run mode:direct
npm start
```

### Collector Mode

App sends to local OpenTelemetry Collector, which forwards to Sentry.

```bash
# Add to .env if not present:
OTEL_EXPORTER_OTLP_ENDPOINT=https://YOUR-ORG.ingest.sentry.io
SENTRY_AUTH_HEADER=sentry_key=YOUR_PUBLIC_KEY,sentry_version=7

# Switch mode
npm run mode:collector

# Start collector (auto-downloads binary ~100MB on first run)
npm run collector:start

# Start app
npm start
```

**Collector commands:**

```bash
npm run collector:start   # Start
npm run collector:stop    # Stop
npm run collector:health  # Health check
npm run collector:logs    # View logs
```

## Troubleshooting

**Database connection error**

- Check `DATABASE_URL` includes `?sslmode=require`
- Verify Neon project is active at https://console.neon.tech

**No traces in Sentry**

- Verify OTLP endpoint URL is correct
- Check Sentry public key in headers
- Enable debug logging (see README.md)

**Port already in use**

- Change `PORT=3001` in .env

## Next Steps

See [README.md](README.md) for:

- API endpoints
- Manual instrumentation examples
- Error scenarios
- Development tips
