import * as p from '@clack/prompts';
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
    subtasks = await readTaskSubtasks(basePath, selectedTaskDir);
  } catch (error) {
    p.log.error(t('dev_read_subtasks_error', (error as Error).message));
    p.outro(t('dev_fail_generic'));
    return;
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
    await writeTaskSubtasks(basePath, selectedTaskDir, updatedSubtasks);
    p.log.success(t('dev_save_success'));
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
    p.note(
      t('dev_next_instruction_content', selectedTaskDir, nextSubtask.title),
      t('dev_next_instruction_title')
    );
  } else {
    p.log.success(t('dev_all_completed'));
  }

  p.outro(t('dev_outro'));
}
