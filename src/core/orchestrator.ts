import * as p from '@clack/prompts';
import {
  checkConfigExist,
  saveDocumentation,
  saveProjectConfig,
  readProjectConfig,
  saveRootBridgedFiles,
} from './fs/writer.js';
import { scanDirectory } from './fs/scanner.js';
import { analyzeWorkspaceLocally, formatAnalysisReport } from './fs/analyzer.js';
import { askSetupConfig } from '../commands/prompts.js';
import { createAIService } from './ai/providers.js';
import {
  DISCOVERY_SYSTEM_PROMPT,
  buildDiscoveryPrompt,
  DISCOVERY_SCHEMA,
  SYSTEM_PROMPT,
  buildContextPrompt,
  FINAL_CONTEXT_SCHEMA,
} from './ai/prompts.js';
import { getRecommendation } from './ai/recommendations.js';
import { getApiKey, saveApiKey } from './fs/global-config.js';

/**
 * Main orchestration flow for the init (sophiaContext alignment) command.
 */
export async function runInitFlow(basePath: string): Promise<void> {
  // 1. Check if the configuration files already exist
  const alreadyExists = await checkConfigExist(basePath);
  if (alreadyExists) {
    p.log.warn('⚠️ Uma configuração do sophiAgents já está presente neste diretório.');
    const overwrite = await p.confirm({
      message: 'Deseja executar a configuração novamente e sobrescrever os arquivos existentes?',
      initialValue: false,
    });

    if (p.isCancel(overwrite) || !overwrite) {
      p.outro('Configuração abortada. Os arquivos existentes foram mantidos.');
      return;
    }
  }

  // Try to load any existing config.json to prepopulate prompts on failure or overwrite
  let existingConfig: any = undefined;
  try {
    existingConfig = await readProjectConfig(basePath);
  } catch {
    // Ignore: config.json does not exist yet (normal on first run)
  }

  // 2. Collect model preferences from the user
  const setupConfig = await askSetupConfig(existingConfig);

  // 3. Resolve community recommendations for the chosen model
  const recommendation = getRecommendation(setupConfig.modelName);

  const tempProjectConfig = {
    provider: setupConfig.provider,
    modelName: setupConfig.modelName,
    temperature: recommendation.temperature,
    contextLimit: recommendation.contextLimit,
    contextStrategy: recommendation.contextStrategy,
    integrations: setupConfig.integrations,
  };

  // Immediately save the configuration placeholder to config.json.
  try {
    await saveProjectConfig(basePath, tempProjectConfig);
  } catch (error) {
    p.log.error(`Não foi possível salvar o config.json temporário: ${(error as Error).message}`);
  }

  // 4. Handle API Key resolution for cloud providers
  let resolvedApiKey: string | undefined = undefined;
  if (setupConfig.provider !== 'ollama') {
    resolvedApiKey = await getApiKey(setupConfig.provider);

    if (!resolvedApiKey) {
      p.log.warn(`🔑 A chave de API para o provedor "${setupConfig.provider}" não foi detectada.`);

      const promptKey = await p.password({
        message: `Por favor, digite sua chave de API para o provedor ${setupConfig.provider.toUpperCase()}:`,
        validate(value) {
          if (!value || value.trim().length === 0) {
            return 'A chave de API é obrigatória para prosseguir.';
          }
        },
      });

      if (p.isCancel(promptKey)) {
        p.outro('Configuração interrompida pelo usuário.');
        return;
      }

      resolvedApiKey = promptKey;

      const saveGlobally = await p.confirm({
        message:
          'Deseja salvar esta chave de API globalmente para que funcione em outros projetos?',
        initialValue: true,
      });

      if (p.isCancel(saveGlobally)) {
        p.outro('Configuração interrompida.');
        return;
      }

      if (saveGlobally) {
        await saveApiKey(setupConfig.provider, resolvedApiKey);
        p.log.success('Chave de API salva globalmente com sucesso!');
      }
    }
  }

  p.log.info(`🤖 Recomendações da Comunidade Aplicadas para "${setupConfig.modelName}":`);
  p.log.step(`• Estratégia de Contexto: ${tempProjectConfig.contextStrategy}`);
  p.log.step(`• Temperatura: ${tempProjectConfig.temperature}`);
  p.log.step(`• Limite de Contexto: ${tempProjectConfig.contextLimit.toLocaleString()} tokens`);

  // 5. Scan the workspace directory and run Local Static Analysis
  const scanSpinner = p.spinner();
  scanSpinner.start('Varrendo a estrutura e analisando os arquivos do projeto localmente...');

  let analysisReport = '';
  try {
    const files = await scanDirectory(basePath);
    const localAnalysis = await analyzeWorkspaceLocally(basePath, files);
    analysisReport = formatAnalysisReport(localAnalysis);
    scanSpinner.stop('Estrutura e dados do projeto mapeados e analisados localmente!');
  } catch (error) {
    scanSpinner.stop('A análise local falhou!');
    p.log.error(`Erro na análise estática: ${(error as Error).message}`);
    p.outro('A configuração falhou.');
    return;
  }

  // 6. Stage 1: AI Gap Discovery
  const discoverySpinner = p.spinner();
  discoverySpinner.start(
    'A IA do SophiaCode está analisando a estrutura para descobrir o propósito e lacunas de contexto...'
  );

  let discoveryResult: { detectedPurpose: string; questions: { id: string; question: string }[] };
  try {
    const aiService = createAIService({
      provider: setupConfig.provider,
      modelName: setupConfig.modelName,
      temperature: tempProjectConfig.temperature,
      apiKey: resolvedApiKey,
    });

    discoveryResult = await aiService.generateStructured<{
      detectedPurpose: string;
      questions: { id: string; question: string }[];
    }>(DISCOVERY_SYSTEM_PROMPT, buildDiscoveryPrompt(analysisReport), DISCOVERY_SCHEMA);
    discoverySpinner.stop('Análise de lacunas concluída!');
  } catch (error) {
    discoverySpinner.stop('A análise de lacunas por IA falhou!');
    p.log.error(`Erro: ${(error as Error).message}`);
    p.outro('A configuração falhou.');
    return;
  }

  // 7. Interactive Questionnaire
  p.log.info('✨ Propósito Detectado pela IA:');
  p.log.step(discoveryResult.detectedPurpose);

  const adjustedPurpose = await p.text({
    message: 'Confirme ou ajuste o propósito geral detectado para o projeto:',
    initialValue: discoveryResult.detectedPurpose,
    validate(value) {
      if (!value || value.trim().length === 0) {
        return 'O propósito do projeto é obrigatório.';
      }
    },
  });

  if (p.isCancel(adjustedPurpose)) {
    p.outro('Configuração interrompida pelo usuário.');
    return;
  }

  const answers: { question: string; answer: string }[] = [];
  p.log.info('🎯 Responda a 3 perguntas chave para fechar lacunas e evitar contexto fraco:');

  for (let i = 0; i < discoveryResult.questions.length; i++) {
    const q = discoveryResult.questions[i];
    const answer = await p.text({
      message: `[${i + 1}/3] ${q.question}`,
      validate(value) {
        if (!value || value.trim().length === 0) {
          return 'Esta resposta é obrigatória para garantir um contexto forte.';
        }
      },
    });

    if (p.isCancel(answer)) {
      p.outro('Configuração interrompida pelo usuário.');
      return;
    }

    answers.push({ question: q.question, answer });
  }

  // 8. Stage 2: Final Context Generation
  const contextSpinner = p.spinner();
  contextSpinner.start(
    'Processando suas respostas e gerando os arquivos de diretrizes finais (sophiaContext)...'
  );

  try {
    const aiService = createAIService({
      provider: setupConfig.provider,
      modelName: setupConfig.modelName,
      temperature: tempProjectConfig.temperature,
      apiKey: resolvedApiKey,
    });

    const finalContext = await aiService.generateStructured<{
      architectureContent: string;
      patternsContent: string;
      claudeContent: string;
      rootAgentsContent: string;
    }>(
      SYSTEM_PROMPT,
      buildContextPrompt(adjustedPurpose, answers, analysisReport),
      FINAL_CONTEXT_SCHEMA
    );

    contextSpinner.stop('Diretrizes e contexto do repositório gerados com sucesso!');

    // 9. Persist the generated files and final config on disk
    const saveSpinner = p.spinner();
    saveSpinner.start('Gravando documentação do sophiaContext e pontes de agentes...');

    // Save context files (architecture.md and coding-patterns.md) under context/
    await saveDocumentation(
      basePath,
      finalContext.architectureContent,
      finalContext.patternsContent
    );

    // Save root bridges (CLAUDE.md and AGENTS.md)
    await saveRootBridgedFiles(
      basePath,
      finalContext.claudeContent,
      finalContext.rootAgentsContent,
      setupConfig.integrations
    );

    // Save final configuration including purpose and alignment QA
    const finalProjectConfig = {
      ...tempProjectConfig,
      detectedPurpose: adjustedPurpose,
      alignmentQA: answers,
    };
    await saveProjectConfig(basePath, finalProjectConfig);

    saveSpinner.stop('Arquivos de contexto e pontes gravados no disco!');
    p.outro('🎉 SophiaCode inicializado com sucesso! Contexto gerado na pasta "sophiAgents/".');
  } catch (error) {
    contextSpinner.stop('A geração do sophiaContext falhou!');
    p.log.error(`Erro: ${(error as Error).message}`);
    p.outro('A configuração falhou.');
  }
}
