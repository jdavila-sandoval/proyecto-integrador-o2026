import type { AuthProviderNoUserManagerProps } from "react-oidc-context";

export const cognitoAuthConfig: AuthProviderNoUserManagerProps = {
  authority: import.meta.env.VITE_COGNITO_AUTHORITY,
  client_id: import.meta.env.VITE_COGNITO_CLIENT_ID,
  redirect_uri: import.meta.env.VITE_COGNITO_REDIRECT_URI,
  response_type: "code",
  scope: "openid email profile",

  onSigninCallback: () => {
    window.history.replaceState(
      {},
      document.title,
      window.location.pathname
    );
  },
};