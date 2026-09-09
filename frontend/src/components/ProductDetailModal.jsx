import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useSocket } from '../context/SocketContext';

export default function ProductDetailModal({ product, onClose }) {
  const { addToCart } = useCart();
  const { getStock } = useSocket();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  if (!product) return null;

  const currentStock = getStock(product);
  const isOutOfStock = currentStock <= 0;

  const handleIncrement = () => {
    if (qty < currentStock) setQty((prev) => prev + 1);
  };

  const handleDecrement = () => {
    if (qty > 1) setQty((prev) => prev - 1);
  };

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addToCart(
      {
        ...product,
        countInStock: currentStock,
      },
      qty
    );
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div
        className="relative w-full max-w-3xl glass rounded-3xl border border-luxe-glassBorder overflow-hidden shadow-2xl bg-luxe-surface/90"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full glass border border-luxe-glassBorder hover:border-yellow-500/50 flex items-center justify-center text-luxe-secondary hover:text-luxe-primary transition-all"
        >
          ✕
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 sm:p-8">
          {/* Product Image Column */}
          <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-black/40 border border-luxe-glassBorder">
            <img
              src={product.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30'}
              alt={product.name}
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute top-3 left-3">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-black/60 text-yellow-300 border border-yellow-400/20 backdrop-blur-sm">
                {product.category || 'Luxury'}
              </span>
            </div>
          </div>

          {/* Product Details Column */}
          <div className="flex flex-col justify-between">
            <div>
              <p className="text-xs uppercase font-bold tracking-widest text-luxe-secondary mb-1">
                {product.brand || 'Luxe Atelier'}
              </p>
              <h2 className="text-2xl font-serif font-bold text-luxe-primary mb-2">
                {product.name}
              </h2>

              {/* Rating */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex text-amber-400 text-sm">
                  {'★'.repeat(Math.min(5, Math.floor(product.rating || product.averageRating || 5)))}
                </div>
                <span className="text-xs text-luxe-secondary font-medium">
                  {(product.rating || product.averageRating || 5.0).toFixed(1)} (
                  {product.numReviews || 12} authentic reviews)
                </span>
              </div>

              {/* Price */}
              <div className="text-2xl font-serif font-bold text-amber-300 mb-4">
                ${Number(product.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>

              {/* Description */}
              <p className="text-xs text-luxe-secondary leading-relaxed mb-6 line-clamp-4">
                {product.description ||
                  'Meticulously engineered by master craftsmen using finest grade materials, embodying exquisite luxury and timeless heritage.'}
              </p>

              {/* Stock Status Badge */}
              <div className="mb-6 flex items-center gap-3">
                <span className="text-xs text-luxe-secondary">Availability:</span>
                <span
                  id={`stock-badge-${product._id}`}
                  className={`stock-badge ${
                    !isOutOfStock ? 'in-stock' : 'out-of-stock'
                  } text-xs font-bold px-3 py-1 rounded-full`}
                >
                  {!isOutOfStock ? `${currentStock} units in vault` : 'Currently Sold Out'}
                </span>
              </div>
            </div>

            {/* Quantity Stepper & Add to Bag */}
            <div className="pt-4 border-t border-luxe-glassBorder space-y-4">
              {!isOutOfStock && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-luxe-secondary font-medium">Select Quantity</span>
                  <div className="flex items-center gap-3 glass border border-luxe-glassBorder rounded-xl px-3 py-1">
                    <button
                      type="button"
                      onClick={handleDecrement}
                      disabled={qty <= 1}
                      className="text-sm font-bold px-1 text-luxe-secondary hover:text-luxe-primary disabled:opacity-30"
                    >
                      −
                    </button>
                    <span className="text-xs font-bold w-6 text-center">{qty}</span>
                    <button
                      type="button"
                      onClick={handleIncrement}
                      disabled={qty >= currentStock}
                      className="text-sm font-bold px-1 text-luxe-secondary hover:text-luxe-primary disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                disabled={isOutOfStock}
                onClick={handleAddToCart}
                className={`w-full py-3.5 rounded-2xl text-xs uppercase font-bold tracking-widest transition-all duration-200 shadow-xl ${
                  isOutOfStock
                    ? 'btn-disabled opacity-50 cursor-not-allowed bg-zinc-700 text-zinc-400'
                    : added
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-black shadow-yellow-500/20 hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                {isOutOfStock ? 'Sold Out' : added ? 'Added to Bag ✓' : `Add to Bag • $${(Number(product.price) * qty).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
