import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "react-oidc-context";
import { cognitoAuthConfig } from "./auth/cognito";

import App from "./App";
import "./styles.css";
import CognitoTest from "./auth/CognitoTest";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider {...cognitoAuthConfig}>
        <App />
        {/* <CognitoTest /> */}
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
