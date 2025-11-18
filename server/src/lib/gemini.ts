import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is required');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Configuration for retry logic
const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 30000; // 30 seconds
const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504]; // Rate limit, server errors

// Alternative models as fallback - using fastest and most reliable models
// Priority: speed and reliability for production use
const FALLBACK_MODELS = [
  'gemini-2.0-flash-exp',  // Fast experimental model
  'gemini-1.5-flash'       // Very fast and stable fallback
];

/**
 * Extract retry delay from error message if available
 * Gemini API includes retryDelay in the error response for 429 errors
 */
function extractRetryDelay(error: any): number | null {
  const errorMessage = error?.message || '';
  
  // Look for "Please retry in X.XXs" pattern
  const retryMatch = errorMessage.match(/Please retry in ([\d.]+)s/i);
  if (retryMatch) {
    const seconds = parseFloat(retryMatch[1]);
    return Math.ceil(seconds * 1000); // Convert to milliseconds
  }
  
  // Try to parse RetryInfo from JSON if present
  try {
    const retryInfoMatch = errorMessage.match(/"retryDelay":"(\d+)s"/);
    if (retryInfoMatch) {
      const seconds = parseInt(retryInfoMatch[1], 10);
      return seconds * 1000;
    }
  } catch (e) {
    // Ignore parsing errors
  }
  
  return null;
}

/**
 * Check if error is quota exceeded permanently (no quota available)
 */
function isQuotaExceededPermanently(error: any): boolean {
  const errorMessage = error?.message || '';
  
  // Check for "limit: 0" which indicates no quota available
  if (/limit:\s*0/i.test(errorMessage) && /quota exceeded/i.test(errorMessage)) {
    return true;
  }
  
  // Check for free tier quota exceeded with limit 0
  if (/free_tier.*limit:\s*0/i.test(errorMessage)) {
    return true;
  }
  
  return false;
}

/**
 * Check if an error is retryable (temporary server error)
 */
function isRetryableError(error: any): { retryable: boolean; skipModel?: boolean } {
  // Check for HTTP status codes in error message or status property
  const errorMessage = error?.message || '';
  const statusCode = error?.status || error?.statusCode || error?.code;
  
  // 404 errors are not retryable (model doesn't exist)
  if (statusCode === 404) {
    return { retryable: false, skipModel: true };
  }
  
  // Check if quota is permanently exceeded (no quota available)
  if (isQuotaExceededPermanently(error)) {
    return { retryable: false, skipModel: true };
  }
  
  // Check if status code is retryable
  if (statusCode && RETRYABLE_STATUS_CODES.includes(statusCode)) {
    return { retryable: true };
  }
  
  // Check error message for common retryable patterns
  const retryablePatterns = [
    /503/i,
    /service unavailable/i,
    /overloaded/i,
    /rate limit/i,
    /429/i,
    /too many requests/i,
    /temporarily unavailable/i,
    /try again later/i,
    /server error/i,
    /502/i,
    /504/i,
    /gateway timeout/i,
    /bad gateway/i
  ];
  
  const isRetryable = retryablePatterns.some(pattern => pattern.test(errorMessage));
  
  return { retryable: isRetryable };
}

/**
 * Calculate exponential backoff delay with jitter
 */
