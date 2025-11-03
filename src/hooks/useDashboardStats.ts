import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface DashboardStats {
  // Métricas principales
  totalCalls: number;
  avgDuration: number; // en segundos
  successRate: number; // porcentaje
  ticketsCreated: number;
  
  // Métricas adicionales
  analysisRate: number; // porcentaje
  totalCost: number; // en euros
  audioAvailability: number; // porcentaje
  
  // Tendencias (comparación con período anterior)
  trends: {
    calls: number; // porcentaje de cambio
    duration: number;
    success: number;
    tickets: number;
  };
  
  // Estado del sistema
  systemStatus: {
    isActive: boolean;
    lastCallTime: string | null;
    uptime: number; // porcentaje
  };
  
  // Datos para gráficos
  dailyVolume: Array<{
    date: string;
    calls: number;
    successful: number;
    failed: number;
  }>;
  
  callsByStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
}

export function useDashboardStats(period: 'today' | 'week' | 'month' = 'month') {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const calculateDateRange = useCallback((period: string) => {
    const now = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setDate(now.getDate() - 30);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }
    
    return { startDate: startDate.toISOString(), endDate: now.toISOString() };
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { startDate, endDate } = calculateDateRange(period);
      
      // 🔒 FILTRO: Solo contar llamadas del agente de Nogal
      const NOGAL_AGENT_ID = 'agent_01jym1fbthfhttdrgyqvdx5xtq';
      
      // Obtener datos del período actual
      const { data: currentCalls, error: currentError } = await supabase
        .from('calls')
        .select(`
          id,
          duration_seconds,
          call_successful,
          tickets_created,
          analysis_completed,
          cost_cents,
          audio_download_url,
          status,
          start_time,
          created_at
        `)
        .eq('agent_id', NOGAL_AGENT_ID)
        .gte('start_time', startDate)
        .lte('start_time', endDate)
        .order('start_time', { ascending: false });

      if (currentError) throw currentError;

      // Obtener datos del período anterior para comparación
      const previousStartDate = new Date(startDate);
      const previousEndDate = new Date(startDate);
      const periodDays = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
      
      previousStartDate.setDate(previousStartDate.getDate() - periodDays);
      
      // Usar la misma constante NOGAL_AGENT_ID definida arriba
      const { data: previousCalls, error: previousError } = await supabase
        .from('calls')
        .select('id, duration_seconds, call_successful, tickets_created')
        .eq('agent_id', NOGAL_AGENT_ID)
        .gte('start_time', previousStartDate.toISOString())
        .lt('start_time', startDate);

      if (previousError) throw previousError;

      // Calcular métricas principales
      const totalCalls = currentCalls?.length || 0;
      const successfulCalls = currentCalls?.filter(call => call.call_successful).length || 0;
      const totalDuration = currentCalls?.reduce((sum, call) => sum + (call.duration_seconds || 0), 0) || 0;
      const totalTickets = currentCalls?.reduce((sum, call) => sum + (call.tickets_created || 0), 0) || 0;
      const analyzedCalls = currentCalls?.filter(call => call.analysis_completed).length || 0;
      const totalCostCents = currentCalls?.reduce((sum, call) => sum + (call.cost_cents || 0), 0) || 0;
      const callsWithAudio = currentCalls?.filter(call => call.audio_download_url).length || 0;

      // Calcular métricas del período anterior
      const previousTotalCalls = previousCalls?.length || 0;
      const previousSuccessfulCalls = previousCalls?.filter(call => call.call_successful).length || 0;
      const previousTotalDuration = previousCalls?.reduce((sum, call) => sum + (call.duration_seconds || 0), 0) || 0;
      const previousTotalTickets = previousCalls?.reduce((sum, call) => sum + (call.tickets_created || 0), 0) || 0;

      // Calcular tendencias
      const calculateTrend = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      // Obtener datos para gráficos diarios
      const dailyData = new Map();
      currentCalls?.forEach(call => {
        const date = new Date(call.start_time).toISOString().split('T')[0];
        if (!dailyData.has(date)) {
          dailyData.set(date, { calls: 0, successful: 0, failed: 0 });
        }
        const dayData = dailyData.get(date);
        dayData.calls++;
        if (call.call_successful) {
          dayData.successful++;
        } else {
          dayData.failed++;
        }
      });

      // Convertir a array y ordenar
      const dailyVolume = Array.from(dailyData.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Calcular distribución por estado
      const statusCounts = new Map();
      currentCalls?.forEach(call => {
        const status = call.status || 'unknown';
        statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
      });

      const callsByStatus = Array.from(statusCounts.entries()).map(([status, count]) => ({
        status,
        count,
        percentage: totalCalls > 0 ? Math.round((count / totalCalls) * 100) : 0
      }));

      // Verificar estado del sistema
      const lastCall = currentCalls?.[0];
      const lastCallTime = lastCall?.start_time || null;
      const isActive = lastCallTime ? 
        (new Date().getTime() - new Date(lastCallTime).getTime()) < (2 * 60 * 60 * 1000) : // 2 horas
        false;

      const dashboardStats: DashboardStats = {
        totalCalls,
        avgDuration: totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0,
        successRate: totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 0,
        ticketsCreated: totalTickets,
        analysisRate: totalCalls > 0 ? Math.round((analyzedCalls / totalCalls) * 100) : 0,
        totalCost: Math.round(totalCostCents / 100 * 100) / 100, // Convertir a euros con 2 decimales
        audioAvailability: totalCalls > 0 ? Math.round((callsWithAudio / totalCalls) * 100) : 0,
        trends: {
          calls: calculateTrend(totalCalls, previousTotalCalls),
          duration: calculateTrend(
            totalCalls > 0 ? totalDuration / totalCalls : 0,
            previousTotalCalls > 0 ? previousTotalDuration / previousTotalCalls : 0
          ),
          success: calculateTrend(
            totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0,
            previousTotalCalls > 0 ? (previousSuccessfulCalls / previousTotalCalls) * 100 : 0
          ),
          tickets: calculateTrend(totalTickets, previousTotalTickets)
        },
        systemStatus: {
          isActive,
          lastCallTime,
          uptime: 99.9 // Esto podría calcularse basado en el historial de errores
        },
        dailyVolume,
        callsByStatus
      };

      setStats(dashboardStats);
      setLastUpdated(new Date());

      console.log('📊 Dashboard stats calculated:', {
        period,
        totalCalls,
        successRate: dashboardStats.successRate,
        avgDuration: dashboardStats.avgDuration
      });

    } catch (error) {
      console.error('❌ Error fetching dashboard stats:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  }, [period, calculateDateRange]);

  const refresh = useCallback(() => {
    fetchStats();
  }, [fetchStats]);

  // Cargar datos iniciales
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Auto-refresh cada 5 minutos
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 Auto-refresh dashboard stats...');
      fetchStats();
    }, 5 * 60 * 1000); // 5 minutos

    return () => clearInterval(interval);
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    lastUpdated,
    refresh
  };
} 