import * as p from '@clack/prompts';
import { AIProvider } from '../core/fs/global-config.js';
import { t } from '../core/i18n.js';

export interface SetupConfig {
  provider: AIProvider;
  modelName: string;
}

/**
 * Initiates an interactive terminal questionnaire to collect provider preferences.
 * Accepts defaultValues to prepopulate prompts if the user has already ran setup.
 */
export async function askSetupConfig(defaultValues?: Partial<SetupConfig>): Promise<SetupConfig> {
  p.intro(t('welcome_intro'));

  const config = await p.group(
    {
      provider: () =>
        p.select({
          message: t('provider_select'),
          initialValue: defaultValues?.provider || 'gemini',
          options: [
            {
              value: 'gemini',
              label: 'Google Gemini (Nuvem - recomendado)',
              hint: 'Requer GEMINI_API_KEY',
            },
            { value: 'openai', label: 'OpenAI (Nuvem)', hint: 'Requer OPENAI_API_KEY' },
            {
              value: 'ollama',
              label: 'Ollama (Local / Offline)',
              hint: 'Requer o Ollama rodando localmente',
            },
          ],
        }),

      modelName: ({ results }) => {
        let defaultModel = 'gemini-2.5-flash';
        let placeholder = 'Ex: gemini-2.5-flash, gemini-2.5-pro';

        if (results.provider === 'openai') {
          defaultModel = 'gpt-4o-mini';
          placeholder = 'Ex: gpt-4o, gpt-4o-mini';
        } else if (results.provider === 'ollama') {
          defaultModel = 'qwen2.5-coder:7b';
          placeholder = 'Ex: qwen2.5-coder:7b, llama3:8b';
        }

        // If the user previously selected the same provider, keep their chosen model name
        const initialModel =
          defaultValues?.provider === results.provider ? defaultValues?.modelName : undefined;

        return p.text({
          message: t('model_name_prompt'),
          placeholder,
          initialValue: initialModel || defaultModel,
        });
      },
    },
    {
      // Gracefully handle terminal exit (Ctrl+C)
      onCancel: () => {
        p.cancel(t('cancel_generic'));
        process.exit(0);
      },
    }
  );

  return config as SetupConfig;
}
