import fs from 'fs/promises';
import path from 'path';

// Define the name of the folder where the agent configurations will live
const CONFIG_FOLDER_NAME = 'sophiAgents';

/**
 * Helper to get the absolute path to the sophiAgents configuration directory.
 */
function getConfigDirectory(basePath: string): string {
  return path.join(basePath, CONFIG_FOLDER_NAME);
}

/**
 * Checks if the sophiAgents folder and its core documentation files (MAP.md and Agents.md) exist.
 * Returns true only if the folder and BOTH files are present.
 */
export async function checkConfigExist(basePath: string): Promise<boolean> {
  const configDir = getConfigDirectory(basePath);
  const mapPath = path.join(configDir, 'MAP.md');
  const agentsPath = path.join(configDir, 'Agents.md');

  try {
    // Check if the directory and files exist using fs.access
    await fs.access(configDir);
    await fs.access(mapPath);
    await fs.access(agentsPath);
    return true;
  } catch {
    // If any access check fails (throws an error), they do not exist
    return false;
  }
}

/**
 * Creates the sophiAgents directory (if not exists) and saves the generated
 * MAP.md and Agents.md files.
 */
export async function saveDocumentation(
  basePath: string,
  mapContent: string,
  agentsContent: string
): Promise<void> {
  const configDir = getConfigDirectory(basePath);
  const mapPath = path.join(configDir, 'MAP.md');
  const agentsPath = path.join(configDir, 'Agents.md');

  // Ensure the directory exists (recursive: true makes sure it won't throw if it already exists)
  await fs.mkdir(configDir, { recursive: true });

  // Write files with UTF-8 encoding
  await fs.writeFile(mapPath, mapContent, 'utf-8');
  await fs.writeFile(agentsPath, agentsContent, 'utf-8');
}

/**
 * Writes or modifies agent redirection files (CLAUDE.md / AGENTS.md) in the project root.
 * If the file exists, it prepends the redirection instructions to preserve existing configurations.
 */
async function writeOrRedirectFile(
  filePath: string,
  fileName: string,
  newContent: string
): Promise<void> {
  try {
    // Check if file already exists
    await fs.access(filePath);
    
    // Read current content
    const existingContent = await fs.readFile(filePath, 'utf-8');
    
    // If it already redirects to sophiAgents, don't write it again to avoid duplication
    if (existingContent.includes('sophiAgents')) {
      return;
    }

    // Prepend the redirection notice at the very top of the existing file
    const redirectedContent = 
      `# SophiaCode Redirection\n\n` +
      `> [!IMPORTANT]\n` +
      `> This project uses **SophiaCode** for architecture mapping and rules.\n` +
      `> For the complete objective, file map, out-of-scope rules, and active feature specs,\n` +
      `> please refer to [sophiAgents/MAP.md](sophiAgents/MAP.md) and [sophiAgents/Agents.md](sophiAgents/Agents.md).\n\n` +
      `---\n\n` +
      existingContent;

    await fs.writeFile(filePath, redirectedContent, 'utf-8');
  } catch {
    // File does not exist, write the new content directly
    await fs.writeFile(filePath, newContent, 'utf-8');
  }
}

/**
 * Saves the bridged files in the project root pointing external agents (Claude, OpenCode) to the sophiAgents directory.
 */
export async function saveRootBridgedFiles(
  basePath: string,
  claudeContent: string,
  rootAgentsContent: string,
  integrations: ('claude' | 'opencode')[] = []
): Promise<void> {
  if (integrations.includes('claude')) {
    const claudePath = path.join(basePath, 'CLAUDE.md');
    await writeOrRedirectFile(claudePath, 'CLAUDE.md', claudeContent);
  }
  if (integrations.includes('opencode')) {
    const agentsPath = path.join(basePath, 'AGENTS.md');
    await writeOrRedirectFile(agentsPath, 'AGENTS.md', rootAgentsContent);
  }
}

/**
 * Reads the MAP.md file from the sophiAgents directory.
 */
export async function readMapFile(basePath: string): Promise<string> {
  const mapPath = path.join(getConfigDirectory(basePath), 'MAP.md');
  return await fs.readFile(mapPath, 'utf-8');
}

/**
 * Overwrites the MAP.md file (useful for the /edit command).
 */
export async function writeMapFile(basePath: string, content: string): Promise<void> {
  const mapPath = path.join(getConfigDirectory(basePath), 'MAP.md');
  await fs.writeFile(mapPath, content, 'utf-8');
}

/**
 * Saves the project configuration (config.json) under the sophiAgents folder.
 */
export async function saveProjectConfig(basePath: string, config: any): Promise<void> {
  const configDir = getConfigDirectory(basePath);
  const configPath = path.join(configDir, 'config.json');
  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Reads the project configuration (config.json) from the sophiAgents folder.
 */
export async function readProjectConfig(basePath: string): Promise<any> {
  const configPath = path.join(getConfigDirectory(basePath), 'config.json');
  const content = await fs.readFile(configPath, 'utf-8');
  return JSON.parse(content);
}
