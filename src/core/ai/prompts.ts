/**
 * System prompt instructing the AI to perform a codebase analysis and identify gaps.
 */
export const DISCOVERY_SYSTEM_PROMPT = `
You are the SophiaCode AI Discovery Agent. Your job is to analyze the local repository structure and dependencies report, determine the purpose of the application, and find architectural or requirements gaps.

Generate exactly 3 key targeted questions to ask the developer in Portuguese. These questions must focus on closing details about database usage, APIs, missing integrations, or execution environments.

You MUST respond strictly in JSON matching this schema:
{
  "detectedPurpose": "A guessed brief summary of what this application is about (write in Portuguese).",
  "questions": [
    {
      "id": "q1",
      "question": "The first targeted question in Portuguese."
    },
    {
      "id": "q2",
      "question": "The second targeted question in Portuguese."
    },
    {
      "id": "q3",
      "question": "The third targeted question in Portuguese."
    }
  ]
}
`;

/**
 * Builds the user discovery prompt template with the local static analysis report.
 */
export function buildDiscoveryPrompt(localAnalysisReport: string): string {
  return `
Analyze this local static codebase report and identify the purpose and architecture gaps:

\`\`\`plaintext
${localAnalysisReport}
\`\`\`
`;
}

/**
 * JSON Schema for discovery response.
 */
export const DISCOVERY_SCHEMA = {
  type: 'OBJECT',
  properties: {
    detectedPurpose: {
      type: 'STRING',
      description: 'Guessed description of the application in Portuguese.',
    },
    questions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING' },
          question: { type: 'STRING' },
        },
        required: ['id', 'question'],
      },
    },
  },
  required: ['detectedPurpose', 'questions'],
};

/**
 * System prompt instructing the AI to generate the final architecture context files.
 */
export const SYSTEM_PROMPT = `
You are the SophiaCode AI Workspace Architect. Your task is to analyze the project's requirements, code, and developer answers to generate configuration files for coding agents.

CRITICAL REQUIREMENT:
You MUST generate the markdown content for architecture.md and coding-patterns.md strictly in English. Translate any user answers or descriptions if they are in Portuguese.

You must respond strictly in JSON matching this schema:
{
  "architectureContent": "Markdown content for architecture.md (saved in sophiAgents/context/architecture.md)",
  "patternsContent": "Markdown content for coding-patterns.md (saved in sophiAgents/context/coding-patterns.md)",
  "claudeContent": "Markdown content for CLAUDE.md (saved in project root)",
  "rootAgentsContent": "Markdown content for AGENTS.md (saved in project root)"
}

Instructions for each file:

1. architectureContent (sophiAgents/context/architecture.md):
   - Detailed project map of files and directory tree.
   - Purpose, stack, objective, and flow details.

2. patternsContent (sophiAgents/context/coding-patterns.md):
   - Coding guidelines, rules, state management rules, database rules, testing rules.
   - Ensure the instructions prevent the agent from breaking boundaries.

3. claudeContent (CLAUDE.md in the root):
   - Short bridge file directing Claude Code to read the sophiAgents context.
   - Must include standard project commands (e.g. Build: npm run build, Test: npm run test).

4. rootAgentsContent (AGENTS.md in the root):
   - Similar bridge file directing OpenCode and other agents to read the sophiAgents context.
`;

/**
 * Builds the user prompt for generating final context files.
 */
export function buildContextPrompt(
  detectedPurpose: string,
  answers: { question: string; answer: string }[],
  localAnalysisReport: string
): string {
  let answersBlock = '';
  for (const item of answers) {
    answersBlock += `- **Pergunta**: ${item.question}\n  **Resposta**: ${item.answer}\n`;
  }

  return `
Please generate the final context documents. Here is the context gathered:

=== MAIN PURPOSE ===
"${detectedPurpose}"

=== ALIGNMENT QUESTIONS & ANSWERS ===
${answersBlock}

=== LOCAL CODEBASE REPORT ===
\`\`\`plaintext
${localAnalysisReport}
\`\`\`
`;
}

