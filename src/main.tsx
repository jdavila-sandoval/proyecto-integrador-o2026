import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "react-oidc-context";
import { CurrentUserProvider } from "./auth/CurrentUserContext";
import { cognitoAuthConfig } from "./auth/cognito";

import App from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider {...cognitoAuthConfig}>
        <CurrentUserProvider>
          <App />
        </CurrentUserProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
