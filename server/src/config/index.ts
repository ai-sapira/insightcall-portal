import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  
  // Supabase Configuration - Unificada para todo el sistema
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceKey?: string;
  
  // Legacy Nogal Supabase (para compatibilidad)
  nogalSupabaseUrl: string;
  nogalSupabaseServiceKey: string;
  
  segurneoVoiceApiKey: string;
  segurneoVoiceBaseUrl: string;
  geminiApiKey: string;
  nogalApiBaseUrl: string;
  nogalApiTimeout: number;
  nogalApiKey?: string;
  
  // ElevenLabs Agent Filter
  elevenlabsAgentId?: string; // Agent ID de ElevenLabs para filtrar llamadas de Nogal
}

// Helper function to get required environment variables
function getRequiredEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

// Helper function to get optional environment variables
function getOptionalEnvVar(name: string, defaultValue: string = ''): string {
  return process.env[name] || defaultValue;
}

const config: Config = {
  // Server Configuration
  port: parseInt(getOptionalEnvVar('PORT', '3000')),
  nodeEnv: getOptionalEnvVar('NODE_ENV', 'development'),

  // Supabase Configuration - Unificada
  supabaseUrl: getOptionalEnvVar('SUPABASE_URL', 'https://zfmrknubpbzsowfatnbq.supabase.co'),
  supabaseAnonKey: getOptionalEnvVar('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmbXJrbnVicGJ6c293ZmF0bmJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2MTMxMDAsImV4cCI6MjA2MzE4OTEwMH0.zaVXvVOTKRZzAA52f8m2qLXewIsS1bk_6x59N5Kx1wU'),
  supabaseServiceKey: getOptionalEnvVar('SUPABASE_SERVICE_ROLE_KEY'),

  // Legacy Nogal Supabase (fallback a configuración unificada)
  nogalSupabaseUrl: getOptionalEnvVar('NOGAL_SUPABASE_URL', getOptionalEnvVar('SUPABASE_URL', 'https://zfmrknubpbzsowfatnbq.supabase.co')),
  nogalSupabaseServiceKey: getOptionalEnvVar('NOGAL_SUPABASE_SERVICE_KEY', getOptionalEnvVar('SUPABASE_SERVICE_ROLE_KEY', getOptionalEnvVar('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmbXJrbnVicGJ6c293ZmF0bmJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2MTMxMDAsImV4cCI6MjA2MzE4OTEwMH0.zaVXvVOTKRZzAA52f8m2qLXewIsS1bk_6x59N5Kx1wU'))),

  // Segurneo Voice Configuration  
  segurneoVoiceApiKey: getOptionalEnvVar('SEGURNEO_VOICE_API_KEY', 'segurneo_test_key'),
  segurneoVoiceBaseUrl: getOptionalEnvVar('SEGURNEO_VOICE_API_BASE_URL', 'https://segurneo-voice.onrender.com/api/v1'),

  // Gemini Configuration
  geminiApiKey: getOptionalEnvVar('GEMINI_API_KEY', 'development_key'),

  // Nogal API Configuration
  nogalApiBaseUrl: getOptionalEnvVar('NOGAL_API_BASE_URL', 'https://api.nogal.app/v1'),
  nogalApiTimeout: parseInt(getOptionalEnvVar('NOGAL_API_TIMEOUT', '30000')),
  nogalApiKey: getOptionalEnvVar('NOGAL_API_KEY'),
  
  // ElevenLabs Agent Filter
  elevenlabsAgentId: getOptionalEnvVar('ELEVENLABS_AGENT_ID'),
};

export default config; 