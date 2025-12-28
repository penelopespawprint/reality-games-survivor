import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { routes } from "@/shared/routes";

interface Props {
  children: React.ReactNode;
}

const AdminRoute: React.FC<Props> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  if (!user) {
    return <Navigate to={routes.login} replace />;
  }

  if (!user.isAdmin) {
    return <Navigate to={routes.dashboard} replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;