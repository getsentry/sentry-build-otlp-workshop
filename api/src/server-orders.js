import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeRedis } from './services/cache.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import healthRouter from './routes/health.js';
import ordersRouter from './routes/orders.js';

dotenv.config();

const PORT = process.env.ORDERS_PORT || 3002;

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

// Routes
app.get('/', (req, res) => {
  res.json({
    name: 'Orders Service',
    version: '1.0.0',
    description: 'Orders microservice instrumented with OpenTelemetry',
    endpoints: {
      health: 'GET /health',
      orders: {
        create: 'POST /api/orders',
        getById: 'GET /api/orders/:id',
        getByUser: 'GET /api/orders/user/:userId',
      },
    },
  });
});

app.use('/health', healthRouter);
app.use('/api/orders', ordersRouter);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

async function startServer() {
  try {
    console.log('🚀 Initializing Orders Service...');

    // Initialize in-memory cache
    await initializeRedis();

    console.log('✅ Services initialized successfully');

    // Start the Express server
    const server = app.listen(PORT, () => {
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📦 Orders Service');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`📡 Server listening on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API URL: http://localhost:${PORT}`);
      console.log(`💚 Health Check: http://localhost:${PORT}/health`);
      console.log('');
      console.log('📊 Available Endpoints:');
      console.log('   POST /api/orders            - Create new order');
      console.log('   GET  /api/orders/:id        - Get order by ID');
      console.log('   GET  /api/orders/user/:id   - Get user orders');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('');
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);

      server.close(() => {
        console.log('✅ HTTP server closed');
      });

      setTimeout(() => {
        console.error('❌ Forceful shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start Orders Service:', error);
    process.exit(1);
  }
}

startServer();
