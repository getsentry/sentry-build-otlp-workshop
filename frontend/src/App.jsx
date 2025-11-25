import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import ProductList from './pages/ProductList';
import ProductDetail from './pages/ProductDetail';
import Checkout from './pages/Checkout';
import './App.css';

function App() {
  const [cartItems, setCartItems] = useState([]);

  function addToCart(product) {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        console.log('Updated cart item quantity', {
          productId: product.id,
          productName: product.name,
          previousQuantity: existing.quantity,
          addedQuantity: product.quantity,
          newQuantity: existing.quantity + product.quantity,
        });
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + product.quantity }
            : item
        );
      }
      console.log('Added item to cart', {
        productId: product.id,
        productName: product.name,
        quantity: product.quantity,
        price: product.price,
      });
      return [...prev, product];
    });
  }

  function updateQuantity(productId, quantity) {
    setCartItems(prev =>
      prev.map(item =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  }

  function removeFromCart(productId) {
    setCartItems(prev => prev.filter(item => item.id !== productId));
  }

  function clearCart() {
    setCartItems([]);
  }

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <BrowserRouter>
      <div className="app">
        <Header cartCount={cartCount} />
        <main className="main">
          <Routes>
            <Route path="/" element={<ProductList />} />
            <Route
              path="/product/:id"
              element={<ProductDetail onAddToCart={addToCart} />}
            />
            <Route
              path="/cart"
              element={
                <Checkout
                  cartItems={cartItems}
                  onUpdateQuantity={updateQuantity}
                  onRemove={removeFromCart}
                  onClearCart={clearCart}
                />
              }
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
