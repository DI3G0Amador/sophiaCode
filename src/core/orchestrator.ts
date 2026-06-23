import * as p from '@clack/prompts';
import {
  checkConfigExist,
  saveDocumentation,
  saveProjectConfig,
  readProjectConfig,
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
import { t } from './i18n.js';

/**
 * Main orchestration flow for the init (sophiaContext alignment) command.
 */
export async function runInitFlow(basePath: string): Promise<void> {
  // 1. Check if the configuration files already exist
  const alreadyExists = await checkConfigExist(basePath);
  if (alreadyExists) {
    p.log.warn(t('init_overwrite_warn'));
    const overwrite = await p.confirm({
      message: t('init_overwrite_confirm'),
      initialValue: false,
    });

    if (p.isCancel(overwrite) || !overwrite) {
      p.outro(t('init_overwrite_cancel'));
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
    integrations: [],
  };

  // Immediately save the configuration placeholder to config.json.
  try {
    await saveProjectConfig(basePath, tempProjectConfig);
  } catch (error) {
    p.log.error(t('config_save_error', (error as Error).message));
  }

  // 4. Handle API Key resolution for cloud providers
  let resolvedApiKey: string | undefined = undefined;
  if (setupConfig.provider !== 'ollama') {
    resolvedApiKey = await getApiKey(setupConfig.provider);

    if (!resolvedApiKey) {
      p.log.warn(t('api_key_warn', setupConfig.provider));

      const promptKey = await p.password({
        message: t('api_key_prompt', setupConfig.provider.toUpperCase()),
        validate(value) {
          if (!value || value.trim().length === 0) {
            return t('api_key_prompt_validation');
          }
        },
      });

      if (p.isCancel(promptKey)) {
        p.outro(t('cancel_generic'));
        return;
      }

      resolvedApiKey = promptKey;

      const saveGlobally = await p.confirm({
        message: t('save_global_key_prompt'),
        initialValue: true,
      });

      if (p.isCancel(saveGlobally)) {
        p.outro(t('cancel_generic'));
        return;
      }

      if (saveGlobally) {
        await saveApiKey(setupConfig.provider, resolvedApiKey);
        p.log.success(t('api_key_saved'));
      }
    }
  }

  p.log.info(t('community_recommendations', setupConfig.modelName));
  p.log.step(t('recommendation_strategy', tempProjectConfig.contextStrategy));
  p.log.step(t('recommendation_temp', tempProjectConfig.temperature));
  p.log.step(t('recommendation_limit', tempProjectConfig.contextLimit.toLocaleString()));

  // 5. Scan the workspace directory and run Local Static Analysis
  const scanSpinner = p.spinner();
  scanSpinner.start(t('scanner_start'));

  let analysisReport = '';
  try {
    const files = await scanDirectory(basePath);
    const localAnalysis = await analyzeWorkspaceLocally(basePath, files);
    analysisReport = formatAnalysisReport(localAnalysis);
    scanSpinner.stop(t('scanner_success'));
  } catch (error) {
    scanSpinner.stop(t('scanner_fail'));
    p.log.error(t('scan_error_prefix', (error as Error).message));
    p.outro(t('cancel_generic'));
    return;
  }

  // 6. Stage 1: AI Gap Discovery
  const discoverySpinner = p.spinner();
  discoverySpinner.start(t('discovery_start'));

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
    discoverySpinner.stop(t('discovery_success'));
  } catch (error) {
    discoverySpinner.stop(t('discovery_fail'));
    p.log.error(t('discovery_error_prefix', (error as Error).message));
    p.outro(t('cancel_generic'));
    return;
  }

  // 7. Interactive Questionnaire
  p.log.info(t('detected_purpose_title'));
  p.log.step(discoveryResult.detectedPurpose);

  const adjustedPurpose = await p.text({
    message: t('purpose_adjust_prompt'),
    initialValue: discoveryResult.detectedPurpose,
    validate(value) {
      if (!value || value.trim().length === 0) {
        return t('purpose_required');
      }
    },
  });

  if (p.isCancel(adjustedPurpose)) {
    p.outro(t('cancel_generic'));
    return;
  }

  const answers: { question: string; answer: string }[] = [];
  p.log.info(t('questions_intro'));

  for (let i = 0; i < discoveryResult.questions.length; i++) {
    const q = discoveryResult.questions[i];
    const answer = await p.text({
      message: `[${i + 1}/3] ${q.question}`,
      validate(value) {
        if (!value || value.trim().length === 0) {
          return t('questions_validation');
        }
      },
    });

    if (p.isCancel(answer)) {
      p.outro(t('cancel_generic'));
      return;
    }

    answers.push({ question: q.question, answer });
  }

  // 8. Stage 2: Final Context Generation
  const contextSpinner = p.spinner();
  contextSpinner.start(t('context_start'));

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

    contextSpinner.stop(t('context_success'));

    // 9. Persist the generated files and final config on disk
    const saveSpinner = p.spinner();
    saveSpinner.start(t('writer_start'));

    // Save context files (architecture.md and coding-patterns.md) under context/
    await saveDocumentation(
      basePath,
      finalContext.architectureContent,
      finalContext.patternsContent
    );

    // Save final configuration including purpose and alignment QA
    const finalProjectConfig = {
      ...tempProjectConfig,
      detectedPurpose: adjustedPurpose,
      alignmentQA: answers,
    };
    await saveProjectConfig(basePath, finalProjectConfig);

    saveSpinner.stop(t('writer_success'));
    p.outro(t('init_success'));
  } catch (error) {
    contextSpinner.stop(t('context_fail'));
    p.log.error(t('generation_error_prefix', (error as Error).message));
    p.outro(t('cancel_generic'));
  }
}
