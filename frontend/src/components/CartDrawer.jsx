import React from 'react';
import { useCart } from '../context/CartContext';

export default function CartDrawer({ isOpen, onClose, onProceedToCheckout }) {
  const {
    cartItems,
    itemCount,
    subtotal,
    shipping,
    tax,
    totalPrice,
    updateQty,
    removeFromCart,
    clearCart,
  } = useCart();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md glass border-l border-luxe-glassBorder bg-luxe-surface/95 flex flex-col shadow-2xl">
          {/* Header */}
          <div className="p-6 border-b border-luxe-glassBorder flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-serif font-bold text-luxe-primary">
                Your Shopping Bag
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 font-bold border border-yellow-500/30">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full glass border border-luxe-glassBorder hover:border-yellow-500/50 text-luxe-secondary hover:text-luxe-primary transition-all"
            >
              ✕
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="text-4xl">🛍️</div>
                <h3 className="font-serif text-lg font-bold text-luxe-primary">
                  Your Bag is Empty
                </h3>
                <p className="text-xs text-luxe-secondary max-w-xs">
                  Discover our timeless curation of luxury timepieces, fine jewelry, and rare leather
                  creations.
                </p>
                <button
                  onClick={onClose}
                  className="mt-4 px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-xs font-bold shadow-md hover:scale-105 transition-all"
                >
                  Explore Collection
                </button>
              </div>
            ) : (
              cartItems.map((item) => (
                <div
                  key={item._id}
                  className="flex gap-4 p-3.5 rounded-2xl glass border border-luxe-glassBorder relative group"
                >
                  {/* Thumbnail */}
                  <img
                    src={item.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30'}
                    alt={item.name}
                    className="w-20 h-20 rounded-xl object-cover bg-black/40 border border-luxe-glassBorder flex-shrink-0"
                  />

                  {/* Info */}
                  <div className="flex flex-col justify-between flex-1 min-w-0">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-luxe-secondary">
                        {item.brand || 'Luxe'}
                      </span>
                      <h4 className="font-serif text-sm font-bold text-luxe-primary truncate">
                        {item.name}
                      </h4>
                      <p className="text-xs font-bold text-amber-300 mt-0.5">
                        ${Number(item.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    {/* Quantity Stepper & Remove */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2 glass border border-luxe-glassBorder rounded-lg px-2 py-0.5">
                        <button
                          onClick={() => updateQty(item._id, item.qty - 1)}
                          className="text-xs font-bold text-luxe-secondary hover:text-luxe-primary px-1"
                        >
                          −
                        </button>
                        <span className="text-xs font-bold w-4 text-center">{item.qty}</span>
                        <button
                          onClick={() => updateQty(item._id, item.qty + 1)}
                          disabled={item.countInStock && item.qty >= item.countInStock}
                          className="text-xs font-bold text-luxe-secondary hover:text-luxe-primary px-1 disabled:opacity-30"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item._id)}
                        className="text-xs text-rose-400/80 hover:text-rose-400 p-1 transition-colors"
                        title="Remove item"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer & Financial Breakdown */}
          {cartItems.length > 0 && (
            <div className="p-6 border-t border-luxe-glassBorder space-y-4 bg-black/20">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-luxe-secondary">
                  <span>Subtotal</span>
                  <span className="text-luxe-primary font-medium">
                    ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-luxe-secondary">
                  <span>White-Glove Insured Delivery</span>
                  <span className="text-emerald-400 font-medium">Complimentary ($0.00)</span>
                </div>
                <div className="flex justify-between text-luxe-secondary">
                  <span>Estimated Tax</span>
                  <span className="text-luxe-primary font-medium">Included ($0.00)</span>
                </div>
                <div className="pt-2 border-t border-luxe-glassBorder flex justify-between text-sm font-bold">
                  <span className="text-luxe-primary font-serif">Total Order</span>
                  <span className="text-amber-300 font-serif text-lg">
                    ${totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  onClose();
                  onProceedToCheckout();
                }}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-black text-xs uppercase font-bold tracking-widest shadow-xl shadow-yellow-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Proceed to Checkout
              </button>

              <button
                onClick={clearCart}
                className="w-full text-center text-[11px] text-luxe-secondary hover:text-rose-400 transition-colors pt-1"
              >
                Empty Shopping Bag
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
