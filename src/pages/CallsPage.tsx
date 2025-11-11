import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useVoiceCallsPaginated } from '@/hooks/useVoiceCallsReal';
import { VoiceCallReal } from '@/services/voiceCallsRealDataService';
import { voiceCallsRealDataService, VoiceCallDetailsClean } from '@/services/voiceCallsRealDataService';
import { exportService } from '@/services/exportService';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Pagination } from '@/components/ui/pagination';
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';

// Icons
import { 
  Phone, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Download, 
  RefreshCw, 
  Calendar,
  FileSpreadsheet,
  Clock,
  MessageSquare,
  AlertCircle,
  Activity,
  ChevronLeft,
  Send,
  FileText,
  PieChart,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2
} from 'lucide-react';

import { CallDetailsSidebar } from '@/components/calls/CallDetailsSidebar';
import DashboardLayout from '@/components/layout/DashboardLayout';

// Types para filtros simplificados
type FilterPeriod = 'all' | 'today' | 'week' | 'month' | '3months' | '6months';

interface FilterState {
  period: FilterPeriod;
  search: string;
}

export default function CallsPage() {
  const { toast } = useToast();
  
  // Estados locales de filtros - INMUTABLES para evitar re-renders
  const [filters, setFilters] = useState<FilterState>({
    period: 'all',
    search: ''
  });
  
  // Estados de UI
  const [selectedCall, setSelectedCall] = useState<VoiceCallDetailsClean | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Sidebar de detalles cerrado por defecto
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  
  // Estados para exportación
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportType, setExportType] = useState<'filters' | 'dateRange' | 'specific'>('filters');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedCallIds, setSelectedCallIds] = useState<string[]>([]);
  const [exportCount, setExportCount] = useState<number | null>(null);
  const [loadingExportCount, setLoadingExportCount] = useState(false);

  // Hook de datos - SOLO SE EJECUTA CUANDO CAMBIAN LOS FILTROS
  const { 
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
    hasNextPage,
    hasPrevPage,
    updateFilters
  } = useVoiceCallsPaginated(1, 15, false, filters as any);

  // Handler para cambio de filtros - MEMORIZADO
  const handleFiltersChange = useCallback((newFilters: Partial<FilterState>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    updateFilters(updatedFilters as any);
  }, [filters, updateFilters]);

  // Handler para refresh - MEMORIZADO
  const handleRefresh = useCallback(() => {
    refresh(filters as any);
    toast({
      title: "Datos actualizados",
      description: "Las llamadas han sido actualizadas correctamente.",
    });
  }, [refresh, filters, toast]);

  // Handler para cargar detalles - MEMORIZADO
  const handleViewDetails = useCallback(async (call: VoiceCallReal) => {
    try {
      setLoadingDetails(true);
      const details = await voiceCallsRealDataService.getVoiceCallDetailsClean(call.segurneo_call_id);
      setSelectedCall(details);
      setSidebarOpen(true); // Abrir sidebar de detalles cuando se selecciona una llamada
    } catch (error) {
      console.error('Error loading call details:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los detalles de la llamada.",
        variant: "destructive",
      });
    } finally {
      setLoadingDetails(false);
    }
  }, [toast]);

  // Handlers de exportación - MEMORIZADOS
  const handleExportCSV = useCallback(async (exportFilters?: any) => {
    try {
      const filtersToUse = exportFilters || filters;
      await exportService.exportToCSV(filtersToUse);
      toast({
        title: "Exportación exitosa",
        description: "El archivo CSV se ha descargado correctamente",
      });
      setExportDialogOpen(false);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      toast({
        title: "Error",
        description: "No se pudo exportar el archivo CSV",
        variant: "destructive",
      });
    }
  }, [filters, toast]);

  const handleExportExcel = useCallback(async (exportFilters?: any) => {
    try {
      const filtersToUse = exportFilters || filters;
      await exportService.exportToExcel(filtersToUse);
      toast({
        title: "Exportación exitosa",
        description: "El archivo Excel se ha descargado correctamente",
      });
      setExportDialogOpen(false);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: "Error",
        description: "No se pudo exportar el archivo Excel",
        variant: "destructive",
      });
    }
  }, [filters, toast]);

  // Calcular conteo de llamadas a exportar
  useEffect(() => {
    const calculateExportCount = async () => {
      if (!exportDialogOpen) {
        setExportCount(null);
        return;
      }

      setLoadingExportCount(true);
      try {
        if (exportType === 'filters') {
          // Usar el total actual de llamadas con los filtros aplicados
          setExportCount(total);
        } else if (exportType === 'dateRange') {
          if (startDate && endDate) {
            // Para el conteo por intervalo, hacemos una consulta de prueba
            // usando el servicio de exportación que tiene acceso a getCallsByDateRange
            try {
              const startDateISO = new Date(startDate).toISOString();
              const endDateISO = new Date(endDate);
              endDateISO.setHours(23, 59, 59, 999);
              
              // Usar el método interno del servicio de exportación para obtener datos
              // y contar cuántas llamadas hay
              const testData = await exportService.getExportData({
                startDate: startDateISO,
                endDate: endDateISO.toISOString(),
                search: filters.search
              });
              setExportCount(testData.length);
            } catch (error) {
              console.error('Error contando llamadas por intervalo:', error);
              setExportCount(null);
            }
          } else {
            setExportCount(null);
          }
        } else if (exportType === 'specific') {
          setExportCount(selectedCallIds.length);
        }
      } catch (error) {
        console.error('Error calculando conteo de exportación:', error);
        setExportCount(null);
      } finally {
        setLoadingExportCount(false);
      }
    };

    calculateExportCount();
  }, [exportDialogOpen, exportType, filters, total, startDate, endDate, selectedCallIds]);

  // Handler para preparar exportación según tipo seleccionado
  const handlePrepareExport = useCallback((type: 'csv' | 'excel') => {
    let exportFilters: any = { ...filters };

    if (exportType === 'dateRange') {
      if (!startDate || !endDate) {
        toast({
          title: "Error",
          description: "Por favor selecciona ambas fechas",
          variant: "destructive",
        });
        return;
      }
      exportFilters = {
        ...filters,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        period: undefined, // Sobrescribir período predefinido
      };
    } else if (exportType === 'specific') {
      if (selectedCallIds.length === 0) {
        toast({
          title: "Error",
          description: "Por favor selecciona al menos una llamada",
          variant: "destructive",
        });
        return;
      }
      exportFilters = {
        specificCallIds: selectedCallIds,
      };
    }

    if (type === 'csv') {
      handleExportCSV(exportFilters);
    } else {
      handleExportExcel(exportFilters);
    }
  }, [exportType, startDate, endDate, selectedCallIds, filters, handleExportCSV, handleExportExcel, toast]);

  // Handlers para exportar llamadas específicas - MEMORIZADOS
  const handleExportSingleCSV = useCallback(async (conversationId: string) => {
    try {
      await exportService.exportSingleCallToCSV(conversationId);
      toast({
        title: "Exportación exitosa",
        description: `Llamada exportada: ...${conversationId.slice(-8)}.csv`,
      });
    } catch (error) {
      console.error('Error exporting single call to CSV:', error);
      toast({
        title: "Error",
        description: "No se pudo exportar la llamada",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleExportSingleExcel = useCallback(async (conversationId: string) => {
    try {
      await exportService.exportSingleCallToExcel(conversationId);
      toast({
        title: "Exportación exitosa",
        description: `Llamada exportada: ...${conversationId.slice(-8)}.xlsx`,
      });
    } catch (error) {
      console.error('Error exporting single call to Excel:', error);
      toast({
        title: "Error",
        description: "No se pudo exportar la llamada",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Métricas calculadas - MEMORIZADAS (usando estadísticas filtradas, no solo página actual)
  const keyMetrics = useMemo(() => {
    if (!calls || !stats) return [];

    const avgDurationFormatted = stats.avgDuration 
      ? `${Math.floor(stats.avgDuration / 60)}m ${Math.floor(stats.avgDuration % 60)}s`
      : '0m 0s';

    return [
      {
        title: 'Total Llamadas',
        value: total.toLocaleString(),
        subtitle: `Con filtros aplicados`,
        icon: Phone,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50'
      },
      {
        title: 'Duración Promedio',
        value: avgDurationFormatted,
        subtitle: 'Por llamada',
        icon: Clock,
        color: 'text-green-600',
        bgColor: 'bg-green-50'
      },
      {
        title: 'Tickets Enviados',
        value: stats.ticketsSent.toLocaleString(),
        subtitle: 'Exitosos a Nogal',
        icon: Send,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50'
      },
      {
        title: 'Mensajes Totales',
        value: stats.totalMessages.toLocaleString(),
        subtitle: 'Con filtros aplicados',
        icon: MessageSquare,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50'
      },
      {
        title: 'Interacción Promedio',
        value: `${Math.round(stats.avgMessages)}`,
        subtitle: 'Mensajes por llamada',
        icon: MessageSquare,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50'
      }
    ];
  }, [calls, stats, total]);

  // Función para formatear fecha - MEMORIZADA
  const formatDate = useCallback((dateString: string | null | undefined) => {
    if (!dateString) return 'Fecha no disponible';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Fecha inválida';
      return format(date, 'dd MMM, yyyy HH:mm', { locale: es });
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return 'Error en fecha';
    }
  }, []);

  // Función para obtener configuración de estado - MEMORIZADA
  const getStatusConfig = useCallback((call: VoiceCallReal) => {
    // Llamadas fallidas
    if (call.status === 'failed') {
      return { variant: 'destructive' as const, label: 'Llamada Fallida', icon: AlertCircle };
    }
    
    // Llamadas en progreso
    if (call.status === 'in_progress') {
      return { variant: 'secondary' as const, label: 'En Proceso', icon: Activity };
    }
    
    // Llamadas completadas - revisar si tienen tickets
    if (call.status === 'completed') {
      if (call.tickets_count > 0) {
        return { variant: 'default' as const, label: 'Ticket Enviado', icon: Send };
      } else {
        return { variant: 'secondary' as const, label: 'Ticket Pendiente', icon: FileText };
      }
    }
    
    // Fallback
    return { variant: 'outline' as const, label: 'Estado Desconocido', icon: AlertCircle };
  }, []);

  // Loading State
  if (isLoading && !calls) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </CardHeader>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error al cargar las llamadas: {error}
        </AlertDescription>
      </Alert>
    );
  }

  const filteredCalls = calls || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
      {/* Header Minimalista */}
      <div className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold">Llamadas</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{total.toLocaleString()} llamadas totales</span>
                  {lastUpdated && (
                    <>
                      <Separator orientation="vertical" className="h-4" />
                      <span>Actualizado {format(lastUpdated, 'HH:mm', { locale: es })}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Exportar Llamadas</DialogTitle>
                  <DialogDescription>
                    Selecciona qué llamadas deseas exportar
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {/* Tipo de exportación */}
                  <div className="space-y-2">
                    <Label>Tipo de exportación</Label>
                    <Select value={exportType} onValueChange={(value: any) => setExportType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="filters">Llamadas visibles (con filtros aplicados)</SelectItem>
                        <SelectItem value="dateRange">Por intervalo de tiempo</SelectItem>
                        <SelectItem value="specific">Llamadas específicas por ID</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Información de filtros actuales */}
                  {exportType === 'filters' && (
                    <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Filtros aplicados:</span>
                        {loadingExportCount ? (
                          <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                          <Badge variant="secondary">
                            {exportCount !== null ? `${exportCount.toLocaleString()} llamadas` : 'Calculando...'}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        {filters.period !== 'all' && (
                          <div>• Período: {
                            filters.period === 'today' ? 'Hoy' : 
                            filters.period === 'week' ? 'Semana' : 
                            filters.period === 'month' ? 'Mes' :
                            filters.period === '3months' ? '3 Meses' :
                            filters.period === '6months' ? '6 Meses' :
                            filters.period
                          }</div>
                        )}
                        {filters.search && (
                          <div>• Búsqueda: "{filters.search}"</div>
                        )}
                        {filters.period === 'all' && !filters.search && (
                          <div>• Sin filtros: todas las llamadas</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Intervalo de tiempo */}
                  {exportType === 'dateRange' && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Fecha de inicio</Label>
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Fecha de fin</Label>
                        <Input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                        />
                      </div>
                      {startDate && endDate && (
                        <div className="rounded-lg border bg-muted/50 p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Llamadas en el intervalo:</span>
                            {loadingExportCount ? (
                              <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : (
                              <Badge variant="secondary">
                                {exportCount !== null ? `${exportCount.toLocaleString()} llamadas` : 'Calculando...'}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Del {format(new Date(startDate), 'dd MMM yyyy', { locale: es })} al {format(new Date(endDate), 'dd MMM yyyy', { locale: es })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Llamadas específicas */}
                  {exportType === 'specific' && (
                    <div className="space-y-2">
                      <Label>IDs de conversación (separados por comas)</Label>
                      <Input
                        placeholder="conv_123, conv_456, ..."
                        value={selectedCallIds.join(', ')}
                        onChange={(e) => {
                          const ids = e.target.value.split(',').map(id => id.trim()).filter(id => id);
                          setSelectedCallIds(ids);
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        Ingresa los IDs de conversación separados por comas
                      </p>
                      {selectedCallIds.length > 0 && (
                        <div className="rounded-lg border bg-muted/50 p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Llamadas seleccionadas:</span>
                            <Badge variant="secondary">
                              {selectedCallIds.length} {selectedCallIds.length === 1 ? 'llamada' : 'llamadas'}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Resumen de exportación */}
                  {exportCount !== null && exportCount > 0 && (
                    <div className="rounded-lg bg-primary/10 border border-primary/20 p-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            Se exportarán {exportCount.toLocaleString()} {exportCount === 1 ? 'llamada' : 'llamadas'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            El archivo incluirá todas las columnas configuradas
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Botones de acción */}
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      onClick={() => handlePrepareExport('csv')}
                      disabled={exportCount === null || exportCount === 0 || loadingExportCount}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Exportar CSV
                    </Button>
                    <Button 
                      onClick={() => handlePrepareExport('excel')}
                      disabled={exportCount === null || exportCount === 0 || loadingExportCount}
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Exportar Excel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Métricas Minimalistas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium">Resumen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {keyMetrics.map((metric, index) => {
              const IconComponent = metric.icon;
              return (
                <div key={index} className="flex flex-col items-center text-center p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="p-2 rounded-md bg-background mb-2">
                    <IconComponent className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg font-semibold">{metric.value}</p>
                    <p className="text-xs text-muted-foreground leading-tight">{metric.title}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filtros y Búsqueda */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Filtros y búsqueda</CardTitle>
              <CardDescription>
                Filtra y busca llamadas específicas
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-sm">
              {filteredCalls.length} resultados
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Filtros en una sola línea */}
          <div className="flex items-center space-x-4">
            
            {/* Búsqueda unificada */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ID, conversación, agente, Caller ID..."
                  value={filters.search}
                  onChange={(e) => handleFiltersChange({ search: e.target.value })}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Período */}
            <Select 
              value={filters.period} 
              onValueChange={(value) => handleFiltersChange({ period: value as FilterPeriod })}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="today">Hoy</SelectItem>
                <SelectItem value="week">Semana</SelectItem>
                <SelectItem value="month">Mes</SelectItem>
                <SelectItem value="3months">3 Meses</SelectItem>
                <SelectItem value="6months">6 Meses</SelectItem>
              </SelectContent>
            </Select>

            {/* Modo de vista */}
            <Select value={viewMode} onValueChange={(value) => setViewMode(value as 'table' | 'cards')}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="table">Tabla</SelectItem>
                <SelectItem value="cards">Tarjetas</SelectItem>
              </SelectContent>
            </Select>

            {/* Botón de filtros avanzados */}
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          </div>

 
        </CardContent>
      </Card>

      {/* Lista de llamadas mejorada */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">
              Llamadas
            </CardTitle>
            <CardDescription>
                Lista de llamadas con detalles y acciones • Página {currentPage} de {totalPages}
            </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <PieChart className="h-4 w-4 mr-2" />
                Analíticas
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCalls.length === 0 ? (
            <div className="text-center py-12">
              <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay llamadas</h3>
              <p className="text-muted-foreground">
                {filters.search || filters.period !== 'all'
                  ? 'No se encontraron llamadas con los filtros actuales.'
                  : 'No hay llamadas disponibles en este momento.'}
              </p>
            </div>
          ) : (
            <>
              {viewMode === 'table' ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Llamada</TableHead>
                        <TableHead className="w-40">Fecha</TableHead>
                        <TableHead>Duración</TableHead>
                        <TableHead>Interacción</TableHead>
                        <TableHead>Análisis</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCalls.map((call) => {
                        const statusConfig = getStatusConfig(call);
                        const StatusIcon = statusConfig.icon;
                        return (
                          <TableRow key={call.id} className="hover:bg-muted/50">
                            <TableCell>
                              <code className="font-mono text-sm bg-muted px-2 py-1 rounded break-all">
                                {call.conversation_id}
                              </code>
                            </TableCell>
                            <TableCell>
                              <div className="whitespace-nowrap">
                                {formatDate(call.start_time)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span>{Math.floor(call.duration_seconds / 60)}m {call.duration_seconds % 60}s</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-3 text-sm">
                                <div className="flex items-center space-x-1">
                                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{call.total_messages}</span>
                                </div>
                                <div className="text-muted-foreground">
                                  ({Math.round((call.agent_messages / call.total_messages) * 100)}% agente)
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {call.status === 'failed' ? (
                                <Badge variant="destructive" className="flex items-center space-x-1 w-fit">
                                  <AlertCircle className="h-3 w-3" />
                                  <span>Fallido</span>
                                </Badge>
                              ) : call.analysis_completed ? (
                                <Badge variant="default" className="flex items-center space-x-1 w-fit bg-green-600 hover:bg-green-700">
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span>Completado</span>
                                </Badge>
                              ) : call.status === 'completed' ? (
                                <Badge variant="secondary" className="flex items-center space-x-1 w-fit bg-amber-100 text-amber-800 hover:bg-amber-200">
                                  <Clock className="h-3 w-3" />
                                  <span>En proceso</span>
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="flex items-center space-x-1 w-fit">
                                  <Minus className="h-3 w-3" />
                                  <span>Pendiente</span>
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleViewDetails(call)}
                                  disabled={loadingDetails}
                                >
                                  {loadingDetails ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    'Ver detalles'
                                  )}
                                </Button>
                                
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      <Download className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Exportar Llamada</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleExportSingleCSV(call.conversation_id)}>
                                      <FileText className="h-4 w-4 mr-2" />
                                      Exportar CSV
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleExportSingleExcel(call.conversation_id)}>
                                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                                      Exportar Excel
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCalls.map((call) => {
                    const statusConfig = getStatusConfig(call);
                    const StatusIcon = statusConfig.icon;
                    return (
                      <Card key={call.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <code className="font-mono text-sm bg-muted px-2 py-1 rounded break-all">
                              {call.conversation_id}
                            </code>
                            <Badge variant={statusConfig.variant} className="flex items-center space-x-1">
                              <StatusIcon className="h-3 w-3" />
                              <span>{statusConfig.label}</span>
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>{formatDate(call.start_time)}</span>
                            </div>
                          </div>
                                                      <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center space-x-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span>{Math.floor(call.duration_seconds / 60)}m {call.duration_seconds % 60}s</span>
                              </div>
                            </div>
                                                        <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center space-x-2">
                                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                <span>{call.total_messages} mensajes</span>
                              </div>
                              <span className="text-muted-foreground">
                                {Math.round((call.agent_messages / call.total_messages) * 100)}% agente
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm">
                              {call.ticket_sent_to_nogal ? (
                                <>
                                  <Send className="h-4 w-4 text-green-600" />
                                  <span className="text-green-600">Ticket enviado a Nogal</span>
                                </>
                              ) : call.tickets_count > 0 ? (
                                <>
                                  <AlertCircle className="h-4 w-4 text-orange-600" />
                                  <span className="text-orange-600">Error al enviar ticket</span>
                                </>
                              ) : (
                                <>
                                  <Minus className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-muted-foreground">Sin ticket generado</span>
                                </>
                              )}
                            </div>
                                                      <div className="pt-2 space-y-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full"
                                onClick={() => handleViewDetails(call)}
                                disabled={loadingDetails}
                              >
                                {loadingDetails ? (
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  'Ver detalles'
                                )}
                              </Button>
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" className="w-full">
                                    <Download className="h-4 w-4 mr-2" />
                                    Exportar
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Exportar Llamada</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleExportSingleCSV(call.conversation_id)}>
                                    <FileText className="h-4 w-4 mr-2" />
                                    Exportar CSV
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleExportSingleExcel(call.conversation_id)}>
                                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                                    Exportar Excel
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Paginación mejorada */}
              <div className="flex items-center justify-between pt-6">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <span>
                    Mostrando {filteredCalls.length} de {total.toLocaleString()} llamadas
                  </span>
                  {filteredCalls.length > 0 && (
                    <>
                      <Separator orientation="vertical" className="h-4" />
                      <span>
                        Página {currentPage} de {totalPages}
                      </span>
                    </>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(currentPage - 1)}
                    disabled={!hasPrevPage || isLoading}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(currentPage + 1)}
                    disabled={!hasNextPage || isLoading}
                  >
                    Siguiente
                    <ChevronLeft className="h-4 w-4 ml-2 rotate-180" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Sidebar de detalles */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent className="w-[600px] sm:max-w-[600px]">
          {selectedCall && (
            <CallDetailsSidebar
              call={selectedCall}
              isOpen={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
            />
          )}
        </SheetContent>
             </Sheet>
       </div>
     </DashboardLayout>
   );
 }
