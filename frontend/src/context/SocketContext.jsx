import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [stockOverrides, setStockOverrides] = useState({});

  // Direct DOM updater matching legacy tests and real-time reactive sync
  const updateProductStockUI = useCallback((productId, count) => {
    const stockCount = typeof count === 'number' ? count : parseInt(count, 10);

    // 1. Update React state override
    setStockOverrides((prev) => ({
      ...prev,
      [productId]: stockCount,
    }));

    // 2. Update window cache for test compatibility
    if (typeof window !== 'undefined') {
      if (!window.currentProductsMap) window.currentProductsMap = {};
      if (window.currentProductsMap[productId]) {
        window.currentProductsMap[productId].countInStock = stockCount;
      }
    }

    // 3. Direct DOM manipulation for instant feedback / test harness compatibility
    if (typeof document !== 'undefined') {
      const badge = document.getElementById(`stock-badge-${productId}`);
      if (badge) {
        if (stockCount > 0) {
          badge.textContent = `${stockCount} in stock`;
          badge.classList.remove('out-of-stock');
          badge.classList.add('in-stock');
          badge.classList.add('badge-pulse');
          setTimeout(() => {
            badge.classList.remove('badge-pulse');
          }, 1500);
        } else {
          badge.textContent = 'Out of Stock';
          badge.classList.remove('in-stock');
          badge.classList.remove('badge-pulse');
          badge.classList.add('out-of-stock');
        }
      }

      const button = document.querySelector(`button[data-product-id="${productId}"]`);
      if (button) {
        if (stockCount > 0) {
          button.disabled = false;
          button.classList.remove('btn-disabled');
          button.classList.remove('opacity-50');
          button.classList.remove('cursor-not-allowed');
          button.textContent = 'Add to Cart';
        } else {
          button.disabled = true;
          button.classList.add('btn-disabled');
          button.classList.add('opacity-50');
          button.classList.add('cursor-not-allowed');
          button.textContent = 'Out of Stock';
        }
      }
    }
  }, []);

  // Expose updateProductStockUI on window for legacy tests
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.updateProductStockUI = updateProductStockUI;
    }
  }, [updateProductStockUI]);

  useEffect(() => {
    // Connect to same origin or port 5000 in dev
    const socketUrl =
      typeof window !== 'undefined' && window.location.port === '5173'
        ? 'http://localhost:5000'
        : '';

    const socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    socketInstance.on('stockUpdate', (data) => {
      if (data && data.productId) {
        const remainingStock =
          data.countInStock !== undefined ? data.countInStock : data.newStock;
        updateProductStockUI(data.productId, remainingStock);
      }
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [updateProductStockUI]);

  const getStock = (product) => {
    if (!product || !product._id) return 0;
    if (stockOverrides[product._id] !== undefined) {
      return stockOverrides[product._id];
    }
    return product.countInStock ?? 0;
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        stockOverrides,
        getStock,
        updateProductStockUI,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

export default SocketContext;
