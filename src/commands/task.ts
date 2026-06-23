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

  // 3. Load input data
  const plannerSpinner = p.spinner();
  plannerSpinner.start(t('task_spinner_read'));

  let mvpData: any;
  let architectureMap: string;
  let codingPatterns: string;

  try {
    mvpData = await readMvpConfig(basePath, selectedMvpKey);
    architectureMap = await readMapFile(basePath);

    const patternsPath = path.join(basePath, 'sophiAgents', 'context', 'coding-patterns.md');
    codingPatterns = await fs.readFile(patternsPath, 'utf-8');
    plannerSpinner.stop(t('task_read_success'));
  } catch (error) {
    plannerSpinner.stop(t('task_read_fail'));
    p.log.error(t('discovery_error_prefix', (error as Error).message));
    p.outro(t('task_fail_generic'));
    return;
  }

  // 4. Setup AI Service and call LLM
  const aiSpinner = p.spinner();
  aiSpinner.start(t('task_spinner_ai'));

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
        planContent: string;
        subtasks: { id: string; title: string; done: boolean }[];
      }[];
    }>(TASK_SYSTEM_PROMPT, userPrompt, TASK_SCHEMA);

    aiSpinner.stop(t('task_ai_success'));

    // 5. Persist tasks to disk
    const saveSpinner = p.spinner();
    saveSpinner.start(t('task_spinner_save'));

    for (const task of taskResult.tasks) {
      await saveTask(basePath, task.index, task.slug, task.planContent, task.subtasks);
      p.log.step(t('task_generated_step', task.index, task.slug));
    }

    // Update MVP status
    mvpData.status = 'planned';
    await saveMvpConfig(basePath, selectedMvpKey, mvpData);

    saveSpinner.stop(t('task_success'));
    p.outro(t('task_outro', mvpData.name, taskResult.tasks.length));
  } catch (error) {
    aiSpinner.stop(t('task_ai_fail'));
    p.log.error(t('discovery_error_prefix', (error as Error).message));
    p.outro(t('task_fail_generic'));
  }
}
