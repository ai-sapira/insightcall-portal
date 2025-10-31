// 🎯 NUEVO CONTROLLER SIMPLE - VERSION OPTIMIZADA DEBUG 2025-01-08
// Responsabilidad única: API endpoints para el sistema de llamadas
// CAMBIO FORZADO PARA RELOAD

import { Request, Response } from 'express';
import { newCallProcessor } from '../../services/newCallProcessor';
import { supabase } from '../../lib/supabase';
import { Call } from '../../types/call.types';
import { SegurneoWebhookPayload } from '../../types/calls.types';

/**
 * 🎯 Controller principal para el sistema de llamadas optimizado
 * Endpoints mínimos y claros
 */
export class NewCallsController {

  /**
   * 📥 WEBHOOK: Recibir llamada de Segurneo y procesarla completamente
   * POST /api/v1/calls/webhook-new
   */
  async webhook(req: Request, res: Response) {
    const startTime = Date.now();
    
    try {
      console.log(`📥 [WEBHOOK] Received payload for: ${req.body.conversation_id}`);
      
      // Validar API key
      const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
      if (!this.validateApiKey(apiKey as string)) {
        console.error('❌ [WEBHOOK] Invalid API key');
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Validar payload básico
      if (!req.body.conversation_id || !req.body.call_id) {
        console.error('❌ [WEBHOOK] Missing required fields');
        return res.status(400).json({ 
          error: 'Bad Request',
          message: 'conversation_id and call_id are required'
        });
      }

      // Procesar llamada completa
      const processedCall = await newCallProcessor.processCall(req.body as SegurneoWebhookPayload);
      
      const duration = Date.now() - startTime;
      console.log(`✅ [WEBHOOK] Processed successfully in ${duration}ms: ${processedCall.id}`);

      return res.status(201).json({
        success: true,
        call_id: processedCall.id,
        conversation_id: processedCall.conversation_id,
        analysis_completed: processedCall.analysis_completed,
        tickets_created: processedCall.tickets_created,
        processing_time_ms: duration
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [WEBHOOK] Error after ${duration}ms:`, error);
      
      return res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
        conversation_id: req.body?.conversation_id,
        processing_time_ms: duration
      });
    }
  }

  /**
   * 📋 LISTAR: Obtener todas las llamadas con paginación
   * GET /api/v1/calls/new
   */
  async getCalls(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100); // Max 100
      const offset = (page - 1) * limit;

      // Filtros opcionales
      const status = req.query.status as string;
      const agent_id = req.query.agent_id as string;
      const analysis_completed = req.query.analysis_completed === 'true';

      console.log(`📋 [LIST] Getting calls - page: ${page}, limit: ${limit}`);

      let query = supabase
        .from('calls')
        .select('*', { count: 'exact' })
        .order('received_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Aplicar filtros
      if (status) {
        query = query.eq('status', status);
      }
      if (agent_id) {
        // Si se especifica un agent_id específico en query params, lo aplicamos además del filtro base
        query = query.eq('agent_id', agent_id);
      }
      if (req.query.analysis_completed !== undefined) {
        query = query.eq('analysis_completed', analysis_completed);
      }

      const { data: calls, count, error } = await query;

      if (error) {
        throw error;
      }

      console.log(`✅ [LIST] Retrieved ${calls?.length} calls`);

      return res.json({
        calls: calls as Call[],
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit)
        }
      });

    } catch (error) {
      console.error('❌ [LIST] Error getting calls:', error);
      console.error('❌ [LIST] Error stack:', error instanceof Error ? error.stack : 'No stack');
      return res.status(500).json({
        error: 'Error getting call',
        details: error instanceof Error ? error.message : 'Unknown error',
        debugInfo: {
          type: typeof error,
          name: error instanceof Error ? error.name : 'unknown',
          stack: error instanceof Error ? error.stack : 'no stack'
        }
      });
    }
  }

  /**
   * 🔍 DETALLE: Obtener una llamada específica
   * GET /api/v1/calls/new/:id
   */
  async getCall(req: Request, res: Response) {
    try {
      const { id } = req.params;
      console.log(`🔍 [DETAIL] Getting call: ${id}`);

      // Buscar por ID o por conversation_id
      let query = supabase.from('calls').select('*');
      
      if (id.startsWith('conv_')) {
        query = query.eq('conversation_id', id);
      } else {
        query = query.eq('id', id);
      }

      const { data: call, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log(`⚠️ [DETAIL] Call not found: ${id}`);
          return res.status(404).json({
            error: 'Not Found',
            message: 'Call not found'
          });
        }
        throw error;
      }

      console.log(`✅ [DETAIL] Call retrieved: ${call.id}`);
      return res.json(call as Call);

    } catch (error) {
      console.error('❌ [DETAIL] Error getting call:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 📊 ESTADÍSTICAS: Obtener estadísticas del sistema
   * GET /api/v1/calls/new/stats
   */
  async getStats(req: Request, res: Response) {
    try {
      console.log('📊 [STATS] Getting system statistics');

      // TODO: Implementar getStats en newCallProcessor
      const stats = { message: "Stats temporalmente deshabilitadas durante migración" };
      
      console.log('✅ [STATS] Statistics retrieved');
      return res.json(stats);

    } catch (error) {
      console.error('❌ [STATS] Error getting stats:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * ❤️ HEALTH: Health check del nuevo sistema
   * GET /api/v1/calls/new/health
   */
  async health(req: Request, res: Response) {
    try {
      // Verificar conexión a DB
      const { data, error } = await supabase
        .from('calls')
        .select('count')
        .limit(1);

      if (error) {
        throw error;
      }

      return res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
        version: '2.0.0-optimized'
      });

    } catch (error) {
      console.error('❌ [HEALTH] Health check failed:', error);
      return res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 🧪 TEST: Endpoint para pruebas con datos simulados
   * POST /api/v1/calls/new/test
   */
  async test(req: Request, res: Response) {
    try {
      console.log('🧪 [TEST] Creating test call');

      const testPayload: SegurneoWebhookPayload = {
        call_id: `test-${Date.now()}`,
        conversation_id: `conv_test_${Date.now()}`,
        agent_id: 'test-agent',
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 120000).toISOString(), // 2 min después
        duration_seconds: 120,
        status: 'completed',
        cost: 500, // 5€
        termination_reason: 'Test completed',
        transcript_summary: 'This is a test call summary for validation purposes.',
        call_successful: true,
        participant_count: {
          agent_messages: 3,
          user_messages: 2,
          total_messages: 5
        },
        audio_available: false,
        created_at: new Date().toISOString(),
        transcripts: [
          {
            sequence: 1,
            speaker: 'agent',
            message: 'Hola, soy el agente virtual de prueba.',
            segment_start_time: 0,
            segment_end_time: 3,
            tool_calls: [],
            tool_results: []
          },
          {
            sequence: 2,
            speaker: 'user',
            message: 'Hola, necesito ayuda con mi póliza.',
            segment_start_time: 4,
            segment_end_time: 7,
            tool_calls: [],
            tool_results: []
          },
          {
            sequence: 3,
            speaker: 'agent',
            message: 'Por supuesto, ¿me puede dar su número de póliza?',
            segment_start_time: 8,
            segment_end_time: 11,
            tool_calls: [],
            tool_results: []
          }
        ]
      };

      const result = await newCallProcessor.processCall(testPayload);
      
      console.log(`✅ [TEST] Test call created: ${result.id}`);
      return res.status(201).json({
        success: true,
        message: 'Test call created successfully',
        call: result
      });

    } catch (error) {
      console.error('❌ [TEST] Test failed:', error);
      return res.status(500).json({
        error: 'Test Failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 🧪 DEBUG: Endpoint temporal para hacer debug del problema
   * GET /api/v1/calls/new/debug
   */
  async debugCalls(req: Request, res: Response) {
    console.log(`🧪 [DEBUG] Starting debug endpoint`);
    
    try {
      // Test 1: Conexión básica a Supabase
      console.log(`🧪 [DEBUG] Test 1: Basic connection`);
      const test1 = await supabase.from('calls').select('count');
      
      // Test 2: Consulta simple
      console.log(`🧪 [DEBUG] Test 2: Simple query`);
      const test2 = await supabase.from('calls').select('id, conversation_id').limit(1);
      
      // Test 3: Consulta completa
      console.log(`🧪 [DEBUG] Test 3: Full query`);
      const test3 = await supabase.from('calls').select('*').limit(1);
      
      return res.json({
        debug: true,
        timestamp: new Date().toISOString(),
        tests: {
          count: test1,
          simple: test2,
          full: test3
        }
      });
      
    } catch (error) {
      console.error(`❌ [DEBUG] Error:`, error);
      return res.status(500).json({
        debug: true,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack'
      });
    }
  }

  /**
   * 🔐 Validar API key
   */
  private validateApiKey(apiKey: string): boolean {
    const validApiKeys = [
      process.env.SEGURNEO_VOICE_API_KEY,
      'segurneo', // Key temporal para desarrollo
      'test-key'  // Key para pruebas
    ].filter(Boolean);

    return validApiKeys.includes(apiKey);
  }
}

// 🚀 Exportar instancia única
export const newCallsController = new NewCallsController(); 