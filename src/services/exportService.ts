import * as XLSX from 'xlsx';
import { parse as csvParse } from 'papaparse';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { voiceCallsRealDataService, VoiceCallReal } from './voiceCallsRealDataService';
import { supabase } from '../lib/supabase';

// 📊 INTERFACES PARA EXPORTACIÓN
export interface ExportCallData {
  // 📞 DATOS DE LLAMADA
  conversation_id: string;
  caller_id: string;
  fecha: string;
  hora: string;
  duracion: string;
  duracion_segundos: number;
  estado_llamada: string;
  razon_finalizacion: string;
  agente_id: string;
  
  // 💬 DATOS DE INTERACCIÓN
  mensajes_agente: number;
  mensajes_usuario: number;
  total_mensajes: number;
  porcentaje_agente: string;
  resumen_transcripcion: string;
  
  // 🎫 DATOS DE TICKET
  tickets_creados: number;
  ticket_ids: string;
  ticket_tipo: string;
  ticket_motivo: string;
  ticket_prioridad: string;
  ticket_estado: string;
  ticket_enviado_nogal: string;
  nogal_ticket_id: string;
  nogal_estado: string;
  
  // 👤 DATOS DE CLIENTE EXTRAÍDOS
  nombre_cliente: string;
  email_cliente: string;
  telefono_cliente: string;
  codigo_cliente: string;
  direccion_cliente: string;
  
  // 🧠 DATOS DE ANÁLISIS IA
  tipo_incidencia_ia: string;
  motivo_gestion_ia: string;
  confianza_ia: number;
  requiere_ticket: string;
  
  // 💰 DATOS DE COSTOS
  costo_centavos: number;
  costo_euros: string;
  
  // 🎵 DATOS DE AUDIO
  audio_disponible: string;
  audio_url: string;
  audio_tamaño_mb: string;
}

export interface ExportFilters {
  period?: 'all' | 'today' | 'week' | 'month';
  search?: string;
  ticket_status?: 'all' | 'sent' | 'failed' | 'none';
  includeAudio?: boolean;
  // 🎯 NUEVO: Exportación específica
  specificCallIds?: string[]; // IDs de conversaciones específicas
  // 📅 NUEVO: Intervalo de tiempo personalizado
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
}

export class ExportService {
  
