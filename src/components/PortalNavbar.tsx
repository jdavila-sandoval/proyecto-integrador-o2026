import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "react-oidc-context";

import { Logo } from "./Logo";
import { LogoutButton } from "../auth/LogoutButton";
import { useCurrentRole } from "../auth/CurrentUserContext";

export function PortalNavbar() {
  const auth = useAuth();
  const { role } = useCurrentRole();
  const [profileOpen, setProfileOpen] = useState(false);

  const displayName =
    auth.user?.profile.name ?? auth.user?.profile.email ?? "Usuario";

  const initials = displayName.trim().slice(0, 2).toUpperCase();

  return (
    <header className="portal-header">
      <div className="portal-nav container">
        <Logo />
        <div className="global-search">
          <span>⌕</span>
          <input
            placeholder="Buscar cursos, videos o materias..."
            aria-label="Buscar en el portal"
          />
        </div>
        <span className="role-badge">{role ?? "Sin rol"}</span>
        <div className="profile-wrap">
          <button
            type="button"
            className="profile-button"
            aria-expanded={profileOpen}
            onClick={() => setProfileOpen((open) => !open)}
          >
            <span className="profile-avatar">{initials}</span>
            <span className="profile-name">
              {displayName}
              <small>Sesión autenticada</small>
            </span>
            <span>⌄</span>
          </button>
          {profileOpen && (
            <div className="profile-menu">
              <Link to="/">Ir a inicio</Link>
              <LogoutButton />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
