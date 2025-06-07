import axios from 'axios';

const api = axios.create({
  baseURL: '/', 
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    if (!config.url?.startsWith('/api/')) {
      config.url = `/api/${config.url}`;
    }

    const token = localStorage.getItem('jwt_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response) {
      // Handle specific error cases
      switch (error.response.status) {
        case 401:
          // Handle unauthorized (e.g., redirect to login)
          localStorage.removeItem('jwt_token');
          window.location.href = '/login';
          break;
        case 403:
          // Handle forbidden
          console.error('Forbidden access:', error.response.data);
          break;
        default:
          console.error('API Error:', error.response.data);
      }
    }
    return Promise.reject(error);
  }
);

export default api; 