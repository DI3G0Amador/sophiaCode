# SophiaCode CLI

Leia este documento em outros idiomas: [English](README.md) | [Português (Brasil)](README.pt.md)

Gerencie o contexto, especificações de funcionalidades (MVPs) e a memória de longo prazo do seu projeto para agentes de IA de forma automatizada e estruturada.

O SophiaCode é uma ferramenta de linha de comando (CLI) desenvolvida para simplificar e automatizar o alinhamento arquitetural e a coordenação de contexto entre desenvolvedores humanos e agentes autônomos de IA (como Claude Code, Cursor, GitHub Copilot ou OpenCode).

Ela varre o seu espaço de trabalho, executa análises estáticas locais de dependências e gera arquivos de diretrizes estruturados na pasta `/sophiAgents`. Isso garante que os agentes leiam regras claras e não fujam do escopo do projeto.

---

## Inicialização Rápida

Você pode rodar o SophiaCode diretamente utilizando o npx:

```bash
# Inicia o painel geral interativo
npx sophiacode
```

---

## Painel Interativo (Dashboard)

Executar o comando `sophiacode` sem subcomandos adicionais inicializa o Painel Interativo Geral. Essa interface de terminal permite que você execute todos os fluxos da CLI de forma sequencial e gerencie seu espaço de trabalho em um loop contínuo:

```bash
npx sophiacode
```

---

## Referência de Comandos da CLI

Se você precisar automatizar fluxos (como em pipelines de CI/CD), é possível rodar os subcomandos diretamente:

- **`sophiacode init`**: Executa a análise estática no seu projeto, faz perguntas para descobrir lacunas via LLM e inicializa a pasta `/sophiAgents`.
- **`sophiacode mvp`**: Inicia o designer interativo de MVP/funcionalidade. Gera um arquivo de especificação técnica estrito em JSON salvo sob `sophiAgents/mvps/`.
- **`sophiacode task`**: Seleciona um MVP planejado e o divide em tarefas sequenciais, gerando planos de ação (`plan.md`) e listas de tarefas (`subtasks.json`) sob `sophiAgents/tasks/`.
- **`sophiacode dev`**: Executa o Modo Engenheiro. Apresenta o checklist de tarefas planejadas, atualiza o progresso e fornece instruções e prompts copiáveis para guiar agentes de desenvolvimento (como o Claude Code) na resolução da próxima subtask.
- **`sophiacode skill`**: Configura templates de servidores Model Context Protocol (MCP) (SQLite, sistema de arquivos local, busca na web Brave) ou scripts de automação customizados sob `sophiAgents/skills/`.
- **`sophiacode bridge`**: Configura arquivos de redirecionamento na raiz do projeto (`CLAUDE.md`, `.cursorrules`, `AGENTS.md`, `llms.txt`) para que agentes de terceiros leiam o contexto do `sophiAgents/` automaticamente.

---

## Opções de Instalação

Dependendo de sua preferência, você pode instalar o SophiaCode de uma das seguintes formas:

### Opção 1: Instalação Local ou via Git (Recomendada para desenvolvimento/customização)
Você pode instalar o SophiaCode diretamente de uma pasta local ou de um repositório Git. Graças aos hooks de ciclo de vida do npm, a compilação do TypeScript é feita de forma 100% automática durante a instalação:
```bash
# Instalar a partir de uma pasta local
npm install -g /caminho/para/sophiaCode

# Ou instalar diretamente do repositório Git remoto
npm install -g git+https://github.com/D13GO91/sophiaCode.git
```

### Opção 2: Instalação Global via npm
Uma vez que o pacote esteja publicado no registro público do npm, você pode instalá-lo em qualquer máquina com o comando:
```bash
npm install -g sophiacode
```

---

## Configuração do Servidor MCP do Jira

O SophiaCode possui um servidor MCP do Jira integrado. Para usá-lo com seu cliente de IA favorito (como Claude Desktop ou Cursor):

### 1. Configuração no Claude Desktop
Adicione a configuração do servidor em `%APPDATA%\Claude\claude_desktop_config.json` (Windows) ou `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):
```json
{
  "mcpServers": {
    "sophiacode-jira": {
      "command": "sophiacode",
      "args": ["jira-mcp"],
      "env": {
        "JIRA_URL": "https://seu-dominio.atlassian.net",
        "JIRA_EMAIL": "seu-email@empresa.com",
        "JIRA_API_TOKEN": "SEU_API_TOKEN_DO_JIRA"
      }
    }
  }
}
```

### 2. Configuração no Cursor
1. Abra as Configurações do Cursor (`Ctrl + ,` ou `Cmd + ,`) e navegue até **Features** -> **MCP**.
2. Clique em **+ Add New MCP Server**.
3. Preencha com os seguintes detalhes:
   - **Name**: `sophiacode-jira`
   - **Type**: `command`
   - **Command**: `sophiacode jira-mcp`
4. Forneça as variáveis de ambiente (`JIRA_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`) no ambiente do seu sistema ou no arquivo `.env` do seu projeto local antes de iniciar o Cursor.

---

## Desenvolvimento Local e Contribuição

Se você deseja contribuir para a ferramenta, pode configurar o ambiente de desenvolvimento local:

```bash
# Clone o repositório
git clone https://github.com/D13GO91/sophiaCode.git
cd sophiaCode

# Instale as dependências
npm install

# Compile o código TypeScript
npm run build

# Execute os testes unitários
npm run test:run

# Execute verificações de estilo e linter
npm run lint
npm run format:check
```

Consulte [docs/architecture.md](docs/architecture.md) para detalhes de arquitetura do projeto. Pull Requests são muito bem-vindos!

---

## Licença

Este projeto está licenciado sob a licença MIT - consulte o arquivo [LICENSE](LICENSE) para obter detalhes.
