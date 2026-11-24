import { useState } from "react";
import { useAuth } from "react-oidc-context";

export default function CognitoSessionTest() {
  const auth = useAuth();
  const [actionError, setActionError] = useState<string | null>(null);

  const signIn = async () => {
    setActionError(null);

    try {
      await auth.signinRedirect();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "No se pudo iniciar sesión."
      );
    }
  };

  const signOut = async () => {
    setActionError(null);

    try {
      const domain = import.meta.env.VITE_COGNITO_DOMAIN.replace(/\/$/, "");
      const logoutUrl = new URL(`${domain}/logout`);

      logoutUrl.searchParams.set(
        "client_id",
        import.meta.env.VITE_COGNITO_CLIENT_ID
      );
      logoutUrl.searchParams.set(
        "logout_uri",
        import.meta.env.VITE_COGNITO_LOGOUT_URI
      );

      await auth.removeUser();
      window.location.assign(logoutUrl.toString());
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "No se pudo cerrar sesión."
      );
    }
  };

  if (auth.isLoading) {
    return <p>Comprobando sesión de Cognito...</p>;
  }

  if (auth.error) {
    return (
      <section>
        <h2>Prueba de Cognito</h2>
        <p role="alert">{auth.error.message}</p>
        <button type="button" onClick={() => void signIn()}>
          Reintentar inicio de sesión
        </button>
      </section>
    );
  }

  return (
    <section>
      <h2>Prueba de Cognito</h2>

      {actionError && <p role="alert">{actionError}</p>}

      {auth.isAuthenticated ? (
        <>
          <p>Sesión autenticada correctamente.</p>
          <p>
            Usuario: {auth.user?.profile.email ?? auth.user?.profile.sub}
          </p>

          <button type="button" onClick={() => void signOut()}>
            Cerrar sesión
          </button>
        </>
      ) : (
        <>
          <p>No hay una sesión de Cognito activa.</p>

          <button type="button" onClick={() => void signIn()}>
            Iniciar sesión con Cognito
          </button>
        </>
      )}
    </section>
  );
}