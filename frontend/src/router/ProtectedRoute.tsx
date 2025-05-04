import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  console.log('ProtectedRoute - isAuthenticated:', isAuthenticated);

  if (!isAuthenticated) {
    console.log('Not authenticated, redirecting to login...');
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}; 