import { useAuth } from "react-oidc-context";
import { cognitoAuthConfig } from "./cognito";

export default function CognitoTest() {
  const auth = useAuth();

    const handleLogout = async () => {
      const cognitoDomain = import.meta.env.VITE_COGNITO_DOMAIN;
      const logoutUrl = new URL("/logout", cognitoDomain);
      logoutUrl.searchParams.set("client_id", cognitoAuthConfig.client_id,);
      logoutUrl.searchParams.set("logout_uri", "http://localhost:5173/",);
  
      auth.stopSilentRenew();
      await auth.removeUser();
  
      window.location.assign(logoutUrl.toString());
    };

  if (auth.isLoading) {
    return <main>Comprobando sesión...</main>;
  }

  if (auth.error) {
    return (
      <main>
        <h1>Error de autenticación</h1>
        <p>{auth.error.message}</p>
        <p>Revisa la configuración y vuelve a abrir la página.</p>
      </main>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <main>
        <h1>Prueba aislada de Cognito</h1>
        <p>No hay una sesión autenticada.</p>

        <button
          type="button"
          onClick={() => void auth.signinRedirect()}
        >
          Iniciar sesión con Cognito
        </button>
      </main>
    );
  }

  return (
    <main>
      <h1>Autenticación correcta</h1>

      <dl>
        <dt>Correo</dt>
        <dd>{auth.user?.profile.email ?? "No disponible"}</dd>

        <dt>Identificador del usuario — sub</dt>
        <dd>{auth.user?.profile.sub}</dd>

        <dt>Access token recibido</dt>
        <dd>{auth.user?.access_token ? "Cuack" : "No"}</dd>

        <dt>ID token recibido</dt>
        <dd>{auth.user?.id_token ? "Cuack" : "No"}</dd>
      </dl>

      <button
        type="button"
        onClick={() => {
            void handleLogout();
        }}
        >
        Cerrar sesión
      </button>
    </main>
  );
}