import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
  requireEmailVerification?: boolean;
}

/**
 * Component that protects routes requiring authentication
 */
export const ProtectedRoute = ({ 
  children, 
  requireEmailVerification = false 
}: ProtectedRouteProps) => {
  const { user, loading, isEmailConfirmed } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireEmailVerification && !isEmailConfirmed) {
    return <Navigate to="/verify-email" replace />;
  }

  return <>{children}</>;
};



