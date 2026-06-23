import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export interface GlobalConfig {
  geminiApiKey?: string;
  openaiApiKey?: string;
  language?: 'en' | 'pt';
}

export type AIProvider = 'gemini' | 'openai' | 'ollama';

/**
 * Returns the directory path for global configurations.
 */
function getGlobalConfigDir(): string {
  return path.join(os.homedir(), '.sophiacode');
}

/**
 * Returns the file path for the global config.json.
 */
function getGlobalConfigPath(): string {
  return path.join(getGlobalConfigDir(), 'config.json');
}

/**
 * Reads the global config from the user's home directory.
 * Returns an empty object if the file doesn't exist.
 */
export async function readGlobalConfig(): Promise<GlobalConfig> {
  const configPath = getGlobalConfigPath();
  try {
    const data = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(data) as GlobalConfig;
  } catch {
    // If file doesn't exist or is invalid JSON, return empty config
    return {};
  }
}

/**
 * Saves the global config in the user's home directory.
 */
export async function saveGlobalConfig(config: GlobalConfig): Promise<void> {
  const configDir = getGlobalConfigDir();
  const configPath = getGlobalConfigPath();
  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Retrieves the API key for a provider from either environment variables OR global configuration.
 */
export async function getApiKey(provider: AIProvider): Promise<string | undefined> {
  // 1st Priority: Environment variables
  const envKey = `${provider.toUpperCase()}_API_KEY`;
  if (process.env[envKey]) {
    return process.env[envKey];
  }

  // 2nd Priority: Global config file
  const config = await readGlobalConfig();
  switch (provider) {
    case 'gemini':
      return config.geminiApiKey;
    case 'openai':
      return config.openaiApiKey;
    default:
      return undefined;
  }
}

/**
 * Saves the API key for a specific provider globally.
 */
export async function saveApiKey(provider: AIProvider, apiKey: string): Promise<void> {
  const config = await readGlobalConfig();
  switch (provider) {
    case 'gemini':
      config.geminiApiKey = apiKey;
      break;
    case 'openai':
      config.openaiApiKey = apiKey;
      break;
  }
  await saveGlobalConfig(config);
}
