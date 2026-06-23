import * as p from '@clack/prompts';
import {
  checkConfigExist,
  readProjectConfig,
  readMapFile,
  saveMvpConfig,
} from '../core/fs/writer.js';
import { createAIService } from '../core/ai/providers.js';
import { MVP_SYSTEM_PROMPT, buildMvpPrompt, MVP_SCHEMA } from '../core/ai/prompts.js';
import { getApiKey } from '../core/fs/global-config.js';
import { t } from '../core/i18n.js';

export async function runMvpCommand(basePath: string): Promise<void> {
  // 1. Verify that the context has been initialized first
  const initialized = await checkConfigExist(basePath);
  if (!initialized) {
    p.log.error(t('mvp_error_init'));
    return;
  }

  p.intro(t('mvp_intro'));

  // 2. Collect inputs interactively
  const name = await p.text({
    message: t('mvp_name_prompt'),
    placeholder: 'Ex: Stripe Integration',
    validate(value) {
      if (!value || value.trim().length === 0) {
        return t('mvp_name_validation');
      }
    },
  });
  if (p.isCancel(name)) {
    p.outro(t('cancel_generic'));
    return;
  }

  const key = await p.text({
    message: t('mvp_key_prompt'),
    placeholder: 'Ex: stripe-payments',
    validate(value) {
      if (!value || value.trim().length === 0) {
        return t('mvp_key_validation');
      }
      if (!/^[a-z0-9-]+$/.test(value)) {
        return t('mvp_key_regex_error');
      }
    },
  });
  if (p.isCancel(key)) {
    p.outro(t('cancel_generic'));
    return;
  }

  const objective = await p.text({
    message: t('mvp_objective_prompt'),
    placeholder: 'Ex: Permitir que usuários façam checkout e atualizem assinaturas no banco',
    validate(value) {
      if (!value || value.trim().length === 0) {
        return t('mvp_objective_validation');
      }
    },
  });
  if (p.isCancel(objective)) {
    p.outro(t('cancel_generic'));
    return;
  }

  const featuresText = await p.text({
    message: t('mvp_features_prompt'),
    placeholder: 'Ex: Rota de Webhook, Redirecionamento de Checkout, Validação de Assinatura',
    validate(value) {
      if (!value || value.trim().length === 0) {
        return t('mvp_features_validation');
      }
    },
  });
  if (p.isCancel(featuresText)) {
    p.outro(t('cancel_generic'));
    return;
  }

  const constraints = await p.text({
    message: t('mvp_constraints_prompt'),
    placeholder: 'Ex: Usar Fastify e Prisma ORM, sem bibliotecas externas de Stripe adicionais',
  });
  if (p.isCancel(constraints)) {
    p.outro(t('cancel_generic'));
    return;
  }

  const features = featuresText
    .split(',')
    .map((f) => f.trim())
    .filter((f) => f.length > 0);

  // 3. Setup AI Service
  const aiSpinner = p.spinner();
  aiSpinner.start(t('mvp_spinner'));

  try {
    const config = await readProjectConfig(basePath);
    const resolvedApiKey =
      config.provider !== 'ollama' ? await getApiKey(config.provider) : undefined;
    const architectureMap = await readMapFile(basePath);

    const aiService = createAIService({
      provider: config.provider,
      modelName: config.modelName,
      temperature: config.temperature,
      apiKey: resolvedApiKey,
    });

    const userPrompt = buildMvpPrompt(
      name,
      objective,
      features,
      constraints || 'None',
      architectureMap
    );

    const mvpResult = await aiService.generateStructured<{
      name: string;
      key: string;
      description: string;
      features: string[];
      requirements: string;
      status: string;
    }>(MVP_SYSTEM_PROMPT, userPrompt, MVP_SCHEMA);

    // Save to disk
    await saveMvpConfig(basePath, key, mvpResult);
    aiSpinner.stop(t('mvp_success'));

    p.log.success(`✅ "sophiAgents/mvps/${key}.json"`);
    p.outro(t('mvp_outro'));
  } catch (error) {
    aiSpinner.stop('Error!');
    p.log.error(`Erro na IA: ${(error as Error).message}`);
    p.outro(t('cancel_generic'));
  }
}
