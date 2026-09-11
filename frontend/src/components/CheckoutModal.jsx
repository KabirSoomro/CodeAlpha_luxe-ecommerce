import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { formatPKR } from '../utils/currency';

export default function CheckoutModal({ isOpen, onClose, onOrderPlaced, openAuthModal }) {
  const { cartItems, totalPrice, clearCart } = useCart();
  const { user, isAuthenticated } = useAuth();

  const [address, setAddress] = useState('123 Luxe Boulevard, Penthouse 4');
  const [city, setCity] = useState('New York');
  const [postalCode, setPostalCode] = useState('10001');
  const [country, setCountry] = useState('United States');
  const [paymentMethod, setPaymentMethod] = useState('CreditCard');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [placedOrder, setPlacedOrder] = useState(null);

  if (!isOpen) return null;

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      if (openAuthModal) openAuthModal();
      return;
    }

    if (cartItems.length === 0) {
      setErrorMessage('Your shopping bag is empty.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const orderData = {
        orderItems: cartItems.map((item) => ({
          product: item._id || item.product,
          name: item.name,
          image: item.image,
          price: item.price,
          qty: item.qty,
        })),
        shippingAddress: {
          address,
          city,
          postalCode,
          country,
        },
        paymentMethod,
        totalPrice,
      };

      const createdOrder = await api.createOrder(orderData);
      clearCart();
      setPlacedOrder(createdOrder);
      setIsSubmitting(false);

      if (onOrderPlaced) {
        onOrderPlaced(createdOrder);
      }
    } catch (err) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Failed to place order. Please verify item availability.');
    }
  };

  const handleCloseAndReset = () => {
    setPlacedOrder(null);
    setErrorMessage('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div
        className="relative w-full max-w-2xl glass rounded-3xl border border-luxe-glassBorder overflow-hidden shadow-2xl bg-luxe-surface/95 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-luxe-glassBorder flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">✨</span>
            <h2 className="text-xl font-serif font-bold text-luxe-primary">
              {placedOrder ? 'Acquisition Confirmed' : 'Private Concierge Checkout'}
            </h2>
          </div>
          <button
            onClick={handleCloseAndReset}
            className="p-2 rounded-full glass border border-luxe-glassBorder hover:border-yellow-500/50 text-luxe-secondary hover:text-luxe-primary transition-all"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
          {placedOrder ? (
            /* Success View */
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto text-2xl">
                ✓
              </div>
              <h3 className="font-serif text-2xl font-bold text-luxe-primary">
                Thank You For Your Acquisition
              </h3>
              <p className="text-xs text-luxe-secondary max-w-md mx-auto">
                Your order{' '}
                <span className="text-amber-300 font-mono font-bold">{placedOrder._id}</span> has
                been placed and forwarded to our vault for insured white-glove dispatch.
              </p>

              <div className="p-4 rounded-2xl glass border border-luxe-glassBorder max-w-md mx-auto text-left space-y-2 text-xs">
                <div className="flex justify-between text-luxe-secondary">
                  <span>Total Amount:</span>
                  <span className="text-amber-300 font-bold font-serif text-sm">
                    {formatPKR(placedOrder.totalPrice)}
                  </span>
                </div>
                <div className="flex justify-between text-luxe-secondary">
                  <span>Payment Method:</span>
                  <span className="text-luxe-primary font-medium">{placedOrder.paymentMethod}</span>
                </div>
                <div className="flex justify-between text-luxe-secondary">
                  <span>Delivery Address:</span>
                  <span className="text-luxe-primary truncate max-w-[200px]">
                    {placedOrder.shippingAddress?.address}, {placedOrder.shippingAddress?.city}
                  </span>
                </div>
              </div>

              <div className="pt-4 flex justify-center gap-3">
                <button
                  onClick={handleCloseAndReset}
                  className="px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-xs font-bold shadow-lg shadow-yellow-500/20 hover:scale-105 transition-all"
                >
                  Return to Boutique
                </button>
              </div>
            </div>
          ) : !isAuthenticated ? (
            /* Unauthenticated Prompt */
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 flex items-center justify-center mx-auto text-2xl">
                🔒
              </div>
              <h3 className="font-serif text-xl font-bold text-luxe-primary">
                Exclusive Membership Required
              </h3>
              <p className="text-xs text-luxe-secondary max-w-md mx-auto">
                Please sign in to your verified Luxe client account to proceed with secure vault
                checkout and order tracking.
              </p>
              <button
                onClick={() => {
                  onClose();
                  if (openAuthModal) openAuthModal();
                }}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-xs font-bold shadow-lg shadow-yellow-500/20 hover:scale-105 transition-all"
              >
                Sign In or Register
              </button>
            </div>
          ) : (
            /* Checkout Form */
            <form onSubmit={handleSubmitOrder} className="space-y-6">
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Order Items Preview */}
              <div>
                <h4 className="text-xs uppercase font-bold tracking-wider text-luxe-secondary mb-3">
                  Acquisition Summary ({cartItems.length} items)
                </h4>
                <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
                  {cartItems.map((item) => (
                    <div
                      key={item._id}
                      className="flex items-center justify-between text-xs p-2 rounded-xl glass border border-luxe-glassBorder"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-8 h-8 rounded-lg object-cover bg-black/40"
                        />
                        <span className="text-luxe-primary font-medium truncate">{item.name}</span>
                        <span className="text-luxe-secondary">×{item.qty}</span>
                      </div>
                      <span className="text-amber-300 font-bold ml-2">
                        {formatPKR(Number(item.price) * item.qty)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping Address Inputs */}
              <div>
                <h4 className="text-xs uppercase font-bold tracking-wider text-luxe-secondary mb-3">
                  White-Glove Shipping Address
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-luxe-secondary mb-1">Street Address</label>
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full bg-black/20 dark:bg-white/5 border border-luxe-glassBorder rounded-xl px-3 py-2 text-xs text-luxe-primary focus:outline-none focus:border-yellow-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-luxe-secondary mb-1">City</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full bg-black/20 dark:bg-white/5 border border-luxe-glassBorder rounded-xl px-3 py-2 text-xs text-luxe-primary focus:outline-none focus:border-yellow-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-luxe-secondary mb-1">Postal Code</label>
                    <input
                      type="text"
                      required
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="w-full bg-black/20 dark:bg-white/5 border border-luxe-glassBorder rounded-xl px-3 py-2 text-xs text-luxe-primary focus:outline-none focus:border-yellow-500/50"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-luxe-secondary mb-1">Country</label>
                    <input
                      type="text"
                      required
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full bg-black/20 dark:bg-white/5 border border-luxe-glassBorder rounded-xl px-3 py-2 text-xs text-luxe-primary focus:outline-none focus:border-yellow-500/50"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <h4 className="text-xs uppercase font-bold tracking-wider text-luxe-secondary mb-3">
                  Payment Method
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'CreditCard', label: 'Credit Card', icon: '💳' },
                    { id: 'PayPal', label: 'PayPal', icon: '🅿️' },
                    { id: 'Crypto', label: 'Crypto/Wire', icon: '₿' },
                  ].map((pm) => (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setPaymentMethod(pm.id)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        paymentMethod === pm.id
                          ? 'border-yellow-500 bg-yellow-500/10 text-yellow-300 shadow-md'
                          : 'border-luxe-glassBorder glass text-luxe-secondary hover:text-luxe-primary'
                      }`}
                    >
                      <div className="text-lg mb-1">{pm.icon}</div>
                      <div className="text-[11px] font-semibold">{pm.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Total & Action Button */}
              <div className="pt-4 border-t border-luxe-glassBorder flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-luxe-secondary block">Total Investment</span>
                  <span className="text-xl font-bold font-serif text-amber-300">
                    {formatPKR(totalPrice)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-black text-xs uppercase font-bold tracking-widest shadow-xl shadow-yellow-500/20 hover:scale-105 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSubmitting ? 'Securing Acquisition...' : 'Complete Acquisition'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
