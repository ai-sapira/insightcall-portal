// src/lib/elevenlabs-api.ts

/**
 * Get API base URL
 * In development: uses VITE_API_URL or defaults to localhost:3000
 * In production: uses VITE_API_URL or same origin
 */
const getApiBaseUrl = (): string => {
  // If explicitly set, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // In development, default to localhost:3000
  if (import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3000';
  }
  
  // In production, use the Render backend URL as default if VITE_API_URL is not set
  return 'https://insightcall-portal.onrender.com';
};

const API_BASE_URL = getApiBaseUrl();

interface AgentConfigPayload {
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
  // Include other top-level fields from the API if needed, like 'name'
  // name?: string; 
}

// Define a more detailed type based on the API response if necessary
// This might involve nesting based on the GET response structure
interface AgentDetails {
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
       // ... other asr fields
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
       // ... other tts fields
     };
     // ... other conversation_config fields
   };
   // ... other top-level fields from the GET response
}


export const getAgentConfig = async (): Promise<AgentDetails> => {
  const url = `${API_BASE_URL}/api/v1/agent/config`;
  
  console.log('[ElevenLabs API] Fetching agent config from:', url);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("[ElevenLabs API] Error fetching agent config:", errorData);
    throw new Error(errorData.message || `Failed to fetch agent config: ${response.statusText}`);
  }

  const result = await response.json();
  
  // Backend returns { success: true, data: AgentDetails }
  if (result.success && result.data) {
    return result.data;
  }
  
  throw new Error('Invalid response format from backend');
};

export const updateAgentConfig = async (payload: AgentConfigPayload): Promise<void> => {
  const url = `${API_BASE_URL}/api/v1/agent/config`;
  
  console.log('[ElevenLabs API] Updating agent config at:', url);
  console.log('[ElevenLabs API] Payload:', payload);

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("[ElevenLabs API] Error updating agent config:", errorData);
    throw new Error(errorData.message || `Failed to update agent config: ${response.statusText}`);
  }

  const result = await response.json();
  
  // Backend returns { success: true, message: string }
  if (!result.success) {
    throw new Error(result.message || 'Failed to update agent config');
  }
  
  console.log("[ElevenLabs API] Agent config updated successfully");
}; 