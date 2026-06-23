import * as p from '@clack/prompts';
import { AIProvider } from '../core/fs/global-config.js';

// Define a structure for the user responses
export interface UserRules {
  objective: string;
  outOfScope: string;
  acceptableErrors: string;
}

export interface SetupConfig {
  provider: AIProvider;
  modelName: string;
  integrations: ('claude' | 'opencode')[];
}

/**
 * Initiates an interactive terminal questionnaire to collect provider preferences and integrations.
 * Accepts defaultValues to prepopulate prompts if the user has already ran setup.
 */
export async function askSetupConfig(defaultValues?: Partial<SetupConfig>): Promise<SetupConfig> {
  p.intro('👋 Bem-vindo à configuração do SophiaCode!');

  const config = await p.group(
    {
      provider: () =>
        p.select({
          message: 'Qual Provedor de IA você deseja usar?',
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
          message: 'Qual o nome do modelo de IA específico que deseja usar?',
          placeholder,
          initialValue: initialModel || defaultModel,
        });
      },

      integrations: () =>
        p.multiselect({
          message: 'Deseja criar pontes de integração na raiz do projeto para outros agentes?',
          initialValues: defaultValues?.integrations || [],
          options: [
            {
              value: 'claude',
              label: 'Claude Code (Cria/Edita CLAUDE.md na raiz)',
              hint: 'Redireciona o Claude Code para o sophiAgents',
            },
            {
              value: 'opencode',
              label: 'OpenCode / Outros (Cria/Edita AGENTS.md na raiz)',
              hint: 'Redireciona o OpenCode para o sophiAgents',
            },
          ],
          required: false, // User can select none to avoid root pollution!
        }),
    },
    {
      // Gracefully handle terminal exit (Ctrl+C)
      onCancel: () => {
        p.cancel('Configuração cancelada pelo usuário.');
        process.exit(0);
      },
    }
  );

  return config as SetupConfig;
}
