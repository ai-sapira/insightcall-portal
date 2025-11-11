
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowUpRight, 
  Calendar, 
  Phone, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  MessageSquare, 
  BarChart3,
  UserCheck
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import RealCallsList from "@/components/calls/RealCallsList";
import { Link } from "react-router-dom";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useState, useMemo } from "react";
import { subDays, format } from "date-fns";
import { es } from "date-fns/locale";

const HomePage = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('month');
  const { stats, isLoading, error, lastUpdated, refresh } = useDashboardStats(selectedPeriod);

  // Función para formatear duración en minutos:segundos
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Función para formatear tendencias
  const formatTrend = (trend: number): string => {
    if (trend === 0) return "=";
    return trend > 0 ? `+${trend}%` : `${trend}%`;
  };

  // Función para obtener el texto del período
  const getPeriodText = (period: string): string => {
    switch (period) {
      case 'today': return 'Hoy';
      case 'week': return 'Últimos 7 días';
      case 'month': return 'Últimos 30 días';
      default: return 'Últimos 30 días';
    }
  };

  // Calcular media de llamadas por día según el período
  const calculateAverageCallsPerDay = (): number => {
    if (!stats || stats.totalCalls === 0) return 0;
    const daysInPeriod = selectedPeriod === 'today' ? 1 : selectedPeriod === 'week' ? 7 : 30;
    return Math.round((stats.totalCalls / daysInPeriod) * 10) / 10;
  };

  // Configurar métricas principales con datos reales
  const keyMetrics = stats ? [
    {
      title: "Llamadas almacenadas",
      value: stats.totalCalls.toLocaleString(),
      subtitle: getPeriodText(selectedPeriod),
      icon: Phone,
      trend: formatTrend(stats.trends.calls),
      trendValue: `${Math.abs(stats.trends.calls)} vs período anterior`,
      positive: stats.trends.calls >= 0,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Duración promedio",
      value: formatDuration(stats.avgDuration),
      subtitle: "Por llamada",
      icon: Clock,
      trend: formatTrend(stats.trends.duration),
      trendValue: `${Math.abs(stats.trends.duration)}% vs período anterior`,
      positive: stats.trends.duration <= 0, // Menor duración es mejor
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Media llamadas por día",
      value: calculateAverageCallsPerDay().toLocaleString(),
      subtitle: getPeriodText(selectedPeriod),
      icon: Calendar,
      trend: formatTrend(stats.trends.calls),
      trendValue: `${Math.abs(stats.trends.calls)}% vs período anterior`,
      positive: stats.trends.calls >= 0,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50"
    },
    {
      title: "Tickets creados",
      value: stats.ticketsCreated.toLocaleString(),
      subtitle: "Automáticamente",
      icon: MessageSquare,
      trend: formatTrend(stats.trends.tickets),
      trendValue: `${Math.abs(stats.trends.tickets)} vs período anterior`,
      positive: stats.trends.tickets >= 0,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    }
  ] : [];

  // Datos para el gráfico de área (últimos días)
  // Asegurar que todos los días del período estén representados
  const chartData = useMemo(() => {
    const daysInPeriod = selectedPeriod === 'today' ? 1 : selectedPeriod === 'week' ? 7 : 30;
    const now = new Date();
    const isLongPeriod = daysInPeriod > 7;
    
    // Crear mapa con todos los días del período inicializados en 0
    const daysMap = new Map<string, { name: string; calls: number; successful: number; failed: number }>();
    
    for (let i = daysInPeriod - 1; i >= 0; i--) {
      const date = subDays(now, i);
      const dayKey = date.toISOString().split('T')[0];
      const dayName = isLongPeriod
        ? format(date, 'dd/MM', { locale: es }) // Para períodos largos, mostrar fecha completa
        : format(date, 'EEE', { locale: es }); // Para períodos cortos, mostrar día de la semana
      
      daysMap.set(dayKey, {
        name: dayName,
        calls: 0,
        successful: 0,
        failed: 0
      });
    }
    
    // Llenar con datos reales si existen
    if (stats?.dailyVolume && stats.dailyVolume.length > 0) {
      stats.dailyVolume.forEach(day => {
        const dateKey = day.date;
        if (daysMap.has(dateKey)) {
          const dayName = isLongPeriod
            ? format(new Date(day.date), 'dd/MM', { locale: es })
            : format(new Date(day.date), 'EEE', { locale: es });
          
          daysMap.set(dateKey, {
            name: dayName,
            calls: day.calls,
            successful: day.successful,
            failed: day.failed
          });
        }
      });
    }
    
    // Convertir a array manteniendo el orden
    return Array.from(daysMap.values());
  }, [stats?.dailyVolume, selectedPeriod]);

  // Datos para el gráfico circular de estados
  const statusData = stats?.callsByStatus.map((item, index) => ({
    name: item.status === 'completed' ? 'Completadas' : 
          item.status === 'failed' ? 'Fallidas' : 
          item.status === 'in_progress' ? 'En progreso' : item.status,
    value: item.count,
    percentage: item.percentage,
    color: `hsl(var(--chart-${index + 1}))`
  })) || [];


  if (error) {
    return (
      <DashboardLayout>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <h3 className="font-medium text-red-800">Error al cargar estadísticas</h3>
                <p className="text-sm text-red-600">{error}</p>
                <Button variant="outline" size="sm" onClick={refresh} className="mt-2">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reintentar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header mejorado con selector de período */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight">
              Dashboard
            </h1>
            <p className="text-muted-foreground">
              Resumen de actividad y métricas del sistema
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 bg-muted rounded-lg p-1">
              {['today', 'week', 'month'].map((period) => (
                <Button
                  key={period}
                  variant={selectedPeriod === period ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedPeriod(period as any)}
                  className="h-8"
                >
                  {period === 'today' ? 'Hoy' : period === 'week' ? '7 días' : '30 días'}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {isLoading ? (
          // Skeletons mientras carga
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-20" />
              </CardContent>
            </Card>
          ))
        ) : (
          keyMetrics.map((metric, index) => (
            <Card key={index} className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {metric.title}
                </CardTitle>
                <div className={`p-2 rounded-md ${metric.bgColor}`}>
                  <metric.icon className={`h-4 w-4 ${metric.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground">
                    {metric.subtitle}
                  </p>
                  <div className="flex items-center">
                    {metric.positive ? (
                      <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                    )}
                    <span className={`text-xs font-medium ${
                      metric.positive ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {metric.trend}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {metric.trendValue}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Contenido principal */}
      <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
            
            {/* Gráfico principal */}
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Volumen de llamadas</CardTitle>
                <CardDescription>
                  Llamadas procesadas en {getPeriodText(selectedPeriod).toLowerCase()}
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsla(var(--muted-foreground) / 0.1)" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        interval={selectedPeriod === 'month' ? 2 : 0}
                        angle={selectedPeriod === 'month' ? -45 : 0}
                        textAnchor={selectedPeriod === 'month' ? 'end' : 'middle'}
                        height={selectedPeriod === 'month' ? 60 : 30}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--popover))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 'var(--radius)',
                          boxShadow: 'var(--shadow-md)'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="calls" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorCalls)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Panel lateral con información de llamadas */}
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Información de llamadas</CardTitle>
                <CardDescription>
                  Detalles del período seleccionado
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center space-x-4">
                      <div className="p-2 rounded-full bg-blue-100">
                        <Phone className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-2xl font-bold leading-none">
                          {stats?.totalCalls || 0}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          llamadas en {getPeriodText(selectedPeriod).toLowerCase()}
                        </p>
                      </div>
                    </div>

                    <Separator />

                    {/* Información adicional */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Análisis completados</span>
                        <Badge variant="secondary" className="text-blue-700 bg-blue-50">
                          {stats?.analysisRate || 0}%
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Audio disponible</span>
                        <Badge variant="secondary" className="text-green-700 bg-green-50">
                          {stats?.audioAvailability || 0}%
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Tickets creados</span>
                        <span className="text-sm font-medium">
                          {stats?.ticketsCreated || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Duración promedio</span>
                        <span className="text-sm font-medium">
                          {formatDuration(stats?.avgDuration || 0)}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
      </div>

      {/* Acciones rápidas */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Acciones rápidas</CardTitle>
          <CardDescription>
            Acceso directo a las funciones más utilizadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button variant="outline" className="h-24 flex-col space-y-2" asChild>
              <Link to="/calls">
                <Phone className="h-6 w-6" />
                <span>Ver llamadas</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-24 flex-col space-y-2" asChild>
              <Link to="/analytics">
                <BarChart3 className="h-6 w-6" />
                <span>Analíticas</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-24 flex-col space-y-2" asChild>
              <Link to="/users">
                <UserCheck className="h-6 w-6" />
                <span>Usuarios</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Llamadas recientes */}
      <Card className="mt-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle>Llamadas recientes</CardTitle>
            <CardDescription>
              Últimas llamadas almacenadas en el sistema
            </CardDescription>
          </div>
          <Button variant="ghost" asChild>
            <Link to="/calls">
              Ver todas
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <RealCallsList limit={8} showHeader={false} />
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default HomePage;
