import { GoogleGenAI } from '@google/genai';
import { SYSTEM_PROMPT, buildUserPrompt } from './prompts.js';
// ADAPTER: Implementing the AIService using the @google/genai SDK.
export class GeminiAIService {
    ai;
    modelName;
    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('Missing GEMINI_API_KEY environment variable. Please configure it in your .env file.');
        }
        // Initialize the Google GenAI SDK with the API key.
        this.ai = new GoogleGenAI({ apiKey });
        // Using the modern, fast, and cost-effective gemini-2.5-flash model.
        this.modelName = 'gemini-2.5-flash';
    }
    async generateDocumentation(rules, directoryTree) {
        const userPrompt = buildUserPrompt(rules, directoryTree);
        try {
            // Calling the models.generateContent API
            const response = await this.ai.models.generateContent({
                model: this.modelName,
                contents: userPrompt,
                config: {
                    systemInstruction: SYSTEM_PROMPT,
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: 'OBJECT',
                        properties: {
                            mapContent: {
                                type: 'STRING',
                                description: 'The complete markdown content for MAP.md'
                            },
                            agentsContent: {
                                type: 'STRING',
                                description: 'The complete markdown content for Agents.md'
                            }
                        },
                        required: ['mapContent', 'agentsContent']
                    }
                }
            });
            const responseText = response.text;
            if (!responseText) {
                throw new Error('Received an empty response from the AI model.');
            }
            // Since we requested application/json with responseSchema, responseText is guaranteed to be a JSON string.
            const result = JSON.parse(responseText);
            return result;
        }
        catch (error) {
            throw new Error(`Failed to generate documentation via Gemini API: ${error.message}`);
        }
    }
}
