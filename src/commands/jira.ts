import * as p from '@clack/prompts';
import { t } from '../core/i18n.js';
import { readProjectConfig, saveProjectConfig, checkConfigExist } from '../core/fs/writer.js';
import { readGlobalConfig, saveGlobalConfig } from '../core/fs/global-config.js';

export async function runJiraConfigFlow(basePath: string): Promise<void> {
  const initialized = await checkConfigExist(basePath);
  if (!initialized) {
    p.log.error(t('dev_error_init'));
    p.log.info(t('dev_error_init_instruction'));
    return;
  }

  p.intro(t('jira_intro'));

  // Load existing configs
  let existingProj: any = {};
  try {
    existingProj = await readProjectConfig(basePath);
  } catch {}

  let existingGlobal: any = {};
  try {
    existingGlobal = await readGlobalConfig();
  } catch {}

  const defaultUrl = existingProj.jira?.url || existingGlobal.jira?.url || '';
  const defaultEmail = existingProj.jira?.email || existingGlobal.jira?.email || '';
  const defaultToken = existingProj.jira?.token || existingGlobal.jira?.token || '';
  const defaultProjectKey = existingProj.jira?.projectKey || 'SCRUM';

  // 1. Jira URL
  const url = await p.text({
    message: t('jira_url_prompt'),
    initialValue: defaultUrl,
    validate(value) {
      if (!value || value.trim().length === 0) {
        return t('jira_url_required');
      }
    },
  });
  if (p.isCancel(url)) {
    p.outro(t('cancel_generic'));
    return;
  }

  // 2. Jira Email
  const email = await p.text({
    message: t('jira_email_prompt'),
    initialValue: defaultEmail,
    validate(value) {
      if (!value || value.trim().length === 0) {
        return t('jira_email_required');
      }
    },
  });
  if (p.isCancel(email)) {
    p.outro(t('cancel_generic'));
    return;
  }

  // 3. Jira API Token
  const token = await p.password({
    message: t('jira_token_prompt'),
    validate(value) {
      if ((!value || value.trim().length === 0) && !defaultToken) {
        return t('jira_token_required');
      }
    },
  });
  if (p.isCancel(token)) {
    p.outro(t('cancel_generic'));
    return;
  }
  const resolvedToken = token || defaultToken;

  // 4. Jira Project Key
  const projectKey = await p.text({
    message: t('jira_project_prompt'),
    initialValue: defaultProjectKey,
    validate(value) {
      if (!value || value.trim().length === 0) {
        return t('jira_project_required');
      }
    },
  });
  if (p.isCancel(projectKey)) {
    p.outro(t('cancel_generic'));
    return;
  }

  // 5. Select save scope
  const scope = await p.select({
    message: t('jira_save_scope_prompt'),
    options: [
      { value: 'local', label: 'Local neste projeto (sophiAgents/config.json)' },
      { value: 'global', label: 'Globalmente para todos os projetos (~/.sophiacode/config.json)' },
    ],
  });
  if (p.isCancel(scope)) {
    p.outro(t('cancel_generic'));
    return;
  }

  if (scope === 'global') {
    // Save to global config
    const globalConfig = {
      ...existingGlobal,
      jira: {
        url: url.trim(),
        email: email.trim(),
        token: resolvedToken.trim(),
      },
    };
    await saveGlobalConfig(globalConfig);

    // Save projectKey locally
    existingProj.jira = {
      ...(existingProj.jira || {}),
      url: url.trim(), // Keep URL locally too for quick checks
      projectKey: projectKey.trim().toUpperCase(),
    };
    // Delete local token/email to prevent duplication if saved globally
    if (existingProj.jira.token) delete existingProj.jira.token;
    if (existingProj.jira.email) delete existingProj.jira.email;

    await saveProjectConfig(basePath, existingProj);
  } else {
    // Save everything locally
    existingProj.jira = {
      url: url.trim(),
      email: email.trim(),
      token: resolvedToken.trim(),
      projectKey: projectKey.trim().toUpperCase(),
    };
    await saveProjectConfig(basePath, existingProj);
  }

  p.outro(t('jira_success'));
}
