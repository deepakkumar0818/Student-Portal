import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    // Redirect to appropriate login page based on required role
    const loginPath = requiredRole === 'admin' ? '/admin/login' : '/login';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // Check role-based access
  if (requiredRole === 'admin') {
    const isAdmin = user?.role && ['admin', 'super_admin', 'staff'].includes(user.role);
    if (!isAdmin) {
      return <Navigate to="/login" replace />;
    }
  } else if (requiredRole === 'student') {
    const isStudent = user?.rollNumber && (!user?.role || !['admin', 'super_admin', 'staff'].includes(user.role));
    if (!isStudent) {
      return <Navigate to="/admin/login" replace />;
    }
  }

  return children;
};

export default ProtectedRoute; 