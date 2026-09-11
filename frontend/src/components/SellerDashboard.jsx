import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import { formatPKR } from '../utils/currency';

export default function SellerDashboard({ onNavigateShop }) {
  const { user, refreshProfile } = useAuth();
  const { stockOverrides } = useSocket();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshingStatus, setRefreshingStatus] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'orders'
  
  // Orders State
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderStatusUpdating, setOrderStatusUpdating] = useState(null);

  // Modal states for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState('');

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    category: 'Watches',
    price: '',
    countInStock: '',
    description: '',
    image: '',
  });

  const isApproved = Boolean(user && user.isApproved);

  const fetchSellerProducts = useCallback(async () => {
    if (!isApproved) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMySellerProducts();
      setProducts(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Failed to fetch boutique inventory');
    }
  }, [isApproved]);

  const fetchSellerOrders = useCallback(async () => {
    if (!isApproved) return;
    setLoadingOrders(true);
    try {
      const data = await api.getSellerOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  }, [isApproved]);

  useEffect(() => {
    fetchSellerProducts();
    fetchSellerOrders();
  }, [fetchSellerProducts, fetchSellerOrders]);

  const handleRefreshStatus = async () => {
    setRefreshingStatus(true);
    try {
      await refreshProfile();
      await fetchSellerProducts();
      await fetchSellerOrders();
    } finally {
      setTimeout(() => setRefreshingStatus(false), 600);
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    setOrderStatusUpdating(orderId);
    try {
      const updatedOrder = await api.updateOrderStatus(orderId, newStatus);
      setOrders((prev) =>
        prev.map((ord) => (ord._id === orderId ? { ...ord, orderStatus: updatedOrder.orderStatus } : ord))
      );
    } catch (err) {
      alert(err.message || 'Failed to update order status');
    } finally {
      setOrderStatusUpdating(null);
    }
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      brand: user?.storeName || 'LUXE Atelier',
      category: 'Watches',
      price: '',
      countInStock: '5',
      description: '',
      image: '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      brand: product.brand || '',
      category: product.category || 'Watches',
      price: String(product.price || ''),
      countInStock: String(
        stockOverrides[product._id] !== undefined ? stockOverrides[product._id] : product.countInStock || 0
      ),
      description: product.description || '',
      image: product.image || '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const uploadFileHandler = async (e) => {
    const file = e.target.files[0];
    const formDataObj = new FormData();
    formDataObj.append('image', file);
    setUploading(true);

    try {
      const imagePath = await api.uploadImage(formDataObj);
      setFormData({ ...formData, image: imagePath });
      setUploading(false);
    } catch (error) {
      console.error(error);
      setFormError('Image upload failed');
      setUploading(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      const payload = {
        name: formData.name,
        brand: formData.brand,
        category: formData.category,
        price: Number(formData.price),
        countInStock: Number(formData.countInStock),
        description: formData.description,
        image: formData.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30',
      };

      if (editingProduct) {
        const updated = await api.updateProduct(editingProduct._id, payload);
        setProducts((prev) =>
          prev.map((p) => (p._id === editingProduct._id ? updated : p))
        );
      } else {
        const created = await api.createProduct(payload);
        setProducts((prev) => [created, ...prev]);
      }

      setIsModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'Operation failed');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (productId, productName) => {
    if (!window.confirm(`Are you certain you wish to withdraw "${productName}" from your inventory?`)) {
      return;
    }
    try {
      await api.deleteProduct(productId);
      setProducts((prev) => prev.filter((p) => p._id !== productId));
    } catch (err) {
      alert(err.message || 'Failed to delete product');
    }
  };

  // Metrics
  const totalItemsInStock = products.reduce((acc, p) => {
    const stock = stockOverrides[p._id] !== undefined ? stockOverrides[p._id] : p.countInStock;
    return acc + (Number(stock) || 0);
  }, 0);

  const totalVaultValue = products.reduce((acc, p) => {
    const stock = stockOverrides[p._id] !== undefined ? stockOverrides[p._id] : p.countInStock;
    return acc + (Number(p.price) || 0) * (Number(stock) || 0);
  }, 0);

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="glass rounded-3xl p-6 sm:p-8 border border-luxe-glassBorder flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-3xl">💎</span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-luxe-primary">
                {user?.storeName || 'Merchant Atelier'}
              </h1>
              <p className="text-xs text-luxe-secondary flex items-center flex-wrap gap-1.5 pt-0.5">
                <span>Registered Merchant:</span>
                <span className="text-luxe-primary font-semibold">{user?.name}</span>
                <span>({user?.email})</span>
                {user?.accountId && (
                  <span className="font-mono text-[11px] font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/20">
                    ID: {user.accountId}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Approval Badge & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {isApproved ? (
            <span className="px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-bold flex items-center gap-2 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Verified & Approved Merchant
            </span>
          ) : (
            <span className="px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-2 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              Pending Admin Verification
            </span>
          )}

          <button
            onClick={handleRefreshStatus}
            disabled={refreshingStatus}
            className="p-2.5 rounded-full glass border border-luxe-glassBorder hover:border-yellow-500/50 text-luxe-secondary hover:text-luxe-primary transition-all text-xs"
            title="Refresh Account Status"
          >
            {refreshingStatus ? '⏳' : '🔄'}
          </button>

          {isApproved && (
            <button
              onClick={openCreateModal}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-black text-xs uppercase font-bold tracking-wider shadow-lg shadow-yellow-500/20 hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>+</span>
              <span>List New Piece</span>
            </button>
          )}
        </div>
      </div>

      {/* PENDING APPROVAL WARNING BANNER */}
      {!isApproved && (
        <div className="glass rounded-3xl p-8 border border-amber-500/40 bg-amber-500/10 space-y-4">
          <div className="flex items-start gap-4">
            <span className="text-4xl">🛡️</span>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-amber-300">
                Awaiting Administrator Approval
              </h2>
              <p className="text-xs text-luxe-secondary leading-relaxed max-w-3xl">
                Your seller application has been registered in the Luxe verification vault. In order to preserve the sovereign exclusivity and authenticity of our marketplace, all new merchant profiles must be manually approved by the Administrator before products can be published.
              </p>
              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={handleRefreshStatus}
                  className="px-4 py-2 rounded-xl bg-amber-400 text-black text-xs font-bold hover:bg-amber-300 transition-all shadow-md cursor-pointer"
                >
                  Check Verification Status
                </button>
                {onNavigateShop && (
                  <button
                    onClick={onNavigateShop}
                    className="px-4 py-2 rounded-xl glass border border-luxe-glassBorder text-xs text-luxe-primary hover:bg-white/5 transition-all"
                  >
                    Browse Marketplace
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* APPROVED SELLER VIEW */}
      {isApproved && (
        <>
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass rounded-2xl p-5 border border-luxe-glassBorder space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-luxe-secondary">
                Active Listings
              </span>
              <p className="text-3xl font-serif font-bold text-luxe-primary">
                {products.length}
              </p>
            </div>

            <div className="glass rounded-2xl p-5 border border-luxe-glassBorder space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-luxe-secondary">
                Total Units In Vault
              </span>
              <p className="text-3xl font-serif font-bold text-emerald-400">
                {totalItemsInStock}
              </p>
            </div>

            <div className="glass rounded-2xl p-5 border border-luxe-glassBorder space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-luxe-secondary">
                Boutique Vault Valuation
              </span>
              <p className="text-3xl font-serif font-bold text-amber-300">
                {formatPKR(totalVaultValue)}
              </p>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="flex space-x-4 border-b border-luxe-glassBorder">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`pb-4 px-2 text-sm font-bold uppercase tracking-widest transition-colors relative ${
                activeTab === 'inventory' ? 'text-amber-300' : 'text-luxe-secondary hover:text-luxe-primary'
              }`}
            >
              🛍️ Boutique Inventory
              {activeTab === 'inventory' && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-400 rounded-t-full shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`pb-4 px-2 text-sm font-bold uppercase tracking-widest transition-colors relative ${
                activeTab === 'orders' ? 'text-amber-300' : 'text-luxe-secondary hover:text-luxe-primary'
              }`}
            >
              📦 Order Management
              {orders.length > 0 && (
                <span className="ml-2 bg-amber-500/20 text-amber-300 py-0.5 px-2 rounded-full text-[10px]">
                  {orders.length}
                </span>
              )}
              {activeTab === 'orders' && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-400 rounded-t-full shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
              )}
            </button>
          </div>

          {/* Inventory Tab Content */}
          {activeTab === 'inventory' && (
            <div className="glass rounded-3xl p-6 sm:p-8 border border-luxe-glassBorder space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-serif font-bold text-luxe-primary">
                  Your Vault Catalog
                </h2>
                <p className="text-xs text-luxe-secondary">
                  Only pieces listed by your merchant account are shown here. You have sovereign control over these listings.
                </p>
              </div>
              <button
                onClick={openCreateModal}
                className="hidden sm:flex px-4 py-2 rounded-xl bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-xs font-bold hover:bg-yellow-500/30 transition-all items-center gap-1.5 cursor-pointer"
              >
                <span>+</span> Add Product
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-luxe-secondary">
                Retrieving your boutique catalog...
              </div>
            ) : error ? (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {error}
              </div>
            ) : products.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <span className="text-4xl block">📦</span>
                <p className="text-sm font-semibold text-luxe-primary">
                  No products listed yet
                </p>
                <p className="text-xs text-luxe-secondary max-w-sm mx-auto">
                  Click the button below to publish your first high-end watch, fine jewelry, or luxury leather item.
                </p>
                <button
                  onClick={openCreateModal}
                  className="mt-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-xs font-bold uppercase tracking-wider shadow-lg hover:scale-105 transition-all"
                >
                  List First Piece
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[11px] uppercase tracking-wider text-luxe-secondary border-b border-luxe-glassBorder">
                    <tr>
                      <th className="pb-3 pl-2">Product</th>
                      <th className="pb-3">Category</th>
                      <th className="pb-3">Price</th>
                      <th className="pb-3">Live Stock</th>
                      <th className="pb-3 text-right pr-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-luxe-glassBorder/60">
                    {products.map((p) => {
                      const stock =
                        stockOverrides[p._id] !== undefined
                          ? stockOverrides[p._id]
                          : p.countInStock;
                      const isOut = stock <= 0;

                      return (
                        <tr key={p._id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-4 pl-2">
                            <div className="flex items-center gap-3">
                              <img
                                src={p.image}
                                alt={p.name}
                                className="w-12 h-12 rounded-xl object-cover border border-luxe-glassBorder"
                              />
                              <div>
                                <span className="font-bold text-luxe-primary block">
                                  {p.name}
                                </span>
                                <span className="text-[10px] text-luxe-secondary">
                                  {p.brand}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 text-luxe-secondary">{p.category}</td>
                          <td className="py-4 font-serif font-bold text-amber-300">
                            {formatPKR(p.price)}
                          </td>
                          <td className="py-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                !isOut
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                              }`}
                            >
                              {!isOut ? `${stock} in stock` : 'Out of Stock'}
                            </span>
                          </td>
                          <td className="py-4 text-right pr-2">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEditModal(p)}
                                className="px-3 py-1.5 rounded-lg border border-luxe-glassBorder hover:border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(p._id, p.name)}
                                className="px-3 py-1.5 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          )}

          {/* Orders Tab Content */}
          {activeTab === 'orders' && (
            <div className="glass rounded-3xl p-6 sm:p-8 border border-luxe-glassBorder space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-serif font-bold text-luxe-primary">
                    Client Orders
                  </h2>
                  <p className="text-xs text-luxe-secondary">
                    Manage fulfillments and dispatch updates for your clients.
                  </p>
                </div>
                <button
                  onClick={fetchSellerOrders}
                  disabled={loadingOrders}
                  className="px-4 py-2 rounded-xl glass border border-luxe-glassBorder text-xs text-luxe-secondary hover:text-luxe-primary transition-all flex items-center gap-2"
                >
                  {loadingOrders ? '⏳ Syncing...' : '🔄 Sync Orders'}
                </button>
              </div>

              {loadingOrders && orders.length === 0 ? (
                <div className="py-12 text-center text-xs text-luxe-secondary">
                  Retrieving client orders...
                </div>
              ) : orders.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <span className="text-4xl block">📝</span>
                  <p className="text-sm font-semibold text-luxe-primary">
                    No orders yet
                  </p>
                  <p className="text-xs text-luxe-secondary max-w-sm mx-auto">
                    When clients acquire pieces from your boutique, they will appear here for fulfillment.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((ord) => (
                    <div
                      key={ord._id}
                      className="glass rounded-2xl p-5 border border-luxe-glassBorder space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-luxe-glassBorder pb-4">
                        <div>
                          <p className="text-xs font-mono font-bold text-amber-300">
                            #{ord._id.slice(-8).toUpperCase()}
                          </p>
                          <p className="text-[10px] text-luxe-secondary">
                            {new Date(ord.createdAt).toLocaleDateString()} • {ord.paymentMethod}
                          </p>
                        </div>
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] text-luxe-secondary block">Total</span>
                          <span className="text-base font-serif font-bold text-luxe-primary">
                            {formatPKR(ord.totalPrice)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 space-y-2">
                          <p className="text-[10px] uppercase font-bold text-luxe-secondary">Client</p>
                          <p className="text-xs font-medium text-luxe-primary">{ord.user?.name}</p>
                          <p className="text-[11px] text-luxe-secondary">{ord.user?.email}</p>
                          <p className="text-[10px] text-luxe-secondary max-w-xs mt-1">
                            {ord.shippingAddress?.address}, {ord.shippingAddress?.city}, {ord.shippingAddress?.country}
                          </p>
                        </div>
                        <div className="flex-1 space-y-2">
                          <p className="text-[10px] uppercase font-bold text-luxe-secondary">Items</p>
                          <div className="space-y-1">
                            {ord.orderItems.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-[11px]">
                                <span className="text-luxe-primary truncate pr-2">
                                  {item.qty}x {item.name}
                                </span>
                                <span className="text-amber-300 whitespace-nowrap">
                                  {formatPKR(item.price * item.qty)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex-1 space-y-2">
                          <p className="text-[10px] uppercase font-bold text-luxe-secondary">Fulfillment Status</p>
                          <select
                            value={ord.orderStatus || 'Order Placed'}
                            onChange={(e) => handleUpdateOrderStatus(ord._id, e.target.value)}
                            disabled={orderStatusUpdating === ord._id}
                            className={`w-full bg-black/20 border border-luxe-glassBorder rounded-xl px-3 py-2 text-xs font-bold transition-all focus:outline-none focus:border-yellow-500/50 ${
                              ord.orderStatus === 'Delivered'
                                ? 'text-emerald-400 bg-emerald-500/10'
                                : 'text-amber-300'
                            }`}
                          >
                            <option value="Order Placed">Order Placed</option>
                            <option value="Processing">Processing</option>
                            <option value="Pack Ready">Pack Ready</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Out for Delivery">Out for Delivery</option>
                            <option value="Delivered">Delivered</option>
                          </select>
                          {orderStatusUpdating === ord._id && (
                            <p className="text-[10px] text-yellow-400 animate-pulse mt-1">Updating...</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* CREATE / EDIT PRODUCT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div
            className="relative w-full max-w-lg glass rounded-3xl border border-luxe-glassBorder overflow-hidden shadow-2xl bg-luxe-surface/95 max-h-[90vh] overflow-y-auto p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-luxe-glassBorder">
              <h3 className="text-lg font-serif font-bold text-luxe-primary">
                {editingProduct ? 'Edit Luxury Piece' : 'List New Luxury Piece'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-luxe-secondary hover:text-luxe-primary"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-luxe-secondary font-medium mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Patek Philippe Calatrava 5227"
                  className="w-full bg-black/20 dark:bg-white/5 border border-luxe-glassBorder rounded-xl px-3.5 py-2 text-luxe-primary focus:outline-none focus:border-yellow-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-luxe-secondary font-medium mb-1">
                    Brand / Maison
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="e.g. Patek Philippe"
                    className="w-full bg-black/20 dark:bg-white/5 border border-luxe-glassBorder rounded-xl px-3.5 py-2 text-luxe-primary focus:outline-none focus:border-yellow-500/50"
                  />
                </div>
                <div>
                  <label className="block text-luxe-secondary font-medium mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-black/20 dark:bg-white/5 border border-luxe-glassBorder rounded-xl px-3.5 py-2 text-luxe-primary focus:outline-none focus:border-yellow-500/50"
                  >
                    <option value="Watches" className="bg-zinc-900 text-white">Watches</option>
                    <option value="Jewelry" className="bg-zinc-900 text-white">Jewelry</option>
                    <option value="Leather Goods" className="bg-zinc-900 text-white">Leather Goods</option>
                    <option value="Accessories" className="bg-zinc-900 text-white">Accessories</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-luxe-secondary font-medium mb-1">
                    Price (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="e.g. 32000"
                    className="w-full bg-black/20 dark:bg-white/5 border border-luxe-glassBorder rounded-xl px-3.5 py-2 text-luxe-primary focus:outline-none focus:border-yellow-500/50"
                  />
                </div>
                <div>
                  <label className="block text-luxe-secondary font-medium mb-1">
                    Initial Stock Count
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.countInStock}
                    onChange={(e) => setFormData({ ...formData, countInStock: e.target.value })}
                    placeholder="e.g. 5"
                    className="w-full bg-black/20 dark:bg-white/5 border border-luxe-glassBorder rounded-xl px-3.5 py-2 text-luxe-primary focus:outline-none focus:border-yellow-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-luxe-secondary font-medium mb-1">
                  Product Image
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={uploadFileHandler}
                    className="w-full bg-black/20 dark:bg-white/5 border border-luxe-glassBorder rounded-xl px-3.5 py-2 text-luxe-primary focus:outline-none focus:border-yellow-500/50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-50/10 file:text-yellow-400 hover:file:bg-yellow-50/20"
                  />
                  {uploading && <span className="text-xs text-yellow-400">Uploading...</span>}
                </div>
                {formData.image && !uploading && (
                  <div className="mt-2 text-[10px] text-emerald-400">Image successfully uploaded/linked.</div>
                )}
              </div>

              <div>
                <label className="block text-luxe-secondary font-medium mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Details regarding movement, gemstones, carat weight, provenance..."
                  className="w-full bg-black/20 dark:bg-white/5 border border-luxe-glassBorder rounded-xl px-3.5 py-2 text-luxe-primary focus:outline-none focus:border-yellow-500/50"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl glass border border-luxe-glassBorder text-luxe-secondary hover:text-luxe-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-black font-bold uppercase tracking-wider shadow-lg shadow-yellow-500/20 cursor-pointer disabled:opacity-50"
                >
                  {formLoading ? 'Publishing...' : editingProduct ? 'Save Changes' : 'Publish Listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
