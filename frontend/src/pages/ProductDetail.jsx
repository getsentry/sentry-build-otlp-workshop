import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProduct } from '../api/client';

export default function ProductDetail({ onAddToCart }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  async function fetchProduct() {
    try {
      setLoading(true);
      setError(null);
      const data = await getProduct(id);
      setProduct(data.product);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleAddToCart() {
    if (product) {
      onAddToCart({ ...product, quantity });
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading product...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="error">
          <p>Error loading product: {error}</p>
          <button onClick={() => navigate('/')} className="btn-secondary">
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container">
        <div className="error">Product not found</div>
      </div>
    );
  }

  return (
    <div className="container">
      <button onClick={() => navigate('/')} className="back-btn">
        ← Back to Products
      </button>

      <div className="product-detail">
        <div className="product-detail-image">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} />
          ) : (
            <div className="product-detail-image-placeholder">
              <span className="product-emoji-large">📦</span>
            </div>
          )}
        </div>

        <div className="product-detail-info">
          <h1>{product.name}</h1>
          <p className="product-sku">SKU: {product.sku}</p>
          <p className="product-detail-description">{product.description}</p>

          <div className="product-detail-price">
            <span className="price-label">Price:</span>
            <span className="price-value">${product.price}</span>
          </div>

          <div className="product-detail-stock">
            {product.stock_quantity > 0 ? (
              <span className="in-stock">✓ In Stock ({product.stock_quantity} available)</span>
            ) : (
              <span className="out-of-stock">✗ Out of Stock</span>
            )}
          </div>

          {product.stock_quantity > 0 && (
            <div className="product-actions">
              <div className="quantity-selector">
                <label>Quantity:</label>
                <div className="quantity-controls">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="qty-btn"
                  >
                    −
                  </button>
                  <span className="quantity">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                    className="qty-btn"
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                onClick={handleAddToCart}
                className={`btn-primary ${added ? 'btn-success' : ''}`}
              >
                {added ? '✓ Added to Cart!' : 'Add to Cart'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
