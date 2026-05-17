import { useEffect, useState } from "react";
import { fetchEnrollmentData } from "../services/enrollment-api.js";

/**
 * Hook que busca dados de matrícula da API do ufabc-next.
 *
 * Retorna:
 *   enrollmentMap – Map<turmaId, { vagas, requisicoes, ratio }> (vazio se indisponível)
 *   isLoading     – true enquanto o fetch está em andamento
 *   isAvailable   – true se a API retornou dados (período de matrícula ativo)
 */
export function useEnrollmentData() {
  const [enrollmentMap, setEnrollmentMap] = useState(() => new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetchEnrollmentData({ signal: controller.signal })
      .then((map) => {
        setEnrollmentMap(map);
        setIsAvailable(map.size > 0);
      })
      .catch(() => {
        // AbortError ou erro inesperado — mantém mapa vazio
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, []);

  return { enrollmentMap, isLoading, isAvailable };
}
