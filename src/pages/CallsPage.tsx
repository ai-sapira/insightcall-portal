import React, { useState, useCallback, useMemo } from 'react';
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
type FilterPeriod = 'all' | 'today' | 'week' | 'month';

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
  } = useVoiceCallsPaginated(1, 15, false, filters);

  // Handler para cambio de filtros - MEMORIZADO
  const handleFiltersChange = useCallback((newFilters: Partial<FilterState>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    updateFilters(updatedFilters);
  }, [filters, updateFilters]);

  // Handler para refresh - MEMORIZADO
  const handleRefresh = useCallback(() => {
    refresh(filters);
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
  const handleExportCSV = useCallback(async () => {
    try {
      await exportService.exportToCSV(filters);
      toast({
        title: "Exportación exitosa",
        description: "El archivo CSV se ha descargado correctamente",
      });
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      toast({
        title: "Error",
        description: "No se pudo exportar el archivo CSV",
        variant: "destructive",
      });
    }
  }, [filters, toast]);

  const handleExportExcel = useCallback(async () => {
    try {
      await exportService.exportToExcel(filters);
      toast({
        title: "Exportación exitosa",
        description: "El archivo Excel se ha descargado correctamente",
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: "Error",
        description: "No se pudo exportar el archivo Excel",
        variant: "destructive",
      });
    }
  }, [filters, toast]);

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

  // Métricas calculadas - MEMORIZADAS
  const keyMetrics = useMemo(() => {
    if (!calls || !stats) return [];

    const avgDurationFormatted = stats.avgDuration 
      ? `${Math.floor(stats.avgDuration / 60)}m ${Math.floor(stats.avgDuration % 60)}s`
      : '0m 0s';
    
    const successRate = calls.length > 0 
      ? ((calls.filter(c => c.call_successful).length / calls.length) * 100).toFixed(1)
      : '0';
    
    const ticketsGenerated = calls.reduce((sum, call) => sum + (call.tickets_count || 0), 0);
    const totalMessages = calls.reduce((sum, call) => sum + call.total_messages, 0);
    const audioAvailable = calls.filter(c => !!c.audio_download_url).length;
    const audioPercentage = calls.length > 0 ? ((audioAvailable / calls.length) * 100).toFixed(0) : '0';

    return [
      {
        title: 'Total Llamadas',
        value: total.toLocaleString(),
        subtitle: `${calls.length} en esta página`,
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
        title: 'Tasa de Éxito',
        value: `${successRate}%`,
        subtitle: 'Llamadas exitosas',
        icon: TrendingUp,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50'
      },
      {
        title: 'Tickets Enviados',
        value: calls.filter(c => c.ticket_sent_to_nogal).length.toString(),
        subtitle: 'Exitosos a Nogal',
        icon: Send,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50'
      },
      {
        title: 'Mensajes Totales',
        value: totalMessages.toLocaleString(),
        subtitle: 'En esta página',
        icon: MessageSquare,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50'
      },
      {
        title: 'Interacción Promedio',
        value: `${Math.round(calls.reduce((sum, call) => sum + call.total_messages, 0) / calls.length)}`,
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Exportar Datos</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportCSV}>
                  <FileText className="h-4 w-4 mr-2" />
                  Exportar CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Exportar Excel
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <PieChart className="h-4 w-4 mr-2" />
                  Ver analíticas
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Métricas Minimalistas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium">Resumen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
                              <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                  <code className="font-mono text-sm bg-muted px-2 py-1 rounded">
                                    {call.conversation_id}
                                  </code>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {call.segurneo_call_id.slice(0, 16)}...
                                </div>
                              </div>
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
                            <div className="space-y-1">
                              <code className="font-mono text-sm bg-muted px-2 py-1 rounded">
                                {call.conversation_id}
                              </code>
                              <p className="text-sm text-muted-foreground">
                                {call.segurneo_call_id.slice(0, 16)}...
                              </p>
                            </div>
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
