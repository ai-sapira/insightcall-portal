import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Clock,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Phone,
  MessageSquare,
  Minus
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useVoiceCallsReal } from "@/hooks/useVoiceCallsReal";
import { Link } from "react-router-dom";

interface RealCallsListProps {
  limit?: number;
  showHeader?: boolean;
}

const RealCallsList: React.FC<RealCallsListProps> = ({ 
  limit = 10, 
  showHeader = true 
}) => {
  const { calls, stats, isLoading, error, lastUpdated, refresh } = useVoiceCallsReal(limit);

  const handleRefresh = () => {
    refresh();
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    if (isToday) {
      return `Hoy ${format(date, 'HH:mm')}`;
    } else if (isYesterday) {
      return `Ayer ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'dd MMM, HH:mm', { locale: es });
    }
  };

  // Loading skeleton - minimalista
  if (isLoading && (!calls || calls.length === 0)) {
    return (
      <>
        {showHeader && (
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-light">Llamadas Recientes</CardTitle>
              <Button variant="ghost" size="sm" disabled>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Cargando...
              </Button>
            </div>
          </CardHeader>
        )}
        <CardContent>
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
                {Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </>
    );
  }

  // Error state - minimalista
  if (error) {
    return (
      <>
        {showHeader && (
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-light">Llamadas Recientes</CardTitle>
              <Button variant="ghost" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
            </div>
          </CardHeader>
        )}
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground font-light">
                Error al cargar las llamadas
              </p>
              <p className="text-sm text-muted-foreground mt-2">{error}</p>
            </div>
          </div>
        </CardContent>
      </>
    );
  }

  // Empty state - minimalista
  if (!calls || calls.length === 0) {
    return (
      <>
        {showHeader && (
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-light">Llamadas Recientes</CardTitle>
              <Button variant="ghost" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
            </div>
          </CardHeader>
        )}
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Phone className="h-8 w-8 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground font-light">
                Sin llamadas recientes
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Las llamadas aparecerán aquí cuando lleguen
              </p>
            </div>
          </div>
        </CardContent>
      </>
    );
  }

  return (
    <>
        {showHeader && (
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">
                  Llamadas Recientes
                </CardTitle>
                {lastUpdated && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Actualizado {lastUpdated.toLocaleTimeString('es-ES')}
                  </p>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleRefresh}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Actualizar
              </Button>
            </div>
          </CardHeader>
        )}

      <CardContent>
        {/* Tabla de llamadas - misma estética que CallsPage */}
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
              {calls.map((call) => (
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
                    {call.total_messages > 0 ? (
                      <div className="flex items-center space-x-3 text-sm">
                        <div className="flex items-center space-x-1">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{call.total_messages}</span>
                        </div>
                        {call.agent_messages && (
                          <div className="text-muted-foreground">
                            ({Math.round((call.agent_messages / call.total_messages) * 100)}% agente)
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
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
                    <Button 
                      variant="outline" 
                      size="sm"
                      asChild
                    >
                      <Link to={`/calls?conversation=${call.conversation_id}`}>
                        Ver detalles
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </>
  );
};

export default RealCallsList; 