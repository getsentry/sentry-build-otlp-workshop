# Distributed Tracing Demo Plan
## Sentry React Frontend → OpenTelemetry Backend

---

## 🎯 Demo Goals

1. **Show OTEL ingestion** - Backend traces sent to Sentry via OTLP (✅ already working)
2. **Show distributed tracing** - Connected traces from Sentry-instrumented React → OTEL-instrumented API in unified Sentry trace view
3. *Quick reference*: Point to existing Sentry project showing SDK traces (no time needed to demo in detail)

---

## 🔍 Technical Overview

### How Distributed Tracing Works (Sentry SDK → OTEL Backend)

**Frontend (Sentry SDK)** sends these headers on API calls:
- `sentry-trace`: Sentry's proprietary trace context (trace ID, span ID, sampling decision)
- `baggage`: W3C baggage for metadata propagation
- `traceparent`: W3C standard trace context (when `propagateTraceparent: true`)

**Backend (OpenTelemetry)** automatically:
- Extracts `traceparent` header via auto-instrumentation
- Creates child spans linked to the parent trace ID
- Continues the distributed trace seamlessly

**Result in Sentry:**
- Single unified trace view showing: Browser → API → Database → Redis
- Full waterfall across frontend and backend operations
- Error correlation across services

---

## 📋 Recommendation: **Separate Repository**

### ✅ Why Separate?

1. **Demo Flow Clarity**
   - Present backend OTEL integration first (already done)
   - Present frontend Sentry SDK separately (clear and focused)
   - Then combine both to show distributed tracing

2. **Realistic Architecture**
   - Frontend and backend are typically separate repos in production
   - Demonstrates real-world deployment patterns
   - Each can be deployed/scaled independently

3. **Clear Boundaries**
   - Keeps concerns separated (no mixing build tools/configs)
   - Easier to explain "this is Sentry SDK, this is OTEL"
   - Simpler for audience to understand the integration points

4. **Reusability**
   - Can demo backend standalone with Postman/curl
   - Can demo frontend standalone pointing at any backend
   - Flexible for different demo scenarios

### ⚠️ If Combined (Not Recommended)

Would require:
- Monorepo structure with `frontend/` and `backend/` folders
- Complicates the simple Node.js backend demo
- Mixing npm scripts and build tools
- Less clear where Sentry SDK ends and OTEL begins

---

## 🏗️ Implementation Plan

### Phase 1: Create React E-commerce Frontend (Separate Repo)

**Repository Structure:**
```
otel-ecommerce-frontend/
├── src/
│   ├── sentry.js              # Sentry initialization
│   ├── App.jsx                # Main app component
│   ├── pages/
│   │   ├── ProductList.jsx    # Browse products
│   │   ├── ProductDetail.jsx  # View single product
│   │   └── Checkout.jsx       # Create order
│   ├── components/
│   │   ├── ProductCard.jsx
│   │   ├── ShoppingCart.jsx
│   │   └── ErrorBoundary.jsx
│   └── api/
│       └── client.js          # API calls to backend
├── .env.example
├── vite.config.js
└── package.json
```

**Key Technologies:**
- **React 18** with Vite (fast, modern)
- **React Router** for client-side routing
- **@sentry/react** SDK with BrowserTracing
- Simple CSS (no complex UI library to distract from the tracing demo)

**Sentry Configuration:**
```javascript
// src/sentry.js
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_FRONTEND_DSN",
  integrations: [
    Sentry.browserTracingIntegration({
      tracePropagationTargets: [
        "localhost:3000",
        /^http:\/\/localhost:3000\/api/,
      ],
    }),
    Sentry.replayIntegration(),
  ],

  // Key settings for distributed tracing
  tracesSampleRate: 1.0,
  propagateTraceparent: true,  // ⭐ Critical for OTEL integration

  // Session replay for error debugging
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

**API Client:**
```javascript
// src/api/client.js
const API_BASE = 'http://localhost:3000/api';

