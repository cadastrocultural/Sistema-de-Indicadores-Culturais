import { useEffect } from 'react';

/**
 * Hook para suprimir o warning conhecido do Recharts sobre keys duplicadas em elementos SVG.
 * Este é um bug interno do Recharts que não afeta a funcionalidade da aplicação.
 * Ref: https://github.com/recharts/recharts/issues/3615
 */
export const useSuppressRechartsWarning = () => {
  useEffect(() => {
    const originalError = console.error;
    const originalWarn = console.warn;

    console.error = (...args: any[]) => {
      const firstArg = args[0];
      if (
        typeof firstArg === 'string' &&
        firstArg.includes('Encountered two children with the same key')
      ) {
        // Suprimir apenas este warning específico do Recharts
        return;
      }
      originalError.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      const firstArg = args[0];
      if (
        typeof firstArg === 'string' &&
        firstArg.includes('Encountered two children with the same key')
      ) {
        // Suprimir apenas este warning específico do Recharts
        return;
      }
      originalWarn.apply(console, args);
    };

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);
};
