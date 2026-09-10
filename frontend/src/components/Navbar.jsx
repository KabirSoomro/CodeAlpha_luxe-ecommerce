import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Navbar({
  searchTerm,
  setSearchTerm,
  activeView,
  setActiveView,
  openAuthModal,
  openCartDrawer,
  setSelectedCategory,
}) {
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { itemCount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (view, category = 'All') => {
    setActiveView(view);
    if (setSelectedCategory) setSelectedCategory(category);
    setMobileMenuOpen(false);
  };

  const firstName = user?.name ? user.name.split(' ')[0] : 'Guest';

  return (
    <nav className="glass sticky top-0 z-40 border-b border-luxe-glassBorder backdrop-blur-md transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand / Logo */}
          <div className="flex items-center gap-6 cursor-pointer" onClick={() => handleNavClick('catalog')}>
            <div className="flex flex-col">
              <span className="text-3xl font-extrabold tracking-widest font-serif bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                LUXE
              </span>
              <span className="text-[10px] uppercase tracking-[0.25em] text-luxe-secondary -mt-1 font-semibold">
                Haute Horlogerie
              </span>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-1 ml-4 text-sm font-medium">
              <button
                onClick={() => handleNavClick('catalog', 'All')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  activeView === 'catalog'
                    ? 'text-yellow-400 font-semibold bg-white/5'
                    : 'text-luxe-secondary hover:text-luxe-primary hover:bg-white/5'
                }`}
              >
                Catalog
              </button>
              <button
                onClick={() => handleNavClick('catalog', 'Watches')}
                className="px-3 py-1.5 rounded-lg text-luxe-secondary hover:text-luxe-primary hover:bg-white/5 transition-colors"
              >
                Watches
              </button>
              <button
                onClick={() => handleNavClick('catalog', 'Jewelry')}
                className="px-3 py-1.5 rounded-lg text-luxe-secondary hover:text-luxe-primary hover:bg-white/5 transition-colors"
              >
                Jewelry
              </button>
              <button
                onClick={() => handleNavClick('catalog', 'Leather Goods')}
                className="px-3 py-1.5 rounded-lg text-luxe-secondary hover:text-luxe-primary hover:bg-white/5 transition-colors"
              >
                Leather Goods
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="hidden lg:flex items-center flex-1 max-w-xs mx-6">
            <div className="relative w-full">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search rare timepieces, jewelry..."
                className="w-full bg-black/20 dark:bg-white/5 border border-luxe-glassBorder rounded-full py-1.5 pl-9 pr-4 text-xs focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/40 text-luxe-primary placeholder-luxe-secondary transition-all"
              />
              <svg
                className="absolute left-3 top-2.5 h-3.5 w-3.5 text-luxe-secondary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-2.5 text-xs text-luxe-secondary hover:text-luxe-primary"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Right Action Icons & Controls */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button matching exact test expectations */}
            <button
              id="theme-toggle"
              onClick={toggleTheme}
              aria-label="Toggle Theme"
              title="Toggle Theme"
              className="p-2.5 rounded-full border border-luxe-glassBorder hover:border-yellow-500/40 glass hover:scale-105 transition-all text-sm flex items-center justify-center cursor-pointer"
            >
              <span className="theme-icon select-none">{theme === 'light' ? '☀️' : '🌙'}</span>
            </button>

            {/* Cart Icon & Badge */}
            <button
              id="cart-button"
              onClick={openCartDrawer}
              aria-label="View Shopping Cart"
              className="relative p-2.5 rounded-full border border-luxe-glassBorder hover:border-yellow-500/40 glass hover:scale-105 transition-all text-sm flex items-center justify-center cursor-pointer"
            >
              <svg
                className="w-5 h-5 text-luxe-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              {itemCount > 0 && (
                <span
                  id="cart-badge"
                  className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-[11px] font-bold h-5 min-w-[20px] px-1 rounded-full flex items-center justify-center shadow-lg animate-badgePulse"
                >
                  {itemCount}
                </span>
              )}
            </button>

            {/* Auth / Profile / Admin Navigation */}
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                {/* Profile Link */}
                <button
                  id="profile-button"
                  onClick={() => handleNavClick('profile')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                    activeView === 'profile'
                      ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400'
                      : 'border-luxe-glassBorder hover:border-yellow-500/40 glass text-luxe-primary'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>Hi, {firstName}</span>
                </button>

                {/* Seller Merchant Hub Link if Seller */}
                {user?.role === 'Seller' && (
                  <button
                    id="seller-button"
                    onClick={() => handleNavClick('seller')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                      activeView === 'seller'
                        ? 'border-amber-400 bg-amber-400 text-black shadow-lg shadow-amber-400/20'
                        : 'border-amber-500/40 text-amber-300 hover:bg-amber-400/10'
                    }`}
                  >
                    <span>💎</span>
                    <span>Merchant Hub</span>
                    {!user?.isApproved && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    )}
                  </button>
                )}

                {/* Admin Dashboard Link if Admin */}
                {isAdmin && (
                  <button
                    id="admin-button"
                    onClick={() => handleNavClick('admin')}
                    className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                      activeView === 'admin'
                        ? 'border-yellow-500 bg-yellow-500 text-black shadow-lg shadow-yellow-500/20'
                        : 'border-amber-400/40 text-amber-300 hover:bg-amber-400/10'
                    }`}
                  >
                    Admin Portal
                  </button>
                )}

                {/* Logout Button */}
                <button
                  onClick={logout}
                  className="p-2 text-xs text-luxe-secondary hover:text-rose-400 hover:bg-rose-500/10 rounded-full transition-colors"
                  title="Sign Out"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                onClick={openAuthModal}
                className="px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-black text-xs font-bold tracking-wide shadow-md shadow-amber-500/20 hover:scale-105 transition-all"
              >
                Sign In
              </button>
            )}

            {/* Mobile Hamburger Menu Toggle */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-luxe-secondary hover:text-luxe-primary"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 pt-2 border-t border-luxe-glassBorder space-y-2">
            <div className="px-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products..."
                className="w-full bg-black/20 dark:bg-white/5 border border-luxe-glassBorder rounded-lg py-2 px-3 text-xs text-luxe-primary focus:outline-none"
              />
            </div>
            <div className="flex flex-col space-y-1 px-2 text-sm font-medium">
              <button
                onClick={() => handleNavClick('catalog', 'All')}
                className="text-left px-3 py-2 rounded-lg hover:bg-white/5 text-luxe-primary"
              >
                Catalog (All)
              </button>
              <button
                onClick={() => handleNavClick('catalog', 'Watches')}
                className="text-left px-3 py-2 rounded-lg hover:bg-white/5 text-luxe-secondary"
              >
                Watches
              </button>
              <button
                onClick={() => handleNavClick('catalog', 'Jewelry')}
                className="text-left px-3 py-2 rounded-lg hover:bg-white/5 text-luxe-secondary"
              >
                Jewelry
              </button>
              <button
                onClick={() => handleNavClick('catalog', 'Leather Goods')}
                className="text-left px-3 py-2 rounded-lg hover:bg-white/5 text-luxe-secondary"
              >
                Leather Goods
              </button>
              {isAuthenticated && (
                <>
                  <button
                    onClick={() => handleNavClick('profile')}
                    className="text-left px-3 py-2 rounded-lg hover:bg-white/5 text-yellow-400"
                  >
                    My Orders & Profile
                  </button>
                  {user?.role === 'Seller' && (
                    <button
                      onClick={() => handleNavClick('seller')}
                      className="text-left px-3 py-2 rounded-lg hover:bg-white/5 text-amber-300 font-semibold flex items-center gap-1.5"
                    >
                      <span>💎 Merchant Hub</span>
                      {!user?.isApproved && (
                        <span className="text-[10px] text-amber-400 font-normal">(Pending)</span>
                      )}
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => handleNavClick('admin')}
                      className="text-left px-3 py-2 rounded-lg hover:bg-white/5 text-amber-300 font-semibold"
                    >
                      Admin Dashboard
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
