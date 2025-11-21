# Testing Distributed Tracing: Sentry Frontend + OTEL Backend

This guide explains how to verify that distributed tracing is working between your Sentry-instrumented React frontend and OpenTelemetry-instrumented backend.

## Prerequisites

- Frontend running with Sentry SDK + `propagateTraceparent: true`
- Backend running with OpenTelemetry instrumentation
- Both services connected and able to communicate

## Test 1: Verify Trace Headers in Browser (Quickest Test)

### Steps:
1. Start your backend API server:
   ```bash
   cd api
   npm start
   # Or use 'npm run dev' for auto-reload during development
   ```

2. Start your frontend app:
   ```bash
   cd frontend
   npm run dev
   ```

3. Open your frontend in a browser (usually `http://localhost:5173`)

4. Open Browser DevTools (F12 or right-click → Inspect)

5. Go to the **Network** tab

6. Trigger an API call by:
   - Loading the products page
   - Searching for products
   - Creating an order
   - Any action that calls your backend API

7. Click on the API request in the Network tab (e.g., `products` or `orders`)

8. Look at the **Request Headers** section

### Expected Results:

You should see these three headers:

```
sentry-trace: 86f9764521e4416ab762e6c83f7f0e0e-bf5f7b3d84ed4f2f-1
baggage: sentry-environment=production,sentry-release=...
traceparent: 00-86f9764521e4416ab762e6c83f7f0e0e-bf5f7b3d84ed4f2f-01
```

**Key Points:**
- `sentry-trace`: Sentry's proprietary trace header
- `baggage`: W3C baggage header with Sentry metadata
- `traceparent`: W3C standard trace context header (this connects to OTEL!)

**If headers are missing:**
- Check that `tracePropagationTargets` includes your API URL
- Verify `propagateTraceparent: true` is set in Sentry.init()
- Check that the request URL matches your configured targets

---

## Test 2: Verify Backend Receives Trace Context

### Steps:

1. Add temporary logging to your backend to see incoming headers

2. In your API (e.g., `api/src/app.js`), add this middleware temporarily:
   ```javascript
   app.use((req, res, next) => {
     console.log('=== TRACE HEADERS ===');
     console.log('sentry-trace:', req.headers['sentry-trace']);
     console.log('baggage:', req.headers['baggage']);
     console.log('traceparent:', req.headers['traceparent']);
     console.log('====================');
     next();
   });
   ```

3. Restart your backend server:
   ```bash
   cd api
   npm start
   ```

4. Make an API request from your frontend

5. Check the backend console logs

### Expected Results:

You should see the trace headers logged:
```
=== TRACE HEADERS ===
sentry-trace: 86f9764521e4416ab762e6c83f7f0e0e-bf5f7b3d84ed4f2f-1
baggage: sentry-environment=production,sentry-release=1.0.0...
traceparent: 00-86f9764521e4416ab762e6c83f7f0e0e-bf5f7b3d84ed4f2f-01
====================
```

**If headers are NOT received:**
- Check CORS configuration (headers might be blocked)
- Verify frontend is actually sending the headers (Test 1)
- Check for proxy/middleware that strips headers

---

## Test 3: Check OTEL Continues the Trace

### Steps:

1. Your OTEL instrumentation should automatically pick up the `traceparent` header

2. Check your OTEL console output for trace IDs

3. The trace ID from the frontend should match the trace ID in the backend spans

### How to Verify:

**Frontend trace ID** (from browser Network tab):
```
traceparent: 00-86f9764521e4416ab762e6c83f7f0e0e-bf5f7b3d84ed4f2f-01
                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                  This is the trace ID
```

**Backend spans** should have the same trace ID when exported to Sentry

---

## Test 4: Verify Full Trace in Sentry

### Steps:

1. Go to your Sentry project: https://sentry.io

2. Navigate to **Performance** section

3. Generate some activity:
   - Load products page
   - Search for items
   - Create an order

4. Look for transactions in the Performance view

5. Click on a transaction to see the trace details

### Expected Results:

You should see a **full distributed trace** that includes:

**Frontend spans:**
- Page load
- Navigation events
- HTTP request to backend API

**Backend spans (from OTEL):**
- HTTP server span (Express)
- Database queries (if any)
- Redis operations
- External API calls

All connected in a single trace view with parent-child relationships.

### Trace Structure Example:
```
Frontend: pageload
  └─ Frontend: fetch GET /api/products
      └─ Backend: GET /api/products (from OTEL)
          ├─ Backend: Redis GET products:all
          ├─ Backend: Database Query
          └─ Backend: HTTP Response
```

**If traces are disconnected:**
- Frontend and backend appear as separate traces
- Check that `propagateTraceparent` is enabled
- Verify backend OTEL is configured to accept incoming trace context
- Check that trace IDs match between frontend and backend

---

## Test 5: Advanced - Check Trace Context Propagation Details

### Using curl to simulate requests:

1. Get a trace ID from Sentry or generate one:
   ```
   Trace ID: 86f9764521e4416ab762e6c83f7f0e0e
   Span ID: bf5f7b3d84ed4f2f
   ```

2. Test your backend directly:
   ```bash
   curl -X GET http://localhost:3000/api/products \
     -H "traceparent: 00-86f9764521e4416ab762e6c83f7f0e0e-bf5f7b3d84ed4f2f-01" \
     -v
   ```

3. Check if your backend OTEL creates child spans with the same trace ID

---

## Troubleshooting

### Headers Not Sent from Frontend

**Check:**
- `tracePropagationTargets` configuration
- Browser console for Sentry errors
- Network tab shows the request going to the correct URL

**Fix:**
```javascript
Sentry.init({
  tracePropagationTargets: [
    "localhost",
    /^http:\/\/localhost:3000/,
  ],
  propagateTraceparent: true,
});
```

### Headers Not Received by Backend

**Check:**
- CORS configuration allows custom headers
- No middleware stripping headers

**Fix (in api/src/app.js):**
```javascript
import cors from 'cors';

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  exposedHeaders: ['sentry-trace', 'baggage', 'traceparent'],
  allowedHeaders: ['sentry-trace', 'baggage', 'traceparent', 'Content-Type'],
}));
```

### Traces Not Connected in Sentry

**Check:**
- Backend is sending OTEL data to the correct Sentry project
- Trace IDs match between frontend and backend
- OTEL exporter is configured with correct Sentry endpoint

**Verify OTEL endpoint** (in api/.env):
```
OTEL_EXPORTER_OTLP_ENDPOINT=https://o{org-id}.ingest.us.sentry.io/api/{project-id}/integration/otlp
```

---

## Quick Checklist

- [ ] Frontend has `propagateTraceparent: true`
- [ ] Frontend has correct `tracePropagationTargets`
- [ ] Headers visible in browser Network tab
- [ ] Backend receives headers (check with logging)
- [ ] Backend OTEL configured to continue traces
- [ ] CORS allows trace headers
- [ ] Full trace visible in Sentry Performance view
- [ ] Frontend and backend spans connected in one trace

---

## Success Criteria

✅ **Test passes when:**
1. Browser Network tab shows `traceparent` header in API requests
2. Backend logs show received trace headers
3. Sentry Performance view shows single trace with both frontend and backend spans
4. Spans are properly nested (frontend request → backend handler → DB/cache operations)

❌ **Test fails when:**
1. No `traceparent` header in browser requests
2. Backend doesn't receive trace headers
3. Frontend and backend appear as separate traces in Sentry
4. Trace IDs don't match between frontend and backend
