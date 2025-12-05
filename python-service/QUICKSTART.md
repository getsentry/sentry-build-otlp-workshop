# Python Service - Quick Start Guide 🚀

Get the Python service running in 3 simple steps!

## Step 1: Install Dependencies

The setup script creates a virtual environment and installs dependencies:

```bash
cd python-service
./setup.sh
```

Or from the project root:

```bash
npm run python:install
```

This creates a `venv/` directory with isolated Python dependencies (best practice!).

## Step 2: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your Sentry DSN:

```bash
# Get from: Sentry → Settings → Projects → [Your Project] → Client Keys (DSN)
SENTRY_DSN=https://YOUR_KEY@YOUR_ORG.ingest.us.sentry.io/YOUR_PROJECT_ID

# Use same database as Node.js services
DATABASE_URL=postgresql://...  # Copy from api/.env
```

That's it! Unlike Node.js, you only need the DSN - no OTLP endpoints to configure.

## Step 3: Run the Service

```bash
./run.sh
```

Or from the project root:

```bash
npm run python
```

The run script automatically activates the virtual environment and starts the service.

The service starts on http://localhost:3003

## Test It Out

```bash
# Health check
curl http://localhost:3003/health

# Get inventory
curl http://localhost:3003/api/inventory

# Update stock
curl -X PUT http://localhost:3003/api/inventory/1 \
  -H "Content-Type: application/json" \
  -d '{"stock_quantity": 100}'

# Trigger test error (to see in Sentry)
curl http://localhost:3003/api/error
```

## Verify in Sentry

1. Go to your Sentry project
2. Navigate to **Performance** → View traces from `python-inventory-service`
3. Navigate to **Issues** → View errors from `/api/error` endpoint
4. All traces and errors are automatically linked!

## What Makes Python Special?

The Python OTLP integration is **significantly simpler** than the Node.js setup:

**Node.js requires:**

- OTLP traces endpoint
- OTLP logs endpoint
- Authentication headers
- Manual exporter configuration

**Python requires:**

- Just the DSN!

The `OTLPIntegration` automatically handles everything else.

## Next Steps

- See [README.md](README.md) for full documentation
- Check [src/instrument.py](src/instrument.py) to see how simple the setup is
- Compare with `api/instrument-otel.js` to see the difference
