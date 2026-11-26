import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "react-oidc-context";
import { apiRequest } from "../services/apiClient";

export type AppRole = "Alumno" | "Docente";

interface MeResponse {
  sub: string;
  email: string | null;
  groups: string[];
  role: "docente" | "alumno" | null;
}

interface CurrentUserState {
  role: AppRole | null;
  loading: boolean;
  error: string | null;
}

const CurrentUserContext = createContext<CurrentUserState>({
  role: null,
  loading: true,
  error: null,
});

function toRole(role: MeResponse["role"]): AppRole | null {
  if (role === "docente") return "Docente";
  if (role === "alumno") return "Alumno";
  return null;
}

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const idToken = auth.user?.id_token;
  const [state, setState] = useState<CurrentUserState>({
    role: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!auth.isAuthenticated) {
      setState({ role: null, loading: auth.isLoading, error: null });
      return;
    }

    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: null }));

    apiRequest<MeResponse>("/me")
      .then((me) => {
        if (!cancelled) {
          setState({ role: toRole(me.role), loading: false, error: null });
        }
      })
      .catch((reason) => {
        if (!cancelled) {
          setState({
            role: null,
            loading: false,
            error:
              reason instanceof Error
                ? reason.message
                : "No se pudo obtener el perfil.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [auth.isAuthenticated, auth.isLoading, idToken]);

  return (
    <CurrentUserContext.Provider value={state}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentRole(): CurrentUserState {
  return useContext(CurrentUserContext);
}
