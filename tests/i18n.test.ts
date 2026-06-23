import { describe, it, expect } from 'vitest';
import { I18n, t } from '../src/core/i18n.js';

describe('i18n Translation Engine', () => {
  it('should default to English language', () => {
    I18n.setLanguage('en');
    expect(I18n.getLanguage()).toBe('en');
  });

  it('should allow setting language to Portuguese', () => {
    I18n.setLanguage('pt');
    expect(I18n.getLanguage()).toBe('pt');
  });

  it('should translate simple keys correctly in English and Portuguese', () => {
    I18n.setLanguage('en');
    expect(t('welcome_intro')).toBe('Welcome to SophiaCode setup!');

    I18n.setLanguage('pt');
    expect(t('welcome_intro')).toBe('Bem-vindo à configuração do SophiaCode!');
  });

  it('should interpolate single arguments correctly', () => {
    I18n.setLanguage('en');
    expect(t('dev_read_subtasks_error', 'File not found')).toBe(
      'Could not read subtasks for this task: File not found'
    );

    I18n.setLanguage('pt');
    expect(t('dev_read_subtasks_error', 'Arquivo não encontrado')).toBe(
      'Não foi possível ler as subtasks desta tarefa: Arquivo não encontrado'
    );
  });

  it('should interpolate multiple arguments correctly', () => {
    I18n.setLanguage('en');
    expect(t('task_outro', 'Auth System', 4)).toBe(
      'Done! The MVP "Auth System" has been split into 4 tasks. Run "sophiacode dev" to manage progress.'
    );

    I18n.setLanguage('pt');
    expect(t('task_outro', 'Sistema de Autenticação', 4)).toBe(
      'Concluído! O MVP "Sistema de Autenticação" foi quebrado em 4 tarefas. Rode "sophiacode dev" para gerenciar o progresso.'
    );
  });
});
