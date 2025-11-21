import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const schema = `
-- Products table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  total_amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50),
  payment_status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
`;

const seedData = `
-- Seed users
INSERT INTO users (email, name) VALUES
  ('john@example.com', 'John Doe'),
  ('jane@example.com', 'Jane Smith'),
  ('bob@example.com', 'Bob Johnson')
ON CONFLICT (email) DO NOTHING;

-- Seed products
INSERT INTO products (sku, name, description, price, stock_quantity, image_url) VALUES
  ('LAPTOP-001', 'Premium Laptop', 'High-performance laptop with 16GB RAM', 1299.99, 50, 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500&h=500&fit=crop'),
  ('PHONE-001', 'Smartphone Pro', 'Latest smartphone with 5G capability', 899.99, 100, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&h=500&fit=crop'),
  ('TABLET-001', 'Tablet Plus', '10-inch tablet with stylus support', 599.99, 75, 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=500&h=500&fit=crop'),
  ('HEADPHONE-001', 'Wireless Headphones', 'Noise-canceling over-ear headphones', 249.99, 200, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop'),
  ('WATCH-001', 'Smart Watch', 'Fitness tracking smartwatch', 349.99, 150, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&h=500&fit=crop'),
  ('KEYBOARD-001', 'Mechanical Keyboard', 'RGB backlit mechanical keyboard', 129.99, 80, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500&h=500&fit=crop'),
  ('MOUSE-001', 'Gaming Mouse', 'Wireless gaming mouse with RGB', 79.99, 120, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500&h=500&fit=crop'),
  ('MONITOR-001', '4K Monitor', '27-inch 4K IPS display', 499.99, 40, 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500&h=500&fit=crop'),
  ('SPEAKER-001', 'Bluetooth Speaker', 'Portable waterproof speaker', 89.99, 180, 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500&h=500&fit=crop'),
  ('CAMERA-001', 'Digital Camera', 'Mirrorless camera with 24MP sensor', 1499.99, 30, 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&h=500&fit=crop')
ON CONFLICT (sku) DO NOTHING;
`;

async function setupDatabase() {
  const client = await pool.connect();

  try {
    console.log('🗄️  Setting up database schema...');
    await client.query(schema);
    console.log('✅ Schema created successfully');

    console.log('🌱 Seeding database with sample data...');
    await client.query(seedData);
    console.log('✅ Database seeded successfully');

  } catch (error) {
    console.error('❌ Error setting up database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

setupDatabase()
  .then(() => {
    console.log('✨ Database setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to setup database:', error);
    process.exit(1);
  });
