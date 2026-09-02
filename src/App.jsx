import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import SaaSAdminDashboard from './pages/SaaSAdminDashboard';
import SaaSLogin from './pages/SaaSLogin';

function App() {
  const [authed, setAuthed] = useState(() => !!localStorage.getItem('saas_token'));

  useEffect(() => {
    const token = localStorage.getItem('saas_token');
    setAuthed(!!token);
  }, []);

  const handleLogin = () => setAuthed(true);
  const handleLogout = () => {
    localStorage.removeItem('saas_token');
    localStorage.removeItem('saas_user');
    setAuthed(false);
  };

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route
          path="/login"
          element={authed ? <Navigate to="/" replace /> : <SaaSLogin onLogin={handleLogin} />}
        />
        <Route
          path="/"
          element={
            authed
              ? <SaaSAdminDashboard onLogout={handleLogout} />
              : <Navigate to="/login" replace />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
