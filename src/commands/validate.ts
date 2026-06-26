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

export async function runValidateCommand(basePath: string): Promise<void> {
  // 1. Verify context initialization
  const initialized = await checkConfigExist(basePath);
  if (!initialized) {
    p.log.error(t('dev_error_init'));
    p.log.info(t('dev_error_init_instruction'));
    return;
  }

  // 2. List active tasks
  const tasksList = await listTasks(basePath);
  if (tasksList.length === 0) {
    p.log.warn(t('dev_error_tasks'));
    p.log.info(t('dev_error_tasks_instruction'));
    return;
  }

  p.intro(t('validate_intro'));

  // 3. Select active task to close
  const selectedTaskDir = await p.select({
    message: t('validate_select_prompt'),
    options: tasksList.map((taskDir) => ({ value: taskDir, label: taskDir })),
  });

  if (p.isCancel(selectedTaskDir)) {
    p.outro(t('cancel_generic'));
    return;
  }

  // 4. Load Jira metadata if exists
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
    p.log.info(`🔗 Jira: ${jiraLink.issueKey}`);
  } catch {
    // No Jira link
  }

  // 5. Handle Jira actions (Assignment, Worklog, Done Transition)
  const {
    getJiraMyself,
    assignJiraIssue,
    addJiraWorklog,
    transitionJiraIssueByName,
    isJiraConfigured,
    getJiraSubtasks,
  } = await import('../core/mcp/jiraServer.js');

  const jiraActive = await isJiraConfigured(basePath);

  if (jiraActive && jiraLink) {
    try {
      // 5.1 Assignment Check
      const myself = await getJiraMyself(basePath);
      const assignSelf = await p.confirm({
        message: t('validate_assign_confirm', jiraLink.issueKey, myself.displayName),
        initialValue: true,
      });

      if (!p.isCancel(assignSelf) && assignSelf) {
        const assignSpinner = p.spinner();
        assignSpinner.start(t('validate_assigning'));
        await assignJiraIssue(basePath, jiraLink.issueKey, myself.accountId);
        assignSpinner.stop(t('validate_assign_success', myself.displayName));
      }

      // 5.2 Worklog Input
      const timeSpent = await p.text({
        message: t('validate_time_prompt'),
        placeholder: '1h 30m',
        validate(value) {
          if (!value || value.trim().length === 0) {
            return t('validate_time_required');
          }
        },
      });

      if (!p.isCancel(timeSpent) && typeof timeSpent === 'string') {
        const worklogSpinner = p.spinner();
        worklogSpinner.start(t('validate_logging_worklog'));
        await addJiraWorklog(basePath, jiraLink.issueKey, timeSpent);
        worklogSpinner.stop(t('validate_worklog_success', timeSpent));
      }

      // 5.3 Close child subtasks first
      try {
        const subtasksList = await getJiraSubtasks(basePath, jiraLink.issueKey);
        if (subtasksList.length > 0) {
          const subtasksSpinner = p.spinner();
          subtasksSpinner.start(
            `Fechando ${subtasksList.length} subtarefas no Jira... / Closing subtasks...`
          );
          for (const sub of subtasksList) {
            await transitionJiraIssueByName(basePath, sub.key, 'Done');
          }
          subtasksSpinner.stop(`${subtasksList.length} subtarefas fechadas no Jira.`);
        }
      } catch (subErr) {
        p.log.warn(`Aviso ao fechar subtarefas no Jira: ${(subErr as Error).message}`);
      }

      // 5.4 Transition parent to Done
      const transitionSpinner = p.spinner();
      transitionSpinner.start(t('validate_closing_issue'));
      const ok = await transitionJiraIssueByName(basePath, jiraLink.issueKey, 'Done');
      if (ok) {
        transitionSpinner.stop(t('validate_close_success', jiraLink.issueKey));
      } else {
        transitionSpinner.stop(t('validate_close_fail'));
      }
    } catch (err) {
      p.log.error(t('validate_jira_error', (err as Error).message));
    }
  }

  // 6. Complete all local subtasks
  try {
    let subtasks: any[] = [];
    try {
      subtasks = await readTaskSubtasks(basePath, selectedTaskDir as string);
    } catch {
      // Ignore
    }

    if (subtasks.length > 0) {
      const updatedSubtasks = subtasks.map((s) => ({ ...s, done: true }));
      await writeTaskSubtasks(basePath, selectedTaskDir as string, updatedSubtasks);
    }

    p.log.success(t('validate_local_success'));
  } catch (error) {
    p.log.error(t('validate_local_error', (error as Error).message));
  }

  p.outro(t('validate_outro'));
}
