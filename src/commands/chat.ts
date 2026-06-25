import * as p from '@clack/prompts';
import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';
import { t } from '../core/i18n.js';
import {
  checkConfigExist,
  readProjectConfig,
  saveMvpConfig,
  listMvpConfigs,
} from '../core/fs/writer.js';
import { listTasks } from '../core/fs/writer.js';
import { createAIService } from '../core/ai/providers.js';
import { getApiKey } from '../core/fs/global-config.js';
import {
  CHAT_SYSTEM_PROMPT,
  CHAT_SCHEMA,
  buildChatPrompt,
} from '../core/ai/prompts.js';

/**
 * Custom multiline text prompt that supports line continuation using backslash '\'.
 */
async function askMultiline(message: string, placeholder = ''): Promise<string | symbol> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '│  ',
    });

    console.log(`\n◇  ${message}`);
    if (placeholder) {
      console.log(`│  \x1b[90m${placeholder}\x1b[0m`);
    }
    rl.prompt();

    const lines: string[] = [];

    const onLine = (line: string) => {
      if (line.endsWith('\\')) {
        lines.push(line.slice(0, -1));
        rl.setPrompt('│  ');
        rl.prompt();
      } else {
        lines.push(line);
        rl.close();
      }
    };

    rl.on('line', onLine);

    rl.on('close', () => {
      const fullText = lines.join('\n').trim();
      if (!fullText) {
        resolve(Symbol('cancel'));
      } else {
        resolve(fullText);
      }
    });

    rl.on('SIGINT', () => {
      rl.close();
      resolve(Symbol('cancel'));
    });
  });
}

