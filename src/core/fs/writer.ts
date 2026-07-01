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
 * Checks if the sophiAgents folder and its core documentation files (architecture.md and coding-patterns.md) exist.
 * Returns true only if the folder and BOTH files are present under context/.
 */
export async function checkConfigExist(basePath: string): Promise<boolean> {
  const configDir = getConfigDirectory(basePath);
  const contextDir = path.join(configDir, 'context');
  const architecturePath = path.join(contextDir, 'architecture.md');
  const patternsPath = path.join(contextDir, 'coding-patterns.md');

  try {
    await fs.access(configDir);
    await fs.access(contextDir);
    await fs.access(architecturePath);
    await fs.access(patternsPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates the sophiAgents directory, its subdirectories (context, mvps, tasks, skills, memory),
 * and saves the generated architecture.md and coding-patterns.md files under context/.
 */
export async function saveDocumentation(
  basePath: string,
  architectureContent: string,
  patternsContent: string
): Promise<void> {
  const configDir = getConfigDirectory(basePath);

  // Define subdirectories to initialize
  const subDirs = ['context', 'mvps', 'tasks', 'skills', 'memory'];

  // Ensure all directories exist
  for (const dir of subDirs) {
    await fs.mkdir(path.join(configDir, dir), { recursive: true });
  }

  const architecturePath = path.join(configDir, 'context', 'architecture.md');
  const patternsPath = path.join(configDir, 'context', 'coding-patterns.md');

  // Write core documentation files
  await fs.writeFile(architecturePath, architectureContent, 'utf-8');
  await fs.writeFile(patternsPath, patternsContent, 'utf-8');
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
      `> please refer to [sophiAgents/context/architecture.md](sophiAgents/context/architecture.md) and [sophiAgents/context/coding-patterns.md](sophiAgents/context/coding-patterns.md).\n\n` +
      `---\n\n` +
      existingContent;

    await fs.writeFile(filePath, redirectedContent, 'utf-8');
  } catch {
    // File does not exist, write the new content directly
    await fs.writeFile(filePath, newContent, 'utf-8');
  }
}

/**
 * Saves the bridged files in the project root pointing external agents to the sophiAgents directory.
 */
export async function writeAgentBridgeFile(
  basePath: string,
  toolType: 'claude' | 'cursor' | 'opencode' | 'codex'
): Promise<void> {
  let fileName = '';
  let content = '';

  if (toolType === 'claude') {
    fileName = 'CLAUDE.md';
    content =
      `# Claude Code Redirection\n\n` +
      `This project uses SophiaCode for development guidelines. Please read:\n` +
      `- [sophiAgents/context/architecture.md](sophiAgents/context/architecture.md)\n` +
      `- [sophiAgents/context/coding-patterns.md](sophiAgents/context/coding-patterns.md)\n`;
  } else if (toolType === 'cursor') {
    fileName = '.cursorrules';
    content =
      `This project uses SophiaCode for development guidelines. Please read:\n` +
      `- sophiAgents/context/architecture.md\n` +
      `- sophiAgents/context/coding-patterns.md\n`;

    try {
      const rulesDir = path.join(basePath, '.cursor', 'rules');
      await fs.mkdir(rulesDir, { recursive: true });

      const contextRuleContent =
        `---\n` +
        `description: Always read architectural guidelines and workspace context in sophiAgents\n` +
        `globs: *\n` +
        `alwaysApply: true\n` +
        `---\n` +
        `This project uses **SophiaCode** for architecture mapping and context orchestration.\n` +
        `For the complete directory structure, purpose, stack details, and overall goals, please read the architecture definition file:\n` +
        `- [sophiAgents/context/architecture.md](sophiAgents/context/architecture.md)\n`;

      const patternsRuleContent =
        `---\n` +
        `description: Always adhere to the coding standards, patterns, and style rules defined in sophiAgents\n` +
        `globs: **/*.ts, **/*.js, **/*.tsx, **/*.jsx, **/*.py, **/*.go, **/*.rs\n` +
        `alwaysApply: true\n` +
        `---\n` +
        `When creating new components, refactoring code, or fixing bugs, follow the coding standards and styling patterns defined in:\n` +
        `- [sophiAgents/context/coding-patterns.md](sophiAgents/context/coding-patterns.md)\n`;

      await fs.writeFile(
        path.join(rulesDir, 'sophiagents-context.mdc'),
        contextRuleContent,
        'utf-8'
      );
      await fs.writeFile(
        path.join(rulesDir, 'sophiagents-patterns.mdc'),
        patternsRuleContent,
        'utf-8'
      );
    } catch {
      // Ignore directory creation or write errors
    }
  } else if (toolType === 'opencode') {
    fileName = 'AGENTS.md';
    content =
      `# OpenCode Redirection\n\n` +
      `This project uses SophiaCode for development guidelines. Please read:\n` +
      `- sophiAgents/context/architecture.md\n` +
      `- sophiAgents/context/coding-patterns.md\n`;
  } else if (toolType === 'codex') {
    fileName = 'llms.txt';
    content =
      `# llms.txt Redirection\n\n` +
      `This project uses SophiaCode for development guidelines. Please read:\n` +
      `- sophiAgents/context/architecture.md\n` +
      `- sophiAgents/context/coding-patterns.md\n`;
  }

  const filePath = path.join(basePath, fileName);
  await writeOrRedirectFile(filePath, fileName, content);
}

/**
 * Reads the architecture.md file from the sophiAgents/context/ directory.
 */
export async function readMapFile(basePath: string): Promise<string> {
  const architecturePath = path.join(getConfigDirectory(basePath), 'context', 'architecture.md');
  return await fs.readFile(architecturePath, 'utf-8');
}

/**
 * Overwrites the architecture.md file (useful for context updates).
 */
export async function writeMapFile(basePath: string, content: string): Promise<void> {
  const architecturePath = path.join(getConfigDirectory(basePath), 'context', 'architecture.md');
  await fs.writeFile(architecturePath, content, 'utf-8');
}

/**
 * Saves the project configuration (config.json) under the sophiAgents folder.
 * Also ensures it is added to .gitignore.
 */
export async function saveProjectConfig(basePath: string, config: any): Promise<void> {
  const configDir = getConfigDirectory(basePath);
  const configPath = path.join(configDir, 'config.json');
  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
  await ensureGitignoreIgnored(basePath);
}

/**
 * Reads the project configuration (config.json) from the sophiAgents folder.
 */
export async function readProjectConfig(basePath: string): Promise<any> {
  const configPath = path.join(getConfigDirectory(basePath), 'config.json');
  const content = await fs.readFile(configPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Saves an MVP specification JSON under sophiAgents/mvps/.
 */
export async function saveMvpConfig(basePath: string, key: string, mvpData: any): Promise<void> {
  const mvpsDir = path.join(getConfigDirectory(basePath), 'mvps');
  await fs.mkdir(mvpsDir, { recursive: true });
  await fs.writeFile(path.join(mvpsDir, `${key}.json`), JSON.stringify(mvpData, null, 2), 'utf-8');
}

/**
 * Reads an MVP specification JSON from sophiAgents/mvps/.
 */
export async function readMvpConfig(basePath: string, key: string): Promise<any> {
  const filePath = path.join(getConfigDirectory(basePath), 'mvps', `${key}.json`);
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Lists all MVP keys (filenames without .json) under sophiAgents/mvps/.
 */
export async function listMvpConfigs(basePath: string): Promise<string[]> {
  const mvpsDir = path.join(getConfigDirectory(basePath), 'mvps');
  try {
    const files = await fs.readdir(mvpsDir);
    return files.filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', ''));
  } catch {
    return [];
  }
}

/**
 * Saves a task breakdown structure: creates a directory and writes both plan.md and subtasks.json.
 */
export async function saveTask(
  basePath: string,
  taskIndex: string,
  taskSlug: string,
  planContent: string,
  subtasks: any[],
  metadata?: {
    title: string;
    estimatedTime?: string;
    difficulty?: string;
    owner?: string;
  }
): Promise<void> {
  const taskDir = path.join(getConfigDirectory(basePath), 'tasks', `task-${taskIndex}-${taskSlug}`);
  await fs.mkdir(taskDir, { recursive: true });
  await fs.writeFile(path.join(taskDir, 'plan.md'), planContent, 'utf-8');
  await fs.writeFile(
    path.join(taskDir, 'subtasks.json'),
    JSON.stringify(subtasks, null, 2),
    'utf-8'
  );
  if (metadata) {
    await fs.writeFile(path.join(taskDir, 'task.json'), JSON.stringify(metadata, null, 2), 'utf-8');
  }
}

/**
 * Lists all task directory names (task-*) under sophiAgents/tasks/.
 */
export async function listTasks(basePath: string): Promise<string[]> {
  const tasksDir = path.join(getConfigDirectory(basePath), 'tasks');
  try {
    const entries = await fs.readdir(tasksDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() && entry.name.startsWith('task-'))
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
}

/**
 * Reads the subtasks checklist JSON for a specific task.
 */
export async function readTaskSubtasks(basePath: string, taskDirName: string): Promise<any[]> {
  const filePath = path.join(getConfigDirectory(basePath), 'tasks', taskDirName, 'subtasks.json');
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Writes/overwrites the subtasks checklist JSON for a specific task.
 */
export async function writeTaskSubtasks(
  basePath: string,
  taskDirName: string,
  subtasks: any[]
): Promise<void> {
  const filePath = path.join(getConfigDirectory(basePath), 'tasks', taskDirName, 'subtasks.json');
  await fs.writeFile(filePath, JSON.stringify(subtasks, null, 2), 'utf-8');
}

/**
 * Saves local MCP configurations in sophiAgents/skills/mcp-config.json.
 */
export async function saveSkillConfig(basePath: string, mcpConfig: any): Promise<void> {
  const skillsDir = path.join(getConfigDirectory(basePath), 'skills');
  await fs.mkdir(skillsDir, { recursive: true });
  await fs.writeFile(
    path.join(skillsDir, 'mcp-config.json'),
    JSON.stringify(mcpConfig, null, 2),
    'utf-8'
  );
}

/**
 * Ensures that the project's local config.json is excluded from version control by appending it to .gitignore.
 */
export async function ensureGitignoreIgnored(basePath: string): Promise<void> {
  const gitignorePath = path.join(basePath, '.gitignore');
  const ignoreLine = 'sophiAgents/config.json';

  try {
    let content = '';
    try {
      content = await fs.readFile(gitignorePath, 'utf-8');
    } catch {
      // If .gitignore does not exist, we will create a new one
    }

    const lines = content.split(/\r?\n/).map((line) => line.trim());

    // Check if sophiAgents/config.json or sophiAgents/ or sophiAgents is already ignored
    const isIgnored = lines.some(
      (line) => line === ignoreLine || line === 'sophiAgents/' || line === 'sophiAgents'
    );

    if (!isIgnored) {
      const newLineSuffix = content.endsWith('\n') || content.trim().length === 0 ? '' : '\n';
      await fs.appendFile(
        gitignorePath,
        `${newLineSuffix}\n# Local agent configuration (contains preferences and/or secrets)\n${ignoreLine}\n`,
        'utf-8'
      );
    }
  } catch {
    // Fail silently if unable to write .gitignore
  }
}
