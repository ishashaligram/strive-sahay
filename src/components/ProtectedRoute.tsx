import React from 'react';
import { Navigate } from 'react-router-dom';
import { UserRole } from '../types';

interface ProtectedRouteProps {
  currentUser: { role: UserRole; id: string; name: string } | null;
  allowedRole: UserRole;
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  currentUser,
  allowedRole,
  children,
}) => {
  // If not authenticated, redirect to appropriate login route
  if (!currentUser) {
    if (allowedRole === 'assessor') {
      return <Navigate to="/assessor/login" replace />;
    }
    if (allowedRole === 'admin') {
      return <Navigate to="/admin/login" replace />;
    }
    return <Navigate to="/beneficiary/auth" replace />;
  }

  // If role does not match, prevent cross-role access and redirect
  if (currentUser.role !== allowedRole) {
    if (currentUser.role === 'assessor') {
      return <Navigate to="/assessor/dashboard" replace />;
    }
    if (currentUser.role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/beneficiary/dashboard" replace />;
  }

  return <>{children}</>;
};
