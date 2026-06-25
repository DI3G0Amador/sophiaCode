import * as p from '@clack/prompts';
import fs from 'fs/promises';
import path from 'path';
import { t } from '../core/i18n.js';
import {
  checkConfigExist,
  readProjectConfig,
  saveMvpConfig,
  listMvpConfigs,
  saveProjectConfig,
} from '../core/fs/writer.js';
import { listTasks } from '../core/fs/writer.js';
import { createAIService } from '../core/ai/providers.js';
import { getApiKey } from '../core/fs/global-config.js';
import {
  CHAT_SYSTEM_PROMPT,
  CHAT_SCHEMA,
  buildChatPrompt,
} from '../core/ai/prompts.js';
import { askMultilinePreserved } from '../core/cli/input-handler.js';

export async function runChatSession(
  basePath: string,
  initialBuffer = ''
): Promise<{ text: string; toggleMode: boolean; canceled: boolean }> {
  let buffer = initialBuffer;
  const history: { role: 'user' | 'assistant'; content: string }[] = [];

  while (true) {
    const result = await askMultilinePreserved(
      t('chat_message_prompt'),
      buffer,
      'Ex: Crie um MVP de carrinho de compras / Crie uma skill de busca'
    );

    if (result.canceled) {
      return { text: '', toggleMode: false, canceled: true };
    }

    if (result.toggleMode) {
      return { text: result.text, toggleMode: true, canceled: false };
    }

    const userInput = result.text;
    buffer = ''; // Reset buffer since it was successfully submitted

    // Check if they want to exit
    if (userInput === 'exit' || userInput === 'sair' || userInput === 'quit') {
      return { text: '', toggleMode: false, canceled: true };
    }

    if (
      userInput === 'menu' ||
      userInput === 'menus' ||
      userInput === 'voltar' ||
      userInput === 'back'
    ) {
      return { text: '', toggleMode: true, canceled: false };
    }

    // Handle Slash Commands
    if (userInput.startsWith('/')) {
      const handled = await handleSlashCommand(basePath, userInput);
      if (handled) {
        continue;
      }
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

      history.push({ role: 'user', content: userInput });

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
      p.note(aiResult.message, 'SophiaCode Assistant');
      history.push({ role: 'assistant', content: aiResult.message });

      // Execute AI Actions
      if (aiResult.action === 'CREATE_MVP') {
        const mvpSpinner = p.spinner();
        mvpSpinner.start(`Salvando MVP "${aiResult.mvpData.name}"...`);
        await saveMvpConfig(basePath, aiResult.mvpData.key, aiResult.mvpData);
        mvpSpinner.stop(`MVP salvo em: sophiAgents/mvps/${aiResult.mvpData.key}.json`);

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
      } else if (aiResult.action === 'PLAN_MVP_TASKS') {
        const taskSpinner = p.spinner();
        taskSpinner.start(`Planejando tarefas para o MVP "${aiResult.planMvpKey}"...`);
        const { planTasksForMvp } = await import('./task.js');
        const { tasks } = await planTasksForMvp(basePath, aiResult.planMvpKey);
        taskSpinner.stop(`Breakdown concluído. Geradas ${tasks.length} tarefas.`);

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
      } else if (aiResult.action === 'CREATE_SKILL') {
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

export async function runChatCommand(basePath: string): Promise<void> {
  const initialized = await checkConfigExist(basePath);
  if (!initialized) {
    p.log.error(t('chat_error_init'));
    return;
  }

  p.intro(t('chat_intro'));
  await runChatSession(basePath);
}

async function handleSlashCommand(basePath: string, input: string): Promise<boolean> {
  const parts = input.trim().split(' ');
  const cmd = parts[0].toLowerCase();

  switch (cmd) {
    case '/help':
      p.note(
        `Comandos de Barra Disponíveis / Available Slash Commands:\n` +
          `• /init    : Inicializar contexto e mapear arquitetura\n` +
          `• /model   : Escolher provedor e modelo de IA\n` +
          `• /mvp     : Criar especificação técnica de MVP\n` +
          `• /task    : Planejar MVP em backlog de tarefas\n` +
          `• /dev     : Modo Engenheiro (checklist de desenvolvimento)\n` +
          `• /skill   : Configurar servidores MCP e automações\n` +
          `• /bridge  : Configurar pontes para outros agentes (Cursor, Claude Code)\n` +
          `• /help    : Exibir esta ajuda`,
        'SophiaCode Commands'
      );
      return true;

    case '/init': {
      const { runInitFlow } = await import('../core/orchestrator.js');
      await runInitFlow(basePath);
      return true;
    }

    case '/model': {
      await changeModelFlow(basePath);
      return true;
    }

    case '/mvp': {
      const { runMvpCommand } = await import('./mvp.js');
      await runMvpCommand(basePath);
      return true;
    }

    case '/task': {
      const { runTaskCommand } = await import('./task.js');
      await runTaskCommand(basePath);
      return true;
    }

    case '/dev': {
      const { runDevCommand } = await import('./dev.js');
      await runDevCommand(basePath);
      return true;
    }

    case '/skill': {
      const { runSkillCommand } = await import('./skill.js');
      await runSkillCommand(basePath);
      return true;
    }

    case '/bridge': {
      const { runBridgeCommand } = await import('./bridge.js');
      await runBridgeCommand(basePath);
      return true;
    }

    default:
      p.log.warn(`Comando desconhecido: ${cmd}. Digite /help para ajuda.`);
      return true;
  }
}

async function changeModelFlow(basePath: string): Promise<void> {
  const { askSetupConfig } = await import('./prompts.js');
  let existing: any = undefined;
  try {
    existing = await readProjectConfig(basePath);
  } catch {}

  const setupConfig = await askSetupConfig(existing);
  const updatedConfig = {
    ...existing,
    provider: setupConfig.provider,
    modelName: setupConfig.modelName,
  };

  await saveProjectConfig(basePath, updatedConfig);
  p.log.success(`Modelo atualizado com sucesso para: ${setupConfig.provider} (${setupConfig.modelName})`);
}