function calculateRetryDelay(attempt: number): number {
  const exponentialDelay = Math.min(
    INITIAL_RETRY_DELAY * Math.pow(2, attempt),
    MAX_RETRY_DELAY
  );
  // Add jitter (±20%) to prevent thundering herd
  const jitter = exponentialDelay * 0.2 * (Math.random() * 2 - 1);
  return Math.floor(exponentialDelay + jitter);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get model instance with optional model name override
 */
function getModel(modelName: string = 'gemini-2.5-flash') {
  return genAI.getGenerativeModel({ 
    model: modelName,
    generationConfig: {
      temperature: 0.1,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 8192,
    }
  });
}

export const model = getModel();

/**
 * Generate text response with retry logic and fallback models
 */
export async function generateTextResponse(
  prompt: string, 
  context?: string,
  options?: { maxRetries?: number; useFallbackModels?: boolean }
): Promise<string> {
  const maxRetries = options?.maxRetries ?? MAX_RETRIES;
  const useFallbackModels = options?.useFallbackModels ?? true;
  
  const modelsToTry = useFallbackModels 
    ? ['gemini-2.5-flash', ...FALLBACK_MODELS]
    : ['gemini-2.5-flash'];
  
  let lastError: any = null;
  
  // Try each model
  for (const modelName of modelsToTry) {
    const currentModel = getModel(modelName);
    let shouldSkipModel = false;
    
    // Retry logic for current model
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const fullPrompt = context ? `${context}\n\n${prompt}` : prompt;
        
        if (attempt > 0) {
          // Try to extract retry delay from last error, otherwise use exponential backoff
          const apiRetryDelay = extractRetryDelay(lastError);
          const delay = apiRetryDelay 
            ? Math.min(apiRetryDelay, MAX_RETRY_DELAY) // Cap at max delay
            : calculateRetryDelay(attempt - 1);
          
          const delaySource = apiRetryDelay ? 'API-suggested' : 'exponential-backoff';
          console.log(`[Gemini] Retry attempt ${attempt}/${maxRetries} for model ${modelName} after ${delay}ms delay (${delaySource})`);
          await sleep(delay);
        }
        
        const result = await currentModel.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text();
        
        if (attempt > 0 || modelName !== 'gemini-2.5-flash') {
          console.log(`[Gemini] Success with ${attempt > 0 ? `retry ${attempt}` : 'fallback model'} ${modelName}`);
        }
        
        return text;
      } catch (error: any) {
        lastError = error;
        const retryInfo = isRetryableError(error);
        
        console.error(`[Gemini] Error on attempt ${attempt + 1}/${maxRetries + 1} (model: ${modelName}):`, {
          message: error?.message?.substring(0, 200) + '...', // Truncate long messages
          status: error?.status || error?.statusCode,
          retryable: retryInfo.retryable,
          skipModel: retryInfo.skipModel
        });
        
        // If model should be skipped (404, quota exceeded permanently), skip to next model
        if (retryInfo.skipModel) {
          const errorStatus = error?.status || error?.statusCode;
          const reason = errorStatus === 404 ? 'not found' : 'no quota available';
          console.log(`[Gemini] Skipping model ${modelName} (${reason})`);
          shouldSkipModel = true;
          break;
        }
        
        // If not retryable or max retries reached, break and try next model
        if (!retryInfo.retryable || attempt >= maxRetries) {
          break;
        }
      }
    }
    
    // Skip to next model if current model should be skipped
    if (shouldSkipModel) {
      continue;
    }
  }
  
  // All models and retries exhausted
  console.error('[Gemini] All retry attempts exhausted');
  throw new Error(`Failed to generate Gemini response after ${maxRetries} retries across ${modelsToTry.length} models: ${lastError?.message || 'Unknown error'}`);
}

export async function generateStructuredResponse<T>(
  prompt: string,
  context?: string,
  validator?: (response: any) => T,
  options?: { maxRetries?: number; useFallbackModels?: boolean }
): Promise<T> {
  try {
    const response = await generateTextResponse(prompt, context, options);
    console.log('[Gemini] Raw response:', response.substring(0, 500) + '...[truncated]');
    
    // Try to parse the response as JSON with improved error handling
    let parsedResponse: any;
    try {
      // First, try direct JSON parsing
      parsedResponse = JSON.parse(response);
    } catch (parseError) {
      // If that fails, try to extract JSON from markdown code blocks
      const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i);
      if (jsonMatch) {
        try {
          parsedResponse = JSON.parse(jsonMatch[1]);
          console.log('[Gemini] Extracted JSON from markdown blocks');
        } catch (markdownError) {
          console.error('[Gemini] Failed to parse JSON from markdown:', markdownError);
          throw new Error('Failed to parse JSON from markdown blocks');
        }
      } else {
        // Try to find JSON-like content between { and }
        const braceMatch = response.match(/\{[\s\S]*\}/);
        if (braceMatch) {
          try {
            parsedResponse = JSON.parse(braceMatch[0]);
            console.log('[Gemini] Extracted JSON from braces');
          } catch (braceError) {
            console.error('[Gemini] Failed to parse JSON from braces:', braceError);
            console.error('[Gemini] Original response:', response);
            throw new Error('Failed to parse Gemini response as JSON');
          }
        } else {
          console.error('[Gemini] No JSON content found in response:', response);
          throw new Error('No JSON content found in Gemini response');
        }
      }
    }

    // If a validator is provided, use it to validate and transform the response
    if (validator) {
      return validator(parsedResponse);
    }

    return parsedResponse as T;
  } catch (error: any) {
    console.error('Error generating structured Gemini response:', error);
    throw new Error(`Failed to generate structured response: ${error.message}`);
  }
}

export const geminiClient = {
  generateTextResponse,
  generateStructuredResponse,
}; 