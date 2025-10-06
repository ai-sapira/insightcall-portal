// 🎫 CONTROLADOR PARA CREAR TICKETS EN NOGAL VÍA SEGURNEO VOICE
// Endpoint: POST /api/v1/crear-ticket

import { Request, Response } from 'express';
import { nogalTicketService } from '../../services/nogalTicketService';
import { NogalTicketPayload } from '../../types/calls.types';
import { supabase } from '../../lib/supabase';
import { callDecisionEngine } from '../../services/callDecisionEngine';
import { callExecutor } from '../../services/callExecutor';

export class CrearTicketController {

  /**
   * 🎯 POST /api/v1/crear-ticket
   * Crear ticket y enviarlo automáticamente a Nogal vía Segurneo Voice
   */
  async crearTicket(req: Request, res: Response) {
    try {
      console.log(`🎫 [ENDPOINT] Nueva solicitud de creación de ticket`);
      console.log(`📋 [ENDPOINT] Body recibido:`, req.body);

      // 1. Validar campos requeridos
      const { 
        IdCliente, 
        IdLlamada, 
        TipoIncidencia, 
        MotivoIncidencia, 
        Notas 
      } = req.body;

      const requiredFields = {
        IdCliente,
        IdLlamada,
        TipoIncidencia,
        MotivoIncidencia,
        Notas
      };

      const missingFields = Object.entries(requiredFields)
        .filter(([_, value]) => !value || (typeof value === 'string' && value.trim() === ''))
        .map(([field, _]) => field);

      if (missingFields.length > 0) {
        console.error(`❌ [ENDPOINT] Campos faltantes: ${missingFields.join(', ')}`);
        return res.status(400).json({
          success: false,
          message: `Campos requeridos faltantes: ${missingFields.join(', ')}`,
          required_fields: ['IdCliente', 'IdLlamada', 'TipoIncidencia', 'MotivoIncidencia', 'Notas']
        });
      }

      // 2. 🔍 INTERCEPTAR Y MEJORAR NOTAS - Detectar si faltan datos críticos
      let notasMejoradas = Notas.toString().trim();
      const motivoIncidencia = MotivoIncidencia.toString().toLowerCase();
      
      // 🏦 CRÍTICO: Para cambios de cuenta bancaria, verificar si falta el número de cuenta
      if (motivoIncidencia.includes('cuenta') && !notasMejoradas.toLowerCase().includes('es')) {
        console.log(`🔍 [ENDPOINT] Detectado cambio de cuenta SIN número - intentando recuperar datos de la llamada...`);
        
        try {
          const notasEnriquecidas = await this.enrichNotesWithCallData(
            IdLlamada.toString().trim(),
            notasMejoradas,
            TipoIncidencia.toString().trim(),
            MotivoIncidencia.toString().trim()
          );
          
          if (notasEnriquecidas && notasEnriquecidas !== notasMejoradas) {
            console.log(`✅ [ENDPOINT] Notas enriquecidas con datos de la llamada`);
            notasMejoradas = notasEnriquecidas;
          }
        } catch (error) {
          console.warn(`⚠️ [ENDPOINT] No se pudieron enriquecer las notas:`, error);
          // Continuar con las notas originales
        }
      }

      // 3. Preparar payload para Nogal (sin IdTicket, se genera automáticamente)
      const ticketPayload: Omit<NogalTicketPayload, 'IdTicket'> = {
        IdCliente: IdCliente.toString().trim(),
        IdLlamada: IdLlamada.toString().trim(),
        TipoIncidencia: TipoIncidencia.toString().trim(),
        MotivoIncidencia: MotivoIncidencia.toString().trim(),
        NumeroPoliza: req.body.NumeroPoliza?.toString().trim() || '', // ✅ Opcional - vacío si no se identifica
        Notas: notasMejoradas,
        FicheroLlamada: req.body.FicheroLlamada?.toString().trim() || ''
      };

      console.log(`📤 [ENDPOINT] Enviando ticket a Segurneo Voice:`, {
        IdCliente: ticketPayload.IdCliente,
        TipoIncidencia: ticketPayload.TipoIncidencia,
        hasPoliza: !!ticketPayload.NumeroPoliza
      });

      // 4. Enviar a Segurneo Voice usando el servicio
      const result = await nogalTicketService.createAndSendTicket(ticketPayload);

      // 5. Responder según el resultado
      if (result.success) {
        console.log(`✅ [ENDPOINT] Ticket creado exitosamente: ${result.ticket_id}`);
        return res.status(200).json({
          success: true,
          message: result.message,
          ticket_id: result.ticket_id,
          timestamp: new Date().toISOString()
        });
      } else {
        console.error(`❌ [ENDPOINT] Error en creación: ${result.error}`);
        return res.status(500).json({
          success: false,
          message: result.message,
          error: result.error,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error(`❌ [ENDPOINT] Error interno:`, error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 🧪 GET /api/v1/crear-ticket/test
   * Probar conectividad con Segurneo Voice
   */
  async testConnectivity(req: Request, res: Response) {
    try {
      console.log(`🧪 [ENDPOINT] Probando conectividad con Segurneo Voice`);
      
      const testResult = await nogalTicketService.testConnection();
      
      return res.status(200).json({
        success: true,
        message: 'Prueba de conectividad completada',
        connectivity: testResult,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error(`❌ [ENDPOINT] Error en prueba:`, error);
      return res.status(500).json({
        success: false,
        message: 'Error en prueba de conectividad',
        error: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 📋 GET /api/v1/crear-ticket/example
   * Mostrar ejemplo de payload
   */
  async showExample(req: Request, res: Response) {
    const example = {
      IdCliente: "CLI-2025-001",
      IdLlamada: "call_123456789",
      TipoIncidencia: "Consulta de póliza",
      MotivoIncidencia: "Cliente solicita información sobre cobertura",
      NumeroPoliza: "POL-123456", // Opcional - solo si se identifica en la llamada
      Notas: "Cliente satisfecho con la información"
    };

    const automaticFields = {
      IdTicket: "Generado automáticamente (IA-YYYYMMDD-XXX)",
      JsonId: "Generado automáticamente por Segurneo Voice (4 dígitos)",
      Fecha: "Generada automáticamente por Segurneo Voice (DD/MM/YYYY)",
      Hora: "Generada automáticamente por Segurneo Voice (HH:MM:SS)"
    };

    return res.status(200).json({
      description: "Ejemplo de payload para crear ticket vía Segurneo Voice",
      required_fields: example,
      automatic_fields: automaticFields,
      endpoint: "POST /api/v1/crear-ticket",
      note: "IdTicket, JsonId, Fecha y Hora se generan automáticamente"
    });
  }

  /**
   * 🔍 ENRIQUECER NOTAS - Recuperar datos de la llamada y regenerar notas usando CallExecutor
   */
  private async enrichNotesWithCallData(
    conversationId: string,
    notasOriginales: string,
    tipoIncidencia: string,
    motivoIncidencia: string
  ): Promise<string> {
    try {
      console.log(`🔍 [ENRICH] Buscando llamada: ${conversationId}`);

      // 1. Buscar la llamada en Supabase
      const { data: call, error } = await supabase
        .from('calls')
        .select('*')
        .eq('conversation_id', conversationId)
        .single();

      if (error || !call) {
        console.warn(`⚠️ [ENRICH] No se encontró la llamada: ${conversationId}`);
        return notasOriginales;
      }

      // 2. Verificar si ya tiene análisis completo
      if (!call.transcripts || !Array.isArray(call.transcripts) || call.transcripts.length === 0) {
        console.warn(`⚠️ [ENRICH] La llamada no tiene transcripts: ${conversationId}`);
        return notasOriginales;
      }

      console.log(`✅ [ENRICH] Llamada encontrada con ${call.transcripts.length} transcripts`);

      // 3. Re-analizar la llamada para obtener datos extraídos
      const decision = await callDecisionEngine.analyzeCall(call.transcripts, conversationId);
      
      if (!decision || !decision.clientInfo.extractedData) {
        console.warn(`⚠️ [ENRICH] No se pudo obtener análisis de la llamada: ${conversationId}`);
        return notasOriginales;
      }

      // 4. Verificar si tenemos el dato crítico que falta
      const extractedData = decision.clientInfo.extractedData;
      const motivoLower = motivoIncidencia.toLowerCase();
      
      let datoCriticoEncontrado = false;
      let notasEnriquecidas = notasOriginales;

      // 🏦 Para cambios de cuenta bancaria
      if (motivoLower.includes('cuenta') && extractedData.cuentaBancaria) {
        console.log(`🏦 [ENRICH] Número de cuenta encontrado: ${extractedData.cuentaBancaria}`);
        
        // Agregar el número de cuenta a las notas existentes
        if (!notasEnriquecidas.toLowerCase().includes(extractedData.cuentaBancaria.toLowerCase())) {
          notasEnriquecidas += `\n\n🏦 Nueva cuenta bancaria: ${extractedData.cuentaBancaria}`;
          datoCriticoEncontrado = true;
        }
      }

      // 📧 Para cambios de email
      if (motivoLower.includes('email') && extractedData.email) {
        console.log(`📧 [ENRICH] Email encontrado: ${extractedData.email}`);
        
        if (!notasEnriquecidas.toLowerCase().includes(extractedData.email.toLowerCase())) {
          notasEnriquecidas += `\n\n📧 Nuevo email: ${extractedData.email}`;
          datoCriticoEncontrado = true;
        }
      }

      // 🏠 Para cambios de dirección
      if (motivoLower.includes('direccion') && extractedData.direccion) {
        console.log(`🏠 [ENRICH] Dirección encontrada: ${extractedData.direccion}`);
        
        if (!notasEnriquecidas.toLowerCase().includes(extractedData.direccion.toLowerCase())) {
          notasEnriquecidas += `\n\n🏠 Nueva dirección: ${extractedData.direccion}`;
          datoCriticoEncontrado = true;
        }
      }

      // 📞 Para cambios de teléfono
      if (motivoLower.includes('telefono') && extractedData.telefono) {
        console.log(`📞 [ENRICH] Teléfono encontrado: ${extractedData.telefono}`);
        
        if (!notasEnriquecidas.toLowerCase().includes(extractedData.telefono)) {
          notasEnriquecidas += `\n\n📞 Nuevo teléfono: ${extractedData.telefono}`;
          datoCriticoEncontrado = true;
        }
      }

      if (datoCriticoEncontrado) {
        console.log(`✅ [ENRICH] Notas enriquecidas exitosamente para: ${conversationId}`);
        return notasEnriquecidas;
      } else {
        console.log(`ℹ️ [ENRICH] No se encontraron datos adicionales para enriquecer: ${conversationId}`);
        return notasOriginales;
      }

    } catch (error) {
      console.error(`❌ [ENRICH] Error enriqueciendo notas para ${conversationId}:`, error);
      return notasOriginales;
    }
  }
}

// Exportar instancia única
export const crearTicketController = new CrearTicketController(); 