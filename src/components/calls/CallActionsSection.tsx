import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  CheckCircle2, 
  AlertCircle, 
  Phone, 
  User, 
  Ticket, 
  Clock,
  Activity,
  FileText,
  Shield
} from "lucide-react";

interface TicketCreated {
  ticket_id: string;
  tipo_incidencia: string;
  motivo_gestion: string;
  cliente_id: string;
  estado: 'created' | 'failed';
  error?: string;
}

interface RellamadaCreated {
  ticket_relacionado: string;
  followup_id?: string;
  estado: 'created' | 'failed';
  motivo: string;
  error?: string;
}

interface ClienteCreated {
  cliente_id: string;
  nombre: string;
  tipo: string;
  estado: 'created' | 'failed';
  error?: string;
}

interface CallActionsSectionProps {
  aiAnalysis: {
    tickets_creados?: TicketCreated[];
    rellamadas_creadas?: RellamadaCreated[];
    clientes_creados?: ClienteCreated[];
    resumen_ejecucion?: string;
    datos_extraidos?: {
      numeroPoliza?: string;
      nombreCompleto?: string;
      email?: string;
      telefono?: string;
      codigoCliente?: string;
    };
    resumen_analisis?: string;
  } | null;
  ticketsCreated: number;
  ticketIds: string[];
}

