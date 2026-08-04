import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { auth } from "../config/firebase";

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: Array<"faculty" | "organizer" | "member" | "jury">;
  disallowEmails?: string[];
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles,
  disallowEmails,
  redirectTo = "/faculty/dashboard"
}) => {
  const { user, loading } = useAuth();

  // Show loading spinner while auth state is being resolved
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-aether-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userEmail = user.email?.toLowerCase().trim() || "";

  // Block specific user emails from accessing restricted routes (e.g. facultycoordinator@aiverse.in from gallery/settings)
  if (disallowEmails && disallowEmails.map(e => e.toLowerCase().trim()).includes(userEmail)) {
    return <Navigate to={redirectTo} replace />;
  }

  if (allowedRoles && (!user.role || !allowedRoles.includes(user.role))) {
    return <Navigate to="/404" replace />;
  }

  return children;
};
export default ProtectedRoute;
