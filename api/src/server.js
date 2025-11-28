import app, { initializeApp } from './app.js';
import dotenv from 'dotenv';
import { createServer } from 'net';

dotenv.config();

const PREFERRED_PORT = parseInt(process.env.PORT || '3000', 10);
const MAX_PORT = PREFERRED_PORT + 10;

// Check if a port is available
async function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = createServer();

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    server.listen(port);
  });
}

// Find an available port starting from preferred port
async function findAvailablePort(startPort) {
  for (let port = startPort; port <= MAX_PORT; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available ports found between ${startPort} and ${MAX_PORT}`);
}

async function startServer() {
  try {
    // Initialize application services
    await initializeApp();

    // Find available port
    let PORT = PREFERRED_PORT;
    const isPreferredPortAvailable = await isPortAvailable(PREFERRED_PORT);

    if (!isPreferredPortAvailable) {
      console.log(`⚠️  Port ${PREFERRED_PORT} is in use, finding alternative port...`);
      PORT = await findAvailablePort(PREFERRED_PORT + 1);
      console.log(`✓ Using port ${PORT} instead\n`);
    }

    // Start the Express server
    const server = app.listen(PORT, () => {
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🚀 OpenTelemetry E-commerce API Server');
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

      // Close database connections, Redis, etc.
      // The instrument-otel.js SIGTERM handler will close OTEL SDK

      setTimeout(() => {
        console.error('❌ Forceful shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
