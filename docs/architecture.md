# SophiaCode Architecture Guide 🗺️

Este documento descreve o funcionamento interno do **SophiaCode CLI** e o padrão de organização criado para os agentes de IA.

---

## 🏗️ Estrutura de Pastas do Repositório

O repositório está organizado segundo princípios de separação de responsabilidades (Clean Architecture / Ports & Adapters) para garantir portabilidade e clareza para contribuidores humanos e agentes:

```bash
sophia-code-cli/
├── .github/workflows/
│   ├── ci.yml            # Pipeline de integração contínua (testes, lint, types)
│   └── release.yml       # Pipeline de deploy contínuo engatilhado por tags v*
├── bin/
│   └── deploy            # Script executável do processo de deploy/publicação
├── config/
│   ├── deploy.env.example# Variáveis de ambiente públicas de exemplo
│   └── docs-config.json  # Configuração dos fluxos de documentação
├── src/
│   ├── commands/         # Interface de Linha de Comando (CLI) e prompts com o usuário
│   ├── core/             # Lógica de negócio da aplicação
│   │   ├── fs/           # Mapeamento do disco e salvamento (writer, scanner)
│   │   ├── ai/           # Integrações desacopladas com provedores de IA (providers)
│   │   └── orchestrator.ts# Controlador central do fluxo (InitFlow)
│   └── index.ts          # Entrypoint executável do binário da CLI
└── tests/                # Suíte completa de testes automatizados unitários/integração
```

---

## 📂 Como o `sophiAgents` funciona internamente?

Quando o usuário executa o comando `sophiacode init` na raiz do seu projeto, a ferramenta cria um subdiretório chamado `sophiAgents/` contendo a especificação estruturada do projeto. Essa pasta contém três pilares fundamentais:

### 1. `sophiAgents/config.json`
Armazena as configurações locais aplicadas ao projeto atual. Evita que o usuário precise responder às perguntas toda vez que desejar regenerar a especificação. Exemplo:
```json
{
  "provider": "gemini",
  "modelName": "gemini-2.5-flash",
  "temperature": 0.2,
  "contextLimit": 1000000,
  "contextStrategy": "full-context",
  "objective": "Criar um bot de telegram",
  "outOfScope": "Envio de spams",
  "acceptableErrors": "Erros de log menores",
  "integrations": ["claude"]
}
```

### 2. `sophiAgents/MAP.md`
Este arquivo é o mapa arquitetural do projeto. Ele descreve a árvore de arquivos, a stack técnica e explica sucintamente o papel de cada arquivo na aplicação.
Toda vez que uma nova IA iniciar o trabalho, ela deve ler o `MAP.md` para entender em segundos onde reside cada componente sem precisar varrer recursivamente todas as pastas.

### 3. `sophiAgents/Agents.md`
Contém as diretrizes e regras operacionais específicas para as IAs. Define:
- O escopo estrito (o que fazer e o que não fazer).
- Regras de tratamento de erro.
- Convenções de escrita de código do projeto.

---

## 🔗 Pontes de Redirecionamento (Root Bridges)

Muitos agentes de desenvolvimento (como **Claude Code**) procuram arquivos de contexto específicos na raiz do repositório (ex: `CLAUDE.md`).
Para evitar que a raiz do repositório fique poluída com arquivos de configuração de múltiplas IAs, o SophiaCode introduz o conceito de **Root Bridges**.

Se o usuário selecionar pontes de integração (ex: `claude` ou `opencode`), a ferramenta criará arquivos como `CLAUDE.md` ou `AGENTS.md` na raiz com o seguinte cabeçalho de redirecionamento:

```markdown
# SophiaCode Redirection

> [!IMPORTANT]
> This project uses **SophiaCode** for architecture mapping and rules.
> For the complete objective, file map, out-of-scope rules, and active feature specs,
> please refer to [sophiAgents/MAP.md](sophiAgents/MAP.md) and [sophiAgents/Agents.md](sophiAgents/Agents.md).

---
```

Se o arquivo já existia, o SophiaCode apenas **insere** este aviso no topo, preservando integralmente as suas instruções pré-existentes.
