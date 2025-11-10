import { VoiceCallPayload, VoiceCallResponse, TestScenario } from '@shared/types/voiceCalls.types';

const getApiBaseUrl = (): string => {
  // If explicitly set, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // In development, default to localhost:3000
  if (import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3000';
  }
  
  // In production, use Render backend as default
  return 'https://insightcall-portal.onrender.com';
};

const API_BASE_URL = getApiBaseUrl();

export class VoiceCallsService {
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/v1/nogal/calls`;
  }
  
  /**
   * Send voice call data to the endpoint
   */
  async sendVoiceCall(payload: VoiceCallPayload, apiKey?: string): Promise<VoiceCallResponse> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}`);
    }
    
    return data;
  }
  
  /**
   * Get voice call by ID
   */
  async getVoiceCall(callId: string, apiKey?: string): Promise<VoiceCallResponse> {
    const headers: HeadersInit = {};
    
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    const response = await fetch(`${this.baseUrl}/${callId}`, {
      method: 'GET',
      headers,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}`);
    }
    
    return data;
  }
  
  /**
   * Get recent voice calls
   */
  async getRecentVoiceCalls(limit: number = 10, apiKey?: string): Promise<VoiceCallResponse> {
    const headers: HeadersInit = {};
    
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    const response = await fetch(`${this.baseUrl}?limit=${limit}`, {
      method: 'GET',
      headers,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}`);
    }
    
    return data;
  }
  
  /**
   * Get voice call statistics
   */
  async getStats(apiKey?: string): Promise<VoiceCallResponse> {
    const headers: HeadersInit = {};
    
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    const response = await fetch(`${this.baseUrl}/stats`, {
      method: 'GET',
      headers,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}`);
    }
    
    return data;
  }
  
  /**
   * Health check
   */
  async healthCheck(): Promise<VoiceCallResponse> {
    const response = await fetch(`${this.baseUrl}/health`, {
      method: 'GET',
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}`);
    }
    
    return data;
  }
  
  /**
   * Run test scenario
   */
  async runTestScenario(scenario: TestScenario, apiKey?: string): Promise<{
    success: boolean;
    response?: VoiceCallResponse;
    error?: string;
    actualStatus: number;
  }> {
    try {
      const response = await this.sendVoiceCall(scenario.payload, apiKey);
      
      return {
        success: true,
        response,
        actualStatus: 201, // Assuming successful creation
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        actualStatus: 500, // Default error status
      };
    }
  }
}

// Create singleton instance
export const voiceCallsService = new VoiceCallsService();

// Test scenarios for the frontend
export const TEST_SCENARIOS: TestScenario[] = [
  {
    name: 'Llamada Exitosa Completa',
    description: 'Llamada completada exitosamente con todos los campos',
    payload: {
      call_id: 'a1b2c3d4-e5f6-4789-a123-456789abcdef',
      conversation_id: 'conv_elevenlabs_12345',
      agent_id: 'agent_segurneo_001',
      start_time: '2024-01-15T10:00:00.000Z',
      end_time: '2024-01-15T10:05:30.000Z',
      duration_seconds: 330,
      status: 'completed',
      cost: 1250, // 12.50 euros in cents
      termination_reason: 'User hung up normally',
      transcript_summary: 'Cliente consultó sobre estado de su pedido y recibió información completa.',
      call_successful: true,
      participant_count: {
        agent_messages: 8,
        user_messages: 12,
        total_messages: 20
      },
      audio_available: true,
      created_at: '2024-01-15T10:00:00.000Z'
    },
    expectedStatus: 201
  },
  {
    name: 'Llamada Fallida',
    description: 'Llamada que falló por problemas técnicos',
    payload: {
      call_id: 'b2c3d4e5-f6g7-4890-b234-567890bcdefg',
      conversation_id: 'conv_elevenlabs_12346',
      agent_id: 'agent_segurneo_002',
      start_time: '2024-01-15T11:00:00.000Z',
      end_time: '2024-01-15T11:01:15.000Z',
      duration_seconds: 75,
      status: 'failed',
      cost: 350, // 3.50 euros in cents
      termination_reason: 'Connection timeout',
      transcript_summary: null,
      call_successful: false,
      participant_count: {
        agent_messages: 2,
        user_messages: 1,
        total_messages: 3
      },
      audio_available: false,
      created_at: '2024-01-15T11:00:00.000Z'
    },
    expectedStatus: 201
  },
  {
    name: 'Llamada Abandonada',
    description: 'Llamada abandonada por el usuario',
    payload: {
      call_id: 'c3d4e5f6-g7h8-4901-c345-678901cdefgh',
      conversation_id: 'conv_elevenlabs_12347',
      agent_id: 'agent_segurneo_003',
      start_time: '2024-01-15T12:00:00.000Z',
      end_time: '2024-01-15T12:00:45.000Z',
      duration_seconds: 45,
      status: 'abandoned',
      cost: 200, // 2.00 euros in cents
      termination_reason: 'User disconnected early',
      transcript_summary: 'Usuario colgó antes de completar la consulta.',
      call_successful: false,
      participant_count: {
        agent_messages: 1,
        user_messages: 0,
        total_messages: 1
      },
      audio_available: true,
      created_at: '2024-01-15T12:00:00.000Z'
    },
    expectedStatus: 201
  },
  {
    name: 'Llamada Sin Campos Opcionales',
    description: 'Llamada exitosa con solo campos obligatorios',
    payload: {
      call_id: 'd4e5f6g7-h8i9-4012-d456-789012defghi',
      conversation_id: 'conv_elevenlabs_12348',
      agent_id: 'agent_segurneo_004',
      start_time: '2024-01-15T13:00:00.000Z',
      end_time: '2024-01-15T13:03:20.000Z',
      duration_seconds: 200,
      status: 'completed',
      cost: 800, // 8.00 euros in cents
      call_successful: true,
      participant_count: {
        agent_messages: 5,
        user_messages: 7,
        total_messages: 12
      },
      audio_available: true,
      created_at: '2024-01-15T13:00:00.000Z'
    },
    expectedStatus: 201
  },
  {
    name: 'Llamada con Datos Inválidos',
    description: 'Llamada con call_id inválido (debe fallar)',
    payload: {
      call_id: 'invalid-uuid-format',
      conversation_id: 'conv_elevenlabs_12349',
      agent_id: 'agent_segurneo_005',
      start_time: '2024-01-15T14:00:00.000Z',
      end_time: '2024-01-15T14:02:00.000Z',
      duration_seconds: 120,
      status: 'completed',
      cost: 500,
      call_successful: true,
      participant_count: {
        agent_messages: 3,
        user_messages: 4,
        total_messages: 7
      },
      audio_available: true,
      created_at: '2024-01-15T14:00:00.000Z'
    },
    expectedStatus: 400
  }
]; 