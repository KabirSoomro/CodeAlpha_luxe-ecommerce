import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import { formatPKR } from '../utils/currency';

export default function CustomerProfile({ onNavigateShop }) {
  const { user, isAuthenticated, logout, updateProfile } = useAuth();
  const { orderStatusUpdates } = useSocket();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // Profile Edit Modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editStoreName, setEditStoreName] = useState('');
  const [editStoreDescription, setEditStoreDescription] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const openEditModal = () => {
    setEditName(user?.name || '');
    setEditEmail(user?.email || '');
    setEditPassword('');
    setEditStoreName(user?.storeName || '');
    setEditStoreDescription(user?.storeDescription || '');
    setEditError('');
    setEditSuccess('');
    setShowEditModal(true);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');
    setEditSuccess('');
    try {
      const payload = {
        name: editName,
        email: editEmail,
      };
      if (editPassword.trim()) {
        if (editPassword.trim().length < 6) {
          setEditError('Password must be at least 6 characters');
          setEditLoading(false);
          return;
        }
        payload.password = editPassword.trim();
      }
      if (user?.role === 'Seller') {
        payload.storeName = editStoreName;
        payload.storeDescription = editStoreDescription;
      }
      await updateProfile(payload);
      setEditSuccess('Profile updated successfully!');
      setTimeout(() => {
        setShowEditModal(false);
      }, 1200);
    } catch (err) {
      setEditError(err.message || 'Failed to update profile');
    } finally {
      setEditLoading(false);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMyOrders();
      setOrders(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Failed to retrieve order history');
    }
  };

  const toggleExpand = (orderId) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="glass rounded-3xl p-12 border border-luxe-glassBorder max-w-md mx-auto space-y-4">
          <div className="text-4xl">🔐</div>
          <h2 className="text-xl font-serif font-bold text-luxe-primary">Private Client Access</h2>
          <p className="text-xs text-luxe-secondary">
            Please sign in to view your order history and membership portfolio.
          </p>
        </div>
      </div>
    );
  }

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'L';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fadeIn">
      {/* Account Profile Card matching test IDs */}
      <div className="account-card glass rounded-3xl p-6 sm:p-8 border border-luxe-glassBorder shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-amber-500/5 via-yellow-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
          {/* Avatar */}
          <div
            id="user-avatar"
            className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-black font-serif font-bold text-3xl flex items-center justify-center shadow-lg shadow-yellow-500/20 flex-shrink-0"
          >
            {initial}
          </div>

          {/* Account Details */}
          <div className="text-center sm:text-left flex-1 space-y-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <h1 id="user-name" className="text-2xl font-serif font-bold text-luxe-primary">
                {user?.name || 'Valued Collector'}
              </h1>
              <span
                id="user-role-badge"
                className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${
                  user?.role === 'Admin'
                    ? 'border-amber-400 bg-amber-400/10 text-amber-300'
                    : 'border-emerald-400 bg-emerald-400/10 text-emerald-300'
                }`}
              >
                {user?.role || 'Customer'}
              </span>
            </div>
            <p id="user-email" className="text-xs text-luxe-secondary">
              {user?.email}
            </p>
            <p className="text-[11px] text-luxe-secondary/80 pt-1">
              Account ID:{' '}
              <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {user?.accountId || user?._id}
              </span>
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={openEditModal}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-xs font-bold shadow-md hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>✏️</span>
              <span>Edit Profile</span>
            </button>
            <button
              onClick={fetchOrders}
              className="px-4 py-2 rounded-xl glass border border-luxe-glassBorder hover:border-yellow-500/40 text-xs font-semibold text-luxe-secondary hover:text-luxe-primary transition-all flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 rounded-xl border border-rose-500/30 hover:bg-rose-500/10 text-rose-400 text-xs font-semibold transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Orders Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-serif font-bold text-luxe-primary">Acquisition Portfolio</h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/5 border border-luxe-glassBorder text-luxe-secondary">
              {orders.length} {orders.length === 1 ? 'Order' : 'Orders'}
            </span>
          </div>
          {onNavigateShop && (
            <button
              onClick={onNavigateShop}
              className="text-xs text-yellow-400 hover:text-yellow-300 font-semibold transition-colors"
            >
              Browse Boutique →
            </button>
          )}
        </div>

        {/* Orders Container matching test ID */}
        <div id="orders-container" className="space-y-4">
          {loading ? (
            <div className="glass rounded-2xl p-12 text-center border border-luxe-glassBorder">
              <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-luxe-secondary">Retrieving encrypted purchase records...</p>
            </div>
          ) : error ? (
            <div className="glass rounded-2xl p-8 text-center border border-rose-500/30 text-rose-400 text-xs">
              {error}
            </div>
          ) : orders.length === 0 ? (
            <div className="glass rounded-3xl p-12 text-center border border-luxe-glassBorder space-y-4">
              <div className="text-4xl">📦</div>
              <h3 className="font-serif text-lg font-bold text-luxe-primary">
                No Acquisitions Recorded Yet
              </h3>
              <p className="text-xs text-luxe-secondary max-w-sm mx-auto">
                Your collection has not begun. Browse our catalog of haute horlogerie and curated
                luxury goods to place your premier acquisition.
              </p>
              {onNavigateShop && (
                <button
                  onClick={onNavigateShop}
                  className="px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-xs font-bold shadow-md hover:scale-105 transition-all"
                >
                  Explore Collection
                </button>
              )}
            </div>
          ) : (
            orders.map((order) => {
              const isExpanded = expandedOrderId === order._id;
              const dateStr = new Date(order.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              });

              return (
                <div
                  key={order._id}
                  className="glass rounded-2xl border border-luxe-glassBorder overflow-hidden transition-all hover:border-yellow-500/30"
                >
                  {/* Order Summary Row */}
                  <div
                    onClick={() => toggleExpand(order._id)}
                    className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-white/5 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-bold text-amber-300">
                          #{order._id.slice(-8).toUpperCase()}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                            (orderStatusUpdates[order._id]?.orderStatus || order.orderStatus) === 'Delivered'
                              ? 'border-emerald-400 bg-emerald-400/10 text-emerald-400'
                              : 'border-yellow-400/40 bg-yellow-400/10 text-yellow-300'
                          }`}
                        >
                          {orderStatusUpdates[order._id]?.orderStatus || order.orderStatus || (order.isDelivered ? 'Delivered' : 'Order Placed')}
                        </span>
                      </div>
                      <p className="text-xs text-luxe-secondary">Placed on {dateStr}</p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] text-luxe-secondary block">Total Investment</span>
                        <span className="text-base font-serif font-bold text-luxe-primary">
                          {formatPKR(order.totalPrice)}
                        </span>
                      </div>

                      <span className="text-luxe-secondary text-sm">
                        {isExpanded ? '▲' : '▼'}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Items Drawer */}
                  {isExpanded && (
                    <div className="p-5 sm:p-6 border-t border-luxe-glassBorder bg-black/20 space-y-4">
                      <h4 className="text-xs uppercase font-bold tracking-wider text-luxe-secondary">
                        Acquired Items
                      </h4>
                      <div className="space-y-2">
                        {order.orderItems?.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3 rounded-xl glass border border-luxe-glassBorder"
                          >
                            <div className="flex items-center gap-3 truncate">
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-10 h-10 rounded-lg object-cover bg-black/40"
                              />
                              <div className="truncate">
                                <p className="text-xs font-bold text-luxe-primary truncate">
                                  {item.name}
                                </p>
                                <p className="text-[10px] text-luxe-secondary">Quantity: {item.qty}</p>
                              </div>
                            </div>
                            <span className="text-xs font-bold text-amber-300 ml-3">
                              {formatPKR(Number(item.price) * item.qty)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 flex flex-wrap justify-between text-[11px] text-luxe-secondary border-t border-luxe-glassBorder">
                        <span>
                          Shipping to:{' '}
                          <span className="text-luxe-primary">
                            {order.shippingAddress?.address}, {order.shippingAddress?.city}
                          </span>
                        </span>
                        <span>
                          Payment via:{' '}
                          <span className="text-luxe-primary font-medium">{order.paymentMethod}</span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="glass rounded-3xl border border-luxe-glassBorder w-full max-w-lg overflow-hidden shadow-2xl space-y-4 p-6 sm:p-8">
            <div className="flex items-center justify-between pb-4 border-b border-luxe-glassBorder">
              <div className="flex items-center gap-2">
                <span className="text-xl">✏️</span>
                <h3 className="text-lg font-serif font-bold text-luxe-primary">
                  Update Member Credentials
                </h3>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-luxe-secondary hover:text-luxe-primary text-xl font-bold p-1 transition-colors"
              >
                ✕
              </button>
            </div>

            {editSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <span>✅</span>
                <span>{editSuccess}</span>
              </div>
            )}

            {editError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <span>⚠️</span>
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleProfileSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-luxe-secondary font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl glass border border-luxe-glassBorder text-luxe-primary focus:border-amber-400 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-luxe-secondary font-semibold mb-1">Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl glass border border-luxe-glassBorder text-luxe-primary focus:border-amber-400 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-luxe-secondary font-semibold mb-1">
                  New Password <span className="text-[10px] text-luxe-secondary font-normal">(Leave blank to keep unchanged)</span>
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl glass border border-luxe-glassBorder text-luxe-primary focus:border-amber-400 focus:outline-none transition-all"
                />
              </div>

              {user?.role === 'Seller' && (
                <>
                  <div>
                    <label className="block text-luxe-secondary font-semibold mb-1">Boutique Name</label>
                    <input
                      type="text"
                      value={editStoreName}
                      onChange={(e) => setEditStoreName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl glass border border-luxe-glassBorder text-luxe-primary focus:border-amber-400 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-luxe-secondary font-semibold mb-1">Boutique Description</label>
                    <textarea
                      value={editStoreDescription}
                      onChange={(e) => setEditStoreDescription(e.target.value)}
                      rows="2"
                      className="w-full px-4 py-2.5 rounded-xl glass border border-luxe-glassBorder text-luxe-primary focus:border-amber-400 focus:outline-none transition-all resize-none"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-luxe-glassBorder">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl glass border border-luxe-glassBorder text-luxe-secondary hover:text-luxe-primary transition-all font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-xs font-bold shadow-md hover:scale-105 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {editLoading ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
