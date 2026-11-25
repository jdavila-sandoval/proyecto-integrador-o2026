import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "react-oidc-context";

import { Logo } from "../components/Logo";

export function LoginPage() {
  const auth = useAuth();
  const location = useLocation();

  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestedPath: unknown = location.state?.returnTo;

  const returnTo = 
    typeof requestedPath === "string" &&
    requestedPath.startsWith("/") &&
    !requestedPath.startsWith("//")
      ? requestedPath
      : "/dashboard";
  
  const login = async () => {
    setStarting(true);
    setError(null);

    try {
      await auth.signinRedirect({
        state: { returnTo }
      });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No se pudo iniciar el acceso a Cognito."
      );
    }
  };

  if (auth.isLoading) {
    return <main>Comprobando sesión.</main>
  }

  if (auth.isAuthenticated) {
    return <Navigate to={ returnTo } replace />;
  }

  return (
    <div className="auth-page">
      <div className="auth-decoration auth-decoration-one" />
      <div className="auth-decoration auth-decoration-two" />

      <div className="auth-shell">
        <Logo />

        <section className="auth-class">
          <div className="auth-heading">
            <h1>Iniciar sesión</h1>
            <p>Accede a EduStream con tu cuenta.</p>
          </div>

          {( error || auth.error ) && (
            <p role="alert">
              { error ?? auth.error?.message }
            </p>
          )}

          <button
            className="button button-primary submit-button"
            type="button"
            disabled={ starting || Boolean(auth.activeNavigator) }
            onClick={() => void login()}
          >
            { starting ? "Redirigiendo..." : "Continuar con Cognito" }
          </button>

          <p>El inicio de sesión se realiza en la página segura de Cognito.</p>
        </section>

        <Link className="back-home" to="/">
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}

