import { Link } from 'react-router-dom';

export default function ProductCard({ product }) {
  return (
    <Link to={`/product/${product.id}`} className="product-card">
      <div className="product-image">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} />
        ) : (
          <div className="product-image-placeholder">
            <span className="product-emoji">📦</span>
          </div>
        )}
      </div>
      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        <p className="product-description">{product.description}</p>
        <div className="product-footer">
          <span className="product-price">${product.price}</span>
          <span className="product-stock">
            {product.stock_quantity > 0 ? (
              <span className="in-stock">In Stock ({product.stock_quantity})</span>
            ) : (
              <span className="out-of-stock">Out of Stock</span>
            )}
          </span>
        </div>
      </div>
    </Link>
  );
}
