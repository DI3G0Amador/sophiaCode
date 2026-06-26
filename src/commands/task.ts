import * as p from '@clack/prompts';
import fs from 'fs/promises';
import path from 'path';
import { t } from '../core/i18n.js';
import {
  checkConfigExist,
  readProjectConfig,
  readMapFile,
  listMvpConfigs,
  readMvpConfig,
  saveMvpConfig,
  saveTask,
} from '../core/fs/writer.js';
import { createAIService } from '../core/ai/providers.js';
import { TASK_SYSTEM_PROMPT, buildTaskPrompt, TASK_SCHEMA } from '../core/ai/prompts.js';
import { getApiKey } from '../core/fs/global-config.js';

export async function planTasksForMvp(
  basePath: string,
  selectedMvpKey: string
): Promise<{ tasks: any[]; ownerName: string; assigneeId?: string }> {
  // Load input data
  const mvpData = await readMvpConfig(basePath, selectedMvpKey);
  const architectureMap = await readMapFile(basePath);

  const patternsPath = path.join(basePath, 'sophiAgents', 'context', 'coding-patterns.md');
  const codingPatterns = await fs.readFile(patternsPath, 'utf-8');

  // Resolve Owner Name and Assignee ID
  let ownerName = 'Developer';
  let assigneeId: string | undefined = undefined;
  try {
    const { getJiraMyself, isJiraConfigured } = await import('../core/mcp/jiraServer.js');
    if (await isJiraConfigured(basePath)) {
      const myself = await getJiraMyself(basePath);
      ownerName = myself.displayName;
      assigneeId = myself.accountId;
    }
  } catch {
    // Ignore
  }

  if (ownerName === 'Developer') {
    try {
      const { execSync } = await import('child_process');
      const gitUser = execSync('git config user.name', { encoding: 'utf8' }).trim();
      if (gitUser) {
        ownerName = gitUser;
      }
    } catch {
      // Ignore
    }
  }

  // Setup AI Service and call LLM
  const config = await readProjectConfig(basePath);
  const resolvedApiKey =
    config.provider !== 'ollama' ? await getApiKey(config.provider) : undefined;

  const aiService = createAIService({
    provider: config.provider,
    modelName: config.modelName,
    temperature: config.temperature,
    apiKey: resolvedApiKey,
  });

  const userPrompt = buildTaskPrompt(
    JSON.stringify(mvpData, null, 2),
    architectureMap,
    codingPatterns
  );

  const taskResult = await aiService.generateStructured<{
    tasks: {
      index: string;
      slug: string;
      title: string;
      estimatedTime: string;
      difficulty: string;
      planContent: string;
      subtasks: { id: string; title: string; done: boolean }[];
    }[];
  }>(TASK_SYSTEM_PROMPT, userPrompt, TASK_SCHEMA);

  // Persist tasks to disk
  for (const task of taskResult.tasks) {
    const planWithHeader =
      `# [Task ${task.index}] ${task.title}\n` +
      `- **Estimated Time / Estimativa**: ${task.estimatedTime}\n` +
      `- **Difficulty / Dificuldade**: ${task.difficulty}\n` +
      `- **Owner / Responsável**: ${ownerName}\n\n` +
      `---\n\n` +
      task.planContent;

    await saveTask(basePath, task.index, task.slug, planWithHeader, task.subtasks, {
      title: task.title,
      estimatedTime: task.estimatedTime,
      difficulty: task.difficulty,
      owner: ownerName,
    });
  }

  // Update MVP status
  mvpData.status = 'planned';
  await saveMvpConfig(basePath, selectedMvpKey, mvpData);

  return { tasks: taskResult.tasks, ownerName, assigneeId };
}

export async function runTaskCommand(basePath: string): Promise<void> {
  // 1. Verify that context has been initialized first
  const initialized = await checkConfigExist(basePath);
  if (!initialized) {
    p.log.error(t('task_error_init'));
    p.log.info(t('task_error_init_instruction'));
    return;
  }

  // 2. List available MVPs
  const mvpKeys = await listMvpConfigs(basePath);
  if (mvpKeys.length === 0) {
    p.log.warn(t('task_error_mvp'));
    p.log.info(t('task_error_mvp_instruction'));
    return;
  }

  p.intro(t('task_intro'));

  const selectedMvpKey = await p.select({
    message: t('task_select_prompt'),
    options: mvpKeys.map((key) => ({ value: key, label: key })),
  });

  if (p.isCancel(selectedMvpKey)) {
    p.outro(t('cancel_generic'));
    return;
  }

  const aiSpinner = p.spinner();
  aiSpinner.start(t('task_spinner_ai'));

  try {
    const { tasks, ownerName, assigneeId } = await planTasksForMvp(
      basePath,
      selectedMvpKey as string
    );
    aiSpinner.stop(t('task_success'));

    // Optional Jira integration export
    const { isJiraConfigured, createJiraIssue } = await import('../core/mcp/jiraServer.js');
    const jiraActive = await isJiraConfigured(basePath);

    if (jiraActive) {
      const exportToJira = await p.confirm({
        message: 'Deseja exportar essas tarefas para o Jira? / Export tasks to Jira?',
        initialValue: true,
      });

      if (exportToJira && !p.isCancel(exportToJira)) {
        const jiraSpinner = p.spinner();
        jiraSpinner.start('Exportando para o Jira... / Exporting to Jira...');

        let projectKey = 'PROJ';
        try {
          const projectConfig = await readProjectConfig(basePath);
          if (projectConfig.jira && projectConfig.jira.projectKey) {
            projectKey = projectConfig.jira.projectKey;
          }
        } catch {
          // Ignore
        }

        for (const task of tasks) {
          try {
            const descriptionText =
              `* **Estimativa de Tempo / Estimated Time**: ${task.estimatedTime}\n` +
              `* **Dificuldade / Difficulty**: ${task.difficulty}\n` +
              `* **Proprietário / Owner**: ${ownerName}\n\n` +
              `---\n\n` +
              `Plan:\n${task.planContent}\n\n` +
              `Subtasks:\n${task.subtasks.map((s: any) => `- [ ] ${s.title}`).join('\n')}`;

            const jiraIssue = await createJiraIssue(
              basePath,
              projectKey,
              `[Task ${task.index}] ${task.title}`,
              descriptionText,
              'Task',
              undefined,
              assigneeId
            );

            // Save Jira link locally
            const taskDir = path.join(
              basePath,
              'sophiAgents',
              'tasks',
              `task-${task.index}-${task.slug}`
            );
            await fs.writeFile(
              path.join(taskDir, 'jira.json'),
              JSON.stringify(
                {
                  issueKey: jiraIssue.key,
                  id: jiraIssue.id,
                  self: jiraIssue.self,
                },
                null,
                2
              )
            );
            p.log.step(`• Jira Issue: ${jiraIssue.key}`);
          } catch (err) {
            p.log.error(
              `Erro ao criar issue no Jira para tarefa ${task.index}: ${(err as Error).message}`
            );
          }
        }
        jiraSpinner.stop('Exportação concluída! / Export completed!');
      }
    }

    const mvpData = await readMvpConfig(basePath, selectedMvpKey as string);
    p.outro(t('task_outro', mvpData.name, tasks.length));
  } catch (error) {
    aiSpinner.stop(t('task_ai_fail'));
    p.log.error(`Erro: ${(error as Error).message}`);
    p.outro(t('task_fail_generic'));
  }
}