export async function getProducts() {
  // Sentry automatically adds headers here
  const response = await fetch(`${API_BASE}/products`);
  return response.json();
}

export async function createOrder(orderData) {
  const response = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  });
  return response.json();
}
```

### Phase 2: Backend CORS & Headers (Minimal Changes)

**Required Backend Changes:**

1. **Enable CORS for Frontend** (add to `src/app.js`)
```javascript
import cors from 'cors';

app.use(cors({
  origin: 'http://localhost:5173', // Vite default port
  credentials: true,
}));
```

2. **Verify Auto-Instrumentation** (already configured ✅)
```javascript
// instrumentation.js already has this:
'@opentelemetry/instrumentation-http': {
  enabled: true,
  ignoreIncomingPaths: ['/health'],
}
```
This automatically extracts `traceparent` from incoming requests!

3. **Optional: Log Incoming Headers** (for demo purposes)
```javascript
// Add middleware to see propagation in action
app.use((req, res, next) => {
  if (req.headers.traceparent) {
    console.log('📥 Received traceparent:', req.headers.traceparent);
  }
  next();
});
```

### Phase 3: Demo Scenarios

#### Scenario 1: Backend OTEL Traces (Isolated)
**What to show:**
- Start backend with `npm start`
- Run load test: `npm test`
- Show traces in Sentry (Express → PostgreSQL → Redis)
- Explain: "This is pure OpenTelemetry sending data via OTLP"
- Show both direct mode and collector mode

#### Scenario 2: Distributed Tracing (The Main Event)
**What to show:**
1. *Quick reference*: "Here's what Sentry SDK traces look like" (tab over to existing project, 30 seconds)
2. Start both frontend and backend
3. Browse products in browser (triggers: React → API → DB → Cache)
4. Create an order (triggers: React → API → Payment → Inventory)
5. Show **single unified trace** in Sentry:
   ```
   browser.pageload (Sentry SDK)
   └─ fetch /api/products (Sentry SDK)
      └─ GET /api/products (OTEL)
         ├─ cache.get (OTEL)
         │  └─ Redis GET (OTEL)
         └─ SELECT products (OTEL)
            └─ PostgreSQL query (OTEL)
   ```
6. Explain the magic:
   - Frontend sent `traceparent` header (show in browser Network tab)
   - Backend extracted it automatically (no code changes needed!)
   - Sentry stitched them together in one view

#### Scenario 3: Error Propagation
**What to show:**
1. Trigger payment failure in checkout
2. Show how error appears in:
   - Frontend trace (fetch fails with 422)
   - Backend trace (payment.process span marked as error)
   - Connected in single trace view
3. Session Replay showing user's actual clicks leading to error
4. Highlight: "This is why distributed tracing matters - see the full story"

---

## 🎬 Demo Script

### Part 1: "OpenTelemetry to Sentry" (5 min)
- Show backend architecture diagram
- Run load test, generate traces
- Navigate through Sentry trace view
- Highlight automatic instrumentation (HTTP, DB, Redis)
- Show both direct and collector modes
- *Quick aside*: "Here's what Sentry SDK traces look like" (30 sec - tab to existing project)

### Part 2: "Distributed Tracing Magic" (10 min)
- Show the setup: React frontend + OTEL backend
- Explain: "Frontend uses Sentry SDK, Backend uses OpenTelemetry - watch them connect"
- Create order flow end-to-end in browser
- **THE BIG REVEAL**: Show single trace spanning browser → server → database
- Open browser DevTools Network tab, show `traceparent` header being sent
- Explain: "This W3C standard header is the bridge between Sentry SDK and OTEL"
- Trigger payment failure error
- Show unified trace with error + session replay
- Emphasize: "One trace ID, two instrumentation approaches, unified observability"

---

## 🔧 Technical Configuration Matrix

| Component | Instrumentation | Sends To | Trace Format | Headers Sent |
|-----------|----------------|----------|--------------|--------------|
| React Frontend | Sentry SDK | Sentry (DSN) | Sentry + W3C | `sentry-trace`, `baggage`, `traceparent` |
| Express Backend | OpenTelemetry | Sentry (OTLP) | W3C | Receives `traceparent` |
| OTEL Collector | N/A | Sentry (OTLP) | W3C | Forwards with `x-sentry-auth` |

---

## 📦 Required Sentry Setup

### Two Separate Projects (Recommended)

**Option A: Separate Sentry Projects**
- Project 1: "otel-ecommerce-backend" (receives OTLP)
- Project 2: "otel-ecommerce-frontend" (receives Sentry SDK data)
- **Issue:** Traces won't connect across projects ❌

**Option B: Single Sentry Project** ✅ (RECOMMENDED)
- One project: "otel-ecommerce"
- Backend sends OTLP traces to project
- Frontend sends SDK traces to same project
- Sentry automatically connects traces with matching trace IDs ✅

**Configuration:**
```bash
# Backend .env
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=https://ORG.ingest.sentry.io/api/PROJECT_ID/integration/otlp/v1/traces
OTEL_EXPORTER_OTLP_TRACES_HEADERS=x-sentry-auth=sentry sentry_key=PUBLIC_KEY

