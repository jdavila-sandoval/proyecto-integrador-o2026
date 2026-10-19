import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "./Logo";

export function PortalNavbar({
  role,
  onRoleChange,
}: {
  role: "Alumno" | "Docente";
  onRoleChange: (role: "Alumno" | "Docente") => void;
}) {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
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
        <div className="role-toggle" aria-label="Cambiar vista">
          <button
            className={role === "Alumno" ? "active" : ""}
            onClick={() => onRoleChange("Alumno")}
          >
            Vista Alumno
          </button>
          <button
            className={role === "Docente" ? "active" : ""}
            onClick={() => onRoleChange("Docente")}
          >
            Vista Docente
          </button>
        </div>
        <div className="profile-wrap">
          <button
            className="profile-button"
            onClick={() => setProfileOpen(!profileOpen)}
          >
            <span className="profile-avatar">JD</span>
            <span className="profile-name">
              José Dávila<small>{role}</small>
            </span>
            <span>⌄</span>
          </button>
          {profileOpen && (
            <div className="profile-menu">
              <Link to="/">Ir a inicio</Link>
              <button onClick={() => navigate("/login")}>Cerrar sesión</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
