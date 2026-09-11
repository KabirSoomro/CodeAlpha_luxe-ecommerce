import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import { formatPKR } from '../utils/currency';

export default function AdminDashboard() {
  const { user, isAdmin, isAuthenticated } = useAuth();
  const { isConnected } = useSocket();

  const [activeTab, setActiveTab] = useState('products'); // 'products' | 'orders' | 'sellers'
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [metrics, setMetrics] = useState({
    totalProducts: 0,
    lowStock: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalSellers: 0,
    pendingSellers: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionMessage, setActionMessage] = useState('');

  // Modal for Create/Edit Product
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    category: 'Watches',
    price: '',
    countInStock: '',
    image: '',
    description: '',
  });

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      loadDashboardData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, isAdmin]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch sellers separately so a failure doesn't block products/orders
      const [prodsData, ordersData] = await Promise.all([
        api.getProducts(),
        api.getAllOrders(),
      ]);

      let sellersData = [];
      try {
        const sellerRes = await api.getAllSellers();
        // API may return array directly or { data: [...] } or { sellers: [...] }
        if (Array.isArray(sellerRes)) {
          sellersData = sellerRes;
        } else if (sellerRes && Array.isArray(sellerRes.data)) {
          sellersData = sellerRes.data;
        } else if (sellerRes && Array.isArray(sellerRes.sellers)) {
          sellersData = sellerRes.sellers;
        }
      } catch (sellerErr) {
        console.warn('Seller fetch failed (check admin token):', sellerErr.message);
        setActionMessage('⚠️ Seller data unavailable — please log out and log back in as Admin, then refresh.');
      }

      const prods = Array.isArray(prodsData) ? prodsData : [];
      const ords = Array.isArray(ordersData) ? ordersData : [];
      const sellrs = sellersData;

      setProducts(prods);
      setOrders(ords);
      setSellers(sellrs);

      // Compute metrics
      const lowStockCount = prods.filter((p) => (p.countInStock ?? 0) <= 3).length;
      const revenue = ords.reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);
      const pendingSellersCount = sellrs.filter((s) => !s.isApproved).length;

      setMetrics({
        totalProducts: prods.length,
        lowStock: lowStockCount,
        totalOrders: ords.length,
        totalRevenue: revenue,
        totalSellers: sellrs.length,
        pendingSellers: pendingSellersCount,
      });

      setLoading(false);
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Failed to load executive admin data');
    }
  };

  const handleOpenCreate = () => {
    setEditingProductId(null);
    setFormData({
      name: '',
      brand: 'Luxe Royal',
      category: 'Watches',
      price: '1299.99',
      countInStock: '10',
      image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9',
      description: 'Exclusive handcrafted timepiece with Swiss movement and sapphire crystal glass.',
    });
    setShowProductModal(true);
  };

  const handleOpenEdit = (prod) => {
    setEditingProductId(prod._id);
    setFormData({
      name: prod.name,
      brand: prod.brand || 'Luxe Royal',
      category: prod.category || 'Watches',
      price: prod.price,
      countInStock: prod.countInStock,
      image: prod.image,
      description: prod.description || '',
    });
    setShowProductModal(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        brand: formData.brand,
        category: formData.category,
        price: Number(formData.price),
        countInStock: Number(formData.countInStock),
        image: formData.image,
        description: formData.description,
      };

      if (editingProductId) {
        await api.updateProduct(editingProductId, payload);
      } else {
        await api.createProduct(payload);
      }

      setShowProductModal(false);
      loadDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to save product');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to retire this product from the vault?')) return;
    try {
      await api.deleteProduct(id);
      loadDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to delete product');
    }
  };

  const handleMarkDelivered = async (orderId) => {
    try {
      await api.deliverOrder(orderId);
      loadDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to update order status');
    }
  };

  const handleApproveSeller = async (sellerId, sellerName) => {
    try {
      await api.approveSeller(sellerId);
      setActionMessage(`Merchant "${sellerName}" approved! They can now list luxury pieces.`);
      setTimeout(() => setActionMessage(''), 4000);
      loadDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to approve seller');
    }
  };

  const handleRejectSeller = async (sellerId, sellerName) => {
    if (!window.confirm(`Revoke approval for merchant "${sellerName}"? They will no longer be able to publish products.`)) {
      return;
    }
    try {
      await api.rejectSeller(sellerId);
      setActionMessage(`Merchant "${sellerName}" approval revoked.`);
      setTimeout(() => setActionMessage(''), 4000);
      loadDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to revoke seller approval');
    }
  };

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="glass rounded-3xl p-12 border border-rose-500/30 max-w-md mx-auto space-y-4">
          <div className="text-4xl">🚫</div>
          <h2 className="text-xl font-serif font-bold text-rose-400">Restricted Executive Area</h2>
          <p className="text-xs text-luxe-secondary">
            You must hold validated Administrative authority to access this dashboard.
          </p>
        </div>
      </div>
    );
  }

  const pendingSellersCount = sellers.filter((s) => !s.isApproved).length;

  return (
    <div className="admin-wrapper max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fadeIn">
      {/* Header & WebSocket Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-luxe-glassBorder">
        <div>
          <h1 className="text-3xl font-serif font-bold text-luxe-primary">
            Executive Command & Inventory
          </h1>
          <p className="text-xs text-luxe-secondary mt-1">
            Real-time operations, merchant approvals, inventory vaults, and customer fulfillment.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Real-Time WebSocket Status matching test ID */}
          <div
            id="ws-indicator"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold backdrop-blur-md ${
              isConnected
                ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                : 'border-rose-400/40 bg-rose-400/10 text-rose-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'
              }`}
            />
            <span>{isConnected ? 'WebSocket Sync: Active' : 'WebSocket: Offline'}</span>
          </div>

          <button
            onClick={loadDashboardData}
            className="px-4 py-1.5 rounded-xl glass border border-luxe-glassBorder hover:border-yellow-500/40 text-xs font-semibold text-luxe-primary hover:bg-white/5 transition-all cursor-pointer"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
          <span>✨</span>
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Metrics Row matching test IDs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="glass rounded-2xl p-5 border border-luxe-glassBorder relative overflow-hidden">
          <span className="text-xs uppercase font-bold tracking-wider text-luxe-secondary block mb-1">
            Total Vault Items
          </span>
          <span id="metric-total-products" className="text-3xl font-serif font-bold text-luxe-primary">
            {metrics.totalProducts}
          </span>
          <span className="text-[11px] text-luxe-secondary block mt-1">Active luxury catalog</span>
        </div>

        <div className="glass rounded-2xl p-5 border border-luxe-glassBorder relative overflow-hidden">
          <span className="text-xs uppercase font-bold tracking-wider text-luxe-secondary block mb-1">
            Low Stock Alerts
          </span>
          <span
            id="metric-low-stock"
            className={`text-3xl font-serif font-bold ${
              metrics.lowStock > 0 ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {metrics.lowStock}
          </span>
          <span className="text-[11px] text-luxe-secondary block mt-1">≤ 3 units remaining</span>
        </div>

        <div className="glass rounded-2xl p-5 border border-luxe-glassBorder relative overflow-hidden">
          <span className="text-xs uppercase font-bold tracking-wider text-luxe-secondary block mb-1">
            Total Orders
          </span>
          <span id="metric-total-orders" className="text-3xl font-serif font-bold text-luxe-primary">
            {metrics.totalOrders}
          </span>
          <span className="text-[11px] text-luxe-secondary block mt-1">Client purchases</span>
        </div>

        <div className="glass rounded-2xl p-5 border border-luxe-glassBorder relative overflow-hidden">
          <span className="text-xs uppercase font-bold tracking-wider text-luxe-secondary block mb-1">
            Merchants
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-serif font-bold text-yellow-300">
              {sellers.length}
            </span>
            {pendingSellersCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold">
                {pendingSellersCount} Pending
              </span>
            )}
          </div>
          <span className="text-[11px] text-luxe-secondary block mt-1">Seller applications</span>
        </div>

        <div className="glass rounded-2xl p-5 border border-luxe-glassBorder relative overflow-hidden">
          <span className="text-xs uppercase font-bold tracking-wider text-luxe-secondary block mb-1">
            Total Revenue
          </span>
          <span id="metric-total-revenue" className="text-3xl font-serif font-bold text-amber-300">
            {formatPKR(metrics.totalRevenue)}
          </span>
          <span className="text-[11px] text-luxe-secondary block mt-1">Settled transactions</span>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center justify-between border-b border-luxe-glassBorder pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'products'
                ? 'bg-yellow-500 text-black shadow-md shadow-yellow-500/20'
                : 'glass text-luxe-secondary hover:text-luxe-primary border border-luxe-glassBorder'
            }`}
          >
            Catalog Inventory ({products.length})
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'orders'
                ? 'bg-yellow-500 text-black shadow-md shadow-yellow-500/20'
                : 'glass text-luxe-secondary hover:text-luxe-primary border border-luxe-glassBorder'
            }`}
          >
            Customer Orders ({orders.length})
          </button>

          <button
            onClick={() => setActiveTab('sellers')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'sellers'
                ? 'bg-yellow-500 text-black shadow-md shadow-yellow-500/20'
                : 'glass text-luxe-secondary hover:text-luxe-primary border border-luxe-glassBorder'
            }`}
          >
            <span>Merchant Approvals ({sellers.length})</span>
            {pendingSellersCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>
        </div>

        {activeTab === 'products' && (
          <button
            id="add-product-btn"
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-xs font-bold shadow-md hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>+</span>
            <span>Mint Product</span>
          </button>
        )}
      </div>

      {/* Tab 1: Products Management */}
      {activeTab === 'products' && (
        <div className="glass rounded-2xl border border-luxe-glassBorder overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-luxe-glassBorder bg-black/20 text-[11px] uppercase tracking-wider text-luxe-secondary font-bold">
                  <th className="p-4">Item</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Price</th>
                  <th className="p-4">Vault Stock</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody id="products-table-body" className="divide-y divide-luxe-glassBorder text-xs">
                {products.map((prod) => (
                  <tr key={prod._id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 flex items-center gap-3">
                      <img
                        src={prod.image}
                        alt={prod.name}
                        className="w-10 h-10 rounded-lg object-cover bg-black/40 border border-luxe-glassBorder"
                      />
                      <div>
                        <p className="font-bold text-luxe-primary truncate max-w-xs">{prod.name}</p>
                        <p className="text-[10px] text-luxe-secondary">
                          {prod.brand} {prod.user?.storeName ? `• ${prod.user.storeName}` : ''}
                        </p>
                      </div>
                    </td>
                    <td className="p-4 text-luxe-secondary">{prod.category}</td>
                    <td className="p-4 font-serif font-bold text-amber-300">
                      {formatPKR(prod.price)}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          prod.countInStock > 3
                            ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/30'
                            : prod.countInStock > 0
                            ? 'bg-yellow-400/10 text-yellow-300 border border-yellow-400/30'
                            : 'bg-rose-400/10 text-rose-400 border border-rose-400/30'
                        }`}
                      >
                        {prod.countInStock > 0 ? `${prod.countInStock} available` : 'Depleted'}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(prod)}
                        className="px-3 py-1 rounded-lg border border-luxe-glassBorder hover:border-yellow-500/40 text-yellow-400 text-xs hover:bg-yellow-500/10 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(prod._id)}
                        className="px-3 py-1 rounded-lg border border-rose-500/30 hover:border-rose-500 text-rose-400 text-xs hover:bg-rose-500/10 transition-colors"
                      >
                        Retire
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Orders Management */}
      {activeTab === 'orders' && (
        <div className="glass rounded-2xl border border-luxe-glassBorder overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-luxe-glassBorder bg-black/20 text-[11px] uppercase tracking-wider text-luxe-secondary font-bold">
                  <th className="p-4">Order ID</th>
                  <th className="p-4">Client</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Total</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Fulfillment</th>
                </tr>
              </thead>
              <tbody id="orders-table-body" className="divide-y divide-luxe-glassBorder text-xs">
                {orders.map((ord) => (
                  <tr key={ord._id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-mono text-[11px] text-luxe-secondary">
                      #{ord._id.slice(-6).toUpperCase()}
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-luxe-primary">{ord.user?.name || 'Private Client'}</p>
                      <p className="text-[10px] text-luxe-secondary">{ord.user?.email || 'N/A'}</p>
                    </td>
                    <td className="p-4 text-luxe-secondary">
                      {new Date(ord.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="p-4 font-serif font-bold text-luxe-primary">
                      {formatPKR(ord.totalPrice)}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          ord.isDelivered
                            ? 'border-emerald-400 bg-emerald-400/10 text-emerald-400'
                            : 'border-yellow-400/40 bg-yellow-400/10 text-yellow-300'
                        }`}
                      >
                        {ord.isDelivered ? 'Delivered' : 'Processing'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {!ord.isDelivered ? (
                        <button
                          onClick={() => handleMarkDelivered(ord._id)}
                          className="px-3 py-1 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-[11px] font-bold shadow-md hover:scale-105 transition-all"
                        >
                          Mark Delivered
                        </button>
                      ) : (
                        <span className="text-[11px] text-emerald-400 font-medium">✓ Completed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Merchant Approvals (NEW SELLER WORKFLOW) */}
      {activeTab === 'sellers' && (
        <div className="glass rounded-2xl border border-luxe-glassBorder overflow-hidden shadow-xl space-y-4 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-luxe-glassBorder">
            <div>
              <h2 className="text-lg font-serif font-bold text-luxe-primary">
                Merchant Verification Vault
              </h2>
              <p className="text-xs text-luxe-secondary">
                Review and approve external boutiques. Only approved merchants can publish luxury items to the public catalog.
              </p>
            </div>
            <span className="text-xs text-amber-300 font-semibold px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30">
              {pendingSellersCount} Awaiting Authorization
            </span>
          </div>

          {sellers.length === 0 ? (
            <div className="py-12 text-center text-xs text-luxe-secondary">
              No registered merchants found in the system.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-luxe-glassBorder bg-black/20 text-[11px] uppercase tracking-wider text-luxe-secondary font-bold">
                    <th className="p-4">Merchant & Boutique</th>
                    <th className="p-4">Contact</th>
                    <th className="p-4">Registered Date</th>
                    <th className="p-4">Approval Status</th>
                    <th className="p-4 text-right">Curatorial Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-luxe-glassBorder">
                  {sellers.map((s) => (
                    <tr key={s._id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-luxe-primary flex items-center gap-1.5">
                            <span>💎</span>
                            <span>{s.storeName || `${s.name}'s Boutique`}</span>
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-luxe-secondary">{s.name}</span>
                            {s.accountId && (
                              <span className="font-mono text-[10px] font-bold text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/20">
                                {s.accountId}
                              </span>
                            )}
                          </div>
                          {s.storeDescription && (
                            <p className="text-[10px] text-luxe-secondary/80 italic max-w-sm">
                              "{s.storeDescription}"
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-4 font-mono text-[11px] text-luxe-secondary">
                        {s.email}
                      </td>
                      <td className="p-4 text-luxe-secondary">
                        {new Date(s.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="p-4">
                        {s.isApproved ? (
                          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 inline-flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Approved Merchant
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 border border-amber-500/40 text-amber-300 inline-flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            Pending Review
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {!s.isApproved ? (
                          <button
                            onClick={() => handleApproveSeller(s._id, s.name)}
                            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold shadow-md hover:scale-105 transition-all cursor-pointer"
                          >
                            ✓ Approve Merchant
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRejectSeller(s._id, s.name)}
                            className="px-3 py-1 rounded-xl border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Revoke Approval
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Product Creation / Edit Modal matching test ID */}
      {showProductModal && (
        <div
          id="product-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
        >
          <div
            className="relative w-full max-w-lg glass rounded-3xl border border-luxe-glassBorder overflow-hidden shadow-2xl bg-luxe-surface/95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-luxe-glassBorder flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-luxe-primary">
                {editingProductId ? 'Edit Luxury Item' : 'Mint New Catalog Artifact'}
              </h3>
              <button
                onClick={() => setShowProductModal(false)}
                className="p-2 rounded-full glass border border-luxe-glassBorder hover:border-yellow-500/50 text-luxe-secondary hover:text-luxe-primary"
              >
                ✕
              </button>
            </div>

            <form id="create-product-form" onSubmit={handleSaveProduct} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] text-luxe-secondary mb-1">Product Title</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Audemars Piguet Royal Oak"
                  className="w-full bg-black/20 dark:bg-white/5 border border-luxe-glassBorder rounded-xl px-3 py-2 text-xs text-luxe-primary focus:outline-none focus:border-yellow-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-luxe-secondary mb-1">Brand</label>
                  <input
                    type="text"
                    required
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full bg-black/20 dark:bg-white/5 border border-luxe-glassBorder rounded-xl px-3 py-2 text-xs text-luxe-primary focus:outline-none focus:border-yellow-500/50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-luxe-secondary mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-black/20 dark:bg-white/5 border border-luxe-glassBorder rounded-xl px-3 py-2 text-xs text-luxe-primary focus:outline-none focus:border-yellow-500/50"
                  >
                    <option value="Watches" className="bg-zinc-900">Watches</option>
                    <option value="Jewelry" className="bg-zinc-900">Jewelry</option>
                    <option value="Leather Goods" className="bg-zinc-900">Leather Goods</option>
                    <option value="Accessories" className="bg-zinc-900">Accessories</option>
                    <option value="Fashion" className="bg-zinc-900">Fashion</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-luxe-secondary mb-1">Price ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full bg-black/20 dark:bg-white/5 border border-luxe-glassBorder rounded-xl px-3 py-2 text-xs text-luxe-primary focus:outline-none focus:border-yellow-500/50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-luxe-secondary mb-1">Vault Stock Count</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.countInStock}
                    onChange={(e) => setFormData({ ...formData, countInStock: e.target.value })}
                    className="w-full bg-black/20 dark:bg-white/5 border border-luxe-glassBorder rounded-xl px-3 py-2 text-xs text-luxe-primary focus:outline-none focus:border-yellow-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-luxe-secondary mb-1">Image URL</label>
                <input
                  type="url"
                  required
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-black/20 dark:bg-white/5 border border-luxe-glassBorder rounded-xl px-3 py-2 text-xs text-luxe-primary focus:outline-none focus:border-yellow-500/50"
                />
              </div>

              <div>
                <label className="block text-[11px] text-luxe-secondary mb-1">Curatorial Description</label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-black/20 dark:bg-white/5 border border-luxe-glassBorder rounded-xl px-3 py-2 text-xs text-luxe-primary focus:outline-none focus:border-yellow-500/50"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 rounded-xl glass border border-luxe-glassBorder text-xs text-luxe-secondary hover:text-luxe-primary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-xs font-bold shadow-md hover:scale-105 transition-all cursor-pointer"
                >
                  {editingProductId ? 'Save Changes' : 'Mint Artifact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