  /**
   * 📊 Obtener datos completos para exportación
   */
  async getExportData(filters: ExportFilters = {}): Promise<ExportCallData[]> {
    console.log('📊 [EXPORT] Obteniendo datos para exportación...', filters);
    
    try {
      let calls: VoiceCallReal[] = [];
      
      // 🎯 NUEVO: Si se especifican IDs específicos, obtener solo esas llamadas
      if (filters.specificCallIds && filters.specificCallIds.length > 0) {
        console.log(`🎯 [EXPORT] Exportando ${filters.specificCallIds.length} llamadas específicas`);
        calls = await this.getSpecificCalls(filters.specificCallIds);
      } else if (filters.startDate || filters.endDate) {
        // 📅 NUEVO: Si se especifica intervalo de tiempo personalizado
        console.log(`📅 [EXPORT] Exportando por intervalo: ${filters.startDate} a ${filters.endDate}`);
        calls = await this.getCallsByDateRange(filters.startDate!, filters.endDate!, filters.search);
      } else {
        // 1. Obtener todas las llamadas con filtros normales
        const result = await voiceCallsRealDataService.getVoiceCallsPaginated(
          1, 
          1000, // Exportar hasta 1000 llamadas máximo
          filters
        );
        calls = result.calls;
      }
      
      console.log(`📞 [EXPORT] Obtenidas ${calls.length} llamadas`);
      
      // 2. Obtener datos detallados de tickets para todas las llamadas
      const allTicketIds = calls
        .filter(call => call.ticket_ids && call.ticket_ids.length > 0)
        .flatMap(call => call.ticket_ids);
      
      let ticketsData: any[] = [];
      if (allTicketIds.length > 0) {
        const { data: tickets } = await supabase
          .from('tickets')
          .select('*')
          .in('id', allTicketIds);
        ticketsData = tickets || [];
      }
      
      console.log(`🎫 [EXPORT] Obtenidos ${ticketsData.length} tickets`);
      
      // 3. Obtener análisis de IA y datos de clientes para todas las llamadas
      // 🔒 FILTRO: Solo obtener análisis de llamadas del agente de Nogal
      const NOGAL_AGENT_ID = 'agent_01jym1fbthfhttdrgyqvdx5xtq';
      const callIds = calls.map(call => call.id);
      const { data: callsWithAnalysis } = await supabase
        .from('calls')
        .select('id, conversation_id, ai_analysis, transcripts, cost_cents')
        .in('id', callIds)
        .eq('agent_id', NOGAL_AGENT_ID);
      
      console.log(`🧠 [EXPORT] Obtenidos análisis para ${callsWithAnalysis?.length || 0} llamadas`);
      
      // 4. Procesar y combinar todos los datos
      const exportData: ExportCallData[] = calls.map(call => {
        // Buscar datos adicionales
        const callAnalysis = callsWithAnalysis?.find(c => c.id === call.id);
        const callTickets = ticketsData.filter(ticket => call.ticket_ids?.includes(ticket.id));
        const mainTicket = callTickets[0]; // Usar el primer ticket como principal
        
        // Extraer datos de cliente de AI analysis
        const aiAnalysis = callAnalysis?.ai_analysis || {};
        const extractedData = aiAnalysis.extracted_data || aiAnalysis.datos_extraidos || {};
        
        // Extraer datos de cliente de transcripts/tool_results
        let clientDataFromTools = {};
        if (callAnalysis?.transcripts) {
          callAnalysis.transcripts.forEach((transcript: any) => {
            if (transcript.tool_results) {
              transcript.tool_results.forEach((tool: any) => {
                if (tool.tool_name === 'buscar_cliente' && tool.result?.clientes?.length > 0) {
                  const cliente = tool.result.clientes[0];
                  clientDataFromTools = {
                    codigo_cliente: cliente.codigo_cliente,
                    nombre_cliente: cliente.nombre_cliente,
                    email_cliente: cliente.email_cliente,
                    telefono_cliente: cliente.telefono_1 || cliente.telefono_2,
                  };
                }
              });
            }
          });
        }
        
        // Combinar datos de cliente (priorizar tool_results sobre extracted_data)
        const clientData = { ...extractedData, ...clientDataFromTools };
        
        // Calcular duraciones y porcentajes
        const duracionMinutos = Math.floor(call.duration_seconds / 60);
        const duracionSegundos = call.duration_seconds % 60;
        const duracionFormato = `${duracionMinutos}m ${duracionSegundos}s`;
        const porcentajeAgente = call.total_messages > 0 
          ? Math.round((call.agent_messages / call.total_messages) * 100) 
          : 0;
        
        // Formatear fecha y hora
        const fecha = new Date(call.start_time);
        const fechaFormato = format(fecha, 'dd MMM yyyy', { locale: es });
        const horaFormato = format(fecha, 'HH:mm');
        
        // Determinar estado de envío a Nogal
        let nogalEstado = 'No Enviado';
        let nogalTicketId = '';
        if (call.ticket_sent_to_nogal) {
          nogalEstado = 'Enviado Exitosamente';
          nogalTicketId = mainTicket?.metadata?.nogal_ticket_id || '';
        } else if (call.tickets_count > 0) {
          nogalEstado = 'Error al Enviar';
        }
        
        return {
          // 📞 DATOS DE LLAMADA
          conversation_id: call.conversation_id,
          caller_id: call.caller_id || 'No disponible',
          fecha: fechaFormato,
          hora: horaFormato,
          duracion: duracionFormato,
          duracion_segundos: call.duration_seconds,
          estado_llamada: call.status,
          razon_finalizacion: call.termination_reason || '',
          agente_id: call.agent_id,
          
          // 💬 DATOS DE INTERACCIÓN
          mensajes_agente: call.agent_messages,
          mensajes_usuario: call.user_messages,
          total_mensajes: call.total_messages,
          porcentaje_agente: `${porcentajeAgente}%`,
          resumen_transcripcion: call.transcript_summary || '',
          
          // 🎫 DATOS DE TICKET
          tickets_creados: call.tickets_count,
          ticket_ids: call.ticket_ids?.join(', ') || '',
          ticket_tipo: mainTicket?.tipo_incidencia || '',
          ticket_motivo: mainTicket?.motivo_incidencia || '',
          ticket_prioridad: mainTicket?.priority || '',
          ticket_estado: mainTicket?.status || '',
          ticket_enviado_nogal: call.ticket_sent_to_nogal ? 'Sí' : 'No',
          nogal_ticket_id: nogalTicketId,
          nogal_estado: nogalEstado,
          
          // 👤 DATOS DE CLIENTE EXTRAÍDOS
          nombre_cliente: clientData.nombreCliente || clientData.nombre_cliente || '',
          email_cliente: clientData.email || clientData.email_cliente || '',
          telefono_cliente: clientData.telefono || clientData.telefono_cliente || '',
          codigo_cliente: clientData.idCliente || clientData.codigo_cliente || '',
          direccion_cliente: clientData.direccion || '',
          
          // 🧠 DATOS DE ANÁLISIS IA
          tipo_incidencia_ia: aiAnalysis.incident_type || '',
          motivo_gestion_ia: aiAnalysis.management_reason || '',
          confianza_ia: aiAnalysis.confidence || 0,
          requiere_ticket: aiAnalysis.requiere_ticket ? 'Sí' : 'No',
          
          // 💰 DATOS DE COSTOS
          costo_centavos: callAnalysis?.cost_cents || 0,
          costo_euros: callAnalysis?.cost_cents ? `€${(callAnalysis.cost_cents / 100).toFixed(2)}` : '€0.00',
          
          // 🎵 DATOS DE AUDIO
          audio_disponible: call.audio_available ? 'Sí' : 'No',
          audio_url: filters.includeAudio ? (call.audio_download_url || '') : '[No incluido]',
          audio_tamaño_mb: call.audio_file_size ? `${(call.audio_file_size / 1024 / 1024).toFixed(2)} MB` : '',
        };
      });
      
      console.log(`✅ [EXPORT] Procesados ${exportData.length} registros para exportación`);
      return exportData;
      
    } catch (error) {
      console.error('❌ [EXPORT] Error obteniendo datos:', error);
      throw new Error(`Error obteniendo datos para exportación: ${error}`);
    }
  }
  
