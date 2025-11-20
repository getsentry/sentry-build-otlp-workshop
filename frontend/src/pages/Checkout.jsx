import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Cart from '../components/Cart';
import { createOrder } from '../api/client';

export default function Checkout({ cartItems, onUpdateQuantity, onRemove, onClearCart }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('credit_card');

  const total = cartItems.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);

  async function handleCheckout(e) {
    e.preventDefault();

    if (cartItems.length === 0) {
      setError('Your cart is empty');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const orderData = {
        userId: 1, // Demo user
        items: cartItems.map(item => ({
          productId: item.id,
          quantity: item.quantity,
        })),
        paymentMethod,
      };

      const result = await createOrder(orderData);

      setSuccess(true);
      onClearCart();

      setTimeout(() => {
        navigate('/');
      }, 3000);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="container">
        <div className="success-message">
          <h2>✓ Order Placed Successfully!</h2>
          <p>Thank you for your purchase.</p>
          <p>Redirecting to products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1>Shopping Cart</h1>
      </div>

      <div className="checkout-layout">
        <div className="checkout-cart">
          <Cart
            items={cartItems}
            onUpdateQuantity={onUpdateQuantity}
            onRemove={onRemove}
          />
        </div>

        {cartItems.length > 0 && (
          <div className="checkout-form">
            <h2>Complete Your Order</h2>

            <form onSubmit={handleCheckout}>
              <div className="form-group">
                <label>Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="form-select"
                >
                  <option value="credit_card">Credit Card</option>
                  <option value="debit_card">Debit Card</option>
                  <option value="paypal">PayPal</option>
                </select>
              </div>

              <div className="checkout-summary">
                <div className="summary-row">
                  <span>Subtotal:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="summary-row">
                  <span>Shipping:</span>
                  <span>Free</span>
                </div>
                <div className="summary-row total">
                  <strong>Total:</strong>
                  <strong>${total.toFixed(2)}</strong>
                </div>
              </div>

              {error && (
                <div className="error-banner">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn-primary btn-full"
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Place Order'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
