import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import axios from 'axios'

// Legacy URL migration & Global Axios interceptor to dynamically rewrite server URL
if (typeof window !== 'undefined') {
  const saved = localStorage.getItem('POS_SERVER_URL');
  if (saved && saved.includes('darkblue-mosquito')) {
    localStorage.setItem('POS_SERVER_URL', 'https://apn.happypiecafe.in');
  }
}

axios.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    let targetServer = localStorage.getItem('POS_SERVER_URL');
    if (!targetServer) {
      const hostname = window.location.hostname;
      const port = window.location.port;
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
        targetServer = `http://${hostname}${port ? ':' + port : ''}`;
      }
    }
    if (targetServer) {
      const cleanServer = targetServer.trim().replace(/\/$/, "");
      const currentUrl = config.url || '';
      const apiIndex = currentUrl.indexOf('/api');
      if (apiIndex !== -1) {
        config.url = `${cleanServer}${currentUrl.substring(apiIndex)}`;
      }
    }
  }
  return config;
}, (error) => {
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
