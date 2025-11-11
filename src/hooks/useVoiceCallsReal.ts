import { useState, useEffect, useCallback, useRef } from 'react';
import { voiceCallsRealDataService, VoiceCallReal, VoiceCallsStats } from '@/services/voiceCallsRealDataService';

interface UseVoiceCallsRealReturn {
  calls: VoiceCallReal[] | null;
  stats: VoiceCallsStats | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

// TIPOS PARA FILTROS
type FilterOptions = {
  status?: 'all' | 'ticket_sent' | 'ticket_pending' | 'ticket_unassigned' | 'in_progress';
  period?: 'all' | 'today' | 'week' | 'month' | '3months' | '6months';
  search?: string; // Búsqueda unificada: ID, conversación, agente, Caller ID
};

// NUEVO TIPO PARA PAGINACIÓN
interface UseVoiceCallsPaginatedReturn {
  calls: VoiceCallReal[] | null;
  stats: VoiceCallsStats | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: (newFilters?: FilterOptions) => void;
  // Información de paginación
  currentPage: number;
  totalPages: number;
  total: number;
  setPage: (page: number) => void;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  updateFilters: (newFilters: FilterOptions) => void;
}

export function useVoiceCallsReal(limit: number = 50, autoRefresh: boolean = true): UseVoiceCallsRealReturn {
  const [calls, setCalls] = useState<VoiceCallReal[] | null>(null);
  const [stats, setStats] = useState<VoiceCallsStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔄 Actualizando datos de llamadas...');
      
      // Obtener llamadas y estadísticas en paralelo
      const [callsData, statsData] = await Promise.all([
        voiceCallsRealDataService.getRecentVoiceCalls(limit),
        voiceCallsRealDataService.getVoiceCallsStats()
      ]);

      setCalls(callsData);
      setStats(statsData);
      setLastUpdated(new Date());
      
      console.log('✅ Datos actualizados:', {
        llamadas: callsData.length,
        total: statsData.total,
        promedioDuracion: statsData.avgDuration
      });
      
    } catch (err) {
      console.error('❌ Error actualizando datos:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Carga inicial
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh cada 30 segundos si está habilitado
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      console.log('🔄 Auto-refresh de llamadas...');
      fetchData();
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [fetchData, autoRefresh]);

  return {
    calls,
    stats,
    isLoading,
    error,
    lastUpdated,
    refresh
  };
}

// NUEVO HOOK PARA PAGINACIÓN
export function useVoiceCallsPaginated(
  initialPage: number = 1, 
  limit: number = 10, 
  autoRefresh: boolean = false,
  filters?: FilterOptions
): UseVoiceCallsPaginatedReturn {
  const [calls, setCalls] = useState<VoiceCallReal[] | null>(null);
  const [stats, setStats] = useState<VoiceCallsStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  
  // Usar refs para evitar dependencias que cambien constantemente
  const filtersRef = useRef(filters);
  const currentPageRef = useRef(currentPage);
  
  // Actualizar refs cuando cambien los valores
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);
  
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  const fetchData = useCallback(async (page: number, appliedFilters?: FilterOptions) => {
    try {
      setIsLoading(true);
      setError(null);

      console.log(`🔄 [PAGINATION] Actualizando página ${page}...`, appliedFilters);
      
      // Obtener datos paginados y estadísticas en paralelo (con los mismos filtros)
      const [paginatedData, statsData] = await Promise.all([
        voiceCallsRealDataService.getVoiceCallsPaginated(page, limit, appliedFilters),
        voiceCallsRealDataService.getVoiceCallsStats(appliedFilters)
      ]);

      setCalls(paginatedData.calls);
      setCurrentPage(paginatedData.currentPage);
      setTotalPages(paginatedData.totalPages);
      setTotal(paginatedData.total);
      setStats(statsData);
      setLastUpdated(new Date());
      
      console.log('✅ [PAGINATION] Datos actualizados:', {
        página: paginatedData.currentPage,
        páginas_total: paginatedData.totalPages,
        llamadas_página: paginatedData.calls.length,
        total_llamadas: paginatedData.total,
        filtros: appliedFilters
      });
      
    } catch (err) {
      console.error('❌ [PAGINATION] Error actualizando datos:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  const setPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
      fetchData(page, filtersRef.current);
    }
  }, [totalPages, currentPage, fetchData]);

  const refresh = useCallback((newFilters?: FilterOptions) => {
    const filtersToUse = newFilters || filtersRef.current;
    fetchData(currentPageRef.current, filtersToUse);
  }, [fetchData]);

  // Función para actualizar filtros
  const updateFilters = useCallback((newFilters: FilterOptions) => {
    setCurrentPage(1); // Resetear a página 1 cuando cambian filtros
    fetchData(1, newFilters);
  }, [fetchData]);

  // Carga inicial - solo una vez
  useEffect(() => {
    fetchData(initialPage, filters);
  }, []);

  // Auto-refresh si está habilitado (menos frecuente para paginación)
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      console.log(`🔄 [PAGINATION] Auto-refresh página ${currentPageRef.current}...`);
      fetchData(currentPageRef.current, filtersRef.current);
    }, 60000); // 60 segundos (menos frecuente)

    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  return {
    calls,
    stats,
    isLoading,
    error,
    lastUpdated,
    refresh,
    currentPage,
    totalPages,
    total,
    setPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    updateFilters
  };
} 