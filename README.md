# SophiaCode CLI 🚀

> Gerencie o contexto, especificações (MVPs) e a memória de longo prazo do seu projeto para agentes de IA de forma automatizada e estruturada.

**SophiaCode** é uma ferramenta de linha de comando (CLI) desenvolvida para simplificar e automatizar a comunicação e o alinhamento arquitetural entre desenvolvedores humanos e agentes autônomos de IA (como Claude Code, Cursor, GitHub Copilot ou OpenCode). 

Ela varre o seu espaço de trabalho, executa análises estáticas locais de dependências e gera arquivos de diretrizes estruturados na pasta `/sophiAgents`, garantindo que os agentes leiam regras claras e não fujam do escopo do projeto.

---

## ⚡ Instalação Rápida

Você não precisa clonar este repositório para começar. Na raiz do seu projeto atual, execute:

```bash
# Execução direta sem instalação global
npx sophiacode init

# Ou se preferir instalar globalmente via npm
npm install -g sophiacode
```

---

## 🛠️ Principais Recursos

- **Superfície de Configuração Amigável**: Questionário dinâmico no terminal para definir objetivos, limitações do escopo e regras do projeto.
- **Análise Estática Local**: Escaneia a estrutura do repositório, identifica tecnologias em uso (como Puppeteer, Fastify, Telegraf) e resume as dependências sem consumir chaves de API.
- **Adaptação Multiprovedor**: Conexão nativa com **Google Gemini (recomendado)**, **OpenAI** ou **Ollama** executado localmente.
- **Integração de Agentes Integrada**: Gera pontes automáticas com outros assistentes na raiz do repositório (`CLAUDE.md` e `AGENTS.md`) sem poluir suas configurações personalizadas pré-existentes.

---

## 📖 Comandos Disponíveis

- **`sophiacode init`**: Inicia o fluxo interativo e gera as regras dos agentes em `/sophiAgents`.
- **`sophiacode mvp`**: Ajuda a desenhar e validar a especificação inicial de um Produto Mínimo Viável (breve).
- **`sophiacode task`**: Gerencia e detalha o backlog de tarefas atual para que a IA execute com precisão (breve).
- **`sophiacode skill`**: Permite criar e customizar regras comportamentais específicas (breve).
- **`sophiacode dev`**: Executa o ambiente local com monitoramento constante (breve).

---

## 🤝 Contribuição

Para entender a estrutura do projeto, consulte a nossa [Guia de Arquitetura](docs/architecture.md) e as [Diretrizes de Prompt](docs/prompt-guidelines.md). Pull Requests são muito bem-vindos! Certifique-se de que todos os testes passem antes de enviar.

---

## 📄 Licença

Este projeto está licenciado sob a licença MIT - consulte o arquivo [LICENSE](LICENSE) para obter detalhes.