/**
 * JSON Schema for final context response.
 */
export const FINAL_CONTEXT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    architectureContent: {
      type: 'STRING',
      description: 'Markdown content for architecture.md',
    },
    patternsContent: {
      type: 'STRING',
      description: 'Markdown content for coding-patterns.md',
    },
    claudeContent: {
      type: 'STRING',
      description: 'Markdown content for CLAUDE.md',
    },
    rootAgentsContent: {
      type: 'STRING',
      description: 'Markdown content for AGENTS.md',
    },
  },
  required: ['architectureContent', 'patternsContent', 'claudeContent', 'rootAgentsContent'],
};

/**
 * JSON Schema for MVP generation.
 */
export const MVP_SCHEMA = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING' },
    key: { type: 'STRING' },
    description: { type: 'STRING' },
    features: {
      type: 'ARRAY',
      items: { type: 'STRING' },
    },
    requirements: { type: 'STRING' },
    status: { type: 'STRING' },
  },
  required: ['name', 'key', 'description', 'features', 'requirements', 'status'],
};

/**
 * System Prompt for MVP generator.
 */
export const MVP_SYSTEM_PROMPT = `
You are the SophiaCode MVP Architect. Your task is to take the user inputs and design a detailed MVP (Minimum Viable Product) specification JSON document.
Ensure the features are concrete and feasible based on the codebase stack. Translate any Portuguese input into English for requirements.
`;

/**
 * Builds user prompt for MVP generation.
 */
export function buildMvpPrompt(
  name: string,
  objective: string,
  features: string[],
  constraints: string,
  architectureMap: string
): string {
  return `
Create an MVP specification JSON for:
- **Name**: "${name}"
- **Objective**: "${objective}"
- **Features proposed**: [${features.map((f) => `"${f}"`).join(', ')}]
- **Constraints/Technologies**: "${constraints}"

Here is the current repository context:
\`\`\`markdown
${architectureMap}
\`\`\`
`;
}

/**
 * JSON Schema for Task list breakdown.
 */
export const TASK_SCHEMA = {
  type: 'OBJECT',
  properties: {
    tasks: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          index: { type: 'STRING', description: 'Sequence number like 01, 02' },
          slug: { type: 'STRING', description: 'URL-friendly slug like setup-webhooks' },
          title: { type: 'STRING', description: 'Short task description' },
          estimatedTime: {
            type: 'STRING',
            description: 'Estimated implementation time (e.g. 4h, 2d, 1d 4h)',
          },
          difficulty: { type: 'STRING', description: 'Difficulty level (e.g. Easy, Medium, Hard)' },
          planContent: { type: 'STRING', description: 'Complete detailed markdown plan' },
          subtasks: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                id: { type: 'STRING', description: 'unique camelCase id like installDeps' },
                title: { type: 'STRING', description: 'Actionable step title' },
                done: { type: 'BOOLEAN' },
              },
              required: ['id', 'title', 'done'],
            },
          },
        },
        required: [
          'index',
          'slug',
          'title',
          'estimatedTime',
          'difficulty',
          'planContent',
          'subtasks',
        ],
      },
    },
  },
  required: ['tasks'],
};

/**
 * System Prompt for Task planner.
 */
export const TASK_SYSTEM_PROMPT = `
You are the SophiaCode Task Planner. Your job is to take an MVP specification and break it down into sequential tasks.
Each task must contain:
1. An index (e.g. "01")
2. A slug (e.g. "setup-db")
3. A title
4. An estimated implementation time (estimatedTime, e.g. "4h", "2d", "1d 4h")
5. A difficulty level (difficulty, e.g. "Easy", "Medium", "Hard")
6. A highly detailed step-by-step markdown plan (planContent) in English.
7. A list of concrete mechanical subtasks (checklist items) to be completed.

Ensure the tasks are in order of dependencies (e.g. database schema/libraries setup first, logic coding second, tests/polishing third).
`;

