// 🎫 SERVICIO DE TICKETS NOGAL VÍA SEGURNEO VOICE
// Envío exclusivo a través de Segurneo Voice (no directo a Nogal)

import axios, { AxiosError } from 'axios';
import { NogalTicketPayload, NogalTicketResponse } from '../types/calls.types';
import { supabase } from '../lib/supabase';

export class NogalTicketService {
  private readonly SEGURNEO_VOICE_ENDPOINT = 'https://segurneo-voice.onrender.com/api/crear-ticket';
  private readonly TIMEOUT_MS = 15000; // 15 segundos

  /**
   * 🎯 MÉTODO PRINCIPAL - Crear y enviar ticket a Segurneo Voice
   */
  async createAndSendTicket(ticketData: Omit<NogalTicketPayload, 'IdTicket'>): Promise<NogalTicketResponse> {
    console.log(`🎫 [NOGAL] Creando ticket para cliente: ${ticketData.IdCliente}`);

    try {
      // 1. Generar ID único para el ticket
      const idTicket = await this.generateUniqueTicketId();
      
      // 2. Completar payload con sanitización de campos
      const completePayload: NogalTicketPayload = {
        ...ticketData,
        IdTicket: idTicket,
        IdCliente: this.sanitizeTextField(ticketData.IdCliente, 50, 'IdCliente'),
        TipoIncidencia: this.sanitizeTextField(ticketData.TipoIncidencia, 100, 'TipoIncidencia'),
        MotivoIncidencia: this.sanitizeTextField(ticketData.MotivoIncidencia, 100, 'MotivoIncidencia'),
        Ramo: this.sanitizeRamo(ticketData.Ramo), // ✅ NUEVO - sanitizar campo ramo
        NumeroPoliza: this.sanitizeNumeroPoliza(ticketData.NumeroPoliza), // ✅ Sanitizar formato
        Notas: this.sanitizeNotas(ticketData.Notas) // ✅ Limitar longitud de notas
      };

      console.log(`📋 [NOGAL] Payload para Segurneo Voice:`, {
        IdCliente: completePayload.IdCliente,
        IdTicket: completePayload.IdTicket,
        IdLlamada: completePayload.IdLlamada,
        TipoIncidencia: completePayload.TipoIncidencia,
        MotivoIncidencia: completePayload.MotivoIncidencia,
        hasRamo: !!completePayload.Ramo,
        ramo: completePayload.Ramo || 'no especificado',
        hasPoliza: !!completePayload.NumeroPoliza,
        numeroPoliza: completePayload.NumeroPoliza || 'no especificado'
      });

      // 3. Enviar a Segurneo Voice
      const response = await this.sendToSegurneoVoice(completePayload);

      if (response.success) {
        console.log(`✅ [NOGAL] Ticket enviado exitosamente: ${idTicket}`);
        return {
          success: true,
          message: 'Ticket creado y enviado exitosamente a Nogal vía Segurneo Voice',
          ticket_id: idTicket
        };
      } else {
        console.error(`❌ [NOGAL] Error en envío: ${response.error}`);
        return response;
      }

    } catch (error) {
      console.error(`❌ [NOGAL] Error en creación de ticket:`, error);
      return {
        success: false,
        message: 'Error interno en creación de ticket',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * 🎲 Generar ID único de ticket con formato IA-YYYYMMDD-XXX
   */
  private async generateUniqueTicketId(): Promise<string> {
    const today = new Date();
    const dateStr = today.getFullYear().toString() + 
                   (today.getMonth() + 1).toString().padStart(2, '0') + 
                   today.getDate().toString().padStart(2, '0');
    
    // Buscar el último número secuencial del día
    const todayPrefix = `IA-${dateStr}-`;
    
    try {
      console.log(`🎲 [NOGAL] Generando ID con prefijo: ${todayPrefix}`);
      
      // 🔧 ARREGLO: Buscar tickets del día usando cast explícito para string
      const { data: existingTickets, error } = await supabase
        .from('tickets')
        .select('metadata')
        .like('metadata->>nogal_ticket_id', `${todayPrefix}%`) // Usar ->> para extraer como texto
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error(`❌ [NOGAL] Error en consulta Supabase para ID:`, error);
        // Fallback inmediato - no lanzar error
        const fallbackId = `${todayPrefix}001`;
        console.log(`🔄 [NOGAL] Usando ID fallback: ${fallbackId}`);
        return fallbackId;
      }

      let nextNumber = 1;
      
      if (existingTickets && existingTickets.length > 0) {
        const lastTicket = existingTickets[0];
        const lastTicketId = lastTicket.metadata?.nogal_ticket_id;
        
        if (lastTicketId && typeof lastTicketId === 'string') {
          const match = lastTicketId.match(/-(\d{3})$/);
          if (match) {
            nextNumber = parseInt(match[1]) + 1;
          }
        }
      }

      const sequentialPart = nextNumber.toString().padStart(3, '0');
      const ticketId = `${todayPrefix}${sequentialPart}`;
      
      console.log(`✅ [NOGAL] ID generado exitosamente: ${ticketId}`);
      return ticketId;
      
    } catch (error) {
      console.error(`❌ [NOGAL] Error crítico generando ID:`, error);
      // Fallback super robusto - nunca fallar
      const timestamp = Date.now().toString().slice(-3);
      const fallbackId = `${todayPrefix}${timestamp}`;
      console.log(`🆘 [NOGAL] Usando ID timestamp fallback: ${fallbackId}`);
      return fallbackId;
    }
  }

  /**
   * 📤 Enviar ticket a Segurneo Voice
   */
  private async sendToSegurneoVoice(payload: NogalTicketPayload): Promise<NogalTicketResponse> {
    try {
      console.log(`📤 [NOGAL] Enviando a Segurneo Voice: ${this.SEGURNEO_VOICE_ENDPOINT}`);
      
      const response = await axios.post(this.SEGURNEO_VOICE_ENDPOINT, payload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Nogal-InsightCall-Portal/1.0'
        },
        timeout: this.TIMEOUT_MS
      });

      // ✅ ARREGLO MEJORADO: Revisar campo success del payload + código HTTP
      if (response.status >= 200 && response.status < 300) {
        console.log(`✅ [NOGAL] Respuesta de Segurneo Voice (${response.status}):`, response.data);
        
        // 🎯 VALIDACIÓN PRINCIPAL: Revisar campo success del payload
        if (response.data && response.data.success === true) {
          console.log(`✅ [NOGAL] Ticket creado exitosamente en Nogal: ${response.data.ticket_id || payload.IdTicket}`);
          return {
            success: true,
            message: response.data.message || 'Ticket creado exitosamente en Nogal',
            ticket_id: response.data.ticket_id || payload.IdTicket,
            nogal_response: response.data
          };
        } else {
          // HTTP 2xx pero success=false - Error en Nogal
          const errorMsg = response.data?.message || response.data?.error || 'Error procesando ticket en Nogal';
          console.error(`❌ [NOGAL] Ticket rechazado por Nogal:`, errorMsg);
          throw new Error(`Nogal error: ${errorMsg}`);
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (error) {
      console.error(`❌ [NOGAL] Error enviando a Segurneo Voice:`, error);
      
      let errorMessage = 'Error enviando ticket a Segurneo Voice';
      
      if (error instanceof AxiosError) {
        if (error.code === 'ECONNABORTED') {
          errorMessage = `Timeout después de ${this.TIMEOUT_MS}ms`;
        } else if (error.response) {
          errorMessage = `HTTP ${error.response.status}: ${error.response.data?.message || error.response.statusText}`;
        } else if (error.request) {
          errorMessage = 'Sin respuesta del servidor Segurneo Voice';
        } else {
          errorMessage = error.message;
        }
      }

      return {
        success: false,
        message: errorMessage,
        error: errorMessage
      };
    }
  }

  /**
   * 🧪 Probar conectividad con Segurneo Voice
   */
  async testConnection(): Promise<{
    segurneoVoice: boolean;
    responseTime?: number;
    error?: string;
  }> {
    console.log(`🧪 [NOGAL] Probando conectividad con Segurneo Voice`);
    
    const startTime = Date.now();
    
    try {
      // Hacer un request simple para verificar que el endpoint responde
      const response = await axios.get(this.SEGURNEO_VOICE_ENDPOINT.replace('/crear-ticket', '/health'), {
        timeout: 5000
      });
      
      const responseTime = Date.now() - startTime;
      
      return {
        segurneoVoice: response.status === 200,
        responseTime
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        segurneoVoice: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * 🧹 Sanitizar formato de NumeroPoliza para evitar errores en Nogal
   */
  private sanitizeNumeroPoliza(numeroPoliza?: string): string {
    if (!numeroPoliza || numeroPoliza.trim() === '') {
      return ''; // ✅ Vacío si no hay número de póliza claro
    }

    const original = numeroPoliza.trim();
    
    // 🚨 CRÍTICO: Si es texto descriptivo, devolver vacío
    const descriptivePatterns = [
      /número de póliza.*\(a obtener/i,
      /obtener del sistema/i,
      /no especificado/i,
      /no detectado/i,
      /sin especificar/i,
      /^no especificado$/i
    ];
    
    for (const pattern of descriptivePatterns) {
      if (pattern.test(original)) {
        console.log(`🚨 [NOGAL] Número de póliza descriptivo detectado: "${original}" → ""`);
        return '';
      }
    }
    
    // ✅ FIX: Nogal no acepta múltiples pólizas separadas por comas
    // Convertir comas a pipes que sí acepta
    let sanitized = original
      .replace(/,\s*/g, '|') // Reemplazar "," y ", " por "|"
      .replace(/\s+/g, ' ');  // Normalizar espacios
    
    // 🚫 FIX CRÍTICO: Limitar longitud para evitar truncamiento en BD de Nogal
    const MAX_POLIZA_LENGTH = 50; // Límite conservador para BD de Nogal
    
    if (sanitized.length > MAX_POLIZA_LENGTH) {
      // Si hay múltiples pólizas, mantener solo las primeras que quepan
      const polizas = sanitized.split('|');
      let result = '';
      
      for (const poliza of polizas) {
        const next = result ? `${result}|${poliza}` : poliza;
        if (next.length <= MAX_POLIZA_LENGTH) {
          result = next;
        } else {
          break;
        }
      }
      
      sanitized = result;
      console.log(`⚠️ [NOGAL] NumeroPoliza truncado por longitud: ${polizas.length} pólizas → "${sanitized}"`);
    }
    
    console.log(`🧹 [NOGAL] Sanitizando NumeroPoliza: "${numeroPoliza}" → "${sanitized}"`);
    
    return sanitized;
  }

  /**
   * 🧹 Sanitizar y limitar longitud de Notas para evitar truncamiento en BD de Nogal
   */
  private sanitizeNotas(notas: string): string {
    if (!notas || notas.trim() === '') {
      return 'Sin notas adicionales';
    }
    
    const MAX_NOTAS_LENGTH = 500; // Límite conservador para campo Notas
    const originalLength = notas.length;
    
    // Limpiar caracteres problemáticos (especialmente emojis) y normalizar
    let sanitized = notas
      .trim()
      .replace(/[\r\n\t]+/g, ' ')  // Reemplazar saltos de línea y tabs por espacios
      .replace(/\s+/g, ' ')        // Normalizar espacios múltiples
      // Remover emojis Unicode específicamente (incluyendo surrogates como \ud83d)
      .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}-\u{2454}]|[\u{20D0}-\u{20FF}]/gu, '')
      // Remover cualquier carácter que no sea alfanumérico, espacios o puntuación básica
      .replace(/[^\w\sáéíóúüñÁÉÍÓÚÜÑ.,;:()\-\/€%]/g, '')
      .substring(0, MAX_NOTAS_LENGTH); // Limitar longitud
    
    if (originalLength > MAX_NOTAS_LENGTH) {
      console.log(`⚠️ [NOGAL] Notas truncadas por longitud: ${originalLength} → ${sanitized.length} chars`);
    }
    
    console.log(`🧹 [NOGAL] Sanitizando Notas (eliminando emojis): ${originalLength} chars → ${sanitized.length} chars`);
    
    return sanitized;
  }

  /**
   * 🧹 Sanitizar texto general para evitar truncamiento en BD de Nogal
   */
  private sanitizeTextField(text: string, maxLength: number, fieldName: string): string {
    if (!text || text.trim() === '') {
      return text;
    }
    
    let sanitized = text.trim();
    
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength - 3) + '...';
      console.log(`⚠️ [NOGAL] ${fieldName} truncado: ${text.length} → ${sanitized.length} chars`);
    }
    
    return sanitized;
  }

  /**
   * 🧹 Sanitizar campo Ramo para evitar errores en Nogal
   */
  private sanitizeRamo(ramo?: string): string {
    if (!ramo || ramo.trim() === '') {
      return 'No especificado';
    }
    return this.sanitizeTextField(ramo, 50, 'Ramo');
  }

  /**
   * 🎯 Generar ID de ticket para casos externos (mantener compatibilidad)
   */
  generateTicketId(conversationId: string, tipoIncidencia: string): string {
    // Este método se mantiene para compatibilidad, pero ahora usa el nuevo formato
    const today = new Date();
    const dateStr = today.getFullYear().toString() + 
                   (today.getMonth() + 1).toString().padStart(2, '0') + 
                   today.getDate().toString().padStart(2, '0');
    
    // Usar hash del conversationId para generar un número único
    const hash = conversationId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const uniqueNumber = Math.abs(hash % 999) + 1;
    const sequentialPart = uniqueNumber.toString().padStart(3, '0');
    
    return `IA-${dateStr}-${sequentialPart}`;
  }
}

// Exportar instancia única
export const nogalTicketService = new NogalTicketService(); 