  /**
   * 📄 Exportar a CSV
   */
  async exportToCSV(filters: ExportFilters = {}): Promise<void> {
    try {
      const data = await this.getExportData(filters);
      
      // Convertir a CSV con headers en español
      const csvData = data.map(row => ({
        'ID Conversación': row.conversation_id,
        'Caller ID': row.caller_id,
        'Fecha': row.fecha,
        'Hora': row.hora,
        'Duración': row.duracion,
        'Duración (seg)': row.duracion_segundos,
        'Estado Llamada': row.estado_llamada,
        'Razón Finalización': row.razon_finalizacion,
        'Mensajes Agente': row.mensajes_agente,
        'Mensajes Usuario': row.mensajes_usuario,
        'Total Mensajes': row.total_mensajes,
        '% Agente': row.porcentaje_agente,
        'Resumen': row.resumen_transcripcion,
        'Tickets Creados': row.tickets_creados,
        'Ticket IDs': row.ticket_ids,
        'Tipo Ticket': row.ticket_tipo,
        'Motivo Ticket': row.ticket_motivo,
        'Nogal Ticket ID': row.nogal_ticket_id,
        'Estado Nogal': row.nogal_estado,
        'Nombre Cliente': row.nombre_cliente,
        'Email Cliente': row.email_cliente,
        'Teléfono Cliente': row.telefono_cliente,
        'Código Cliente': row.codigo_cliente,
        'Dirección Cliente': row.direccion_cliente,
        'Audio Disponible': row.audio_disponible,
        'URL Audio': row.audio_url,
        'Tamaño Audio': row.audio_tamaño_mb,
      }));
      
      // Generar CSV
      const csvString = this.arrayToCSV(csvData);
      
      // Descargar
      const filename = `llamadas_tickets_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`;
      this.downloadFile(csvString, filename, 'text/csv');
      
      console.log(`✅ [EXPORT] CSV exportado: ${filename}`);
      
    } catch (error) {
      console.error('❌ [EXPORT] Error exportando CSV:', error);
      throw error;
    }
  }
  
