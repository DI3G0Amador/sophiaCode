import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { saveTask, listTasks, readTaskSubtasks, writeTaskSubtasks } from '../src/core/fs/writer.js';

describe('Task Checklist Module (writer.ts task helpers)', () => {
  const testWorkspace = path.join(__dirname, 'temp-task-workspace');

  beforeAll(async () => {
    await fs.rm(testWorkspace, { recursive: true, force: true });
    await fs.mkdir(testWorkspace, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(testWorkspace, { recursive: true, force: true });
  });

  it('should save and list tasks, plan markdowns, task.json metadata, and subtask checklists correctly', async () => {
    const taskIndex = '01';
    const taskSlug = 'database-setup';
    const planContent = '# Action Plan for Database\n- Create migrations\n- Create schemas';
    const subtasks = [
      { id: 'runMigration', title: 'Run Prisma Migrate', done: false },
      { id: 'seedDatabase', title: 'Seed local database values', done: true },
    ];
    const metadata = {
      title: 'Database Setup',
      estimatedTime: '4h',
      difficulty: 'Easy',
      owner: 'Test Developer',
    };

    await saveTask(testWorkspace, taskIndex, taskSlug, planContent, subtasks, metadata);

    // List tasks
    const tasksList = await listTasks(testWorkspace);
    expect(tasksList).toContain(`task-${taskIndex}-${taskSlug}`);

    // Read plan, subtasks, and metadata
    const savedPlan = await fs.readFile(
      path.join(testWorkspace, 'sophiAgents', 'tasks', `task-${taskIndex}-${taskSlug}`, 'plan.md'),
      'utf-8'
    );
    expect(savedPlan).toBe(planContent);

    const savedSubtasks = await readTaskSubtasks(testWorkspace, `task-${taskIndex}-${taskSlug}`);
    expect(savedSubtasks).toEqual(subtasks);

    const savedMetadata = JSON.parse(
      await fs.readFile(
        path.join(
          testWorkspace,
          'sophiAgents',
          'tasks',
          `task-${taskIndex}-${taskSlug}`,
          'task.json'
        ),
        'utf-8'
      )
    );
    expect(savedMetadata).toEqual(metadata);

    // Toggle subtask status
    savedSubtasks[0].done = true;
    await writeTaskSubtasks(testWorkspace, `task-${taskIndex}-${taskSlug}`, savedSubtasks);

    const updatedSubtasks = await readTaskSubtasks(testWorkspace, `task-${taskIndex}-${taskSlug}`);
    expect(updatedSubtasks[0].done).toBe(true);
  });
});