# Frontend .env
VITE_SENTRY_DSN=https://PUBLIC_KEY@ORG.ingest.sentry.io/PROJECT_ID
```

---

## ✅ Next Steps

### Immediate
1. ✅ Fix backend collector mode (DONE)
2. Create new repo: `otel-ecommerce-frontend`
3. Scaffold React app with Vite
4. Install `@sentry/react`

### Frontend Implementation
1. Setup Sentry with `browserTracingIntegration` + `propagateTraceparent: true`
2. Create product list page (fetches from `/api/products`)
3. Create product detail page (fetches from `/api/products/:id`)
4. Create checkout flow (POST to `/api/orders`)
5. Add error scenarios (simulate network failures)

### Backend Updates
1. Add CORS middleware for `http://localhost:5173`
2. Test header propagation (log incoming `traceparent`)
3. Verify traces connect in Sentry

### Documentation
1. Update backend README with distributed tracing info
2. Create frontend README with setup instructions
3. Create DEMO_GUIDE.md with presentation flow
4. Record demo video

---

## 🎓 Key Demo Talking Points

1. **"Two Ways to Send Data to Sentry"**
   - Sentry SDK (native, full features)
   - OpenTelemetry (vendor-neutral, OTLP standard)

2. **"Sentry Speaks OTEL Natively"**
   - No special adapters needed
   - Standard OTLP HTTP endpoint
   - Works with any OTEL instrumentation

3. **"Distributed Tracing Just Works"**
   - W3C traceparent header is the bridge
   - OpenTelemetry auto-instrumentation extracts it
   - Sentry stitches traces together automatically

4. **"Best of Both Worlds"**
   - Use Sentry SDK where it makes sense (browser, mobile)
   - Use OpenTelemetry where you need vendor neutrality
   - Get unified observability regardless

---

## 🚀 Success Criteria

After implementation, you should be able to:

- [ ] Show backend traces flowing to Sentry via OTLP (direct + collector)
- [ ] Show single unified trace spanning React → Express → PostgreSQL → Redis
- [ ] Demonstrate `traceparent` header in browser Network tab
- [ ] Show error propagation across services in unified trace
- [ ] Show session replay of user actions leading to backend error
- [ ] Explain how Sentry SDK + OTEL connect via W3C standard headers
- [ ] Emphasize: No special integration code needed - it just works

---

## 📚 Resources

- [Sentry OTLP Distributed Tracing](https://docs.sentry.io/concepts/otlp/#distributed-tracing-between-sentry-instrumentation-and-opentelemetry-instrumentation)
- [Sentry React SDK Setup](https://docs.sentry.io/platforms/javascript/guides/react/)
- [OpenTelemetry JS Propagation](https://opentelemetry.io/docs/languages/js/propagation/)
- [W3C Trace Context Spec](https://www.w3.org/TR/trace-context/)
