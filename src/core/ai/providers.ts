import { GoogleGenAI } from '@google/genai';
import { OpenAI } from 'openai';
import { AIProvider } from '../fs/global-config.js';

export interface AIServiceConfig {
  provider: AIProvider;
  modelName: string;
  temperature: number;
  apiKey?: string;
  baseURL?: string;
}

export interface AIService {
  generateStructured<T>(systemInstruction: string, prompt: string, responseSchema: any): Promise<T>;

  generateText(systemInstruction: string, prompt: string): Promise<string>;
}

/**
 * Normalizes Schema type properties to lowercase (required by OpenAI strict JSON Schema).
 */
function normalizeSchemaForOpenAI(schema: any): any {
  if (!schema) return schema;
  const clone = JSON.parse(JSON.stringify(schema));

  function walk(node: any) {
    if (node && typeof node === 'object') {
      if (typeof node.type === 'string') {
        node.type = node.type.toLowerCase();
      }
      if (node.properties) {
        for (const key of Object.keys(node.properties)) {
          walk(node.properties[key]);
        }
      }
      if (node.items) {
        walk(node.items);
      }
    }
  }

  walk(clone);
  return clone;
}

/**
 * Retries an async function if it fails with a 429 Rate Limit error.
 */
async function executeWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 3000): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const errorMessage = (error as Error).message;
    const isRateLimit =
      errorMessage.includes('429') ||
      errorMessage.toLowerCase().includes('rate limit') ||
      errorMessage.toLowerCase().includes('too many requests');

    if (isRateLimit && retries > 0) {
      console.log(
        `\n⚠️ Rate Limit (429) detectado. Tentando novamente em ${delay / 1000}s... (Tentativas restantes: ${retries})`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return executeWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

/**
 * Implementation of AIService for Google Gemini SDK.
 */
class GeminiProvider implements AIService {
  private ai: GoogleGenAI;
  private modelName: string;
  private temperature: number;

  constructor(config: AIServiceConfig) {
    const apiKey = config.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Missing GEMINI_API_KEY environment variable for Google Gemini provider.');
    }
    this.ai = new GoogleGenAI({ apiKey });
    this.modelName = config.modelName;
    this.temperature = config.temperature;
  }

  async generateStructured<T>(
    systemInstruction: string,
    prompt: string,
    responseSchema: any
  ): Promise<T> {
    return executeWithRetry(async () => {
      try {
        const response = await this.ai.models.generateContent({
          model: this.modelName,
          contents: prompt,
          config: {
            systemInstruction,
            temperature: this.temperature,
            responseMimeType: 'application/json',
            responseSchema,
          },
        });

        const text = response.text;
        if (!text) {
          throw new Error('Received an empty response from the Gemini model.');
        }
        return JSON.parse(text) as T;
      } catch (error) {
        throw new Error(`Gemini structured generation failed: ${(error as Error).message}`);
      }
    });
  }

  async generateText(systemInstruction: string, prompt: string): Promise<string> {
    return executeWithRetry(async () => {
      try {
        const response = await this.ai.models.generateContent({
          model: this.modelName,
          contents: prompt,
          config: {
            systemInstruction,
            temperature: this.temperature,
          },
        });
        return response.text || '';
      } catch (error) {
        throw new Error(`Gemini text generation failed: ${(error as Error).message}`);
      }
    });
  }
}

/**
 * Implementation of AIService for OpenAI SDK (compatible with OpenAI and Ollama).
 */
class OpenAIProvider implements AIService {
  private openai: OpenAI;
  private modelName: string;
  private temperature: number;

  constructor(config: AIServiceConfig) {
    let baseURL: string | undefined = config.baseURL;
    let apiKey = config.apiKey;

    if (config.provider === 'ollama') {
      baseURL = baseURL || 'http://localhost:11434/v1';
      apiKey = apiKey || 'ollama';
    } else {
      // standard OpenAI
      apiKey = apiKey || process.env.OPENAI_API_KEY;
    }

    if (!apiKey) {
      throw new Error(`Missing API Key for provider "${config.provider}".`);
    }

    this.openai = new OpenAI({ apiKey, baseURL });
    this.modelName = config.modelName;
    this.temperature = config.temperature;
  }

  async generateStructured<T>(
    systemInstruction: string,
    prompt: string,
    responseSchema: any
  ): Promise<T> {
    return executeWithRetry(async () => {
      try {
        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: prompt },
        ];

        const normalizedSchema = normalizeSchemaForOpenAI(responseSchema);

        const response = await this.openai.chat.completions.create({
          model: this.modelName,
          messages,
          temperature: this.temperature,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'response_schema',
              strict: true,
              schema: normalizedSchema,
            },
          },
        });

        const text = response.choices[0]?.message.content;
        if (!text) {
          throw new Error('Received an empty response from the OpenAI model.');
        }
        return JSON.parse(text) as T;
      } catch (error) {
        throw new Error(`OpenAI structured generation failed: ${(error as Error).message}`);
      }
    });
  }

  async generateText(systemInstruction: string, prompt: string): Promise<string> {
    return executeWithRetry(async () => {
      try {
        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: prompt },
        ];

        const response = await this.openai.chat.completions.create({
          model: this.modelName,
          messages,
          temperature: this.temperature,
        });

        return response.choices[0]?.message.content || '';
      } catch (error) {
        throw new Error(`OpenAI text generation failed: ${(error as Error).message}`);
      }
    });
  }
}

/**
 * Factory function to create an instance of AIService based on configuration.
 */
export function createAIService(config: AIServiceConfig): AIService {
  switch (config.provider) {
    case 'gemini':
      return new GeminiProvider(config);
    case 'openai':
    case 'ollama':
      return new OpenAIProvider(config);
    default:
      throw new Error(`Unsupported AI provider: ${config.provider}`);
  }
}