const CallActionsSection: React.FC<CallActionsSectionProps> = ({ 
  aiAnalysis, 
  ticketsCreated, 
  ticketIds 
}) => {
  if (!aiAnalysis) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Activity className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No hay información de acciones disponible</p>
        </CardContent>
      </Card>
    );
  }

  const tickets = aiAnalysis.tickets_creados || [];
  const rellamadas = aiAnalysis.rellamadas_creadas || [];
  const clientes = aiAnalysis.clientes_creados || [];
  const datosCliente = aiAnalysis.datos_extraidos;
  const resumenAnalisis = aiAnalysis.resumen_analisis;

  const getStatusBadge = (estado: 'created' | 'failed') => {
    if (estado === 'created') {
      return (
        <Badge variant="default" className="text-xs">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Completado
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive" className="text-xs">
          <AlertCircle className="h-3 w-3 mr-1" />
          Error
        </Badge>
      );
    }
  };

  const totalActions = tickets.length + rellamadas.length + clientes.length;

  return (
    <div className="space-y-6 pb-8">
      
      {/* HEADER - Resumen Ejecutivo */}
      <Card className="border-2">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">Sistema autónomo</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Procesamiento automático completado</p>
            </div>
            <Badge variant="secondary" className="px-3 py-1">
              {totalActions} {totalActions === 1 ? 'acción' : 'acciones'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center p-4 rounded-lg bg-muted/30">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-background border-2 mx-auto mb-3">
                <Ticket className="h-6 w-6 text-foreground" />
              </div>
              <p className="text-2xl font-bold mb-1">{tickets.length}</p>
              <p className="text-xs text-muted-foreground font-medium">Tickets creados</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/30">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-background border-2 mx-auto mb-3">
                <Phone className="h-6 w-6 text-foreground" />
              </div>
              <p className="text-2xl font-bold mb-1">{rellamadas.length}</p>
              <p className="text-xs text-muted-foreground font-medium">Rellamadas</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/30">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-background border-2 mx-auto mb-3">
                <User className="h-6 w-6 text-foreground" />
              </div>
              <p className="text-2xl font-bold mb-1">{clientes.length}</p>
              <p className="text-xs text-muted-foreground font-medium">Clientes nuevos</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ACCORDION - Detalles de Acciones */}
      <Accordion type="multiple" defaultValue={["tickets", "analysis"]} className="w-full space-y-4">
        
        {/* TICKETS CREADOS */}
        {tickets.length > 0 && (
          <AccordionItem value="tickets" className="border-2 rounded-lg px-6 py-2">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-muted border">
                  <Ticket className="h-5 w-5 text-foreground" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-base">Tickets creados</p>
                  <p className="text-sm text-muted-foreground">{tickets.length} ticket(s) enviado(s) a Nogal</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-4">
              <div className="space-y-6">
                {tickets.map((ticket, index) => (
                  <Card key={index} className="border bg-muted/20">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 rounded-lg bg-background border flex items-center justify-center">
                            <Ticket className="h-4 w-4 text-foreground" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-base">Ticket Creado</h4>
                            <p className="text-sm text-muted-foreground">Enviado automáticamente</p>
                          </div>
                        </div>
                        {getStatusBadge(ticket.estado)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">

                      {/* INFORMACIÓN BÁSICA */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p className="text-muted-foreground text-sm font-medium">ID Ticket</p>
                          <div className="bg-background border rounded-md p-3">
                            <p className="font-mono text-sm font-medium">{ticket.ticket_id}</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-muted-foreground text-sm font-medium">Cliente</p>
                          <div className="bg-background border rounded-md p-3">
                            <p className="font-mono text-sm font-medium">{ticket.cliente_id}</p>
                          </div>
                        </div>
                      </div>

                      {/* NÚMERO DE PÓLIZA - DESTACADO */}
                      {datosCliente?.numeroPoliza && (
                        <div className="bg-background border-2 border-foreground/10 rounded-lg p-4">
                          <div className="flex items-center space-x-3 mb-3">
                            <Shield className="h-5 w-5 text-foreground" />
                            <span className="font-semibold">Póliza afectada</span>
                          </div>
                          <p className="font-mono text-xl font-bold text-foreground">#{datosCliente.numeroPoliza}</p>
                        </div>
                      )}

                      {/* INFORMACIÓN DEL TICKET */}
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-3">
                          <div>
                            <p className="text-muted-foreground text-sm font-medium mb-2">Tipo de incidencia</p>
                            <div className="bg-background border rounded-md p-3">
                              <p className="text-sm font-medium">{ticket.tipo_incidencia}</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-sm font-medium mb-2">Motivo</p>
                            <div className="bg-background border rounded-md p-3">
                              <p className="text-sm font-medium">{ticket.motivo_gestion}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* DATOS DEL CLIENTE */}
                      {datosCliente && (
                        <div className="border-t pt-6">
                          <p className="text-muted-foreground text-sm font-medium mb-4">Datos del cliente</p>
                          <div className="grid grid-cols-1 gap-3">
                            {datosCliente.nombreCompleto && (
                              <div className="flex justify-between items-center p-3 bg-background border rounded-md">
                                <span className="text-muted-foreground text-sm">Nombre:</span>
                                <span className="font-medium text-sm">{datosCliente.nombreCompleto}</span>
                              </div>
                            )}
                            {datosCliente.telefono && (
                              <div className="flex justify-between items-center p-3 bg-background border rounded-md">
                                <span className="text-muted-foreground text-sm">Teléfono:</span>
                                <span className="font-mono text-sm">{datosCliente.telefono}</span>
                              </div>
                            )}
                            {datosCliente.email && (
                              <div className="flex justify-between items-center p-3 bg-background border rounded-md">
                                <span className="text-muted-foreground text-sm">Email:</span>
                                <span className="font-mono text-xs">{datosCliente.email}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* ANÁLISIS DETALLADO DE LA LLAMADA */}
                      {resumenAnalisis && (
                        <div className="border-t pt-6">
                          <div className="flex items-center space-x-3 mb-4">
                            <FileText className="h-5 w-5 text-foreground" />
                            <p className="font-semibold">Análisis detallado de la llamada</p>
                          </div>
                          <div className="bg-background border-2 rounded-lg p-5">
                            <p className="text-sm leading-relaxed">{resumenAnalisis}</p>
                          </div>
                        </div>
                      )}

                      {ticket.error && (
                        <div className="border-t border-destructive/20 pt-6">
                          <p className="text-destructive text-sm font-medium mb-2">Error detectado</p>
                          <div className="bg-destructive/5 border border-destructive/20 rounded-md p-3">
                            <p className="text-destructive text-sm">{ticket.error}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* RELLAMADAS CREADAS */}
        {rellamadas.length > 0 && (
          <AccordionItem value="rellamadas" className="border-2 rounded-lg px-6 py-2">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-muted border">
                  <Phone className="h-5 w-5 text-foreground" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-base">Rellamadas Programadas</p>
                  <p className="text-sm text-muted-foreground">{rellamadas.length} seguimiento(s) creado(s)</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-4">
              <div className="space-y-4">
                {rellamadas.map((rellamada, index) => (
                  <Card key={index} className="border bg-muted/20">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 rounded-lg bg-background border flex items-center justify-center">
                            <Phone className="h-4 w-4 text-foreground" />
                          </div>
                          <div>
                            <h4 className="font-semibold">Seguimiento Programado</h4>
                            <p className="text-sm text-muted-foreground">{rellamada.motivo}</p>
                          </div>
                        </div>
                        {getStatusBadge(rellamada.estado)}
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-muted-foreground text-sm font-medium">Ticket Relacionado</p>
                        <div className="bg-background border rounded-md p-3">
                          <p className="font-mono text-sm">{rellamada.ticket_relacionado}</p>
                        </div>
                      </div>

                      {rellamada.error && (
                        <div className="mt-4 pt-4 border-t border-destructive/20">
                          <div className="bg-destructive/5 border border-destructive/20 rounded-md p-3">
                            <p className="text-destructive text-sm">{rellamada.error}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* CLIENTES CREADOS */}
        {clientes.length > 0 && (
          <AccordionItem value="clientes" className="border-2 rounded-lg px-6 py-2">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-muted border">
                  <User className="h-5 w-5 text-foreground" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-base">Clientes Creados</p>
                  <p className="text-sm text-muted-foreground">{clientes.length} cliente(s) nuevo(s)</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-4">
              <div className="space-y-4">
                {clientes.map((cliente, index) => (
                  <Card key={index} className="border bg-muted/20">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 rounded-lg bg-background border flex items-center justify-center">
                            <User className="h-4 w-4 text-foreground" />
                          </div>
                          <div>
                            <h4 className="font-semibold">{cliente.nombre}</h4>
                            <p className="text-sm text-muted-foreground">Tipo: {cliente.tipo}</p>
                          </div>
                        </div>
                        {getStatusBadge(cliente.estado)}
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-muted-foreground text-sm font-medium">ID Cliente</p>
                        <div className="bg-background border rounded-md p-3">
                          <p className="font-mono text-sm">{cliente.cliente_id}</p>
                        </div>
                      </div>

                      {cliente.error && (
                        <div className="mt-4 pt-4 border-t border-destructive/20">
                          <div className="bg-destructive/5 border border-destructive/20 rounded-md p-3">
                            <p className="text-destructive text-sm">{cliente.error}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* ANÁLISIS DETALLADO - SI NO HAY TICKETS */}
        {resumenAnalisis && tickets.length === 0 && (
          <AccordionItem value="analysis" className="border-2 rounded-lg px-6 py-2">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-muted border">
                  <FileText className="h-5 w-5 text-foreground" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-base">Análisis de la llamada</p>
                  <p className="text-sm text-muted-foreground">Resumen procesado por IA</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-4">
              <Card className="border bg-muted/20">
                <CardContent className="p-5">
                  <p className="text-sm leading-relaxed">{resumenAnalisis}</p>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>
        )}

      </Accordion>

      {/* RESUMEN DEL PROCESAMIENTO */}
      {aiAnalysis.resumen_ejecucion && (
        <Card className="border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-3">
              <Activity className="h-5 w-5" />
              Resumen del procesamiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {aiAnalysis.resumen_ejecucion}
            </p>
          </CardContent>
        </Card>
      )}

    </div>
  );
};

export default CallActionsSection; 