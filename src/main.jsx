import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import axios from 'axios'

axios.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('saas_token');
    const currentUrl = config.url || '';
    if (token && currentUrl.includes('/api')) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

axios.interceptors.response.use((response) => response, (error) => {
  if (typeof window !== 'undefined' && [401, 403].includes(error.response?.status)) {
    localStorage.removeItem('saas_token');
    localStorage.removeItem('saas_user');
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  }
  return Promise.reject(error);
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator && window.location.protocol !== 'file:' && window.location.protocol !== 'app:' && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
  const registerSW = () => {
    try {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('Service Worker registered successfully:', reg.scope))
        .catch(err => console.warn('Service Worker registration skipped or failed:', err.message || err));
    } catch (e) {
      console.warn('Service Worker registration exception:', e.message || e);
    }
  };

  if (document.readyState === 'complete') {
    registerSW();
  } else {
    window.addEventListener('load', registerSW);
  }
}
