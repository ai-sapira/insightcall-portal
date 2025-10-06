// 🎯 CALL EXECUTOR - Ejecutor de decisiones del CallDecisionEngine
// Responsabilidad: Convertir decisiones del LLM en acciones concretas

import { supabase } from '../lib/supabase';
import { NogalClientService, CreateClientRequest } from './nogalClientService';
import { NogalTicketService } from './nogalTicketService';
import { NogalRellamadaService, RellamadaPayload } from './nogalRellamadaService';
import { CallDecision } from './callDecisionEngine';
import { Call } from '../types/call.types';
import { CallTranscript, NogalTicketPayload } from '../types/calls.types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Resultado completo de la ejecución
 */
export interface ExecutionResult {
  success: boolean;
  message: string;
  callId: string;
  actions: {
    clientCreated?: {
      success: boolean;
      clientId?: string;
      error?: string;
    };
    ticketsCreated: {
      success: boolean;
      ticketId?: string;
      error?: string;
    }[];
    followUpCreated?: {
      success: boolean;
      followUpId?: string;
      error?: string;
    };
  };
  summary: string;
}

/**
 * 🚀 EXECUTOR PRINCIPAL - Convierte decisiones LLM en acciones reales
 */
export class CallExecutor {
  private readonly nogalClientService: NogalClientService;
  private readonly nogalTicketService: NogalTicketService;
  private readonly nogalRellamadaService: NogalRellamadaService;

  constructor() {
    this.nogalClientService = new NogalClientService();
    this.nogalTicketService = new NogalTicketService();
    this.nogalRellamadaService = new NogalRellamadaService();
  }

