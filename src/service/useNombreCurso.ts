import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

export const useNombreCurso = () => {
  const location = useLocation();
  const [nombre, setNombre] = useState<string | null>(null);
  const [curso, setCurso] = useState<string | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const nombreParam = searchParams.get("nombre");
    const cursoParam = searchParams.get("curso");

    if (nombreParam) setNombre(nombreParam);
    if (cursoParam) setCurso(cursoParam);

    // Eliminar los parámetros de la URL después de capturarlos
    if (nombreParam || cursoParam) {
      const updatedSearchParams = new URLSearchParams(location.search);
      updatedSearchParams.delete("nombre");
      updatedSearchParams.delete("curso");
      const newUrl = `${location.pathname}${updatedSearchParams.toString() ? `?${updatedSearchParams.toString()}` : ''}`;
      if (location.search !== newUrl) {
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [location]);

  return { nombre, curso };
};
