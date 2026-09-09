import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('luxe_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('luxe_cart', JSON.stringify(cartItems));
    } catch (e) {
      console.warn('Failed to save cart to localStorage:', e);
    }
  }, [cartItems]);

  // Multi-tab storage listener
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'luxe_cart') {
        try {
          setCartItems(e.newValue ? JSON.parse(e.newValue) : []);
        } catch {
          setCartItems([]);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const addToCart = (product, qty = 1) => {
    const quantity = parseInt(qty, 10) || 1;
    const maxStock = typeof product.countInStock === 'number' ? product.countInStock : 99;

    if (maxStock <= 0) {
      return { success: false, message: 'Item is out of stock' };
    }

    setCartItems((prevItems) => {
      const existingIndex = prevItems.findIndex(
        (item) => item._id === product._id || item.product === product._id
      );

      if (existingIndex > -1) {
        const updated = [...prevItems];
        const currentQty = updated[existingIndex].qty;
        const newQty = Math.min(currentQty + quantity, maxStock);
        updated[existingIndex] = {
          ...updated[existingIndex],
          ...product,
          qty: newQty,
        };
        return updated;
      } else {
        const newQty = Math.min(quantity, maxStock);
        return [
          ...prevItems,
          {
            _id: product._id,
            product: product._id,
            name: product.name,
            brand: product.brand,
            image: product.image,
            price: Number(product.price),
            countInStock: maxStock,
            qty: newQty,
          },
        ];
      }
    });

    return { success: true };
  };

  const removeFromCart = (productId) => {
    setCartItems((prevItems) =>
      prevItems.filter((item) => item._id !== productId && item.product !== productId)
    );
  };

  const updateQty = (productId, qty) => {
    const quantity = parseInt(qty, 10);
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCartItems((prevItems) =>
      prevItems.map((item) => {
        if (item._id === productId || item.product === productId) {
          const maxStock = typeof item.countInStock === 'number' ? item.countInStock : 99;
          return {
            ...item,
            qty: Math.min(quantity, maxStock),
          };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCartItems([]);
    try {
      localStorage.setItem('luxe_cart', JSON.stringify([]));
    } catch (e) {
      console.warn('Failed to clear cart storage:', e);
    }
  };

  // Computations
  const itemCount = cartItems.reduce((acc, item) => acc + (Number(item.qty) || 0), 0);
  const subtotal = cartItems.reduce(
    (acc, item) => acc + (Number(item.price) || 0) * (Number(item.qty) || 0),
    0
  );
  const shipping = 0; // Complimentary luxury delivery
  const tax = 0; // Tax included in luxury pricing
  const totalPrice = subtotal + shipping + tax;

  // Expose on window for test compatibility
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.luxeCart = {
        getItems: () => cartItems,
        getItemCount: () => itemCount,
        getTotalPrice: () => totalPrice,
        addToCart,
        removeFromCart,
        updateQty,
        clearCart,
      };
    }
  }, [cartItems, itemCount, totalPrice]);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        itemCount,
        subtotal,
        shipping,
        tax,
        totalPrice,
        addToCart,
        removeFromCart,
        updateQty,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

export default CartContext;
