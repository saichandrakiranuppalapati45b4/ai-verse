import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { auth } from "../config/firebase";

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: Array<"faculty" | "organizer" | "member">;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  // Show loading spinner while auth state is being resolved, or if Firebase has
  // authenticated the user but the React context hasn't received the profile yet
  if (loading || (!user && auth.currentUser)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-aether-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && (!user.role || !allowedRoles.includes(user.role))) {
    return <Navigate to="/404" replace />;
  }

  return children;
};
export default ProtectedRoute;
