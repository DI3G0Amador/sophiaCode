import * as p from '@clack/prompts';
import fs from 'fs/promises';
import path from 'path';
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
    p.log.error('❌ Erro: O sophiaContext não está inicializado neste repositório.');
    p.log.info(
      'Execute o comando "sophiacode init" primeiro para gerar a documentação de contexto.'
    );
    return;
  }

  // 2. List available MVPs
  const mvpKeys = await listMvpConfigs(basePath);
  if (mvpKeys.length === 0) {
    p.log.warn('⚠️ Nenhuma especificação de MVP encontrada em "sophiAgents/mvps/".');
    p.log.info('Crie um MVP primeiro rodando o comando "sophiacode mvp".');
    return;
  }

  p.intro('📋 Planejamento de MVP em Tarefas (Backlog Breakdown)');

  const selectedMvpKey = await p.select({
    message: 'Selecione qual MVP deseja planejar/quebrar em tasks:',
    options: mvpKeys.map((key) => ({ value: key, label: key })),
  });

  if (p.isCancel(selectedMvpKey)) {
    p.outro('Operação cancelada.');
    return;
  }

  // 3. Load input data
  const plannerSpinner = p.spinner();
  plannerSpinner.start('Lendo a arquitetura e buscando a especificação do MVP...');

  let mvpData: any;
  let architectureMap: string;
  let codingPatterns: string;

  try {
    mvpData = await readMvpConfig(basePath, selectedMvpKey);
    architectureMap = await readMapFile(basePath);

    const patternsPath = path.join(basePath, 'sophiAgents', 'context', 'coding-patterns.md');
    codingPatterns = await fs.readFile(patternsPath, 'utf-8');
    plannerSpinner.stop('Arquivos e regras locais lidos com sucesso!');
  } catch (error) {
    plannerSpinner.stop('Falha ao ler os arquivos locais do sophiaContext!');
    p.log.error(`Erro: ${(error as Error).message}`);
    p.outro('A operação falhou.');
    return;
  }

  // 4. Setup AI Service and call LLM
  const aiSpinner = p.spinner();
  aiSpinner.start(
    'A IA está analisando a arquitetura para quebrar o MVP em planos de ação e checklists...'
  );

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

    aiSpinner.stop('Plano de tarefas detalhado gerado com sucesso pela IA!');

    // 5. Persist tasks to disk
    const saveSpinner = p.spinner();
    saveSpinner.start('Salvando planos de ação e listas de tarefas no disco...');

    for (const task of taskResult.tasks) {
      await saveTask(basePath, task.index, task.slug, task.planContent, task.subtasks);
      p.log.step(`• Gerada: "sophiAgents/tasks/task-${task.index}-${task.slug}/plan.md"`);
    }

    // Update MVP status
    mvpData.status = 'planned';
    await saveMvpConfig(basePath, selectedMvpKey, mvpData);

    saveSpinner.stop('Backlog estruturado e checklists gerados com sucesso!');
    p.outro(
      `🎉 Concluído! O MVP "${mvpData.name}" foi quebrado em ${taskResult.tasks.length} tarefas. Rode "sophiacode dev" para gerenciar o progresso.`
    );
  } catch (error) {
    aiSpinner.stop('A quebra de tarefas falhou!');
    p.log.error(`Erro: ${(error as Error).message}`);
    p.outro('A operação falhou.');
  }
}
