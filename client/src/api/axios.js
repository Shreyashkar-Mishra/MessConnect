import axios from 'axios';

// In production builds (Vercel), fall back to the Render URL if env var is missing
const BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? 'https://messconnect-1rt7.onrender.com'
    : 'http://localhost:5000');

// TODO: remove after confirming deployment
console.log('[MessConnect] API BASE_URL:', BASE_URL, '| PROD:', import.meta.env.PROD, '| VITE_API_URL:', import.meta.env.VITE_API_URL);

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Required for HttpOnly cookies
});

// Optionally attach token if stored in local storage or Zustand
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // Recoil auth state will detect the missing cookie on next /api/auth/me call and redirect
    }
    return Promise.reject(error);
  }
);

export const getImageUrl = (imagePath) => {
  if (!imagePath) return '';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
  const filename = imagePath.split('\\').pop().split('/').pop();
  return `${BASE_URL}/uploads/${filename}`;
};

export default api;
