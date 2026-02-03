import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import { trace, context } from '@opentelemetry/api';
import { logger } from './utils/logger.js';

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
    logger.info('Request completed', {
      'http.method': req.method,
      'http.path': req.path,
      'http.status_code': res.statusCode,
      'http.duration_ms': duration,
    });
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

      const response = await axios({
        method: req.method,
        url: targetUrl,
        data: req.body,
        params: req.query,
        headers: {
          ...req.headers,
          host: new URL(targetUrl).host,
        },
        validateStatus: () => true, // Don't throw on any status
      });

      span.setAttribute('http.status_code', response.status);

      logger.info('Proxy request completed', {
        'proxy.target': targetUrl,
        'http.method': req.method,
        'http.status_code': response.status,
      });

      // Forward the response
      res.status(response.status).json(response.data);
    } catch (error) {
      span.recordException(error);
      span.setAttribute('error', true);

      logger.error('Proxy request failed', {
        'proxy.target': targetUrl,
        'http.method': req.method,
        'error.message': error.message,
      });

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
  logger.warn('Route not found', {
    'http.method': req.method,
    'http.path': req.path,
    'http.status_code': 404,
  });
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    availableRoutes: ['/api/products', '/api/orders']
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.exception(err, {
    'http.method': req.method,
    'http.path': req.path,
  });
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

async function startServer() {
  try {
    console.log('Initializing API Gateway...');

    const server = app.listen(PORT, () => {
      logger.info('API Gateway started', {
        'server.port': PORT,
        'server.environment': process.env.NODE_ENV || 'development',
        'routing.products': PRODUCTS_SERVICE_URL,
        'routing.orders': ORDERS_SERVICE_URL,
      });
      console.log('API Gateway started');
      console.log(`Server listening on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Routing: /api/products/* -> ${PRODUCTS_SERVICE_URL}`);
      console.log(`Routing: /api/orders/* -> ${ORDERS_SERVICE_URL}`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`${signal} received. Starting graceful shutdown...`);

      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });

      setTimeout(() => {
        console.error('Forceful shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('Failed to start API Gateway:', error);
    process.exit(1);
  }
}

startServer();
