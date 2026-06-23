import * as p from '@clack/prompts';
import { readGlobalConfig, saveGlobalConfig } from './fs/global-config.js';

export type TranslationKeys =
  | 'welcome_intro'
  | 'provider_select'
  | 'model_name_prompt'
  | 'integrations_select'
  | 'init_overwrite_warn'
  | 'init_overwrite_confirm'
  | 'init_overwrite_cancel'
  | 'config_save_error'
  | 'api_key_warn'
  | 'api_key_prompt'
  | 'api_key_prompt_validation'
  | 'save_global_key_prompt'
  | 'api_key_saved'
  | 'community_recommendations'
  | 'recommendation_strategy'
  | 'recommendation_temp'
  | 'recommendation_limit'
  | 'scanner_start'
  | 'scanner_success'
  | 'scanner_fail'
  | 'scan_error_prefix'
  | 'discovery_start'
  | 'discovery_success'
  | 'discovery_fail'
  | 'discovery_error_prefix'
  | 'detected_purpose_title'
  | 'purpose_adjust_prompt'
  | 'purpose_required'
  | 'questions_intro'
  | 'questions_validation'
  | 'context_start'
  | 'context_success'
  | 'context_fail'
  | 'generation_error_prefix'
  | 'writer_start'
  | 'writer_success'
  | 'init_success'
  | 'mvp_error_init'
  | 'mvp_intro'
  | 'mvp_name_prompt'
  | 'mvp_name_validation'
  | 'mvp_key_prompt'
  | 'mvp_key_validation'
  | 'mvp_key_regex_error'
  | 'mvp_objective_prompt'
  | 'mvp_objective_validation'
  | 'mvp_features_prompt'
  | 'mvp_features_validation'
  | 'mvp_constraints_prompt'
  | 'mvp_spinner'
  | 'mvp_success'
  | 'mvp_outro'
  | 'task_error_init'
  | 'task_error_mvp'
  | 'task_intro'
  | 'task_select_prompt'
  | 'task_spinner_read'
  | 'task_spinner_ai'
  | 'task_spinner_save'
  | 'task_success'
  | 'task_outro'
  | 'dev_error_init'
  | 'dev_error_tasks'
  | 'dev_intro'
  | 'dev_select_prompt'
  | 'dev_checklist_prompt'
  | 'dev_save_success'
  | 'dev_next_step'
  | 'dev_all_completed'
  | 'dev_outro'
  | 'dev_error_init_instruction'
  | 'dev_error_tasks_instruction'
  | 'dev_read_subtasks_error'
  | 'dev_fail_generic'
  | 'dev_no_subtasks'
  | 'dev_done'
  | 'dev_save_error'
  | 'dev_next_instruction_title'
  | 'dev_next_instruction_content'
  | 'task_error_init_instruction'
  | 'task_error_mvp_instruction'
  | 'task_read_success'
  | 'task_read_fail'
  | 'task_ai_success'
  | 'task_generated_step'
  | 'task_ai_fail'
  | 'task_fail_generic'
  | 'skill_error_init'
  | 'skill_error_init_instruction'
  | 'skill_intro'
  | 'skill_confirm'
  | 'skill_select'
  | 'skill_success'
  | 'skill_outro'
  | 'skill_sqlite_label'
  | 'skill_sqlite_hint'
  | 'skill_fs_label'
  | 'skill_fs_hint'
  | 'skill_web_label'
  | 'skill_web_hint'
  | 'skill_script_label'
  | 'skill_script_hint'
  | 'skill_sqlite_success'
  | 'skill_fs_success'
  | 'skill_web_success'
  | 'skill_script_success'
  | 'skill_script_content'
  | 'cancel_generic';

export const TRANSLATIONS: Record<
  'en' | 'pt',
  Record<TranslationKeys, string | ((...args: any[]) => string)>
