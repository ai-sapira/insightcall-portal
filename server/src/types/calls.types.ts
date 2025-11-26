// 🎯 NUEVA ESTRUCTURA SIMPLE - TIPOS DE LLAMADAS
// Una sola interfaz clara para todo el sistema

// 🛠️ FORMATO REAL DE SEGURNEO VOICE - Herramientas
export interface SegurneoToolCall {
  type: string;
  tool_name: string;
  request_id: string;
  tool_details: {
    url: string;
    body: string;
    type: string;
    method: string;
    headers: Record<string, string>;
    path_params: Record<string, any>;
    query_params: Record<string, any>;
  };
  params_as_json: string;
  tool_has_been_called: boolean;
}

export interface SegurneoToolResult {
  type: string;
  is_error: boolean;
  tool_name: string;
  request_id: string;
  result_value: string; // JSON string que hay que parsear
  tool_latency_secs: number;
  tool_has_been_called: boolean;
}

export interface CallTranscript {
  sequence: number;
  speaker: 'agent' | 'user';
  message: string;
  segment_start_time: number;
  segment_end_time: number;
  tool_calls: SegurneoToolCall[];  // Array de tool calls
  tool_results: SegurneoToolResult[]; // Array de tool results
  feedback?: any;
}

// 🔄 LEGACY: Mantener compatibilidad con código anterior
export interface LegacyToolCall {
  type: 'function';
  function: {
    name: string;
    arguments: Record<string, any>;
  };
}

export interface LegacyToolResult {
  status: 'success' | 'error';
  data?: Record<string, any>;
  error?: string;
}

export interface LegacyCallTranscript {
  sequence: number;
  speaker: 'agent' | 'user';
  message: string;
  start_time: number;
  end_time: number;
  confidence: number;
  tool_calls?: LegacyToolCall;
  tool_results?: LegacyToolResult;
  feedback?: string;
}

// Mantener alias para compatibilidad
export interface ToolCall extends LegacyToolCall {}
export interface ToolResult extends LegacyToolResult {}

// 🎫 Estructura para ticket de Nogal (enviado a Segurneo Voice)
export interface NogalTicketPayload {
  IdCliente: string;
  IdTicket: string;
  IdLlamada: string;
  TipoIncidencia: string;
  MotivoIncidencia: string;
  Ramo?: string; // ✅ NUEVO - ramo de seguro si se detecta (hogar, auto, vida, decesos, salud, viaje, otros)
  NumeroPoliza?: string; // ✅ OPCIONAL - solo si se identifica en la llamada
  Notas: string;
  FicheroLlamada?: string;
  // Nota: JsonId, Fecha, Hora los añade automáticamente Segurneo Voice
}

// 🎫 Respuesta del servicio de tickets
export interface NogalTicketResponse {
  success: boolean;
  message: string;
  ticket_id?: string;
  error?: string;
  nogal_response?: any; // Respuesta completa de Segurneo Voice para debugging
}

export interface CallRecord {
  // 🆔 Identificadores
  id: string;                           // UUID interno de Nogal
  segurneo_call_id: string;            // call_id de Segurneo  
  conversation_id: string;             // conversation_id de ElevenLabs
  
  // 📞 Datos básicos de la llamada
  agent_id: string;
  start_time: string;                  // ISO timestamp
  end_time: string;                    // ISO timestamp  
  duration_seconds: number;
  status: 'completed' | 'failed' | 'in_progress';
  call_successful: boolean;
  termination_reason?: string;
  cost_cents: number;                  // Siempre en céntimos
  
  // 📊 Contadores de mensajes
  agent_messages: number;
  user_messages: number;
  total_messages: number;
  
  // 📝 Contenido
  transcript_summary: string;          // Siempre en español (traducido)
  transcripts: CallTranscript[];       // Array con tool_calls y tool_results reales
  
  // 🎵 Información de audio
  audio_download_url?: string | null;
  audio_file_size?: number | null;
  fichero_llamada?: string | null;
  
  // 🧠 Análisis IA (se rellena tras procesar)
  analysis_completed: boolean;
  ai_analysis: {
    tipo_incidencia: string;
    motivo_gestion: string; 
    confidence: number;
    prioridad: 'low' | 'medium' | 'high';
    resumen_analisis: string;
    datos_extraidos: Record<string, any>;
  } | null;
  
  // 🎫 Tickets generados
  tickets_created: number;
  ticket_ids: string[];
  
  // ⏰ Timestamps del sistema
  received_at: string;                 // Cuándo llegó el webhook
  processed_at?: string;               // Cuándo se completó el procesamiento
  created_at: string;
  updated_at: string;
}

// 🎯 Payload que llega de Segurneo (según documentación)
export interface SegurneoWebhookPayload {
  call_id: string;
  conversation_id: string;
  agent_id: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  status: string;
  cost: number;                        // En céntimos
  termination_reason?: string;
  transcript_summary: string;          // Puede estar en inglés
  call_successful: boolean;
  participant_count: {
    agent_messages: number;
    user_messages: number;
    total_messages: number;
  };
  audio_available: boolean;
  created_at: string;
  
  // 🎵 Nuevos campos de audio desde Segurneo
  audio_download_url?: string;
  audio_file_size?: number;
  ficheroLlamada?: string;
  
  transcripts: CallTranscript[]; // Usar formato real con tool_calls y tool_results
} 