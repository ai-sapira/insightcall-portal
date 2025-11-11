
import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from "recharts";
import { CalendarDays, Download, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { format, subDays, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const COLORS = ['#3d904b', '#8eca93', '#bbe1be', '#dcf1de'];
const NOGAL_AGENT_ID = 'agent_01jym1fbthfhttdrgyqvdx5xtq';

interface CallData {
  id: string;
  start_time: string;
  duration_seconds: number;
  call_successful: boolean;
  status: string;
  tickets_created: number;
  total_messages: number;
}

const AnalyticsPage = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('7days');
  const [loading, setLoading] = useState(true);
  const [calls, setCalls] = useState<CallData[]>([]);

  const calculateDateRange = (period: string) => {
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'yesterday':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);
        const yesterdayEnd = new Date(startDate);
        yesterdayEnd.setHours(23, 59, 59, 999);
        return { startDate: startDate.toISOString(), endDate: yesterdayEnd.toISOString() };
      case '7days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);
        break;
      case '30days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);
        break;
      case '3months':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);
        break;
      case '6months':
        startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);
    }
    
    return { startDate: startDate.toISOString(), endDate: now.toISOString() };
  };

  const dateRange = useMemo(() => calculateDateRange(selectedPeriod), [selectedPeriod]);

  useEffect(() => {
    const fetchCalls = async () => {
      setLoading(true);
      try {
        console.log(`[Analytics] Fetching calls for period: ${selectedPeriod}`, dateRange);
        
        const { data, error } = await supabase
          .from('calls')
          .select('id, start_time, duration_seconds, call_successful, status, tickets_created, total_messages')
          .eq('agent_id', NOGAL_AGENT_ID)
          .gte('start_time', dateRange.startDate)
          .lte('start_time', dateRange.endDate)
          .order('start_time', { ascending: true });

        if (error) throw error;
        console.log(`[Analytics] Fetched ${data?.length || 0} calls`);
        setCalls(data || []);
      } catch (error) {
        console.error('Error fetching calls:', error);
        setCalls([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCalls();
  }, [selectedPeriod, dateRange]);

  // Agrupar llamadas por día
  const callVolumeData = useMemo(() => {
    const start = parseISO(dateRange.startDate);
    const now = new Date();
    const daysDiff = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const isLongPeriod = ['30days', '3months', '6months'].includes(selectedPeriod);
    const numDays = Math.min(daysDiff, 
      selectedPeriod === '6months' ? 180 : 
      selectedPeriod === '3months' ? 90 : 
      selectedPeriod === '30days' ? 30 : 
      selectedPeriod === '7days' ? 7 : 
      daysDiff
    );
    
    const daysMap = new Map<string, { calls: number; completed: number; issues: number; date: Date }>();
    
    // Inicializar días del período
    const days = Array.from({ length: numDays }, (_, i) => {
      const date = subDays(now, numDays - 1 - i);
      const dayKey = isLongPeriod
        ? format(date, 'dd/MM', { locale: es }) // Para períodos largos, mostrar fecha completa
        : format(date, 'EEE', { locale: es }); // Para períodos cortos, mostrar día de la semana
      daysMap.set(dayKey, { calls: 0, completed: 0, issues: 0, date });
      return { day: dayKey, date };
    });

    calls.forEach(call => {
      const callDate = parseISO(call.start_time);
      const dayKey = isLongPeriod
        ? format(callDate, 'dd/MM', { locale: es })
        : format(callDate, 'EEE', { locale: es });
      const dayData = daysMap.get(dayKey);
      if (dayData) {
        dayData.calls++;
        if (call.call_successful) {
          dayData.completed++;
        } else {
          dayData.issues++;
        }
      }
    });

    return days.map(({ day }) => ({
      day,
      calls: daysMap.get(day)?.calls || 0,
      completed: daysMap.get(day)?.completed || 0,
      issues: daysMap.get(day)?.issues || 0,
    }));
  }, [calls, selectedPeriod, dateRange]);

  // Duración media total del período
  const averageDuration = useMemo(() => {
    if (calls.length === 0) return 0;
    const totalDuration = calls.reduce((sum, call) => sum + (call.duration_seconds || 0), 0);
    return Math.round((totalDuration / calls.length) / 60 * 10) / 10; // En minutos con 1 decimal
  }, [calls]);

  // Total de tickets creados en el período
  const totalTickets = useMemo(() => {
    return calls.reduce((sum, call) => sum + (call.tickets_created || 0), 0);
  }, [calls]);

  // Mensajes promedio por llamada
  const averageMessages = useMemo(() => {
    if (calls.length === 0) return 0;
    const totalMessages = calls.reduce((sum, call) => sum + (call.total_messages || 0), 0);
    return Math.round((totalMessages / calls.length) * 10) / 10; // Con 1 decimal
  }, [calls]);


  // Distribución por estado (para el gráfico circular)
  const callTypeData = useMemo(() => {
    const statusMap = new Map<string, number>();
    
    calls.forEach(call => {
      const status = call.status || 'unknown';
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });

    const statusLabels: Record<string, string> = {
      'completed': 'Completadas',
      'failed': 'Fallidas',
      'abandoned': 'Abandonadas',
      'unknown': 'Desconocidas',
    };

    return Array.from(statusMap.entries()).map(([status, value]) => ({
      name: statusLabels[status] || status,
      value,
    }));
  }, [calls]);


  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Analiza el rendimiento de las llamadas del asistente virtual
          </p>
        </div>
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="yesterday">Ayer</SelectItem>
              <SelectItem value="7days">Últimos 7 días</SelectItem>
              <SelectItem value="30days">Últimos 30 días</SelectItem>
              <SelectItem value="3months">Últimos 3 meses</SelectItem>
              <SelectItem value="6months">Últimos 6 meses</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Volumen de llamadas</CardTitle>
                <CardDescription>Número total de llamadas por día</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={callVolumeData}>
                      <defs>
                        <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="day" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis fontSize={12} tickLine={false} axisLine={false} />
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsla(var(--muted-foreground) / 0.1)" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '0.5rem'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="calls" 
                        stroke="hsl(var(--primary))" 
                        fillOpacity={1} 
                        fill="url(#colorCalls)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Estado de llamadas</CardTitle>
                <CardDescription>Distribución por estado</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {callTypeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={callTypeData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          fill="#8884d8"
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {callTypeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '0.5rem'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      No hay datos disponibles
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Duración Media</CardTitle>
                <CardDescription>Promedio del período seleccionado</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex flex-col items-center justify-center">
                  <div className="text-5xl font-bold text-primary mb-2">
                    {averageDuration.toFixed(1)}
                  </div>
                  <div className="text-muted-foreground text-lg">minutos</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Total Tickets</CardTitle>
                <CardDescription>Creados en el período</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex flex-col items-center justify-center">
                  <div className="text-5xl font-bold text-primary mb-2">
                    {totalTickets}
                  </div>
                  <div className="text-muted-foreground text-sm">
                    {calls.filter(c => c.tickets_created > 0).length} llamadas con tickets
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mensajes Promedio</CardTitle>
                <CardDescription>Por llamada</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex flex-col items-center justify-center">
                  <div className="text-5xl font-bold text-primary mb-2">
                    {averageMessages.toFixed(1)}
                  </div>
                  <div className="text-muted-foreground text-sm">
                    mensajes por llamada
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Total llamadas</CardTitle>
                <CardDescription>En el período seleccionado</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex flex-col items-center justify-center">
                  <div className="text-5xl font-bold text-primary mb-2">
                    {calls.length}
                  </div>
                  <div className="text-muted-foreground text-sm">
                    llamadas totales
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
      </div>
    </DashboardLayout>
  );
};

export default AnalyticsPage;
