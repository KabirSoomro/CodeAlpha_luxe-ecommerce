import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import ProductGrid from './components/ProductGrid';
import ProductDetailModal from './components/ProductDetailModal';
import CartDrawer from './components/CartDrawer';
import CheckoutModal from './components/CheckoutModal';
import AuthModal from './components/AuthModal';
import CustomerProfile from './components/CustomerProfile';
import AdminDashboard from './components/AdminDashboard';
import SellerDashboard from './components/SellerDashboard';
import { useAuth } from './context/AuthContext';
import api from './services/api';

export default function App() {
  const { user, isAdmin, isAuthenticated } = useAuth();

  // View state: 'catalog' | 'profile' | 'admin' | 'seller'
  const [activeView, setActiveView] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      if (path.includes('admin')) return 'admin';
      if (path.includes('seller')) return 'seller';
      if (path.includes('profile')) return 'profile';
    }
    return 'catalog';
  });

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  // Product data state
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals & Drawers
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch catalog products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getProducts({
        keyword: debouncedSearch,
        category: selectedCategory,
        sort: sortBy,
      });

      const prods = Array.isArray(data) ? data : [];
      setProducts(prods);

      // Populate window.currentProductsMap for test assertions
      if (typeof window !== 'undefined') {
        if (!window.currentProductsMap) window.currentProductsMap = {};
        prods.forEach((p) => {
          window.currentProductsMap[p._id] = p;
        });
      }

      setLoading(false);
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Failed to retrieve products');
    }
  }, [debouncedSearch, selectedCategory, sortBy]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Sync browser URL / history for clean routes (/admin, /profile, /)
  const handleViewChange = (newView) => {
    setActiveView(newView);
    if (typeof window !== 'undefined' && window.history) {
      const targetPath = newView === 'catalog' ? '/' : `/${newView}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState(null, '', targetPath);
      }
    }
  };

  // Popstate listener for back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      if (path.includes('admin')) {
        setActiveView('admin');
      } else if (path.includes('seller')) {
        setActiveView('seller');
      } else if (path.includes('profile')) {
        setActiveView('profile');
      } else {
        setActiveView('catalog');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <div className="min-h-screen bg-luxe-bg text-luxe-primary transition-colors duration-300 flex flex-col font-sans">
      {/* Luxury Navigation Bar */}
      <Navbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        activeView={activeView}
        setActiveView={handleViewChange}
        openAuthModal={() => setIsAuthOpen(true)}
        openCartDrawer={() => setIsCartOpen(true)}
        setSelectedCategory={setSelectedCategory}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Catalog / Boutique View */}
        {activeView === 'catalog' && (
          <div className="space-y-12">
            {/* Hero Banner (Only shown when not searching and category is All) */}
            {!searchTerm && selectedCategory === 'All' && (
              <div className="relative rounded-3xl p-8 sm:p-12 glass border border-luxe-glassBorder overflow-hidden shadow-2xl">
                <div className="absolute -right-16 -bottom-16 w-96 h-96 bg-gradient-to-tl from-amber-500/10 via-yellow-400/5 to-transparent rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 max-w-2xl space-y-4">
                  <span className="text-[11px] uppercase tracking-[0.3em] font-bold text-yellow-400 border border-yellow-400/30 px-3 py-1 rounded-full backdrop-blur-md">
                    Autumn Horology Collection 2026
                  </span>
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-luxe-primary tracking-tight leading-tight">
                    Curated Luxury, Redefined.
                  </h1>
                  <p className="text-sm text-luxe-secondary leading-relaxed max-w-xl">
                    Experience world-class haute horlogerie, certified conflict-free diamonds, and
                    bespoke leather goods curated by master connoisseurs.
                  </p>
                  <div className="pt-2 flex flex-wrap gap-4">
                    <button
                      onClick={() => setSelectedCategory('Watches')}
                      className="px-6 py-3 rounded-full bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-black text-xs uppercase font-bold tracking-widest shadow-lg shadow-yellow-500/20 hover:scale-105 transition-all"
                    >
                      Explore Timepieces
                    </button>
                    <button
                      onClick={() => setSelectedCategory('Jewelry')}
                      className="px-6 py-3 rounded-full glass border border-luxe-glassBorder hover:border-yellow-500/40 text-xs uppercase font-bold tracking-widest text-luxe-primary hover:bg-white/5 transition-all"
                    >
                      Fine Jewelry
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Product Grid & Filters */}
            <ProductGrid
              products={products}
              loading={loading}
              error={error}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              sortBy={sortBy}
              setSortBy={setSortBy}
              searchTerm={debouncedSearch}
              onSelectProduct={(p) => setSelectedProduct(p)}
            />
          </div>
        )}

        {/* Customer Profile View */}
        {activeView === 'profile' && (
          <CustomerProfile onNavigateShop={() => handleViewChange('catalog')} />
        )}

        {/* Merchant / Seller Dashboard View */}
        {activeView === 'seller' && (
          <SellerDashboard onNavigateShop={() => handleViewChange('catalog')} />
        )}

        {/* Admin Dashboard View */}
        {activeView === 'admin' && <AdminDashboard />}
      </main>

      {/* Global Modals & Drawers */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onProceedToCheckout={() => setIsCheckoutOpen(true)}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        openAuthModal={() => setIsAuthOpen(true)}
        onOrderPlaced={() => {
          handleViewChange('profile');
        }}
      />

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* Footer */}
      <footer className="glass border-t border-luxe-glassBorder mt-20 py-10 text-center text-xs text-luxe-secondary">
        <div className="max-w-7xl mx-auto px-4 space-y-3">
          <div className="flex items-center justify-center gap-2">
            <span className="font-serif font-bold text-base tracking-widest bg-gradient-to-r from-amber-200 to-yellow-400 bg-clip-text text-transparent">
              LUXE
            </span>
            <span>—</span>
            <span>The Sovereign Standard in Haute Horlogerie</span>
          </div>
          <p className="text-[11px] text-luxe-secondary/70">
            © 2026 LUXE International Inc. All rights reserved. Encrypted end-to-end vault transactions.
          </p>
        </div>
      </footer>
    </div>
  );
}
