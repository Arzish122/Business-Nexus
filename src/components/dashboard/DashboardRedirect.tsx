import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const DashboardRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Redirect based on user role
  if (user.role === 'entrepreneur') {
    return <Navigate to="/dashboard/entrepreneur" replace />;
  } else if (user.role === 'investor') {
    return <Navigate to="/dashboard/investor" replace />;
  }
  
  // Fallback to entrepreneur dashboard
  return <Navigate to="/dashboard/entrepreneur" replace />;
};