/**
 * Builds user prompt for Task planner.
 */
export function buildTaskPrompt(
  mvpJson: string,
  architectureMap: string,
  codingPatterns: string
): string {
  return `
Break down this MVP specification into actionable tasks:

=== MVP SPECIFICATION ===
${mvpJson}

=== ARCHITECTURE MAP ===
${architectureMap}

=== CODING PATTERNS ===
${codingPatterns}
`;
}

/**
 * System prompt for SophiaCode Chat Assistant.
 */
export const CHAT_SYSTEM_PROMPT = `
You are the SophiaCode AI Chat Assistant, an expert workspace architect and pair programmer.
Your goal is to help the user interact with SophiaCode in a friendly natural-language interface and execute actions based on their requests.

You must respond strictly in JSON matching the response schema.

Actions you can trigger:
1. CREATE_MVP: The user wants to specify or create an MVP/feature (e.g. "crie um mvp de chat", "cria o mvp tal"). You MUST fill the 'mvpData' field. Translate any user descriptions or titles to English if they are in Portuguese.
2. PLAN_MVP_TASKS: The user wants to plan/break down an MVP into tasks (e.g. "use o mvp tal", "crie as tarefas de checkout", "planeje o mvp login"). You MUST specify the MVP key in 'planMvpKey'.
3. CREATE_SKILL: The user wants to setup a skill (e.g. "crie uma skill de busca", "crie um script de automação"). You MUST fill 'skillData'.
4. CHAT_RESPONSE: Default action for questions, chit-chat, explaining how things work, or asking for clarification before acting.

Use the provided conversation history and list of existing MVPs/tasks to contextualize the user request (especially references to "o último prompt", "crie as tarefas dele", "use o mvp anterior").

Respond in the language of the user (e.g., Portuguese). Keep explanations friendly and brief.
`;

/**
 * JSON Schema for Chat response.
 */
export const CHAT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    action: {
      type: 'STRING',
      description: 'One of CREATE_MVP, PLAN_MVP_TASKS, CREATE_SKILL, CHAT_RESPONSE',
    },
    message: {
      type: 'STRING',
      description:
        "The assistant message to print to the user (written in user's language, markdown allowed)",
    },
    mvpData: {
      type: 'OBJECT',
      properties: {
        name: { type: 'STRING', description: 'Descriptive name of the MVP' },
        key: {
          type: 'STRING',
          description: 'Unique slug containing lowercase letters, numbers, and hyphens',
        },
        description: { type: 'STRING', description: 'Main objective of this MVP' },
        features: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description: 'Key features list',
        },
        requirements: {
          type: 'STRING',
          description: 'Technical requirements or constraints (in English)',
        },
        status: { type: 'STRING', description: 'Initial status (e.g., draft)' },
      },
      required: ['name', 'key', 'description', 'features', 'requirements', 'status'],
    },
    planMvpKey: {
      type: 'STRING',
      description: 'Key of the MVP to plan',
    },
    skillData: {
      type: 'OBJECT',
      properties: {
        type: { type: 'STRING', description: 'sqlite, filesystem, brave-search, or custom-script' },
        scriptContent: { type: 'STRING', description: 'Script content for custom-script' },
      },
      required: ['type'],
    },
  },
  required: ['action', 'message'],
};

/**
 * Builds user prompt for Chat Mode.
 */
export function buildChatPrompt(
  conversationHistory: string,
  existingMvpKeys: string[],
  existingTasks: string[]
): string {
  return `
Here are the existing resources in the project context:
- Existing MVPs keys: [${existingMvpKeys.map((k) => `"${k}"`).join(', ')}]
- Existing Tasks: [${existingTasks.map((t) => `"${t}"`).join(', ')}]

=== CONVERSATION HISTORY ===
${conversationHistory}

Determine the action and write a JSON response:
`;
}
