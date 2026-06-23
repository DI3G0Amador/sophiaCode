import * as p from '@clack/prompts';
import fs from 'fs/promises';
import path from 'path';
import { t } from '../core/i18n.js';
import { checkConfigExist, saveSkillConfig } from '../core/fs/writer.js';

export async function runSkillCommand(basePath: string): Promise<void> {
  // 1. Verify that context has been initialized first
  const initialized = await checkConfigExist(basePath);
  if (!initialized) {
    p.log.error(t('skill_error_init'));
    p.log.info(t('skill_error_init_instruction'));
    return;
  }

  p.intro(t('skill_intro'));

  const initializeMcp = await p.confirm({
    message: t('skill_confirm'),
    initialValue: true,
  });

  if (p.isCancel(initializeMcp)) {
    p.outro(t('cancel_generic'));
    return;
  }

  if (initializeMcp) {
    const mcpType = await p.select({
      message: t('skill_select'),
      options: [
        {
          value: 'sqlite',
          label: t('skill_sqlite_label'),
          hint: t('skill_sqlite_hint'),
        },
        {
          value: 'filesystem',
          label: t('skill_fs_label'),
          hint: t('skill_fs_hint'),
        },
        {
          value: 'brave-search',
          label: t('skill_web_label'),
          hint: t('skill_web_hint'),
        },
        {
          value: 'custom-script',
          label: t('skill_script_label'),
          hint: t('skill_script_hint'),
        },
      ],
    });

    if (p.isCancel(mcpType)) {
      p.outro(t('cancel_generic'));
      return;
    }

    const skillsDir = path.join(basePath, 'sophiAgents', 'skills');

    let mcpConfig: any = {};
    if (mcpType === 'sqlite') {
      mcpConfig = {
        mcpServers: {
          sqlite: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-sqlite', '--db', './sqlite.db'],
          },
        },
      };
      await saveSkillConfig(basePath, mcpConfig);
      p.log.success(t('skill_sqlite_success'));
    } else if (mcpType === 'filesystem') {
      mcpConfig = {
        mcpServers: {
          filesystem: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem', './src', './tests'],
          },
        },
      };
      await saveSkillConfig(basePath, mcpConfig);
      p.log.success(t('skill_fs_success'));
    } else if (mcpType === 'brave-search') {
      mcpConfig = {
        mcpServers: {
          'brave-search': {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-brave-search'],
            env: {
              BRAVE_API_KEY: 'INSIRA_SUA_CHAVE_AQUI',
            },
          },
        },
      };
      await saveSkillConfig(basePath, mcpConfig);
      p.log.success(t('skill_web_success'));
    } else if (mcpType === 'custom-script') {
      const scriptContent = t('skill_script_content');

      const scriptPath = path.join(skillsDir, 'verify-quality.sh');
      await fs.mkdir(skillsDir, { recursive: true });
      await fs.writeFile(scriptPath, scriptContent, { encoding: 'utf-8', mode: 0o755 });

      p.log.success(t('skill_script_success'));
    }
  }

  p.outro(t('skill_outro'));
}
