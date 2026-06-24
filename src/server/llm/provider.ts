import { GoogleGenAI, Type } from '@google/genai';
import { SAMPLE_BREAKDOWNS, getSampleOptions, SAMPLE_DOCUMENTS, SAMPLE_REVIEWS, SAMPLE_GOVERNANCE, getSampleSchedule } from '../demo/sampleOutputs.js';
import { SolutionOption, ScheduleAction } from '../../types.js';

let ai: GoogleGenAI | null = null;

// Initialize Gemini SDK with telemetry header as required by the platform instructions
try {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log('Gemini API client initialized successfully in server.');
  } else {
    console.warn('GEMINI_API_KEY is not configured or is a placeholder. Live agent mode will fallback to demo datasets.');
  }
} catch (error) {
  console.error('Failed to initialize Gemini Client:', error);
}

// Check if demo mode is active
const isDemoMode = () => {
  return process.env.DEMO_MODE === 'true' || !ai;
};

// Generates structured output using Gemini or fallback
export async function callLLM(prompt: string, systemInstruction?: string, jsonMode: boolean = false): Promise<string> {
  if (isDemoMode()) {
    throw new Error('DEMO_MODE_ACTIVE');
  }

  try {
    if (!ai) throw new Error('Gemini Client not initialized.');

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: jsonMode ? 'application/json' : undefined,
        temperature: 0.2,
      }
    });

    if (!response.text) {
      throw new Error('Empty response from Gemini.');
    }

    return response.text;
  } catch (err) {
    console.error('Live LLM call failed, propagating to fallback chain:', err);
    throw err;
  }
}
