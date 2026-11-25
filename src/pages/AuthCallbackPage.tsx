import { Link, Navigate } from "react-router-dom";
import { useAuth } from "react-oidc-context";

function getReturnTo(state: unknown): string {
  if (
    typeof state !== "object" ||
    state === null ||
    !("returnTo" in state)
  ) {
    return "/dashboard";
  }

  const path = state.returnTo;

  if (
    typeof path !== "string" ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\")
  ) {
    return "/dashboard";
  }

  const pathname = path.split(/[?#]/)[0];

  if (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/auth/callback"
  ) {
    return "/dashboard"
  }

  return path;
}

export function AuthCallbackPage() {
  const auth = useAuth();

  if (auth.isLoading || auth.activeNavigator) {
    return <main>Completando inicio de sesión...</main>;
  }

  if (auth.error) {
    return (
      <main role="alert">
        <h1>No se pudo completar el acceso</h1>
        <p>{ auth.error.message }</p>
        <Link to="/login">Volver a intentar</Link>
      </main>
    );
  }

  return (
    <Navigate
      to={ getReturnTo(auth.user?.state) }
      replace
    />
  )
}