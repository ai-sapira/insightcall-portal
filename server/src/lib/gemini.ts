import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is required');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
export const model = genAI.getGenerativeModel({ 
  model: 'gemini-2.5-flash',
  generationConfig: {
    temperature: 0.1,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 8192,
  }
});

export async function generateTextResponse(prompt: string, context?: string): Promise<string> {
  try {
    const fullPrompt = context ? `${context}\n\n${prompt}` : prompt;
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error('Error generating Gemini response:', error);
    throw new Error(`Failed to generate Gemini response: ${error.message}`);
  }
}

export async function generateStructuredResponse<T>(
  prompt: string,
  context?: string,
  validator?: (response: any) => T
): Promise<T> {
  try {
    const response = await generateTextResponse(prompt, context);
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