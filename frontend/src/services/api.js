// Unified API service for Luxe Premium E-Commerce Rebuild

const BASE_URL = import.meta.env.VITE_API_URL || '';

function getAuthToken() {
  try {
    return localStorage.getItem('luxe_token');
  } catch {
    return null;
  }
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const token = getAuthToken();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(url, config);

  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMessage =
      (data && data.message) || response.statusText || 'An error occurred during API request';
    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  get: (endpoint, options) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => request(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options) => request(endpoint, { ...options, method: 'PUT', body }),
  delete: (endpoint, options) => request(endpoint, { ...options, method: 'DELETE' }),

  // Products
  getProducts: (params = {}) => {
    const query = new URLSearchParams();
    if (params.keyword) query.set('keyword', params.keyword);
    if (params.category && params.category !== 'All') query.set('category', params.category);
    if (params.sort) query.set('sort', params.sort);
    const qs = query.toString();
    return api.get(`/api/products${qs ? `?${qs}` : ''}`);
  },
  getProductById: (id) => api.get(`/api/products/${id}`),
  createProduct: (productData) => api.post('/api/products', productData),
  updateProduct: (id, productData) => api.put(`/api/products/${id}`, productData),
  deleteProduct: (id) => api.delete(`/api/products/${id}`),
  getMySellerProducts: () => api.get('/api/products/my-products'),

  // Auth
  login: (credentials) => api.post('/api/auth/login', credentials),
  register: (userData) => api.post('/api/auth/register', userData),
  getUserProfile: () => api.get('/api/auth/profile'),

  // Orders
  createOrder: (orderData) => api.post('/api/orders', orderData),
  getMyOrders: () => api.get('/api/orders/myorders'),
  getAllOrders: () => api.get('/api/orders'),
  deliverOrder: (id) => api.put(`/api/orders/${id}/deliver`),

  // Admin
  getAdminMetrics: () => api.get('/api/admin/metrics'),
  getAdminProducts: () => api.get('/api/admin/products'),
  getAdminOrders: () => api.get('/api/admin/orders'),
  getAllSellers: () => api.get('/api/admin/sellers'),
  approveSeller: (id) => api.put(`/api/admin/sellers/${id}/approve`),
  rejectSeller: (id) => api.put(`/api/admin/sellers/${id}/reject`),
};

export default api;