  /**
   * 🎯 Exportar una llamada específica a CSV
   */
  async exportSingleCallToCSV(conversationId: string, includeAudio: boolean = false): Promise<void> {
    try {
      const filters: ExportFilters = {
        specificCallIds: [conversationId],
        includeAudio
      };
      
      const data = await this.getExportData(filters);
      
      if (data.length === 0) {
        throw new Error('No se encontró la llamada especificada');
      }
      
             // Convertir a CSV con headers en español
       const csvData = data.map(row => ({
         'ID Conversación': row.conversation_id,
         'Caller ID': row.caller_id,
         'Fecha': row.fecha,
        'Hora': row.hora,
        'Duración': row.duracion,
        'Estado Llamada': row.estado_llamada,
        'Agente ID': row.agente_id,
        'Mensajes Agente': row.mensajes_agente,
        'Mensajes Usuario': row.mensajes_usuario,
        'Total Mensajes': row.total_mensajes,
        '% Agente': row.porcentaje_agente,
        'Nombre Cliente': row.nombre_cliente,
        'Email Cliente': row.email_cliente,
        'Teléfono Cliente': row.telefono_cliente,
        'Código Cliente': row.codigo_cliente,
        'Tickets Creados': row.tickets_creados,
        'Tipo Ticket': row.ticket_tipo,
        'Enviado a Nogal': row.ticket_enviado_nogal,
        'Estado Nogal': row.nogal_estado,
        'Nogal Ticket ID': row.nogal_ticket_id,
        'Tipo Incidencia (IA)': row.tipo_incidencia_ia,
        'Confianza IA': row.confianza_ia,
        'Costo': row.costo_euros,
        'Audio Disponible': row.audio_disponible,
        'Resumen': row.resumen_transcripcion,
      }));
      
      // Generar CSV
      const csvString = this.arrayToCSV(csvData);
      
      // Descargar con nombre específico
      const shortId = conversationId.slice(-8); // Últimos 8 caracteres
      const filename = `llamada_${shortId}_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`;
      this.downloadFile(csvString, filename, 'text/csv');
      
      console.log(`✅ [EXPORT] Llamada específica exportada: ${filename}`);
      
    } catch (error) {
      console.error('❌ [EXPORT] Error exportando llamada específica:', error);
      throw error;
    }
  }

