import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeRedis } from './services/cache.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import healthRouter from './routes/health.js';
import productsRouter from './routes/products.js';

dotenv.config();

const PORT = process.env.PRODUCTS_PORT || 3001;

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
    name: 'Products Service',
    version: '1.0.0',
    description: 'Products microservice instrumented with OpenTelemetry',
    endpoints: {
      health: 'GET /health',
      products: {
        list: 'GET /api/products',
        getById: 'GET /api/products/:id',
        search: 'GET /api/products/search?q=query',
      },
    },
  });
});

app.use('/health', healthRouter);
app.use('/api/products', productsRouter);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

async function startServer() {
  try {
    console.log('🚀 Initializing Products Service...');

    // Initialize in-memory cache
    await initializeRedis();

    console.log('✅ Services initialized successfully');

    // Start the Express server
    const server = app.listen(PORT, () => {
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🛍️  Products Service');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`📡 Server listening on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API URL: http://localhost:${PORT}`);
      console.log(`💚 Health Check: http://localhost:${PORT}/health`);
      console.log('');
      console.log('📊 Available Endpoints:');
      console.log('   GET  /api/products          - List all products');
      console.log('   GET  /api/products/:id      - Get product by ID');
      console.log('   GET  /api/products/search   - Search products');
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
    console.error('❌ Failed to start Products Service:', error);
    process.exit(1);
  }
}

startServer();
