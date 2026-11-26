import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useCurrentRole, type AppRole } from "../auth/CurrentUserContext";

export function RoleGuard({
  allow,
  children,
}: {
  allow: AppRole;
  children: ReactNode;
}) {
  const { role, loading, error } = useCurrentRole();

  if (loading) {
    return <main>Comprobando permisos...</main>;
  }

  if (error) {
    return (
      <main role="alert">
        <h1>No se pudo verificar tu perfil.</h1>
        <p>{error}</p>
      </main>
    );
  }

  if (role !== allow) {
    return <Navigate to="/manage-videos" replace />;
  }

  return <>{children}</>;
}
