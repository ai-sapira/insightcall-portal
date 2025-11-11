import config from '../config';

const ELEVENLABS_API_BASE_URL = 'https://api.elevenlabs.io/v1/convai/agents';

export interface AgentConfigPayload {
  conversation_config?: {
    agent?: {
      first_message?: string;
    };
    asr?: {
      quality?: 'high' | 'low';
    };
    turn?: {
      turn_timeout?: number;
    };
    tts?: {
      stability?: number;
      similarity_boost?: number;
    };
  };
}

export interface AgentDetails {
  agent_id: string;
  name: string;
  conversation_config: {
    agent: {
      first_message: string;
      language: string;
    };
    asr: {
      quality: 'high' | 'low';
      provider: string;
    };
    turn: {
      turn_timeout: number;
      mode: string;
    };
    tts: {
      model_id: string;
      voice_id: string;
      stability: number;
      similarity_boost: number;
    };
  };
}

export class ElevenLabsService {
  private apiKey: string;
  private agentId: string;

  constructor() {
    this.apiKey = config.elevenlabsApiKey || '';
    this.agentId = config.elevenlabsAgentId || '';

    console.log('[ElevenLabsService] Initializing service...', {
      hasApiKey: !!this.apiKey,
      hasAgentId: !!this.agentId,
      apiKeyLength: this.apiKey?.length || 0,
      agentIdLength: this.agentId?.length || 0,
    });

    if (!this.apiKey || !this.agentId) {
      console.warn('[ElevenLabsService] API Key or Agent ID not configured', {
        hasApiKey: !!this.apiKey,
        hasAgentId: !!this.agentId,
      });
    }
  }

  /**
   * Get agent configuration from ElevenLabs API
   */
  async getAgentConfig(): Promise<AgentDetails> {
    if (!this.apiKey || !this.agentId) {
      throw new Error(`ElevenLabs API Key or Agent ID is not configured. API Key: ${this.apiKey ? 'present' : 'missing'}, Agent ID: ${this.agentId ? 'present' : 'missing'}`);
    }

    const url = `${ELEVENLABS_API_BASE_URL}/${this.agentId}`;
    console.log('[ElevenLabsService] Fetching agent config from:', url);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      console.log('[ElevenLabsService] Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { raw: errorText };
        }
        console.error('[ElevenLabsService] Error fetching agent config:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
        });
        throw new Error(`Failed to fetch agent config: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      console.log('[ElevenLabsService] Agent config retrieved successfully');
      return data;
    } catch (error) {
      console.error('[ElevenLabsService] Fetch error:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Update agent configuration in ElevenLabs API
   */
  async updateAgentConfig(payload: AgentConfigPayload): Promise<void> {
    if (!this.apiKey || !this.agentId) {
      throw new Error('ElevenLabs API Key or Agent ID is not configured');
    }

    const response = await fetch(`${ELEVENLABS_API_BASE_URL}/${this.agentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': this.apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[ElevenLabsService] Error updating agent config:', errorData);
      throw new Error(`Failed to update agent config: ${response.statusText}`);
    }
  }
}

export const elevenLabsService = new ElevenLabsService();