> = {
  en: {
    welcome_intro: 'Welcome to SophiaCode setup!',
    provider_select: 'Which AI Provider do you want to use?',
    model_name_prompt: 'What is the specific AI model name you want to use?',
    integrations_select:
      'Do you want to create integration bridges in the project root for other agents?',
    init_overwrite_warn: 'A sophiAgents configuration is already present in this directory.',
    init_overwrite_confirm: 'Do you want to run setup again and overwrite existing files?',
    init_overwrite_cancel: 'Configuration aborted. Existing files were kept.',
    config_save_error: 'Could not save temporary config.json: {0}',
    api_key_warn: 'API key for provider "{0}" was not detected.',
    api_key_prompt: 'Please enter your API Key for provider {0}:',
    api_key_prompt_validation: 'API Key is required to proceed.',
    save_global_key_prompt:
      'Do you want to save this API Key globally so it works in other projects?',
    api_key_saved: 'API Key saved globally successfully!',
    community_recommendations: 'Community Recommendations Applied for "{0}":',
    recommendation_strategy: '• Context Strategy: {0}',
    recommendation_temp: '• Temperature: {0}',
    recommendation_limit: '• Context Limit: {0} tokens',
    scanner_start: 'Scanning directory tree and analyzing files locally...',
    scanner_success: 'Workspace tree structure mapped and analyzed locally!',
    scanner_fail: 'Local static analysis failed!',
    scan_error_prefix: 'Error during static analysis: {0}',
    discovery_start: 'AI is analyzing workspace to discover purpose and context gaps...',
    discovery_success: 'Gap analysis completed!',
    discovery_fail: 'AI gap discovery failed!',
    discovery_error_prefix: 'Error: {0}',
    detected_purpose_title: 'Purpose Detected by AI:',
    purpose_adjust_prompt: 'Confirm or adjust the general purpose detected for the project:',
    purpose_required: 'Project purpose is required.',
    questions_intro: 'Answer 3 key questions to close gaps and avoid weak context:',
    questions_validation: 'This answer is required to ensure a strong context.',
    context_start: 'Processing your answers and generating final guidelines (sophiaContext)...',
    context_success: 'Guidelines and repository context successfully generated!',
    context_fail: 'sophiaContext generation failed!',
    generation_error_prefix: 'Error: {0}',
    writer_start: 'Writing sophiaContext documentation and agent bridges...',
    writer_success: 'Context files and bridges written to disk!',
    init_success:
      'SophiaCode initialized successfully! Context generated in the "sophiAgents/" directory.',
    mvp_error_init: 'Error: sophiaContext is not initialized in this repository.',
    mvp_intro: 'Create New MVP Specification',
    mvp_name_prompt: 'What is the descriptive name of the MVP/Feature?',
    mvp_name_validation: 'MVP name is required.',
    mvp_key_prompt: 'What is the unique identifying key (lowercase slug without spaces)?',
    mvp_key_validation: 'MVP key is required.',
    mvp_key_regex_error: 'The key must contain only lowercase letters, numbers, and hyphens.',
    mvp_objective_prompt: 'What is the main objective of this MVP?',
    mvp_objective_validation: 'Objective is required.',
    mvp_features_prompt: 'List the main features that make up this MVP (comma-separated):',
    mvp_features_validation: 'At least one feature is required.',
    mvp_constraints_prompt: 'Any specific constraints or technologies required (Optional):',
    mvp_spinner: 'Processing data and designing the MVP technical specification...',
    mvp_success: 'MVP specification generated successfully!',
    mvp_outro: 'Done. You can now run "sophiacode task" to break this MVP into tasks.',
    task_error_init: 'Error: sophiaContext is not initialized in this repository.',
    task_error_mvp: 'No MVP specifications found in "sophiAgents/mvps/".',
    task_intro: 'Planning MVP into Tasks (Backlog Breakdown)',
    task_select_prompt: 'Select which MVP you want to plan/break down into tasks:',
    task_spinner_read: 'Reading local architecture maps and MVP specs...',
    task_spinner_ai: 'AI is analyzing architecture to break down MVP into plans and checklists...',
    task_spinner_save: 'Saving action plans and checklists to disk...',
    task_success: 'Backlog structure and checklists generated successfully!',
    task_outro:
      'Done! The MVP "{0}" has been split into {1} tasks. Run "sophiacode dev" to manage progress.',
    dev_error_init: 'Error: sophiaContext is not initialized in this repository.',
    dev_error_tasks: 'No planned tasks found under "sophiAgents/tasks/".',
    dev_intro: 'Engineer Mode - Task Execution',
    dev_select_prompt: 'Select which task you want to develop or monitor:',
    dev_checklist_prompt: 'Select completed subtasks (press space to toggle):',
    dev_save_success: 'Subtask checklist updated successfully!',
    dev_next_step: 'Next Subtask to resolve:',
    dev_all_completed: 'Excellent! All subtasks for this task have been completed.',
    dev_outro: 'Progress saved.',
    dev_error_init_instruction: 'Run the command "sophiacode init" first.',
    dev_error_tasks_instruction: 'Plan an MVP first by running the command "sophiacode task".',
    dev_read_subtasks_error: 'Could not read subtasks for this task: {0}',
    dev_fail_generic: 'Operation failed.',
    dev_no_subtasks: 'This task does not contain cataloged subtasks.',
    dev_done: 'Completed.',
    dev_save_error: 'Error saving changes: {0}',
    dev_next_instruction_title: 'Orchestration Instructions',
    dev_next_instruction_content:
      "Instruction for the AI (Claude Code / Cursor / OpenCode):\n\"Read the detailed plan in 'sophiAgents/tasks/{0}/plan.md'\nand execute the steps to complete the subtask: '{1}'.\"",
    task_error_init_instruction:
      'Run the command "sophiacode init" first to generate context documentation.',
    task_error_mvp_instruction: 'Create an MVP first by running the command "sophiacode mvp".',
    task_read_success: 'Local files and rules read successfully!',
    task_read_fail: 'Failed to read local sophiaContext files!',
    task_ai_success: 'Detailed task plan successfully generated by AI!',
    task_generated_step: '• Generated: "sophiAgents/tasks/task-{0}-{1}/plan.md"',
    task_ai_fail: 'Task breakdown failed!',
    task_fail_generic: 'Operation failed.',
    skill_error_init: 'Error: sophiaContext is not initialized in this repository.',
    skill_error_init_instruction: 'Run the command "sophiacode init" first.',
    skill_intro: 'Skills Setup (Automations & MCP)',
    skill_confirm: 'Do you want to configure or initialize a local/remote MCP server template?',
    skill_select: 'Select which MCP server template to initialize:',
    skill_success: 'Template saved successfully!',
    skill_outro: 'Skills configuration completed.',
    skill_sqlite_label: 'SQLite Explorer',
    skill_sqlite_hint: 'Provides SQL query tools for local SQLite databases',
    skill_fs_label: 'Local Filesystem',
    skill_fs_hint: 'Allows restricted read/write of specific directories by the agent',
    skill_web_label: 'Web Search',
    skill_web_hint: 'Enables web searching to retrieve up-to-date references and documentation',
    skill_script_label: 'Custom Automation Script',
    skill_script_hint: 'Generates a shell script for the agent to run pre-approved commands',
    skill_sqlite_success:
      'SQLite MCP template saved successfully in "sophiAgents/skills/mcp-config.json"',
    skill_fs_success:
      'Filesystem MCP template saved successfully in "sophiAgents/skills/mcp-config.json"',
    skill_web_success:
      'Brave Search MCP template saved successfully in "sophiAgents/skills/mcp-config.json"',
    skill_script_success: 'Custom script generated at "sophiAgents/skills/verify-quality.sh"',
    skill_script_content:
      '#!/bin/bash\n# Automation script for pre-approved repetitive tasks\n# The AI can run this script to execute local builds or migrations\n\necho "Running local code validation..."\nnpm run lint && npm run typecheck\nif [ $? -eq 0 ]; then\n  echo "All clean!"\nelse\n  echo "Found static analysis issues. Correct them before committing."\n  exit 1\nfi\n',
    cancel_generic: 'Operation cancelled.',
  },
  pt: {
    welcome_intro: 'Bem-vindo à configuração do SophiaCode!',
    provider_select: 'Qual Provedor de IA você deseja usar?',
    model_name_prompt: 'Qual o nome do modelo de IA específico que deseja usar?',
    integrations_select:
      'Deseja criar pontes de integração na raiz do projeto para outros agentes?',
    init_overwrite_warn: 'Uma configuração do sophiAgents já está presente neste diretório.',
    init_overwrite_confirm:
      'Deseja executar a configuração novamente e sobrescrever os arquivos existentes?',
    init_overwrite_cancel: 'Configuração abortada. Os arquivos existentes foram mantidos.',
    config_save_error: 'Não foi possível salvar o config.json temporário: {0}',
    api_key_warn: 'A chave de API para o provedor "{0}" não foi detectada.',
    api_key_prompt: 'Por favor, digite sua chave de API para o provedor {0}:',
    api_key_prompt_validation: 'A chave de API é obrigatória para prosseguir.',
    save_global_key_prompt:
      'Deseja salvar esta chave de API globalmente para que funcione em outros projetos?',
    api_key_saved: 'Chave de API salva globalmente com sucesso!',
    community_recommendations: 'Recomendações da Comunidade Aplicadas para "{0}":',
    recommendation_strategy: '• Estratégia de Contexto: {0}',
    recommendation_temp: '• Temperatura: {0}',
    recommendation_limit: '• Limite de Contexto: {0} tokens',
    scanner_start: 'Varrendo a estrutura e analisando os arquivos do projeto localmente...',
    scanner_success: 'Estrutura e dados do projeto mapeados e analisados localmente!',
    scanner_fail: 'A análise local falhou!',
    scan_error_prefix: 'Erro na análise estática: {0}',
    discovery_start:
      'A IA está analisando a estrutura para descobrir o propósito e lacunas de contexto...',
    discovery_success: 'Análise de lacunas concluída!',
    discovery_fail: 'A análise de lacunas por IA falhou!',
    discovery_error_prefix: 'Erro: {0}',
    detected_purpose_title: 'Propósito Detectado pela IA:',
    purpose_adjust_prompt: 'Confirme ou ajuste o propósito geral detectado para o projeto:',
    purpose_required: 'O propósito do projeto é obrigatório.',
    questions_intro: 'Responda a 3 perguntas chave para fechar lacunas e evitar contexto fraco:',
    questions_validation: 'Esta resposta é obrigatória para garantir um contexto forte.',
    context_start:
      'Processando suas respostas e gerando os arquivos de diretrizes finais (sophiaContext)...',
    context_success: 'Diretrizes e contexto do repositório gerados com sucesso!',
    context_fail: 'A geração do sophiaContext falhou!',
    generation_error_prefix: 'Erro: {0}',
    writer_start: 'Gravando documentação do sophiaContext e pontes de agentes...',
    writer_success: 'Arquivos de contexto e pontes gravados no disco!',
    init_success: 'SophiaCode inicializado com sucesso! Contexto gerado na pasta "sophiAgents/".',
    mvp_error_init: 'Erro: O sophiaContext não está inicializado neste repositório.',
    mvp_intro: 'Criar Nova Especificação de MVP',
    mvp_name_prompt: 'Qual o nome descritivo do MVP/Funcionalidade?',
    mvp_name_validation: 'O nome do MVP é obrigatório.',
    mvp_key_prompt: 'Qual a chave identificadora única (slug minúsculo sem espaços)?',
    mvp_key_validation: 'A chave do MVP é obrigatória.',
    mvp_key_regex_error: 'A chave deve conter apenas letras minúsculas, números e hífens.',
    mvp_objective_prompt: 'Qual o objetivo principal do MVP?',
    mvp_objective_validation: 'O objetivo é obrigatório.',
    mvp_features_prompt:
      'Liste as principais features que compõem este MVP (separadas por vírgula):',
    mvp_features_validation: 'Pelo menos uma feature é obrigatória.',
    mvp_constraints_prompt: 'Restrições ou Tecnologias específicas exigidas (Opcional):',
    mvp_spinner: 'Processando dados e desenhando a especificação técnica do MVP...',
    mvp_success: 'Especificação do MVP gerada com sucesso!',
    mvp_outro:
      'Concluído. Agora você pode rodar "sophiacode task" para quebrar este MVP em tarefas.',
    task_error_init: 'Erro: O sophiaContext não está inicializado neste repositório.',
    task_error_mvp: 'Nenhuma especificação de MVP encontrada em "sophiAgents/mvps/".',
    task_intro: 'Planejamento de MVP em Tarefas (Backlog Breakdown)',
    task_select_prompt: 'Selecione qual MVP deseja planejar/quebrar em tasks:',
    task_spinner_read: 'Lendo a arquitetura e buscando a especificação do MVP...',
    task_spinner_ai:
      'A IA está analisando a arquitetura para quebrar o MVP em planos de ação e checklists...',
    task_spinner_save: 'Salvando planos de ação e listas de tarefas no disco...',
    task_success: 'Backlog estruturado e checklists gerados com sucesso!',
    task_outro:
      'Concluído! O MVP "{0}" foi quebrado em {1} tarefas. Rode "sophiacode dev" para gerenciar o progresso.',
    dev_error_init: 'Erro: O sophiaContext não está inicializado neste repositório.',
    dev_error_tasks: 'Nenhuma tarefa planejada encontrada em "sophiAgents/tasks/".',
    dev_intro: 'Modo Engenheiro - Execução de Tarefas',
    dev_select_prompt: 'Selecione qual tarefa deseja desenvolver ou acompanhar:',
    dev_checklist_prompt:
      'Selecione as subtasks concluídas (pressione espaço para marcar/desmarcar):',
    dev_save_success: 'Checklist de subtasks atualizado com sucesso!',
    dev_next_step: 'Próxima Subtask a ser resolvida:',
    dev_all_completed: 'Excelente! Todas as subtasks desta tarefa foram marcadas como concluídas.',
    dev_outro: 'Progresso salvo.',
    dev_error_init_instruction: 'Execute o comando "sophiacode init" primeiro.',
    dev_error_tasks_instruction: 'Planeje um MVP primeiro rodando o comando "sophiacode task".',
    dev_read_subtasks_error: 'Não foi possível ler as subtasks desta tarefa: {0}',
    dev_fail_generic: 'A operação falhou.',
    dev_no_subtasks: 'Esta tarefa não contém subtasks catalogadas.',
    dev_done: 'Concluído.',
    dev_save_error: 'Erro ao gravar as alterações: {0}',
    dev_next_instruction_title: 'Instruções de Orquestração',
    dev_next_instruction_content:
      "Instrução para a IA (Claude Code / Cursor / OpenCode):\n\"Leia o plano detalhado em 'sophiAgents/tasks/{0}/plan.md'\ne execute os passos para completar a subtask: '{1}'.\"",
    task_error_init_instruction:
      'Execute o comando "sophiacode init" primeiro para gerar a documentação de contexto.',
    task_error_mvp_instruction: 'Crie um MVP primeiro rodando o comando "sophiacode mvp".',
    task_read_success: 'Arquivos e regras locais lidos com sucesso!',
    task_read_fail: 'Falha ao ler os arquivos locais do sophiaContext!',
    task_ai_success: 'Plano de tarefas detalhado gerado com sucesso pela IA!',
    task_generated_step: '• Gerada: "sophiAgents/tasks/task-{0}-{1}/plan.md"',
    task_ai_fail: 'A quebra de tarefas falhou!',
    task_fail_generic: 'A operação falhou.',
    skill_error_init: 'Erro: O sophiaContext não está inicializado neste repositório.',
    skill_error_init_instruction: 'Execute o comando "sophiacode init" primeiro.',
    skill_intro: 'Configuração de Skills (Automações & MCP)',
    skill_confirm:
      'Deseja configurar ou inicializar um template de servidor MCP (Model Context Protocol)?',
    skill_select: 'Selecione qual template de servidor MCP deseja inicializar:',
    skill_success: 'Template de MCP salvo com sucesso!',
    skill_outro: 'Configuração de Skills concluída.',
    skill_sqlite_label: 'SQLite Explorer',
    skill_sqlite_hint: 'Provê ferramentas de consulta SQL a bancos de dados SQLite locais',
    skill_fs_label: 'Sistema de Arquivos Local',
    skill_fs_hint: 'Permite leitura/escrita restrita de diretórios específicos pelo agente',
    skill_web_label: 'Busca na Web',
    skill_web_hint:
      'Habilita buscas na internet para buscar referências e documentações atualizadas',
    skill_script_label: 'Script de Automação Customizado',
    skill_script_hint: 'Gera um script shell para que o agente rode comandos pré-aprovados',
    skill_sqlite_success:
      'Template de MCP SQLite salvo com sucesso em "sophiAgents/skills/mcp-config.json"',
    skill_fs_success:
      'Template de MCP Filesystem salvo com sucesso em "sophiAgents/skills/mcp-config.json"',
    skill_web_success:
      'Template de MCP Brave Search salvo com sucesso em "sophiAgents/skills/mcp-config.json"',
    skill_script_success: 'Script customizado gerado em "sophiAgents/skills/verify-quality.sh"',
    skill_script_content:
      '#!/bin/bash\n# Script de automação para tarefas repetitivas pré-aprovadas\n# A IA pode executar este script para rodar builds locais ou migrations\n\necho "Executando validação de código local..."\nnpm run lint && npm run typecheck\nif [ $? -eq 0 ]; then\n  echo "Tudo limpo!"\nelse\n  echo "Encontrado problemas estáticos. Corrija-os antes de commitar."\n  exit 1\nfi\n',
    cancel_generic: 'Operação cancelada.',
  },
};

