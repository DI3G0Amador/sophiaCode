import * as p from '@clack/prompts';
import { checkConfigExist, saveDocumentation, saveProjectConfig, readProjectConfig, saveRootBridgedFiles } from '../fs/writer.js';
import { scanDirectory } from '../fs/scanner.js';
import { analyzeWorkspaceLocally, formatAnalysisReport } from '../fs/analyzer.js';
import { askSetupConfig } from '../cli/prompts.js';
import { createAIService } from '../ai/providers.js';
import { SYSTEM_PROMPT, buildUserPrompt } from '../ai/prompts.js';
import { getRecommendation } from '../ai/recommendations.js';
import { getApiKey, saveApiKey } from '../fs/global-config.js';

/**
 * Main orchestration flow for the /init command.
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

  // 2. Collect guidelines and model preferences from the user, pre-populated with existing configs if available
  const setupConfig = await askSetupConfig(existingConfig);

  // 3. Resolve community recommendations for the chosen model
  const recommendation = getRecommendation(setupConfig.modelName);
  
  const projectConfig = {
    provider: setupConfig.provider,
    modelName: setupConfig.modelName,
    temperature: recommendation.temperature,
    contextLimit: recommendation.contextLimit,
    contextStrategy: recommendation.contextStrategy,
    // Preserve the user guidelines inside config.json so they can be reloaded next time
    objective: setupConfig.objective,
    outOfScope: setupConfig.outOfScope,
    acceptableErrors: setupConfig.acceptableErrors,
    integrations: setupConfig.integrations,
  };

  // Immediately save the configuration to config.json.
  // This ensures that even if AI generation fails, the user's answers are saved for next time!
  try {
    await saveProjectConfig(basePath, projectConfig);
  } catch (error) {
    p.log.error(`Não foi possível salvar o config.json temporário: ${(error as Error).message}`);
  }

  // 4. Handle API Key resolution for cloud providers (Ollama runs locally and does not require keys)
  let resolvedApiKey: string | undefined = undefined;
  if (projectConfig.provider !== 'ollama') {
    resolvedApiKey = await getApiKey(projectConfig.provider);

    if (!resolvedApiKey) {
      p.log.warn(`🔑 A chave de API para o provedor "${projectConfig.provider}" não foi detectada.`);
      
      const promptKey = await p.password({
        message: `Por favor, digite sua chave de API para o provedor ${projectConfig.provider.toUpperCase()}:`,
        validate(value) {
          if (!value || value.trim().length === 0) {
            return 'A chave de API é obrigatória para prosseguir.';
          }
        }
      });

      if (p.isCancel(promptKey)) {
        p.outro('Configuração interrompida pelo usuário.');
        return;
      }

      resolvedApiKey = promptKey;

      // Ask if the user wants to save it globally in ~/.sophiacode/config.json
      const saveGlobally = await p.confirm({
        message: 'Deseja salvar esta chave de API globalmente para que funcione em outros projetos?',
        initialValue: true,
      });

      if (p.isCancel(saveGlobally)) {
        p.outro('Configuração interrompida.');
        return;
      }

      if (saveGlobally) {
        await saveApiKey(projectConfig.provider, resolvedApiKey);
        p.log.success('Chave de API salva globalmente com sucesso!');
      }
    }
  }

  p.log.info(`🤖 Recomendações da Comunidade Aplicadas para "${setupConfig.modelName}":`);
  p.log.step(`• Estratégia de Contexto: ${projectConfig.contextStrategy}`);
  p.log.step(`• Temperatura: ${projectConfig.temperature}`);
  p.log.step(`• Limite de Contexto: ${projectConfig.contextLimit.toLocaleString()} tokens`);
  p.log.step(`• Detalhes: ${recommendation.description}`);

  // 5. Scan the workspace directory and run Local Static Analysis
  const scanSpinner = p.spinner();
  scanSpinner.start('Varrendo a estrutura e analisando os arquivos do projeto localmente...');
  
  try {
    const files = await scanDirectory(basePath);
    const localAnalysis = await analyzeWorkspaceLocally(basePath, files);
    const analysisReport = formatAnalysisReport(localAnalysis);
    
    scanSpinner.stop('Estrutura e dados do projeto mapeados e analisados localmente!');

    // 6. Generate configurations via the chosen AI Provider
    const aiSpinner = p.spinner();
    aiSpinner.start(`A IA do SophiaCode (${projectConfig.modelName}) está processando a análise estática e gerando os arquivos de diretrizes...`);

    try {
      // Instantiate the decoupled AI service adapter, passing the resolved API key
      const aiService = createAIService({
        provider: projectConfig.provider,
        modelName: projectConfig.modelName,
        temperature: projectConfig.temperature,
        apiKey: resolvedApiKey,
      });

      // Build the prompt containing the local analysis report instead of raw directory tree
      const userPrompt = buildUserPrompt(setupConfig, analysisReport);

      const responseSchema = {
        type: 'OBJECT',
        properties: {
          mapContent: { 
            type: 'STRING',
            description: 'The complete markdown content for MAP.md'
          },
          agentsContent: { 
            type: 'STRING',
            description: 'The complete markdown content for Agents.md'
          },
          claudeContent: {
            type: 'STRING',
            description: 'The complete markdown content for CLAUDE.md in the project root'
          },
          rootAgentsContent: {
            type: 'STRING',
            description: 'The complete markdown content for AGENTS.md in the project root'
          }
        },
        required: ['mapContent', 'agentsContent', 'claudeContent', 'rootAgentsContent']
      };

      // Ask LLM to generate the files conforming to the structured schema
      const documentation = await aiService.generateStructured<{ 
        mapContent: string; 
        agentsContent: string;
        claudeContent: string;
        rootAgentsContent: string;
      }>(
        SYSTEM_PROMPT,
        userPrompt,
        responseSchema
      );

      aiSpinner.stop('Documentação gerada com sucesso pela IA!');

      // 7. Persist the generated files on disk
      const saveSpinner = p.spinner();
      saveSpinner.start('Salvando arquivos de documentação e pontes com agentes locais...');
      
      // Save internal configurations
      await saveDocumentation(basePath, documentation.mapContent, documentation.agentsContent);
      
      // Save root bridged files to redirect Claude Code & OpenCode
      await saveRootBridgedFiles(
        basePath,
        documentation.claudeContent,
        documentation.rootAgentsContent,
        setupConfig.integrations
      );
      
      saveSpinner.stop('Arquivos e pontes de agentes salvos com sucesso!');

      p.outro('🎉 SophiaCode inicializado com sucesso! Verifique a pasta "sophiAgents/".');
    } catch (error) {
      aiSpinner.stop('A geração por IA falhou!');
      p.log.error(`Erro: ${(error as Error).message}`);
      p.outro('A configuração falhou.');
    }
  } catch (error) {
    scanSpinner.stop('A análise local falhou!');
    p.log.error(`Erro na análise estática: ${(error as Error).message}`);
    p.outro('A configuração falhou.');
  }
}
