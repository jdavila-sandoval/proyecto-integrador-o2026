import { useState } from "react";
import { useAuth } from "react-oidc-context";

import { cognitoAuthConfig } from "./cognito";

export function LogoutButton() {
  const auth = useAuth();

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logout = async () => {
    setPending(true);
    setError(null);

    try {
      const domain = import.meta.env.VITE_COGNITO_DOMAIN;
      const logoutUri = import.meta.env.VITE_COGNITO_LOGOUT_URI;

      if (!domain || !logoutUri) {
        throw new Error("Falta configurar el dominio o la URL de inicio de sesión.");
      }

      const logoutUrl = new URL("/logout", domain);

      logoutUrl.searchParams.set("client_id", cognitoAuthConfig.client_id);
      logoutUrl.searchParams.set("logout_uri", logoutUri);

      auth.stopSilentRenew();
      await auth.removeUser();

      window.location.replace(logoutUrl.toString());
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No se pudo completar el cierre de sesión."
      );

      setPending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={ pending }
        onClick={() => void logout()}
      >
        { pending ? "Cerrando sesión..." : "Cerrar sesión." }
      </button>
      
      { error && <p role="alert">{ error }</p> }
    </>
  );
}