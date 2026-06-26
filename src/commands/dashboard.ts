import * as p from '@clack/prompts';
import { ensureLanguageResolved, t } from '../core/i18n.js';
import { runInitFlow } from '../core/orchestrator.js';
import { runMvpCommand } from './mvp.js';
import { runTaskCommand } from './task.js';
import { runDevCommand } from './dev.js';
import { runSkillCommand } from './skill.js';
import { runBridgeCommand } from './bridge.js';
import { runValidateCommand } from './validate.js';
import { runJiraConfigFlow } from './jira.js';

export async function runInteractiveDashboard(basePath: string): Promise<void> {
  await ensureLanguageResolved();

  p.intro(t('dashboard_title'));
  p.log.info('Pressione [TAB] para alternar entre o Chat e os Menus de Comandos.');

  let currentMode: 'chat' | 'menu' = 'chat';
  let chatBuffer = '';

  while (true) {
    if (currentMode === 'chat') {
      const { runChatSession } = await import('./chat.js');
      const result = await runChatSession(basePath, chatBuffer);

      if (result.toggleMode) {
        currentMode = 'menu';
        chatBuffer = result.text; // Preserve typed text
        console.log('\n🔄 [TAB] Alternado para Modo Menu / Switched to Menu Mode');
        continue;
      }

      if (result.canceled) {
        p.outro(t('dashboard_outro'));
        break;
      }
    } else {
      const choice = await p.select({
        message: t('dashboard_select_prompt'),
        options: [
          { value: 'chat', label: '💬 ' + t('dashboard_menu_chat') + ' (TAB)' },
          { value: 'init', label: t('dashboard_menu_init') },
          { value: 'mvp', label: t('dashboard_menu_mvp') },
          { value: 'task', label: t('dashboard_menu_task') },
          { value: 'dev', label: t('dashboard_menu_dev') },
          { value: 'validate', label: t('dashboard_menu_validate') },
          { value: 'jira', label: t('dashboard_menu_jira') },
          { value: 'skill', label: t('dashboard_menu_skill') },
          { value: 'bridge', label: t('dashboard_menu_bridge') },
          { value: 'exit', label: t('dashboard_menu_exit') },
        ],
      });

      if (p.isCancel(choice) || choice === 'exit') {
        p.outro(t('dashboard_outro'));
        break;
      }

      if (choice === 'chat') {
        currentMode = 'chat';
        console.log('\n🔄 Alternado para Modo Chat / Switched to Chat Mode');
        continue;
      }

      try {
        if (choice === 'init') {
          await runInitFlow(basePath);
        } else if (choice === 'mvp') {
          await runMvpCommand(basePath);
        } else if (choice === 'task') {
          await runTaskCommand(basePath);
        } else if (choice === 'dev') {
          await runDevCommand(basePath);
        } else if (choice === 'validate') {
          await runValidateCommand(basePath);
        } else if (choice === 'jira') {
          await runJiraConfigFlow(basePath);
        } else if (choice === 'skill') {
          await runSkillCommand(basePath);
        } else if (choice === 'bridge') {
          await runBridgeCommand(basePath);
        }
      } catch (error) {
        p.log.error((error as Error).message);
      }

      p.log.info('---'); // Visual command separator
    }
  }
}
