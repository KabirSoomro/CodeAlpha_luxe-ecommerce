import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('luxe_token') || null;
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('luxe_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isAuthenticated = Boolean(token && user);
  const isAdmin = Boolean(user && (user.role === 'Admin' || user.isAdmin === true));
  const isSeller = Boolean(user && user.role === 'Seller');
  const isApprovedSeller = Boolean(user && user.role === 'Seller' && user.isApproved);
  const isBuyer = Boolean(user && (user.role === 'Buyer' || user.role === 'Customer'));

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.login({ email, password });
      setToken(data.token);
      setUser(data);
      localStorage.setItem('luxe_token', data.token);
      localStorage.setItem('luxe_user', JSON.stringify(data));
      setLoading(false);
      return data;
    } catch (err) {
      setLoading(false);
      const msg = err.message || 'Login failed';
      setError(msg);
      throw err;
    }
  };

  const register = async (nameOrData, email, password, role = 'Buyer', storeName = '', storeDescription = '') => {
    setLoading(true);
    setError(null);
    try {
      let payload;
      if (typeof nameOrData === 'object' && nameOrData !== null) {
        payload = nameOrData;
      } else {
        payload = {
          name: nameOrData,
          email,
          password,
          role,
          storeName,
          storeDescription,
        };
      }
      const data = await api.register(payload);
      setToken(data.token);
      setUser(data);
      localStorage.setItem('luxe_token', data.token);
      localStorage.setItem('luxe_user', JSON.stringify(data));
      setLoading(false);
      return data;
    } catch (err) {
      setLoading(false);
      const msg = err.message || 'Registration failed';
      setError(msg);
      throw err;
    }
  };

  const refreshProfile = async () => {
    if (!token) return null;
    try {
      const profile = await api.getUserProfile();
      setUser((prev) => {
        const updated = { ...prev, ...profile };
        localStorage.setItem('luxe_user', JSON.stringify(updated));
        return updated;
      });
      return profile;
    } catch (err) {
      console.warn('Could not refresh profile:', err);
      return null;
    }
  };

  const updateProfile = async (userData) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.updateUserProfile(userData);
      if (data.token) {
        setToken(data.token);
        localStorage.setItem('luxe_token', data.token);
      }
      setUser(data);
      localStorage.setItem('luxe_user', JSON.stringify(data));
      setLoading(false);
      return data;
    } catch (err) {
      setLoading(false);
      const msg = err.message || 'Profile update failed';
      setError(msg);
      throw err;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setError(null);
    try {
      localStorage.removeItem('luxe_token');
      localStorage.removeItem('luxe_user');
    } catch (e) {
      console.warn('Error clearing auth storage:', e);
    }
  };

  // Expose on window for compatibility with tests and scripts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.luxeAuth = {
        user,
        token,
        isAuthenticated,
        isAdmin,
        isSeller,
        isApprovedSeller,
        isBuyer,
        login,
        register,
        logout,
        refreshProfile,
        updateProfile,
        getToken: () => token || localStorage.getItem('luxe_token'),
        getUser: () => user,
      };
    }
  }, [user, token, isAuthenticated, isAdmin, isSeller, isApprovedSeller, isBuyer]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isAdmin,
        isSeller,
        isApprovedSeller,
        isBuyer,
        loading,
        error,
        login,
        register,
        logout,
        refreshProfile,
        updateProfile,
        setError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
