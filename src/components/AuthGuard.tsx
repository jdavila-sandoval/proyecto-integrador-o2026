import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "react-oidc-context";

export function AuthGuard({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.isLoading) {
    return <main>Comprobando sesión...</main>;
  }

  if (auth.error) {
    return (
      <main role="alert">
        <h1>No se pudo comprobar la sesión. Vuelva a iniciar sesión.</h1>
        <p>{ auth.error.message }</p>
        <a href="/login">Volver a inicio de sesión</a>
      </main>
    );
  }

  if (!auth.isAuthenticated) {
    const returnTo = location.pathname + location.search + location.hash;

    return <Navigate to="/login" replace state={{ returnTo }}/>;
  }

  return <>{ children }</>
}
