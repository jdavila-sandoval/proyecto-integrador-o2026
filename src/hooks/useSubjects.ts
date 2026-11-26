import { useEffect, useState } from "react";
import type { Subject } from "../types";
import { subjectService } from "../services/subjectService";

export function useSubjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    subjectService
      .list()
      .then((items) => active && setSubjects(items))
      .catch((reason) => {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : "No se pudieron cargar las materias."
          );
        }
      })
      .finally(() => active && setLoading(false))
    
    return () => {
      active = false;
    };
  }, []);

  return { subjects, loading, error };
}