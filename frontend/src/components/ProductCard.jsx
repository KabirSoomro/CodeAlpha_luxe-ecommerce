import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useSocket } from '../context/SocketContext';
import { formatPKR } from '../utils/currency';

export default function ProductCard({ product, index = 0, onSelectProduct }) {
  const { addToCart } = useCart();
  const { getStock } = useSocket();
  const [addedAnimation, setAddedAnimation] = useState(false);

  // Live real-time stock resolution
  const currentStock = getStock(product);
  const isOutOfStock = currentStock <= 0;

  // Staggered animation delay formula from spec: Math.min(index * 0.06, 0.6)s
  const animationDelaySeconds = Math.min(index * 0.06, 0.6);

  const handleAddToCart = (e) => {
    e.stopPropagation();
    if (isOutOfStock) return;

    addToCart(
      {
        ...product,
        countInStock: currentStock,
      },
      1
    );

    setAddedAnimation(true);
    setTimeout(() => setAddedAnimation(false), 1200);
  };

  return (
    <div
      onClick={() => onSelectProduct && onSelectProduct(product)}
      style={{
        animationDelay: `${animationDelaySeconds}s`,
      }}
      className="product-card group relative flex flex-col rounded-2xl border border-luxe-glassBorder glass p-4 transition-all duration-300 hover:border-yellow-500/50 hover:shadow-2xl hover:shadow-yellow-500/10 cursor-pointer animate-fadeInStaggered opacity-0 fill-mode-forwards"
    >
      {/* Product Image Container */}
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black/40 mb-4">
        <img
          src={product.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30'}
          alt={product.name}
          className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-108"
          loading="lazy"
        />

        {/* Live Stock Badge matching exact test ID & class conventions */}
        <div className="absolute top-3 right-3">
          <span
            id={`stock-badge-${product._id}`}
            data-product-id={product._id}
            className={`stock-badge ${
              !isOutOfStock ? 'in-stock' : 'out-of-stock'
            } text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-md shadow-md`}
          >
            {!isOutOfStock ? `${currentStock} in stock` : 'Out of Stock'}
          </span>
        </div>

        {/* Category Pill */}
        <div className="absolute top-3 left-3">
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-black/60 text-yellow-300 border border-yellow-400/20 backdrop-blur-sm">
            {product.category || 'Luxury'}
          </span>
        </div>
      </div>

      {/* Details Container */}
      <div className="flex flex-col flex-1 justify-between">
        <div>
          {/* Brand */}
          <p className="text-xs uppercase font-semibold tracking-widest text-luxe-secondary mb-1">
            {product.brand || 'Luxe Atelier'}
          </p>

          {/* Title */}
          <h3 className="font-serif text-lg font-bold text-luxe-primary line-clamp-1 group-hover:text-yellow-400 transition-colors">
            {product.name}
          </h3>

          {/* Rating */}
          <div className="flex items-center gap-1.5 mt-1 mb-3">
            <div className="flex text-amber-400 text-xs">
              {'★'.repeat(Math.min(5, Math.floor(product.rating || product.averageRating || 5)))}
            </div>
            <span className="text-[11px] text-luxe-secondary font-medium">
              {(product.rating || product.averageRating || 5.0).toFixed(1)} (
              {product.numReviews || 12} reviews)
            </span>
          </div>
        </div>

        {/* Price & Action Row */}
        <div className="pt-3 border-t border-luxe-glassBorder flex items-center justify-between gap-3">
          <div>
            <span className="text-xs text-luxe-secondary block font-medium">Price</span>
            <span className="text-lg font-bold text-amber-300 tracking-tight font-serif">
              {formatPKR(product.price)}
            </span>
          </div>

          {/* Add to Cart Button matching exact test selector button[data-product-id="${productId}"] */}
          <button
            type="button"
            data-product-id={product._id}
            disabled={isOutOfStock}
            onClick={handleAddToCart}
            className={`btn-primary px-4 py-2 rounded-xl text-xs font-bold tracking-wider transition-all duration-200 flex items-center gap-1.5 ${
              isOutOfStock
                ? 'btn-disabled opacity-50 cursor-not-allowed bg-zinc-700 text-zinc-400 border border-zinc-600'
                : addedAnimation
                ? 'bg-emerald-500 text-white scale-95 shadow-md shadow-emerald-500/30'
                : 'bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-black shadow-lg shadow-yellow-500/20 hover:scale-105 active:scale-95'
            }`}
          >
            {isOutOfStock ? (
              'Out of Stock'
            ) : addedAnimation ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
                Added!
              </>
            ) : (
              'Add to Cart'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
