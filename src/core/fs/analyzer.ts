import fs from 'fs/promises';
import path from 'path';

export interface FileAnalysis {
  filePath: string;
  sizeBytes: number;
  imports: string[];
  description: string;
}

export interface ProjectAnalysis {
  techStack: string[];
  files: FileAnalysis[];
}

// Known technologies mapping to help the local static analyzer categorize the project
const TECH_KEYWORDS: Record<string, string> = {
  puppeteer: 'Browser Automation / Web Scraping',
  playwright: 'Browser Automation / Testing',
  baileys: 'WhatsApp Integration',
  '@whiskeysockets/baileys': 'WhatsApp Integration',
  'node-telegram-bot-api': 'Telegram Bot API',
  telegraf: 'Telegram Bot API',
  express: 'HTTP REST API Server',
  fastify: 'HTTP REST API Server',
  dotenv: 'Environment Configuration',
  sqlite3: 'SQLite Database',
  'better-sqlite3': 'SQLite Database',
  'drizzle-orm': 'Drizzle Database ORM',
  prisma: 'Prisma Database ORM',
  mongoose: 'MongoDB ODM',
  typescript: 'TypeScript Compilation',
  vitest: 'Vitest Unit Testing',
  jest: 'Jest Testing Framework',
  '@google/genai': 'Google Gemini AI SDK',
  openai: 'OpenAI SDK',
};

/**
 * Extracts dependency metadata from package.json.
 */
async function analyzePackageJson(basePath: string): Promise<string[]> {
  try {
    const pkgPath = path.join(basePath, 'package.json');
    const content = await fs.readFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(content);

    const deps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    };

    const detectedTech: string[] = [];
    for (const key of Object.keys(deps)) {
      if (TECH_KEYWORDS[key]) {
        detectedTech.push(`${key} (${TECH_KEYWORDS[key]})`);
      }
    }
    return detectedTech;
  } catch {
    return [];
  }
}

/**
 * Reads a file's header to extract external imports and top-level comments.
 */
async function analyzeFile(basePath: string, relativePath: string): Promise<FileAnalysis> {
  const absolutePath = path.join(basePath, relativePath);
  const stats = await fs.stat(absolutePath);

  let imports: string[] = [];
  let description = '';

  try {
    // Read the first 2KB of the file (sufficient for typical headers, comments, and imports)
    const fd = await fs.open(absolutePath, 'r');
    const { buffer } = await fd.read(Buffer.alloc(2048), 0, 2048, 0);
    await fd.close();

    const headerText = buffer.toString('utf-8');

    // Extract imports using regex
    const importRegex =
      /(?:import\s+(?:[\w*\s{},]*\s+from\s+)?['"]([^'"]+)['"])|(?:require\(['"]([^'"]+)['"]\))/g;
    let match;
    const foundImports = new Set<string>();
    while ((match = importRegex.exec(headerText)) !== null) {
      const imp = match[1] || match[2];
      if (imp && !imp.startsWith('.')) {
        // Exclude relative local imports
        foundImports.add(imp);
      }
    }
    imports = Array.from(foundImports);

    // Extract top-level JSDoc/block comments at the start of the file
    const commentRegex = /^\s*\/\*\*([\s\S]*?)\*\//;
    const commentMatch = commentRegex.exec(headerText);
    if (commentMatch && commentMatch[1]) {
      description = commentMatch[1]
        .replace(/\r?\n/g, ' ')
        .replace(/\*\s*/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (description.length > 150) {
        description = description.slice(0, 147) + '...';
      }
    }
  } catch {
    // Fail silently for binary files, folders, or unreadable files
  }

  return {
    filePath: relativePath,
    sizeBytes: stats.size,
    imports,
    description,
  };
}

/**
 * Analyzes the workspace locally (technologies, files, and annotations) without calling any LLM.
 */
export async function analyzeWorkspaceLocally(
  basePath: string,
  filesList: string[]
): Promise<ProjectAnalysis> {
  const techStack = await analyzePackageJson(basePath);

  const files: FileAnalysis[] = [];
  // Limit scanning to code, configurations, and markdown documentation files
  const codeFiles = filesList.filter(
    (f) =>
      f.endsWith('.ts') ||
      f.endsWith('.js') ||
      f.endsWith('.json') ||
      f.endsWith('.py') ||
      f.endsWith('.md')
  );

  // Prioritize source folders to analyze the most important code first, then cap at 150
  const prioritisedFolders = ['src/', 'app/', 'lib/', 'core/', 'server/'];
  const sortedCodeFiles = [...codeFiles].sort((a, b) => {
    const aIsPrioritized = prioritisedFolders.some((folder) => a.startsWith(folder));
    const bIsPrioritized = prioritisedFolders.some((folder) => b.startsWith(folder));
    if (aIsPrioritized && !bIsPrioritized) return -1;
    if (!aIsPrioritized && bIsPrioritized) return 1;
    return a.localeCompare(b);
  });

  const limitedCodeFiles = sortedCodeFiles.slice(0, 150);

  for (const file of limitedCodeFiles) {
    try {
      const analysis = await analyzeFile(basePath, file);
      files.push(analysis);
    } catch {
      // Skip the file if it fails to scan
    }
  }

  return {
    techStack,
    files,
  };
}

/**
 * Helper to convert the project analysis report into a highly compact text structure.
 */
export function formatAnalysisReport(analysis: ProjectAnalysis): string {
  let result = '=== LOCAL ARCHITECTURAL REPORT ===\n';
  result += `Tech Stack (from package.json): ${analysis.techStack.join(', ') || 'None detected'}\n\n`;
  result += 'Mapped Code Files & Dependencies:\n';

  for (const file of analysis.files) {
    const sizeKB = (file.sizeBytes / 1024).toFixed(1);
    result += `- ${file.filePath} (${sizeKB} KB)\n`;
    if (file.imports.length > 0) {
      result += `  Imports: ${file.imports.join(', ')}\n`;
    }
    if (file.description) {
      result += `  Desc: ${file.description}\n`;
    }
  }
  return result;
}