  /**
   * 🎯 MÉTODO PRINCIPAL - Ejecutar decisión completa
   */
  async executeDecision(
    decision: CallDecision,
    call: Call,
    transcripts: CallTranscript[]
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    console.log(`🚀 [EXECUTOR] Ejecutando decisión para llamada: ${call.conversation_id}`);

    try {
      const result: ExecutionResult = {
        success: true,
        message: 'Ejecución completada',
        callId: call.id,
        actions: {
          ticketsCreated: []
        },
        summary: ''
      };

      // 🏗️ PASO 1: Crear cliente si es necesario
      let clientId = decision.clientInfo.existingClientInfo?.clientId || null;
      
      if (decision.decisions.clientDecision.shouldCreateClient) {
        console.log(`👤 [EXECUTOR] Creando cliente nuevo...`);
        const clientResult = await this.createClient(decision, call.conversation_id);
        result.actions.clientCreated = clientResult;
        
        if (clientResult.success) {
          clientId = clientResult.clientId!;
          console.log(`✅ [EXECUTOR] Cliente creado: ${clientId}`);
        } else {
          console.error(`❌ [EXECUTOR] Error creando cliente: ${clientResult.error}`);
          result.success = false;
        }
      } else {
        console.log(`👤 [EXECUTOR] Usando cliente existente: ${clientId}`);
      }

      // 🎫 PASO 2: Crear tickets si es necesario
      if (decision.decisions.ticketDecision.shouldCreateTickets && clientId) {
        console.log(`🎫 [EXECUTOR] Creando ${decision.decisions.ticketDecision.ticketCount} ticket(s)...`);
        
        for (const ticketInfo of decision.decisions.ticketDecision.ticketsInfo) {
          const ticketResult = await this.createTicket(
            decision,
            call,
            clientId,
            ticketInfo.numeroPoliza || null
          );
          result.actions.ticketsCreated.push(ticketResult);
          
          if (ticketResult.success) {
            console.log(`✅ [EXECUTOR] Ticket creado: ${ticketResult.ticketId}`);
          } else {
            console.error(`❌ [EXECUTOR] Error creando ticket: ${ticketResult.error}`);
            result.success = false;
          }
        }
      }

      // 📞 PASO 3: Crear rellamada si es necesario
      if (decision.decisions.followUpDecision.shouldCreateFollowUp) {
        console.log(`📞 [EXECUTOR] Creando rellamada...`);
        const followUpResult = await this.createFollowUp(decision, call, clientId!);
        result.actions.followUpCreated = followUpResult;
        
        if (followUpResult.success) {
          console.log(`✅ [EXECUTOR] Rellamada creada: ${followUpResult.followUpId}`);
        } else {
          console.error(`❌ [EXECUTOR] Error creando rellamada: ${followUpResult.error}`);
          result.success = false;
        }
      }

      // 🔄 PASO 4: Actualizar registro de llamada
      await this.updateCallRecord(call.id, decision, result);

      // 📋 PASO 5: Generar resumen
      result.summary = this.generateExecutionSummary(decision, result);
      
      const duration = Date.now() - startTime;
      console.log(`🎉 [EXECUTOR] Ejecución completada en ${duration}ms: ${result.success ? 'ÉXITO' : 'CON ERRORES'}`);
      
      return result;

    } catch (error) {
      console.error(`❌ [EXECUTOR] Error fatal en ejecución:`, error);
      return {
        success: false,
        message: `Error fatal: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        callId: call.id,
        actions: { ticketsCreated: [] },
        summary: 'Ejecución fallida por error interno'
      };
    }
  }

  /**
   * 👤 Crear cliente nuevo usando NogalClientService
   */
  private async createClient(
    decision: CallDecision,
    conversationId: string
  ): Promise<{ success: boolean; clientId?: string; error?: string }> {
    try {
      const extractedData = decision.clientInfo.extractedData;
      
      // Parsear nombre completo en componentes
      const { nombre, primerApellido, segundoApellido } = this.parseFullName(
        extractedData.nombreCompleto || ''
      );

      // Generar ID único para el cliente
      const clientId = this.generateClientId();

      const clientRequest: CreateClientRequest = {
        IdCliente: clientId,
        IdLlamada: conversationId,
        Nombre: nombre,
        PrimerApellido: primerApellido,
        SegundoApellido: segundoApellido,
        Telefono: extractedData.telefono || '',
        Email: extractedData.email || 'sin-email@nogal.com', // Email por defecto si no hay
        // Campos opcionales de leads si aplica  
        IdLead: decision.clientInfo.leadInfo?.leadId,
        Campaña: decision.clientInfo.leadInfo?.campaignName
      };

      console.log(`👤 [EXECUTOR] Datos del cliente a crear:`, {
        IdCliente: clientRequest.IdCliente,
        Nombre: clientRequest.Nombre,
        PrimerApellido: clientRequest.PrimerApellido,
        SegundoApellido: clientRequest.SegundoApellido,
        Telefono: clientRequest.Telefono,
        Email: clientRequest.Email
      });

      const response = await this.nogalClientService.createClient(clientRequest);
      
      if (response.success) {
        return {
          success: true,
          clientId: clientId // Usar el ID que generamos nosotros
        };
      } else {
        return {
          success: false,
          error: response.message
        };
      }

    } catch (error) {
      return {
        success: false,
        error: `Error interno creando cliente: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  /**
   * 🎫 Crear ticket usando NogalTicketService
   */
  private async createTicket(
    decision: CallDecision,
    call: Call,
    clientId: string,
    numeroPoliza?: string | null
  ): Promise<{ success: boolean; ticketId?: string; error?: string }> {
    try {
      const incident = decision.incidentAnalysis.primaryIncident;
      
      const ticketPayload: Omit<NogalTicketPayload, 'IdTicket'> = {
        IdCliente: clientId,
        IdLlamada: call.conversation_id,
        TipoIncidencia: incident.type,
        MotivoIncidencia: incident.reason,
        Ramo: (incident.type === 'Nueva contratación de seguros' && incident.reason === 'Contratación Póliza') ? (incident.ramo || '') : '',
        NumeroPoliza: numeroPoliza || '',
        Notas: this.generateTicketNotes(decision, call),
        FicheroLlamada: call.audio_download_url || call.fichero_llamada || ''
      };

      console.log(`🎫 [EXECUTOR] Datos del ticket a crear:`, {
        IdCliente: ticketPayload.IdCliente,
        IdLlamada: ticketPayload.IdLlamada,
        TipoIncidencia: ticketPayload.TipoIncidencia,
        MotivoIncidencia: ticketPayload.MotivoIncidencia,
        Ramo: ticketPayload.Ramo,
        NumeroPoliza: ticketPayload.NumeroPoliza,
        FicheroLlamada: ticketPayload.FicheroLlamada ? 'SÍ (Audio disponible)' : 'NO',
        NotasLength: ticketPayload.Notas.length,
        note: 'IdTicket será generado por NogalTicketService'
      });

      const response = await this.nogalTicketService.createAndSendTicket(ticketPayload);
      
      if (response.success) {
        // 💾 GUARDAR TICKET EN SUPABASE PARA EL FRONTEND
        await this.saveTicketToSupabase(call, decision, response.ticket_id!, clientId, numeroPoliza, ticketPayload.Notas);
        
        return {
          success: true,
          ticketId: response.ticket_id
        };
      } else {
        return {
          success: false,
          error: response.message
        };
      }

    } catch (error) {
      return {
        success: false,
        error: `Error interno creando ticket: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  /**
   * 📞 Crear rellamada usando NogalRellamadaService
   */
  private async createFollowUp(
    decision: CallDecision,
    call: Call,
    clientId: string
  ): Promise<{ success: boolean; followUpId?: string; error?: string }> {
    try {
      const followUpInfo = decision.incidentAnalysis.followUpInfo;
      
      if (!followUpInfo.relatedTicketId) {
        return {
          success: false,
          error: 'No se encontró ticket relacionado para la rellamada'
        };
      }

      const rellamadaPayload: RellamadaPayload = {
        IdCliente: clientId,
        IdTicket: followUpInfo.relatedTicketId,
        IdLlamada: call.conversation_id,
        Notas: this.generateFollowUpNotes(decision, call),
        FicheroLlamada: call.audio_download_url || call.fichero_llamada || ''
      };

      console.log(`📞 [EXECUTOR] Datos de la rellamada a crear:`, {
        IdCliente: rellamadaPayload.IdCliente,
        IdTicket: rellamadaPayload.IdTicket,
        IdLlamada: rellamadaPayload.IdLlamada,
        NotasLength: rellamadaPayload.Notas.length
      });

      const response = await this.nogalRellamadaService.crearRellamada(rellamadaPayload);
      
      if (response.success) {
        return {
          success: true,
          followUpId: response.rellamada_id
        };
      } else {
        return {
          success: false,
          error: response.message
        };
      }

    } catch (error) {
      return {
        success: false,
        error: `Error interno creando rellamada: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  /**
   * 🔄 Actualizar registro de llamada con resultados
   */
  private async updateCallRecord(
    callId: string,
    decision: CallDecision,
    result: ExecutionResult
  ): Promise<void> {
    try {
      const ticketIds = result.actions.ticketsCreated
        .filter(t => t.success && t.ticketId)
        .map(t => t.ticketId!);

      const updateData = {
        analysis_completed: true,
        ai_analysis: {
          tipo_incidencia: decision.incidentAnalysis.primaryIncident.type,
          motivo_gestion: decision.incidentAnalysis.primaryIncident.reason,
          confidence: decision.metadata.confidence,
          prioridad: decision.decisions.priority,
          resumen_analisis: decision.metadata.processingRecommendation,
          datos_extraidos: decision.clientInfo.extractedData,
          // 🎯 ACCIONES REALIZADAS - Para el frontend
          tickets_creados: result.actions.ticketsCreated.map(t => ({
            ticket_id: t.ticketId,
            tipo_incidencia: decision.incidentAnalysis.primaryIncident.type,
            motivo_gestion: decision.incidentAnalysis.primaryIncident.reason,
            cliente_id: decision.clientInfo.clientType === 'existing' 
              ? decision.clientInfo.existingClientInfo?.clientId 
              : result.actions.clientCreated?.clientId,
            estado: t.success ? 'created' : 'failed',
            error: t.error || null
          })),
          rellamadas_creadas: result.actions.followUpCreated ? [{
            ticket_relacionado: decision.incidentAnalysis.followUpInfo?.relatedTicketId || 'N/A',
            followup_id: result.actions.followUpCreated.followUpId,
            estado: result.actions.followUpCreated.success ? 'created' : 'failed',
            motivo: 'Seguimiento de incidencia existente',
            error: result.actions.followUpCreated.error || null
          }] : [],
          clientes_creados: result.actions.clientCreated ? [{
            cliente_id: result.actions.clientCreated.clientId,
            nombre: decision.clientInfo.extractedData.nombreCompleto,
            tipo: decision.clientInfo.clientType,
            estado: result.actions.clientCreated.success ? 'created' : 'failed',
            error: result.actions.clientCreated.error || null
          }] : [],
          resumen_ejecucion: this.generateExecutionSummary(decision, result)
        },
        tickets_created: ticketIds.length,
        ticket_ids: ticketIds,
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('calls')
        .update(updateData)
        .eq('id', callId);

      if (error) {
        console.error(`❌ [EXECUTOR] Error actualizando llamada:`, error);
        throw new Error(`Error actualizando base de datos: ${error.message}`);
      }

      console.log(`✅ [EXECUTOR] Llamada actualizada en BD: ${callId}`);

    } catch (error) {
      console.error(`❌ [EXECUTOR] Error en actualización de BD:`, error);
      // No lanzar error - ya tenemos los tickets creados
    }
  }

  // 🛠️ MÉTODOS AUXILIARES

  /**
   * Parsear nombre completo en componentes
   */
  private parseFullName(fullName: string): { 
    nombre: string; 
    primerApellido: string; 
    segundoApellido?: string; 
  } {
    const parts = fullName.trim().split(/\s+/);
    
    if (parts.length === 1) {
      return { nombre: parts[0], primerApellido: 'Sin especificar' };
    } else if (parts.length === 2) {
      return { nombre: parts[0], primerApellido: parts[1] };
    } else {
      return { 
        nombre: parts[0], 
        primerApellido: parts[1], 
        segundoApellido: parts.slice(2).join(' ') 
      };
    }
  }

  /**
   * Generar ID único para cliente
   */
  private generateClientId(): string {
    const timestamp = Date.now().toString().substring(-6); // Últimos 6 dígitos
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${timestamp}${random}F00`;
  }

  /**
   * Generar notas para ticket - VERSIÓN MEJORADA PARA TODOS LOS CASOS
   */
  private generateTicketNotes(decision: CallDecision, call: Call): string {
    const incident = decision.incidentAnalysis.primaryIncident;
    const extractedData = decision.clientInfo.extractedData;
    
    let notes = `${incident.description}\n\n`;
    
    // Normalizar tipos para comparación
    const tipoIncidencia = incident.type?.toLowerCase() || '';
    const motivoIncidencia = incident.reason?.toLowerCase() || '';
    
    // === 🔧 MODIFICACIONES DE PÓLIZA ===
    if (tipoIncidencia.includes('modificacion') || tipoIncidencia.includes('cambio')) {
      
      // Cambio de cuenta bancaria - CRÍTICO
      if (motivoIncidencia.includes('cuenta') && extractedData.cuentaBancaria) {
        notes += `🏦 Nueva cuenta bancaria: ${extractedData.cuentaBancaria}\n`;
      }
      
      // Cambio de dirección postal
      if (motivoIncidencia.includes('direccion') && extractedData.direccion) {
        notes += `🏠 Nueva dirección: ${extractedData.direccion}\n`;
      }
      
      // Cambio de teléfono
      if (extractedData.telefono && extractedData.telefono !== call.caller_id) {
        notes += `📞 Nuevo teléfono: ${extractedData.telefono}\n`;
      }
      
      // Cambio de email
      if (extractedData.email) {
        notes += `📧 Nuevo email: ${extractedData.email}\n`;
      }
      
      // Modificación de asegurados
      if (motivoIncidencia.includes('asegurados')) {
        notes += `👥 Modificación de asegurados solicitada\n`;
      }
      
      // Cesión de derechos
      if (motivoIncidencia.includes('cesion')) {
        notes += `📄 Cesión de derechos para préstamo hipotecario\n`;
        if (motivoIncidencia.includes('incompletos')) {
          notes += `⚠️ Faltan datos del préstamo - cliente debe volver a llamar\n`;
        }
      }
      
      // Cambio de forma de pago
      if (motivoIncidencia.includes('forma de pago')) {
        notes += `💳 Cambio de periodicidad de pago solicitado\n`;
      }
      
      // Modificación de coberturas
      if (motivoIncidencia.includes('coberturas')) {
        notes += `🛡️ Modificación de coberturas solicitada\n`;
      }
      
      // Datos incompletos
      if (motivoIncidencia.includes('datos incompletos')) {
        notes += `⚠️ Cliente no dispone de los datos necesarios para completar la gestión\n`;
      }
    }
    
    // === 📄 SOLICITUDES DE DUPLICADO ===
    else if (tipoIncidencia.includes('duplicado')) {
      
      // Duplicado por email
      if (motivoIncidencia.includes('email') && extractedData.email) {
        notes += `📧 Email destino: ${extractedData.email}\n`;
      }
      
      // Duplicado de tarjetas
      if (motivoIncidencia.includes('tarjeta')) {
        notes += `💳 Solicitud de duplicado de tarjeta de seguro\n`;
      }
      
      // Recibos para declaración renta
      if (motivoIncidencia.includes('renta') || motivoIncidencia.includes('declaracion')) {
        notes += `📊 Recibos solicitados para declaración de la renta\n`;
      }
    }
    
    // === 🏗️ NUEVA CONTRATACIÓN ===
    else if (tipoIncidencia.includes('nueva contratacion')) {
      
      // Especificar ramo si está disponible
      if (incident.ramo) {
        notes += `🎯 Ramo solicitado: ${incident.ramo}\n`;
      }
      
      // Suspensión de garantías
      if (motivoIncidencia.includes('suspension')) {
        notes += `⏸️ Cliente tiene póliza con suspensión de garantías\n`;
      }
      
      // Incluir dirección para nuevas contrataciones
      if (extractedData.direccion) {
        notes += `🏠 Dirección: ${extractedData.direccion}\n`;
      }
    }
    
    // === 🏢 GESTIÓN COMERCIAL ===
    else if (tipoIncidencia.includes('gestion comercial')) {
      
      // Reenvío por rechazo a IA
      if (motivoIncidencia.includes('no quiere ia')) {
        notes += `🤖 Cliente rechaza explícitamente atención automatizada\n`;
      }
      
      // Reenvío por no tomador
      if (motivoIncidencia.includes('no tomador')) {
        notes += `👤 Llamante no es el tomador de la póliza consultada\n`;
      }
      
      // Consulta resuelta
      if (motivoIncidencia.includes('consulta cliente')) {
        notes += `✅ Consulta resuelta directamente por el agente virtual\n`;
      }
      
      // Gestión no resuelta
      if (motivoIncidencia.includes('llam gestion comerc')) {
        notes += `📞 Gestión requiere intervención de agente humano\n`;
      }
      
      // Reenvío a siniestros
      if (motivoIncidencia.includes('siniestros')) {
        notes += `🚗 Transferido a departamento de siniestros\n`;
      }
      
      // Fraccionamiento desde anual
      if (motivoIncidencia.includes('cambio forma de pago')) {
        notes += `💰 Fraccionamiento de pago anual solicitado\n`;
      }
    }
    
    // === 🚨 OTROS SERVICIOS ===
    else if (tipoIncidencia.includes('asistencia carretera')) {
      notes += `🚗 Solicitud de asistencia en carretera/grúa\n`;
    }
    else if (tipoIncidencia.includes('retencion cliente')) {
      notes += `🔄 Cliente solicita anulación/baja de póliza\n`;
    }
    else if (tipoIncidencia.includes('baja cliente')) {
      notes += `🚫 Cliente solicita baja de base de datos\n`;
    }
    else if (tipoIncidencia.includes('reclamacion')) {
      notes += `📢 Reclamación sobre regalo no recibido\n`;
    }
    
    // === 📋 INFORMACIÓN ADICIONAL GENERAL ===
    
    // Póliza mencionada diferente a la afectada
    if (extractedData.numeroPoliza && incident.numeroPolizaAfectada !== extractedData.numeroPoliza) {
      notes += `📋 Póliza mencionada: ${extractedData.numeroPoliza}\n`;
    }
    
    // Dirección para casos no cubiertos arriba
    if (extractedData.direccion && !notes.includes('dirección') && !notes.includes('Dirección')) {
      notes += `🏠 Dirección: ${extractedData.direccion}\n`;
    }
    
    // Información de cliente existente
    if (decision.clientInfo.clientType === 'existing' && decision.clientInfo.existingClientInfo) {
      const clientInfo = decision.clientInfo.existingClientInfo;
      if (clientInfo.numeroPoliza && !notes.includes(clientInfo.numeroPoliza)) {
        notes += `📋 Póliza principal: ${clientInfo.numeroPoliza}\n`;
      }
    }
    
    // Información de lead
    if (decision.clientInfo.clientType === 'lead' && decision.clientInfo.leadInfo) {
      const leadInfo = decision.clientInfo.leadInfo;
      notes += `🎯 Lead de campaña: ${leadInfo.campaignName}\n`;
      if (leadInfo.ramo) {
        notes += `📋 Ramo de interés: ${leadInfo.ramo}\n`;
      }
    }
    
    // === 🔄 CONTEXTO DE RELLAMADA ===
    if (decision.incidentAnalysis.followUpInfo.isFollowUp) {
      notes += `\n[RELLAMADA] Relacionada con ticket: ${decision.incidentAnalysis.followUpInfo.relatedTicketId}\n`;
      if (decision.incidentAnalysis.followUpInfo.followUpReason) {
        notes += `Motivo seguimiento: ${decision.incidentAnalysis.followUpInfo.followUpReason}\n`;
      }
    }
    
    // === 📊 METADATOS FINALES ===
    notes += `\nProcesado automáticamente por IA (Confianza: ${Math.round(decision.metadata.confidence * 100)}%)`;
    
    // Limitar longitud pero preservar información crítica
    if (notes.length > 500) {
      // Mantener descripción inicial + datos críticos + metadatos finales
      const description = incident.description;
      const criticalInfo = notes.match(/[🏦🏠📧📞👥📄💳🛡️⚠️📊🎯⏸️🤖👤✅📞🚗🔄🚫📢📋🎯]/g) || [];
      const confidence = `Procesado automáticamente por IA (Confianza: ${Math.round(decision.metadata.confidence * 100)}%)`;
      
      // Reconstruir con información más crítica
      const criticalLines = notes.split('\n').filter(line => 
        line.includes('🏦') || line.includes('📧') || line.includes('🏠') || 
        line.includes('📞') || line.includes('⚠️') || line.includes('[RELLAMADA]')
      );
      
      notes = `${description}\n\n${criticalLines.join('\n')}\n\n${confidence}`;
      
      // Si aún es muy largo, truncar manteniendo lo más importante
      if (notes.length > 500) {
        notes = notes.substring(0, 480) + '... [Truncado]';
      }
    }
    
    return notes;
  }

  /**
   * Generar notas para rellamada - VERSIÓN MEJORADA
   */
  private generateFollowUpNotes(decision: CallDecision, call: Call): string {
    const followUpInfo = decision.incidentAnalysis.followUpInfo;
    const extractedData = decision.clientInfo.extractedData;
    
    let notes = `🔄 RELLAMADA DE SEGUIMIENTO\n`;
    notes += `Motivo: ${followUpInfo.followUpReason || 'Cliente solicita seguimiento'}\n\n`;
    
    // Descripción de la nueva gestión si aplica
    if (decision.incidentAnalysis.primaryIncident.description) {
      notes += `${decision.incidentAnalysis.primaryIncident.description}\n\n`;
    }
    
    // Información del ticket relacionado
    if (followUpInfo.relatedTicketId) {
      notes += `📋 Ticket relacionado: ${followUpInfo.relatedTicketId}\n`;
    }
    
    // Datos adicionales si se proporcionan en la rellamada
    if (extractedData.email) {
      notes += `📧 Email: ${extractedData.email}\n`;
    }
    if (extractedData.telefono && extractedData.telefono !== call.caller_id) {
      notes += `📞 Teléfono: ${extractedData.telefono}\n`;
    }
    if (extractedData.direccion) {
      notes += `🏠 Dirección: ${extractedData.direccion}\n`;
    }
    if (extractedData.cuentaBancaria) {
      notes += `🏦 Cuenta bancaria: ${extractedData.cuentaBancaria}\n`;
    }
    
    notes += `\nProcesado automáticamente por IA (Confianza: ${Math.round(decision.metadata.confidence * 100)}%)`;
    
    return notes.substring(0, 500);
  }

  /**
   * 💾 Guardar ticket en tabla tickets de Supabase para el frontend
   */
  private async saveTicketToSupabase(
    call: Call, 
    decision: CallDecision, 
    ticketId: string, 
    clientId: string, 
    numeroPoliza?: string | null,
    notasGeneradas?: string  // ✅ NUEVO: Agregar las notas generadas
  ): Promise<void> {
    try {
      const { supabase } = require('../lib/supabase');
      const incident = decision.incidentAnalysis.primaryIncident;
      
      const { v4: uuidv4 } = require('uuid');
      const ticketUuid = uuidv4(); // Generar UUID válido para Supabase
      
      // Usar el método mejorado que incluye datos específicos según tipo de incidencia
      const notasEspecificas = this.generateTicketNotes(decision, call);
      
      const descripcion = `Ticket automático generado por IA

📞 Llamada: ${call.conversation_id}
🕐 Fecha: ${new Date(call.created_at || Date.now()).toLocaleDateString()}
👤 Cliente: ${clientId}
📱 Teléfono: ${decision.clientInfo.extractedData.telefono || 'No disponible'}

🧠 Análisis IA:
• Tipo: ${incident.type}
• Motivo: ${incident.reason}
• Póliza: ${numeroPoliza || 'No especificada'}

${notasEspecificas}

🎫 ID Nogal: ${ticketId}
📝 Procesado automáticamente por el nuevo sistema`;

      const ticketData = {
        id: ticketUuid, // UUID válido para Supabase
        tipo_incidencia: incident.type,
        motivo_incidencia: incident.reason,
        status: 'completed',
        priority: 'medium',
        description: descripcion,
        call_id: call.id,
        assignee_id: null,
        metadata: {
          source: 'ai-auto-generated-new-system',
          conversation_id: call.conversation_id,
          cliente_id: clientId,
          nogal_ticket_id: ticketId,
          original_ticket_id: ticketId,
          numero_poliza: numeroPoliza,
          ramo: incident.ramo,
          ai_analysis: decision,
          extracted_data: decision.clientInfo.extractedData,
          nogal_status: 'sent_to_nogal',
          generated_uuid: ticketUuid,
          created_by_system: 'CallExecutor',
          notas_enviadas: notasGeneradas  // ✅ NUEVO: Guardar las notas enviadas a Nogal
        }
      };

      const { error } = await supabase
        .from('tickets')
        .insert([ticketData]);

      if (error) {
        console.error('❌ [EXECUTOR] Error guardando ticket en Supabase:', error);
      } else {
        console.log(`✅ [EXECUTOR] Ticket guardado en Supabase: ${ticketId}`);
      }

    } catch (error) {
      console.error('❌ [EXECUTOR] Error interno guardando ticket:', error);
    }
  }

  /**
   * Generar resumen de ejecución
   */
  private generateExecutionSummary(decision: CallDecision, result: ExecutionResult): string {
    const actions = [];
    
    if (result.actions.clientCreated?.success) {
      actions.push(`Cliente creado: ${result.actions.clientCreated.clientId}`);
    }
    
    const successfulTickets = result.actions.ticketsCreated.filter(t => t.success);
    if (successfulTickets.length > 0) {
      actions.push(`${successfulTickets.length} ticket(s) creado(s)`);
    }
    
    if (result.actions.followUpCreated?.success) {
      actions.push(`Rellamada creada: ${result.actions.followUpCreated.followUpId}`);
    }
    
    return actions.length > 0 
      ? `Acciones completadas: ${actions.join(', ')}`
      : 'No se realizaron acciones adicionales';
  }
}

// Exportar instancia singleton
export const callExecutor = new CallExecutor(); 