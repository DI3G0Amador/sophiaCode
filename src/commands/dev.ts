import * as p from '@clack/prompts';
import fs from 'fs/promises';
import path from 'path';
import { t } from '../core/i18n.js';
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
    p.log.error(t('dev_error_init'));
    p.log.info(t('dev_error_init_instruction'));
    return;
  }

  // 2. List all tasks
  const tasksList = await listTasks(basePath);
  if (tasksList.length === 0) {
    p.log.warn(t('dev_error_tasks'));
    p.log.info(t('dev_error_tasks_instruction'));
    return;
  }

  p.intro(t('dev_intro'));

  // 3. User selects the task to inspect
  const selectedTaskDir = await p.select({
    message: t('dev_select_prompt'),
    options: tasksList.map((taskDir) => ({ value: taskDir, label: taskDir })),
  });

  if (p.isCancel(selectedTaskDir)) {
    p.outro(t('cancel_generic'));
    return;
  }

  // 4. Load checklist
  let subtasks: { id: string; title: string; done: boolean }[];
  try {
    subtasks = await readTaskSubtasks(basePath, selectedTaskDir as string);
  } catch (error) {
    p.log.error(t('dev_read_subtasks_error', (error as Error).message));
    p.outro(t('dev_fail_generic'));
    return;
  }

  // Check if there is a linked Jira ticket
  let jiraLink: any = undefined;
  try {
    const jiraPath = path.join(
      basePath,
      'sophiAgents',
      'tasks',
      selectedTaskDir as string,
      'jira.json'
    );
    const jiraData = await fs.readFile(jiraPath, 'utf-8');
    jiraLink = JSON.parse(jiraData);
    p.log.info(`🔗 Tarefa vinculada ao Jira: ${jiraLink.issueKey}`);
  } catch {
    // No linked Jira ticket
  }

  if (subtasks.length === 0) {
    p.log.warn(t('dev_no_subtasks'));
    p.outro(t('dev_done'));
    return;
  }

  // 5. Present checklist toggles
  const checklist = await p.multiselect({
    message: t('dev_checklist_prompt'),
    options: subtasks.map((s) => ({ value: s.id, label: s.title })),
    initialValues: subtasks.filter((s) => s.done).map((s) => s.id),
    required: false,
  });

  if (p.isCancel(checklist)) {
    p.outro(t('cancel_generic'));
    return;
  }

  // 6. Update files
  const updatedSubtasks = subtasks.map((s) => ({
    ...s,
    done: (checklist as string[]).includes(s.id),
  }));

  try {
    await writeTaskSubtasks(basePath, selectedTaskDir as string, updatedSubtasks);
    p.log.success(t('dev_save_success'));

    // Handle Jira status transition syncing
    if (jiraLink) {
      const allDone = updatedSubtasks.every((s) => s.done);
      const someDone = updatedSubtasks.some((s) => s.done);
      const { transitionJiraIssueByName } = await import('../core/mcp/jiraServer.js');

      if (allDone) {
        p.log.step(`Sincronizando Jira: Finalizando issue ${jiraLink.issueKey}...`);
        const ok = await transitionJiraIssueByName(basePath, jiraLink.issueKey, 'Done');
        if (ok) {
          p.log.success(`✅ Issue ${jiraLink.issueKey} marcada como concluída/Done no Jira.`);
        } else {
          p.log.warn(`⚠️ Não foi possível alterar status para Done no Jira.`);
        }
      } else if (someDone) {
        p.log.step(
          `Sincronizando Jira: Iniciando/Mantendo issue ${jiraLink.issueKey} em andamento...`
        );
        const ok = await transitionJiraIssueByName(basePath, jiraLink.issueKey, 'Progress');
        if (ok) {
          p.log.success(
            `✅ Issue ${jiraLink.issueKey} marcada como Em Andamento/In Progress no Jira.`
          );
        } else {
          p.log.warn(`⚠️ Não foi possível alterar status para In Progress no Jira.`);
        }
      }
    }
  } catch (error) {
    p.log.error(t('dev_save_error', (error as Error).message));
    p.outro(t('dev_fail_generic'));
    return;
  }

  // 7. Prompt developer with next instructions
  const nextSubtask = updatedSubtasks.find((s) => !s.done);
  if (nextSubtask) {
    p.log.info(t('dev_next_step'));
    p.log.step(`» "${nextSubtask.title}"`);

    const promptXml =
      `<instructions_xml>\n` +
      `<task_context>\n` +
      `  Project Task: "${selectedTaskDir}"\n` +
      `  Current Subtask to Execute: "${nextSubtask.title}"\n` +
      `  Detailed implementation plan: "sophiAgents/tasks/${selectedTaskDir}/plan.md"\n` +
      `</task_context>\n\n` +
      `<instructions>\n` +
      `  1. Read the plan in "sophiAgents/tasks/${selectedTaskDir}/plan.md".\n` +
      `  2. Execute the changes needed ONLY for: "${nextSubtask.title}".\n` +
      `  3. DO NOT implement future/unrelated tasks or refactorings.\n` +
      `  4. Strictly adhere to standard practices in "sophiAgents/context/coding-patterns.md" and "sophiAgents/context/architecture.md".\n` +
      `</instructions>\n\n` +
      `<validation>\n` +
      `  Run your local tests or build command to ensure your changes are correct before completion.\n` +
      `</validation>\n` +
      `</instructions_xml>`;

    p.note(promptXml, t('dev_next_instruction_title'));
  } else {
    p.log.success(t('dev_all_completed'));
  }

  p.outro(t('dev_outro'));
}
