import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import { trace, context } from '@opentelemetry/api';

dotenv.config();

const PORT = process.env.PORT || 3000;
const PRODUCTS_SERVICE_URL = process.env.PRODUCTS_SERVICE_URL || 'http://localhost:3001';
const ORDERS_SERVICE_URL = process.env.ORDERS_SERVICE_URL || 'http://localhost:3002';

const app = express();

// CORS configuration
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });

  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'api-gateway' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'API Gateway',
    version: '1.0.0',
    description: 'Gateway routing requests to Products and Orders microservices',
    mode: 'collector',
    services: {
      products: PRODUCTS_SERVICE_URL,
      orders: ORDERS_SERVICE_URL,
    },
    endpoints: {
      health: 'GET /health',
      products: 'GET /api/products/*',
      orders: 'GET /api/orders/*',
    }
  });
});

// Proxy helper function
async function proxyRequest(req, res, targetUrl) {
  const tracer = trace.getTracer('api-gateway');

  return tracer.startActiveSpan(`proxy ${req.method} ${req.path}`, async (span) => {
    try {
      span.setAttribute('http.target', targetUrl);
      span.setAttribute('proxy.destination', targetUrl);

      // Filter out trace propagation headers for workshop demo
      // This makes each service create independent traces
      const { traceparent, tracestate, ...headersWithoutTrace } = req.headers;

      const response = await axios({
        method: req.method,
        url: targetUrl,
        data: req.body,
        params: req.query,
        headers: {
          ...headersWithoutTrace,
          host: new URL(targetUrl).host,
        },
        validateStatus: () => true, // Don't throw on any status
      });

      span.setAttribute('http.status_code', response.status);

      // Forward the response
      res.status(response.status).json(response.data);
    } catch (error) {
      span.recordException(error);
      span.setAttribute('error', true);

      console.error(`Proxy error for ${targetUrl}:`, error.message);

      res.status(503).json({
        error: 'Service unavailable',
        message: `Failed to reach ${targetUrl}`,
        details: error.message,
      });
    } finally {
      span.end();
    }
  });
}

// Products service proxy
app.all('/api/products*', async (req, res) => {
  const targetUrl = `${PRODUCTS_SERVICE_URL}${req.path}`;
  await proxyRequest(req, res, targetUrl);
});

// Orders service proxy
app.all('/api/orders*', async (req, res) => {
  const targetUrl = `${ORDERS_SERVICE_URL}${req.path}`;
  await proxyRequest(req, res, targetUrl);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    availableRoutes: ['/api/products', '/api/orders']
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

async function startServer() {
  try {
    console.log('🚀 Initializing API Gateway...');
    console.log('');

    const server = app.listen(PORT, () => {
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🚪 API Gateway (Microservices Router)');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`📡 Server listening on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API URL: http://localhost:${PORT}`);
      console.log(`💚 Health Check: http://localhost:${PORT}/health`);
      console.log('');
      console.log('📊 Routing Configuration:');
      console.log(`   /api/products/* → ${PRODUCTS_SERVICE_URL}`);
      console.log(`   /api/orders/*   → ${ORDERS_SERVICE_URL}`);
      console.log('');
      console.log('🎯 Architecture:');
      console.log('   Frontend → Gateway (this) → Microservices → Collector → Sentry');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('');
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);

      server.close(() => {
        console.log('✅ HTTP server closed');
        process.exit(0);
      });

      setTimeout(() => {
        console.error('❌ Forceful shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start API Gateway:', error);
    process.exit(1);
  }
}

startServer();
