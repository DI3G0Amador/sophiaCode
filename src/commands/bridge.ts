import * as p from '@clack/prompts';
import {
  checkConfigExist,
  writeAgentBridgeFile,
  readProjectConfig,
  saveProjectConfig,
} from '../core/fs/writer.js';
import { t } from '../core/i18n.js';

export async function runBridgeCommand(basePath: string): Promise<void> {
  // 1. Verify that context has been initialized first
  const initialized = await checkConfigExist(basePath);
  if (!initialized) {
    p.log.error(t('bridge_error_init'));
    p.log.info(t('bridge_error_init_instruction'));
    return;
  }

  p.intro(t('bridge_intro'));

  // Try to load current integrations if configured
  let currentIntegrations: string[] = [];
  let projectConfig: any = {};
  try {
    projectConfig = await readProjectConfig(basePath);
    currentIntegrations = projectConfig.integrations || [];
  } catch {
    // Ignore: config load failure
  }

  const tools = await p.multiselect({
    message: t('bridge_select_prompt'),
    options: [
      {
        value: 'claude',
        label: t('bridge_claude_label'),
      },
      {
        value: 'cursor',
        label: t('bridge_cursor_label'),
      },
      {
        value: 'opencode',
        label: t('bridge_opencode_label'),
      },
      {
        value: 'codex',
        label: t('bridge_codex_label'),
      },
    ],
    initialValues: currentIntegrations,
    required: false,
  });

  if (p.isCancel(tools)) {
    p.outro(t('cancel_generic'));
    return;
  }

  const spinner = p.spinner();
  spinner.start(t('writer_start'));

  try {
    for (const tool of tools as ('claude' | 'cursor' | 'opencode' | 'codex')[]) {
      await writeAgentBridgeFile(basePath, tool);
    }

    // Save updated integrations list
    projectConfig.integrations = tools;
    await saveProjectConfig(basePath, projectConfig);

    spinner.stop(t('bridge_success'));
    p.outro(t('bridge_outro'));
  } catch (error) {
    spinner.stop(t('dev_fail_generic'));
    p.log.error((error as Error).message);
  }
}
