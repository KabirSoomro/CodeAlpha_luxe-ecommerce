import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ isOpen, onClose }) {
  const { login, register, loading, error, setError } = useAuth();

  const [activeTab, setActiveTab] = useState('login'); // 'login' or 'register'
  const [role, setRole] = useState('Buyer'); // 'Buyer' or 'Seller'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [localError, setLocalError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  if (!isOpen) return null;

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setLocalError('');
    setSuccessNotice('');
    if (setError) setError(null);
  };

  const handlePreFill = (userType) => {
    setLocalError('');
    setSuccessNotice('');
    if (userType === 'customer') {
      setEmail('customer@example.com');
      setPassword('customer123');
    } else if (userType === 'seller') {
      setEmail('seller@example.com');
      setPassword('seller123');
    } else if (userType === 'pendingSeller') {
      setEmail('pendingseller@example.com');
      setPassword('seller123');
    } else if (userType === 'admin') {
      setEmail('admin@example.com');
      setPassword('admin123');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setSuccessNotice('');

    if (activeTab === 'register') {
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match');
        return;
      }
      if (password.length < 6) {
        setLocalError('Password must be at least 6 characters');
        return;
      }
      try {
        const payload = {
          name,
          email,
          password,
          role,
          storeName: role === 'Seller' ? storeName || `${name}'s Store` : '',
          storeDescription: role === 'Seller' ? storeDescription : '',
        };
        const data = await register(payload);
        if (data.role === 'Seller' && !data.isApproved) {
          setSuccessNotice(
            'Seller registration received! Your account is pending Admin approval before you can list products.'
          );
          setTimeout(() => {
            onClose();
          }, 2500);
        } else {
          onClose();
        }
      } catch (err) {
        setLocalError(err.message || 'Registration failed');
      }
    } else {
      try {
        await login(email, password);
        onClose();
      } catch (err) {
        setLocalError(err.message || 'Login failed');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div
        className="relative w-full max-w-md glass rounded-3xl border border-luxe-glassBorder overflow-hidden shadow-2xl bg-luxe-surface/95 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-0 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-2xl font-bold font-serif bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
              LUXE
            </span>
            <span className="text-[10px] uppercase tracking-widest text-luxe-secondary">
              Client & Merchant Vault
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full glass border border-luxe-glassBorder hover:border-yellow-500/50 text-luxe-secondary hover:text-luxe-primary transition-all"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-4">
          <div className="flex rounded-xl bg-black/20 dark:bg-white/5 p-1 border border-luxe-glassBorder">
            <button
              onClick={() => handleTabChange('login')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'login'
                  ? 'bg-yellow-500 text-black shadow-md'
                  : 'text-luxe-secondary hover:text-luxe-primary'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => handleTabChange('register')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'register'
                  ? 'bg-yellow-500 text-black shadow-md'
                  : 'text-luxe-secondary hover:text-luxe-primary'
              }`}
            >
              Register
            </button>
          </div>
        </div>

        {/* Quick Demo Pre-fills */}
        {activeTab === 'login' && (
          <div className="px-6 pt-3 space-y-1.5">
            <div className="text-[10px] text-luxe-secondary text-center">Quick Login Profiles:</div>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <button
                type="button"
                onClick={() => handlePreFill('customer')}
                className="text-[10px] font-semibold px-2.5 py-1 rounded-full border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10 transition-colors"
              >
                Buyer
              </button>
              <button
                type="button"
                onClick={() => handlePreFill('seller')}
                className="text-[10px] font-semibold px-2.5 py-1 rounded-full border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 transition-colors"
              >
                Approved Seller
              </button>
              <button
                type="button"
                onClick={() => handlePreFill('pendingSeller')}
                className="text-[10px] font-semibold px-2.5 py-1 rounded-full border border-orange-500/40 text-orange-300 hover:bg-orange-500/10 transition-colors"
              >
                Pending Seller
              </button>
              <button
                type="button"
                onClick={() => handlePreFill('admin')}
                className="text-[10px] font-semibold px-2.5 py-1 rounded-full border border-amber-500/40 text-amber-300 hover:bg-amber-500/10 transition-colors"
              >
                Admin
              </button>
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {successNotice && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <span>✅</span>
              <span>{successNotice}</span>
            </div>
          )}

          {(localError || error) && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <span>⚠️</span>
              <span>{localError || error}</span>
            </div>
          )}

          {activeTab === 'register' && (
            <>
              {/* Account Type Selection */}
              <div>
                <label className="block text-[11px] font-medium text-luxe-secondary mb-1.5">
                  I want to join as:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('Buyer')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                      role === 'Buyer'
                        ? 'border-yellow-500 bg-yellow-500/10 text-yellow-300 shadow-sm'
                        : 'border-luxe-glassBorder text-luxe-secondary hover:bg-white/5'
                    }`}
                  >
                    <span className="text-base">🛍️</span>
                    <span>Buyer / Client</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('Seller')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                      role === 'Seller'
                        ? 'border-amber-400 bg-amber-400/15 text-amber-300 shadow-sm'
                        : 'border-luxe-glassBorder text-luxe-secondary hover:bg-white/5'
                    }`}
                  >
                    <span className="text-base">💎</span>
                    <span>Seller / Merchant</span>
                  </button>
                </div>
              </div>

              {role === 'Seller' && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <span>🛡️</span> Admin Approval Notice
                  </p>
                  <p className="text-amber-200/80 leading-relaxed">
                    Once registered, your seller account will be reviewed by the Administrator before you can list luxury products on the catalog.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-luxe-secondary mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Lord Alexander Wright"
                  className="w-full bg-black/20 dark:bg-white/5 border border-luxe-glassBorder rounded-xl px-3.5 py-2.5 text-xs text-luxe-primary focus:outline-none focus:border-yellow-500/50"
                />
              </div>

              {role === 'Seller' && (
                <>
                  <div>
                    <label className="block text-[11px] font-medium text-luxe-secondary mb-1">
                      Boutique / Store Name
                    </label>
                    <input
                      type="text"
                      required
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="e.g. Geneva Horology House"
                      className="w-full bg-black/20 dark:bg-white/5 border border-luxe-glassBorder rounded-xl px-3.5 py-2.5 text-xs text-luxe-primary focus:outline-none focus:border-yellow-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-luxe-secondary mb-1">
                      Store Description (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={storeDescription}
                      onChange={(e) => setStoreDescription(e.target.value)}
                      placeholder="Brief summary of your luxury pieces..."
                      className="w-full bg-black/20 dark:bg-white/5 border border-luxe-glassBorder rounded-xl px-3.5 py-2 text-xs text-luxe-primary focus:outline-none focus:border-yellow-500/50"
                    />
                  </div>
                </>
              )}
            </>
          )}

          <div>
            <label className="block text-[11px] font-medium text-luxe-secondary mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@luxury.com"
              className="w-full bg-black/20 dark:bg-white/5 border border-luxe-glassBorder rounded-xl px-3.5 py-2.5 text-xs text-luxe-primary focus:outline-none focus:border-yellow-500/50"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-medium text-luxe-secondary">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold transition-colors flex items-center gap-1 cursor-pointer select-none"
              >
                <span>{showPassword ? '🙈' : '👁️'}</span>
                <span>{showPassword ? 'Hide' : 'Show'}</span>
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-black/20 dark:bg-white/5 border border-luxe-glassBorder rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-luxe-primary focus:outline-none focus:border-yellow-500/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-3 top-2.5 text-sm text-luxe-secondary hover:text-yellow-400 transition-colors cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {activeTab === 'register' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-medium text-luxe-secondary">
                  Confirm Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold transition-colors flex items-center gap-1 cursor-pointer select-none"
                >
                  <span>{showConfirmPassword ? '🙈' : '👁️'}</span>
                  <span>{showConfirmPassword ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-black/20 dark:bg-white/5 border border-luxe-glassBorder rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-luxe-primary focus:outline-none focus:border-yellow-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                  className="absolute right-3 top-2.5 text-sm text-luxe-secondary hover:text-yellow-400 transition-colors cursor-pointer"
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-black text-xs uppercase font-bold tracking-widest shadow-lg shadow-yellow-500/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading
                ? 'Processing...'
                : activeTab === 'login'
                ? 'Access Vault'
                : role === 'Seller'
                ? 'Register Merchant Account'
                : 'Create Membership'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
