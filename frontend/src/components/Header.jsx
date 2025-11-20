import { Link } from 'react-router-dom';

export default function Header({ cartCount }) {
  return (
    <header className="header">
      <div className="container">
        <Link to="/" className="logo">
          <span className="logo-icon">🛒</span>
          <span className="logo-text">OTEL E-Commerce</span>
        </Link>

        <nav className="nav">
          <Link to="/" className="nav-link">Products</Link>
          <Link to="/cart" className="nav-link cart-link">
            Cart
            {cartCount > 0 && (
              <span className="cart-badge">{cartCount}</span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}
