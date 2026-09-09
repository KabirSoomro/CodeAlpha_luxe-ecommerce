import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ isOpen, onClose }) {
  const { login, register, loading, error, setError } = useAuth();

  const [activeTab, setActiveTab] = useState('login'); // 'login' or 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');

  if (!isOpen) return null;

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setLocalError('');
    if (setError) setError(null);
  };

  const handlePreFill = (userType) => {
    if (userType === 'customer') {
      setEmail('customer@example.com');
      setPassword('customer123');
    } else if (userType === 'admin') {
      setEmail('admin@example.com');
      setPassword('admin123');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

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
        await register(name, email, password);
        onClose();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div
        className="relative w-full max-w-md glass rounded-3xl border border-luxe-glassBorder overflow-hidden shadow-2xl bg-luxe-surface/95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-0 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-2xl font-bold font-serif bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
              LUXE
            </span>
            <span className="text-[10px] uppercase tracking-widest text-luxe-secondary">
              Client Portal
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

        {/* Demo Fast Pre-Fill Toolbar */}
        {activeTab === 'login' && (
          <div className="px-6 pt-3 flex items-center justify-center gap-2">
            <span className="text-[10px] text-luxe-secondary">Quick Login:</span>
            <button
              type="button"
              onClick={() => handlePreFill('customer')}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10 transition-colors"
            >
              Demo Customer
            </button>
            <button
              type="button"
              onClick={() => handlePreFill('admin')}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-amber-500/40 text-amber-300 hover:bg-amber-500/10 transition-colors"
            >
              Demo Admin
            </button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {(localError || error) && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <span>⚠️</span>
              <span>{localError || error}</span>
            </div>
          )}

          {activeTab === 'register' && (
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
            <label className="block text-[11px] font-medium text-luxe-secondary mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-black/20 dark:bg-white/5 border border-luxe-glassBorder rounded-xl px-3.5 py-2.5 text-xs text-luxe-primary focus:outline-none focus:border-yellow-500/50"
            />
          </div>

          {activeTab === 'register' && (
            <div>
              <label className="block text-[11px] font-medium text-luxe-secondary mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-black/20 dark:bg-white/5 border border-luxe-glassBorder rounded-xl px-3.5 py-2.5 text-xs text-luxe-primary focus:outline-none focus:border-yellow-500/50"
              />
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-black text-xs uppercase font-bold tracking-widest shadow-lg shadow-yellow-500/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading
                ? 'Authenticating...'
                : activeTab === 'login'
                ? 'Access Vault'
                : 'Create Membership'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
