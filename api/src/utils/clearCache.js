import { initializeRedis, deletePattern, close } from '../services/cache.js';
import dotenv from 'dotenv';

dotenv.config();

async function clearCache() {
  try {
    console.log('🗑️  Clearing Redis cache...');

    // Initialize Redis connection
    await initializeRedis();

    // Clear all product-related cache keys
    const productsCleared = await deletePattern('products:*');
    console.log(`✅ Cleared ${productsCleared} products cache entries`);

    const productCleared = await deletePattern('product:*');
    console.log(`✅ Cleared ${productCleared} individual product cache entries`);

    console.log('✨ Cache cleared successfully!');

    // Close connection
    await close();
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    process.exit(1);
  }
}

clearCache()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to clear cache:', error);
    process.exit(1);
  });
