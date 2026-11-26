import type { ReactNode } from "react";
import { PortalNavbar } from "./PortalNavbar";
import { useCurrentRole } from "../auth/CurrentUserContext";

export function PortalLayout({
  children,
}: {
  children: ReactNode;
  role?: unknown;
  onRoleChange?: unknown;
}) {
  return (
    <>
      <PortalNavbar />
      <main className="portal-main">{children}</main>
    </>
  );
}

export function usePortalRole(): ["Alumno" | "Docente", () => void] {
  const { role } = useCurrentRole();
  return [role ?? "Alumno", () => undefined];
}