export class I18n {
  private static currentLang: 'en' | 'pt' = 'en';

  public static setLanguage(lang: 'en' | 'pt') {
    this.currentLang = lang;
  }

  public static getLanguage(): 'en' | 'pt' {
    return this.currentLang;
  }

  public static t(key: TranslationKeys, ...args: any[]): string {
    const val = TRANSLATIONS[this.currentLang][key] || TRANSLATIONS['en'][key];
    if (typeof val === 'function') {
      return val(...args);
    }
    if (args.length > 0) {
      let str = val;
      for (let i = 0; i < args.length; i++) {
        str = str.replace(`{${i}}`, String(args[i]));
      }
      return str;
    }
    return val;
  }
}

export const t = (key: TranslationKeys, ...args: any[]) => I18n.t(key, ...args);

/**
 * Ensures the language configuration is loaded from global config.
 * Prompts user to select preferred language if not yet set, storing it globally.
 */
export async function ensureLanguageResolved(): Promise<void> {
  const globalConfig = await readGlobalConfig();
  let lang = globalConfig.language;

  if (!lang) {
    p.intro('SophiaCode Language Setup');
    const selected = await p.select({
      message: 'Select default language / Selecione o idioma padrão:',
      options: [
        { value: 'en', label: 'English' },
        { value: 'pt', label: 'Português (Brasil)' },
      ],
    });

    if (p.isCancel(selected)) {
      p.cancel('Setup cancelled / Configuração cancelada.');
      process.exit(0);
    }

    lang = selected as 'en' | 'pt';
    globalConfig.language = lang;
    await saveGlobalConfig(globalConfig);
  }

  I18n.setLanguage(lang);
}