  /**
   * 🎯 Exportar una llamada específica a Excel
   */
  async exportSingleCallToExcel(conversationId: string, includeAudio: boolean = false): Promise<void> {
    try {
      const filters: ExportFilters = {
        specificCallIds: [conversationId],
        includeAudio
      };
      
      const data = await this.getExportData(filters);
      
      if (data.length === 0) {
        throw new Error('No se encontró la llamada especificada');
      }
      
      const call = data[0]; // Solo una llamada
      
      // Crear workbook con información detallada de la llamada
      const workbook = XLSX.utils.book_new();
      
      // 📋 HOJA 1: INFORMACIÓN GENERAL
             const generalData = [{
         'ID Conversación': call.conversation_id,
         'Caller ID': call.caller_id,
         'Fecha': call.fecha,
         'Hora': call.hora,
        'Duración': call.duracion,
        'Estado': call.estado_llamada,
        'Agente': call.agente_id,
        'Razón Finalización': call.razon_finalizacion,
        'Costo': call.costo_euros,
      }];
      
      const generalSheet = XLSX.utils.json_to_sheet(generalData);
      XLSX.utils.book_append_sheet(workbook, generalSheet, 'Información General');
      
      // 📋 HOJA 2: CLIENTE Y TICKET
      const clientTicketData = [{
        'Nombre Cliente': call.nombre_cliente,
        'Email Cliente': call.email_cliente,
        'Teléfono Cliente': call.telefono_cliente,
        'Código Cliente': call.codigo_cliente,
        'Dirección Cliente': call.direccion_cliente,
        'Tickets Creados': call.tickets_creados,
        'Tipo Ticket': call.ticket_tipo,
        'Motivo Ticket': call.ticket_motivo,
        'Prioridad': call.ticket_prioridad,
        'Estado Ticket': call.ticket_estado,
        'Enviado a Nogal': call.ticket_enviado_nogal,
        'Nogal Ticket ID': call.nogal_ticket_id,
        'Estado Nogal': call.nogal_estado,
      }];
      
      const clientSheet = XLSX.utils.json_to_sheet(clientTicketData);
      XLSX.utils.book_append_sheet(workbook, clientSheet, 'Cliente y Ticket');
      
      // 📋 HOJA 3: ANÁLISIS Y INTERACCIÓN
      const analysisData = [{
        'Mensajes Agente': call.mensajes_agente,
        'Mensajes Usuario': call.mensajes_usuario,
        'Total Mensajes': call.total_mensajes,
        'Porcentaje Agente': call.porcentaje_agente,
        'Tipo Incidencia (IA)': call.tipo_incidencia_ia,
        'Motivo Gestión (IA)': call.motivo_gestion_ia,
        'Confianza IA': call.confianza_ia,
        'Requiere Ticket': call.requiere_ticket,
        'Audio Disponible': call.audio_disponible,
        'Tamaño Audio': call.audio_tamaño_mb,
        'Resumen Transcripción': call.resumen_transcripcion,
      }];
      
      const analysisSheet = XLSX.utils.json_to_sheet(analysisData);
      XLSX.utils.book_append_sheet(workbook, analysisSheet, 'Análisis e Interacción');
      
      // Generar y descargar
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const shortId = conversationId.slice(-8); // Últimos 8 caracteres
      const filename = `llamada_detallada_${shortId}_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`;
      
      this.downloadFile(
        new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        filename,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      
      console.log(`✅ [EXPORT] Llamada específica exportada a Excel: ${filename}`);
      
    } catch (error) {
      console.error('❌ [EXPORT] Error exportando llamada específica a Excel:', error);
      throw error;
    }
  }

  /**
   * 📊 Exportar a Excel
   */
  async exportToExcel(filters: ExportFilters = {}): Promise<void> {
    try {
      const data = await this.getExportData(filters);
      
      // Crear workbook con múltiples hojas
      const workbook = XLSX.utils.book_new();
      
      // 📋 HOJA 1: DATOS PRINCIPALES
      const mainData = data.map(row => ({
        'ID Conversación': row.conversation_id,
        'Caller ID': row.caller_id,
        'Fecha': row.fecha,
        'Hora': row.hora,
        'Duración': row.duracion,
        'Estado': row.estado_llamada,
        'Agente': row.agente_id,
        'Mensajes': `${row.total_mensajes} (${row.porcentaje_agente} agente)`,
        'Nombre Cliente': row.nombre_cliente,
        'Email Cliente': row.email_cliente,
        'Teléfono': row.telefono_cliente,
        'Ticket Enviado': row.ticket_enviado_nogal,
        'Estado Nogal': row.nogal_estado,
        'Nogal ID': row.nogal_ticket_id,
        'Tipo Incidencia': row.ticket_tipo,
        'Costo': row.costo_euros,
      }));
      
      const mainSheet = XLSX.utils.json_to_sheet(mainData);
      XLSX.utils.book_append_sheet(workbook, mainSheet, 'Llamadas y Tickets');
      
      // 📊 HOJA 2: DETALLES TÉCNICOS
      const techData = data.map(row => ({
        'ID Conversación': row.conversation_id,
        'Duración (seg)': row.duracion_segundos,
        'Razón Finalización': row.razon_finalizacion,
        'Mensajes Agente': row.mensajes_agente,
        'Mensajes Usuario': row.mensajes_usuario,
        'Total Mensajes': row.total_mensajes,
        'Tickets Creados': row.tickets_creados,
        'Ticket IDs': row.ticket_ids,
        'Prioridad Ticket': row.ticket_prioridad,
        'Estado Ticket': row.ticket_estado,
        'Confianza IA': row.confianza_ia,
        'Requiere Ticket': row.requiere_ticket,
        'Costo (centavos)': row.costo_centavos,
        'Audio Disponible': row.audio_disponible,
        'Tamaño Audio': row.audio_tamaño_mb,
      }));
      
      const techSheet = XLSX.utils.json_to_sheet(techData);
      XLSX.utils.book_append_sheet(workbook, techSheet, 'Detalles Técnicos');
      
      // 🧠 HOJA 3: ANÁLISIS IA Y CLIENTES
      const aiData = data.map(row => ({
        'ID Conversación': row.conversation_id,
        'Nombre Cliente': row.nombre_cliente,
        'Email Cliente': row.email_cliente,
        'Teléfono Cliente': row.telefono_cliente,
        'Código Cliente': row.codigo_cliente,
        'Dirección Cliente': row.direccion_cliente,
        'Tipo Incidencia (IA)': row.tipo_incidencia_ia,
        'Motivo Gestión (IA)': row.motivo_gestion_ia,
        'Confianza IA': row.confianza_ia,
        'Resumen Transcripción': row.resumen_transcripcion,
      }));
      
      const aiSheet = XLSX.utils.json_to_sheet(aiData);
      XLSX.utils.book_append_sheet(workbook, aiSheet, 'IA y Clientes');
      
      // Generar y descargar
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const filename = `llamadas_tickets_completo_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`;
      
      this.downloadFile(
        new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        filename,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      
      console.log(`✅ [EXPORT] Excel exportado: ${filename}`);
      
    } catch (error) {
      console.error('❌ [EXPORT] Error exportando Excel:', error);
      throw error;
    }
  }
  
  /**
   * 🎯 Obtener llamadas específicas por IDs
   */
  private async getSpecificCalls(conversationIds: string[]): Promise<VoiceCallReal[]> {
    try {
      // 🔒 FILTRO: Solo obtener llamadas del agente de Nogal
      const NOGAL_AGENT_ID = 'agent_01jym1fbthfhttdrgyqvdx5xtq';
      
      // Consulta directa por conversation_ids específicos CON JOIN de tickets
      const { data: callsData, error } = await supabase
        .from('calls')
        .select(`
          *,
          tickets_info:tickets(
            id,
            status,
            metadata,
            tipo_incidencia,
            motivo_incidencia,
            priority,
            description,
            created_at
          )
        `)
        .in('conversation_id', conversationIds)
        .eq('agent_id', NOGAL_AGENT_ID)
        .order('start_time', { ascending: false });

      if (error) {
        throw new Error(`Error fetching specific calls: ${error.message}`);
      }

      if (!callsData || callsData.length === 0) {
        console.warn('🔍 [EXPORT] No se encontraron llamadas con los IDs especificados');
        return [];
      }

      // ELIMINADO: Ya no consulta tickets por separado, usa JOIN

      // Procesar las llamadas al formato VoiceCallReal usando JOIN
      const processedCalls: VoiceCallReal[] = callsData.map(call => {
        // Usar tickets del JOIN en lugar de consulta separada
        const tickets = call.tickets_info || [];
        const ticketsCount = tickets.length;
        const hasTickets = ticketsCount > 0;
        
        // Determinar estado de envío a Nogal usando tickets del JOIN
        const ticketSentToNogal = tickets.some((ticket: any) =>
          ticket.status === 'completed' &&
          ticket.metadata?.nogal_status === 'sent_to_nogal'
        );

        // Determinar tickets enviados
        const ticketsSent = tickets.filter((ticket: any) => 
          ticket.metadata?.nogal_ticket_id || 
          ticket.metadata?.ticket_id ||
          ticket.status === 'sent'
        ).length;

        return {
          id: call.id,
          segurneo_call_id: call.segurneo_call_id,
          conversation_id: call.conversation_id,
          agent_id: call.agent_id,
          caller_id: (call as any).caller_id || null,
          start_time: call.start_time,
          end_time: call.end_time,
          duration_seconds: call.duration_seconds,
          status: call.status,
          call_successful: call.call_successful,
          agent_messages: call.agent_messages,
          user_messages: call.user_messages,
          total_messages: call.total_messages,
          audio_available: !!call.audio_download_url,
          termination_reason: call.termination_reason,
          transcript_summary: call.transcript_summary,
          created_at: call.created_at,
          received_at: call.received_at,
          tickets_count: ticketsCount,
          tickets_sent: ticketsSent,
          has_sent_tickets: ticketsSent > 0,
          ticket_status: ticketsCount > 0 ? (ticketsSent > 0 ? 'sent' : 'pending') : 'none',
          ticket_sent_to_nogal: ticketSentToNogal,
          ticket_ids: [], // DEPRECATED: Ya no usamos ticket_ids, solo JOIN
          audio_download_url: call.audio_download_url,
          audio_file_size: call.audio_file_size,
          fichero_llamada: call.fichero_llamada,
        };
      });

      console.log(`✅ [EXPORT] Procesadas ${processedCalls.length} llamadas específicas`);
      return processedCalls;

    } catch (error) {
      console.error('❌ [EXPORT] Error obteniendo llamadas específicas:', error);
      throw new Error(`Error obteniendo llamadas específicas: ${error}`);
    }
  }

  /**
   * 📅 Obtener llamadas por intervalo de tiempo personalizado
   */
  private async getCallsByDateRange(startDate: string, endDate: string, search?: string): Promise<VoiceCallReal[]> {
    try {
      // 🔒 FILTRO: Solo obtener llamadas del agente de Nogal
      const NOGAL_AGENT_ID = 'agent_01jym1fbthfhttdrgyqvdx5xtq';
      
      let query = supabase
        .from('calls')
        .select(`
          *,
          tickets_info:tickets(
            id,
            status,
            metadata,
            tipo_incidencia,
            motivo_incidencia,
            priority,
            description,
            created_at
          )
        `)
        .eq('agent_id', NOGAL_AGENT_ID)
        .order('start_time', { ascending: false });

      // Aplicar filtro de fecha de inicio
      if (startDate) {
        query = query.gte('start_time', startDate);
      }

      // Aplicar filtro de fecha de fin
      if (endDate) {
        // Agregar 23:59:59 al final del día
        const endDateWithTime = new Date(endDate);
        endDateWithTime.setHours(23, 59, 59, 999);
        query = query.lte('start_time', endDateWithTime.toISOString());
      }

      // Aplicar búsqueda si existe
      if (search) {
        const searchTerm = `%${search}%`;
        query = query.or(`conversation_id.ilike.${searchTerm},segurneo_call_id.ilike.${searchTerm},caller_id.ilike.${searchTerm}`);
      }

      const { data: callsData, error } = await query;

      if (error) {
        throw new Error(`Error fetching calls by date range: ${error.message}`);
      }

      if (!callsData || callsData.length === 0) {
        console.warn('🔍 [EXPORT] No se encontraron llamadas en el intervalo especificado');
        return [];
      }

      // Procesar las llamadas al formato VoiceCallReal
      const processedCalls: VoiceCallReal[] = callsData.map(call => {
        const tickets = call.tickets_info || [];
        const ticketsCount = tickets.length;
        
        const ticketSentToNogal = tickets.some((ticket: any) =>
          ticket.status === 'completed' &&
          ticket.metadata?.nogal_status === 'sent_to_nogal'
        );

        const ticketsSent = tickets.filter((ticket: any) => 
          ticket.metadata?.nogal_ticket_id || 
          ticket.metadata?.ticket_id ||
          ticket.status === 'sent'
        ).length;

        return {
          id: call.id,
          segurneo_call_id: call.segurneo_call_id,
          conversation_id: call.conversation_id,
          agent_id: call.agent_id,
          caller_id: (call as any).caller_id || null,
          start_time: call.start_time,
          end_time: call.end_time,
          duration_seconds: call.duration_seconds,
          status: call.status,
          call_successful: call.call_successful,
          agent_messages: call.agent_messages,
          user_messages: call.user_messages,
          total_messages: call.total_messages,
          audio_available: !!call.audio_download_url,
          termination_reason: call.termination_reason,
          transcript_summary: call.transcript_summary,
          created_at: call.created_at,
          received_at: call.received_at,
          tickets_count: ticketsCount,
          tickets_sent: ticketsSent,
          has_sent_tickets: ticketsSent > 0,
          ticket_status: ticketsCount > 0 ? (ticketsSent > 0 ? 'sent' : 'pending') : 'none',
          ticket_sent_to_nogal: ticketSentToNogal,
          ticket_ids: [],
          audio_download_url: call.audio_download_url,
          audio_file_size: call.audio_file_size,
          fichero_llamada: call.fichero_llamada,
        };
      });

      console.log(`✅ [EXPORT] Procesadas ${processedCalls.length} llamadas por intervalo de tiempo`);
      return processedCalls;

    } catch (error) {
      console.error('❌ [EXPORT] Error obteniendo llamadas por intervalo:', error);
      throw new Error(`Error obteniendo llamadas por intervalo: ${error}`);
    }
  }

  /**
   * 🔧 Utilidades privadas
   */
  private arrayToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escapar comillas y envolver en comillas si contiene comas
          const stringValue = String(value || '');
          return stringValue.includes(',') || stringValue.includes('"') 
            ? `"${stringValue.replace(/"/g, '""')}"` 
            : stringValue;
        }).join(',')
      )
    ].join('\n');
    
    return csvContent;
  }
  
  private downloadFile(content: string | Blob, filename: string, mimeType: string): void {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

// 🚀 INSTANCIA SINGLETON
export const exportService = new ExportService(); 