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

export async function runMvpCommand(basePath: string): Promise<void> {
  // 1. Verify that the context has been initialized first
  const initialized = await checkConfigExist(basePath);
  if (!initialized) {
    p.log.error('❌ Erro: O sophiaContext não está inicializado neste repositório.');
    p.log.info(
      'Execute o comando "sophiacode init" primeiro para gerar a documentação de contexto.'
    );
    return;
  }

  p.intro('📦 Criar Nova Especificação de MVP');

  // 2. Collect inputs interactively
  const name = await p.text({
    message: 'Qual o nome descritivo do MVP/Funcionalidade?',
    placeholder: 'Ex: Stripe Integration',
    validate(value) {
      if (!value || value.trim().length === 0) {
        return 'O nome do MVP é obrigatório.';
      }
    },
  });
  if (p.isCancel(name)) {
    p.outro('Operação cancelada.');
    return;
  }

  const key = await p.text({
    message: 'Qual a chave identificadora única (slug minúsculo sem espaços)?',
    placeholder: 'Ex: stripe-payments',
    validate(value) {
      if (!value || value.trim().length === 0) {
        return 'A chave do MVP é obrigatória.';
      }
      if (!/^[a-z0-9-]+$/.test(value)) {
        return 'A chave deve conter apenas letras minúsculas, números e hífens.';
      }
    },
  });
  if (p.isCancel(key)) {
    p.outro('Operação cancelada.');
    return;
  }

  const objective = await p.text({
    message: 'Qual o objetivo principal do MVP?',
    placeholder: 'Ex: Permitir que usuários façam checkout e atualizem assinaturas no banco',
    validate(value) {
      if (!value || value.trim().length === 0) {
        return 'O objetivo é obrigatório.';
      }
    },
  });
  if (p.isCancel(objective)) {
    p.outro('Operação cancelada.');
    return;
  }

  const featuresText = await p.text({
    message: 'Liste as principais features que compõem este MVP (separadas por vírgula):',
    placeholder: 'Ex: Rota de Webhook, Redirecionamento de Checkout, Validação de Assinatura',
    validate(value) {
      if (!value || value.trim().length === 0) {
        return 'Pelo menos uma feature é obrigatória.';
      }
    },
  });
  if (p.isCancel(featuresText)) {
    p.outro('Operação cancelada.');
    return;
  }

  const constraints = await p.text({
    message: 'Restrições ou Tecnologias específicas exigidas (Opcional):',
    placeholder: 'Ex: Usar Fastify e Prisma ORM, sem bibliotecas externas de Stripe adicionais',
  });
  if (p.isCancel(constraints)) {
    p.outro('Operação cancelada.');
    return;
  }

  const features = featuresText
    .split(',')
    .map((f) => f.trim())
    .filter((f) => f.length > 0);

  // 3. Setup AI Service
  const aiSpinner = p.spinner();
  aiSpinner.start('Processando dados e desenhando a especificação técnica do MVP...');

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
    aiSpinner.stop('Especificação do MVP gerada com sucesso!');

    p.log.success(`✅ Arquivo de especificação salvo: "sophiAgents/mvps/${key}.json"`);
    p.outro(
      '🎉 Concluído. Agora você pode rodar "sophiacode task" para quebrar este MVP em tarefas.'
    );
  } catch (error) {
    aiSpinner.stop('Falha na geração do MVP!');
    p.log.error(`Erro na IA: ${(error as Error).message}`);
    p.outro('A operação falhou.');
  }
}
