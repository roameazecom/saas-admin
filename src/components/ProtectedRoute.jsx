import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuthStore();
  const location = useLocation();

  // If user is not logged in, redirect to login page
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If route is restricted by role and user doesn't have it
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their default dashboard based on their role
    switch(user.role) {
      case 'waiter':
        return <Navigate to="/waiter" replace />;
      case 'kitchen_manager':
        return <Navigate to="/kds" replace />;
      case 'admin':
      case 'manager':
        return <Navigate to="/admin" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  // Authorized
  return children;
}