export async function runChatCommand(basePath: string): Promise<void> {
  const initialized = await checkConfigExist(basePath);
  if (!initialized) {
    p.log.error(t('chat_error_init'));
    return;
  }

  p.intro(t('chat_intro'));

  const history: { role: 'user' | 'assistant'; content: string }[] = [];

  while (true) {
    const userInput = await askMultiline(
      t('chat_message_prompt'),
      'Ex: Crie um MVP de carrinho de compras / Crie uma skill de busca'
    );

    if (p.isCancel(userInput)) {
      break;
    }

    if (
      userInput === 'menu' ||
      userInput === 'menus' ||
      userInput === 'voltar' ||
      userInput === 'back'
    ) {
      break;
    }

    if (userInput === 'exit' || userInput === 'sair' || userInput === 'quit') {
      p.outro(t('dashboard_outro'));
      process.exit(0);
    }

    const spinner = p.spinner();
    spinner.start(t('chat_ai_thinking'));

    try {
      const config = await readProjectConfig(basePath);
      const resolvedApiKey =
        config.provider !== 'ollama' ? await getApiKey(config.provider) : undefined;

      const aiService = createAIService({
        provider: config.provider,
        modelName: config.modelName,
        temperature: config.temperature,
        apiKey: resolvedApiKey,
      });

      const existingMvpKeys = await listMvpConfigs(basePath);
      const existingTasksList = await listTasks(basePath);

      // Append user prompt to history
      history.push({ role: 'user', content: userInput });

      // Build conversation history block
      const conversationHistory = history
        .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n\n');

      const chatPrompt = buildChatPrompt(conversationHistory, existingMvpKeys, existingTasksList);

      const aiResult = await aiService.generateStructured<any>(
        CHAT_SYSTEM_PROMPT,
        chatPrompt,
        CHAT_SCHEMA
      );

      spinner.stop('AI Response:');

      // Show message
      p.note(aiResult.message, 'SophiaCode Assistant');

      // Append assistant response to history
      history.push({ role: 'assistant', content: aiResult.message });

      // Handle Action CREATE_MVP
      if (aiResult.action === 'CREATE_MVP') {
        const mvpSpinner = p.spinner();
        mvpSpinner.start(`Salvando MVP "${aiResult.mvpData.name}"...`);
        await saveMvpConfig(basePath, aiResult.mvpData.key, aiResult.mvpData);
        mvpSpinner.stop(`MVP salvo em: sophiAgents/mvps/${aiResult.mvpData.key}.json`);

        // Check if Jira is configured, and prompt to export
        const { isJiraConfigured, createJiraIssue } = await import('../core/mcp/jiraServer.js');
        const jiraActive = await isJiraConfigured(basePath);
        if (jiraActive) {
          const exportMvp = await p.confirm({
            message: `Deseja criar esta especificação de MVP no Jira? / Create MVP in Jira?`,
            initialValue: true,
          });
          if (exportMvp && !p.isCancel(exportMvp)) {
            let projectKey = 'PROJ';
            try {
              const projectConfig = await readProjectConfig(basePath);
              if (projectConfig.jira && projectConfig.jira.projectKey) {
                projectKey = projectConfig.jira.projectKey;
              }
            } catch {}
            const desc = `MVP Description: ${aiResult.mvpData.description}\n\nFeatures:\n${aiResult.mvpData.features.map((f: string) => `- ${f}`).join('\n')}\n\nRequirements:\n${aiResult.mvpData.requirements}`;
            const issue = await createJiraIssue(
              basePath,
              projectKey,
              `[MVP] ${aiResult.mvpData.name}`,
              desc,
              'Story'
            );
            p.log.success(`✅ Epic/Story criada no Jira: ${issue.key}`);
          }
        }
      }
      // Handle Action PLAN_MVP_TASKS
      else if (aiResult.action === 'PLAN_MVP_TASKS') {
        const taskSpinner = p.spinner();
        taskSpinner.start(`Planejando tarefas para o MVP "${aiResult.planMvpKey}"...`);
        const { planTasksForMvp } = await import('./task.js');
        const { tasks } = await planTasksForMvp(basePath, aiResult.planMvpKey);
        taskSpinner.stop(`Breakdown concluído. Geradas ${tasks.length} tarefas.`);

        // Ask for Jira export
        const { isJiraConfigured, createJiraIssue } = await import('../core/mcp/jiraServer.js');
        const jiraActive = await isJiraConfigured(basePath);
        if (jiraActive) {
          const exportTasks = await p.confirm({
            message: `Deseja exportar as ${tasks.length} tarefas criadas para o Jira? / Export tasks to Jira?`,
            initialValue: true,
          });
          if (exportTasks && !p.isCancel(exportTasks)) {
            let projectKey = 'PROJ';
            try {
              const projectConfig = await readProjectConfig(basePath);
              if (projectConfig.jira && projectConfig.jira.projectKey) {
                projectKey = projectConfig.jira.projectKey;
              }
            } catch {}
            for (const task of tasks) {
              try {
                const desc = `Plan:\n${task.planContent}\n\nSubtasks:\n${task.subtasks.map((s: any) => `- [ ] ${s.title}`).join('\n')}`;
                const issue = await createJiraIssue(
                  basePath,
                  projectKey,
                  `[Task ${task.index}] ${task.title}`,
                  desc
                );
                const taskDir = path.join(
                  basePath,
                  'sophiAgents',
                  'tasks',
                  `task-${task.index}-${task.slug}`
                );
                await fs.writeFile(
                  path.join(taskDir, 'jira.json'),
                  JSON.stringify({ issueKey: issue.key, id: issue.id, self: issue.self }, null, 2)
                );
                p.log.step(`• Jira Issue: ${issue.key}`);
              } catch (err) {
                p.log.error(`Erro ao criar issue no Jira: ${(err as Error).message}`);
              }
            }
          }
        }
      }
      // Handle Action CREATE_SKILL
      else if (aiResult.action === 'CREATE_SKILL') {
        const skillSpinner = p.spinner();
        skillSpinner.start(`Configurando skill "${aiResult.skillData.type}"...`);
        const { setupMcpSkill } = await import('./skill.js');
        await setupMcpSkill(basePath, aiResult.skillData.type, aiResult.skillData.scriptContent);
        skillSpinner.stop(`Skill criada com sucesso em "sophiAgents/skills/".`);
      }
    } catch (error) {
      spinner.stop('Erro / Error');
      p.log.error(t('chat_error_ai', (error as Error).message));
    }
  }
}
