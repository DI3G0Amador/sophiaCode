import { createJiraIssue, loadJiraCredentials } from '../src/core/mcp/jiraServer.js';
import { readProjectConfig } from '../src/core/fs/writer.js';

const tasksToExport = [
  {
    index: '01',
    title: 'Create the Jira MCP Server',
    description: 'Implement stdio JSON-RPC MCP server in src/core/mcp/jiraServer.ts'
  },
  {
    index: '02',
    title: 'Register the jira-mcp command and configure i18n keys',
    description: 'Add commands to commands.ts and translation keys to i18n.ts'
  },
  {
    index: '03',
    title: 'Extract task planner and skill helpers, and add Jira integration to task.ts and dev.ts',
    description: 'Allow creating Jira issues from task backlog and updating issue transitions in dev mode'
  },
  {
    index: '04',
    title: 'Implement Chat Mode UI & LLM Orchestrator in src/commands/chat.ts',
    description: 'Create natural language prompt loop with tool action execution'
  },
  {
    index: '05',
    title: 'Create scratch script push-plan-to-jira.ts to export this plan',
    description: 'This script runs and exports all tasks of the plan to the user\'s Jira'
  },
  {
    index: '06',
    title: 'Testing and verification',
    description: 'Run Vitest tests and typechecks'
  }
];

async function run() {
  const basePath = process.cwd();
  console.log('Carregando credenciais do Jira... / Loading Jira credentials...');
  try {
    const creds = await loadJiraCredentials(basePath);
    console.log(`Credenciais detectadas: URL=${creds.url}, Email=${creds.email}`);
    
    let projectKey = process.env.JIRA_PROJECT_KEY || 'PROJ';
    try {
      const projectConfig = await readProjectConfig(basePath);
      if (projectConfig.jira && projectConfig.jira.projectKey) {
        projectKey = projectConfig.jira.projectKey;
      }
    } catch {}
    
    console.log(`Usando Project Key: ${projectKey}`);
    
    for (const t of tasksToExport) {
      console.log(`Criando tarefa ${t.index}: ${t.title}...`);
      const res = await createJiraIssue(
        basePath,
        projectKey,
        `[SophiaCode Plan] Task ${t.index}: ${t.title}`,
        t.description
      );
      console.log(`Successfully created: ${res.key}`);
    }
    console.log('Todos os tickets foram criados no Jira com sucesso!');
  } catch (err) {
    console.error('Falha ao exportar tarefas para o Jira:', err);
  }
}

run();
