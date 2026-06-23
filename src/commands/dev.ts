import * as p from '@clack/prompts';
import {
  checkConfigExist,
  listTasks,
  readTaskSubtasks,
  writeTaskSubtasks,
} from '../core/fs/writer.js';

export async function runDevCommand(basePath: string): Promise<void> {
  // 1. Verify that context has been initialized first
  const initialized = await checkConfigExist(basePath);
  if (!initialized) {
    p.log.error('❌ Erro: O sophiaContext não está inicializado neste repositório.');
    p.log.info('Execute o comando "sophiacode init" primeiro.');
    return;
  }

  // 2. List all tasks
  const tasksList = await listTasks(basePath);
  if (tasksList.length === 0) {
    p.log.warn('⚠️ Nenhuma tarefa planejada encontrada em "sophiAgents/tasks/".');
    p.log.info('Planeje um MVP primeiro rodando o comando "sophiacode task".');
    return;
  }

  p.intro('💻 Modo Engenheiro - Execução de Tarefas');

  // 3. User selects the task to inspect
  const selectedTaskDir = await p.select({
    message: 'Selecione qual tarefa deseja desenvolver ou acompanhar:',
    options: tasksList.map((taskDir) => ({ value: taskDir, label: taskDir })),
  });

  if (p.isCancel(selectedTaskDir)) {
    p.outro('Operação cancelada.');
    return;
  }

  // 4. Load checklist
  let subtasks: { id: string; title: string; done: boolean }[];
  try {
    subtasks = await readTaskSubtasks(basePath, selectedTaskDir);
  } catch (error) {
    p.log.error(`Não foi possível ler as subtasks desta tarefa: ${(error as Error).message}`);
    p.outro('Operação falhou.');
    return;
  }

  if (subtasks.length === 0) {
    p.log.warn('⚠️ Esta tarefa não contém subtasks catalogadas.');
    p.outro('Concluído.');
    return;
  }

  // 5. Present checklist toggles
  const checklist = await p.multiselect({
    message: 'Selecione as subtasks concluídas (pressione espaço para marcar/desmarcar):',
    options: subtasks.map((s) => ({ value: s.id, label: s.title })),
    initialValues: subtasks.filter((s) => s.done).map((s) => s.id),
    required: false,
  });

  if (p.isCancel(checklist)) {
    p.outro('Operação cancelada.');
    return;
  }

  // 6. Update files
  const updatedSubtasks = subtasks.map((s) => ({
    ...s,
    done: (checklist as string[]).includes(s.id),
  }));

  try {
    await writeTaskSubtasks(basePath, selectedTaskDir, updatedSubtasks);
    p.log.success('✅ Checklist de subtasks atualizado com sucesso!');
  } catch (error) {
    p.log.error(`Erro ao gravar as alterações: ${(error as Error).message}`);
    p.outro('A operação falhou.');
    return;
  }

  // 7. Prompt developer with next instructions
  const nextSubtask = updatedSubtasks.find((s) => !s.done);
  if (nextSubtask) {
    p.log.info('🤖 Próxima Subtask a ser resolvida:');
    p.log.step(`» "${nextSubtask.title}"`);
    p.note(
      `Instrução para a IA (Claude Code / Cursor / OpenCode):\n` +
        `"Leia o plano detalhado em 'sophiAgents/tasks/${selectedTaskDir}/plan.md'\n` +
        `e execute os passos para completar a subtask: '${nextSubtask.title}'."`,
      'Instruções de Orquestração'
    );
  } else {
    p.log.success('🎉 Excelente! Todas as subtasks desta tarefa foram marcadas como concluídas.');
  }

  p.outro('Progresso salvo.');
}
