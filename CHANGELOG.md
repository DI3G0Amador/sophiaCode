# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-23

### Added
- Estrutura inicial do SophiaCode CLI com comandos flexíveis.
- Módulo de varredura rápida de diretórios (`scanner`) ignorando caminhos desnecessários.
- Módulo de análise estática local (`analyzer`) de tecnologias e imports de arquivos sem custo de API.
- Orquestrador de IA compatível com Google Gemini, OpenAI e provedores locais rodando no Ollama.
- Geração automatizada de pontes na raiz do projeto (`CLAUDE.md` e `AGENTS.md`) para redirecionamento.
- Suíte completa de testes automatizados com Vitest.
- Arquitetura de CI/CD rigorosa para testes e publicação automatizada via GitHub Actions.
