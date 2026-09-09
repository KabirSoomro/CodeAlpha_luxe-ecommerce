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

  const register = async (name, email, password) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.register({ name, email, password });
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
        login,
        register,
        logout,
        getToken: () => token || localStorage.getItem('luxe_token'),
        getUser: () => user,
      };
    }
  }, [user, token, isAuthenticated, isAdmin]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isAdmin,
        loading,
        error,
        login,
        register,
        logout,
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
