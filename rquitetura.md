1. Levantamento de Requisitos
Requisitos Funcionais (RF)
O que o sistema tem a obrigação de fazer.

RF01: O sistema deve fornecer uma interface de linha de comando (CLI) com os comandos /init, /start, /map e /edit.

RF02: O sistema deve verificar a existência dos arquivos MAP.md e Agents.md na raiz do diretório de execução.

RF03: Caso os arquivos não existam, o sistema deve iniciar um fluxo de perguntas interativas via terminal (Objetivo, Regras fora de escopo, Erros aceitáveis).

RF04: O sistema deve varrer o diretório atual e mapear a árvore de arquivos, identificando a estrutura do projeto.

RF05: O sistema deve integrar-se a uma API de LLM para formatar os dados coletados (respostas + árvore) em um arquivo markdown descritivo.

RF06: O sistema deve criar e salvar os arquivos MAP.md e Agents.md no disco local do usuário.

RF07: O comando /edit deve ler o MAP.md atual e permitir que o usuário adicione ou remova regras interativamente.

Requisitos Não Funcionais (RNF)
Como o sistema deve se comportar (qualidade e restrições).

RNF01 - Performance (I/O): A varredura de diretórios deve ser otimizada para pular pastas pesadas e irrelevantes para o contexto (node_modules, .git, .next, dist, .env) para evitar travamentos e reduzir o payload.

RNF02 - Desacoplamento (Design Pattern): O cliente de IA (SDK) deve ser isolado por meio de interfaces (Ports and Adapters). Se amanhã você trocar a OpenAI pela Anthropic, o núcleo do sistema não pode sofrer alterações.

RNF03 - Portabilidade: O sistema deve ser executável em ambientes Node.js padronizados, sem exigir a instalação de dependências globais complexas na máquina do usuário final (utilizável via npx).

RNF04 - Segurança: O sistema não deve expor chaves de API no código-fonte. Deve consumir variáveis de ambiente (.env ou configuração global do sistema operacional).

2. Estrutura de Diretórios (Arquitetura)
Para manter o controle total e evitar que a aplicação vire um "código espaguete", adotaremos uma estrutura modularizada. Cada pasta tem uma responsabilidade única.

Plaintext
meu-agente-cli/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                 # Ponto de entrada (Entrypoint). Conecta a CLI ao Core.
│   │
│   ├── cli/                     # Camada de Interface do Usuário (Entrada)
│   │   ├── commands.ts          # Define os comandos /init, /edit (usando 'commander')
│   │   └── prompts.ts           # Lógica das perguntas interativas (usando '@clack/prompts')
│   │
│   ├── fs/                      # Camada de Sistema de Arquivos (Infraestrutura)
│   │   ├── scanner.ts           # Função de ler diretórios (usando 'fast-glob')
│   │   └── writer.ts            # Função para criar e editar o MAP.md no disco
│   │
│   ├── ai/                      # Camada de Integração Externa (Adapters)
│   │   ├── client.ts            # Configuração do SDK da IA
│   │   └── prompts.ts           # Os System Prompts rigorosos que você ditará para a IA
│   │
│   ├── core/                    # O "Cérebro" da sua aplicação (Regras de Negócio)
│   │   └── orchestrator.ts      # Junta CLI -> FS -> AI -> FS. O fluxo real acontece aqui.
│   │
│   └── types/                   # Contratos de Dados
│       └── index.d.ts           # Interfaces TypeScript (UserRules, DirectoryMap)
3. O Fluxo de Execução (Core Orchestrator)
O coração do seu projeto vive no orchestrator.ts. Ele é o maestro que chama cada peça de forma previsível e sem desperdício de processamento:

Gatilho: O usuário digita meu-agente /init no terminal. O arquivo cli/commands.ts intercepta e chama o Orchestrator.

Verificação: O Orchestrator chama fs/writer.ts -> O arquivo MAP.md existe? (Retorna false).

Coleta Humana: O Orchestrator chama cli/prompts.ts -> Exibe a UI, coleta o objetivo e regras de escopo e retorna um objeto tipado.

Coleta de Máquina: O Orchestrator chama fs/scanner.ts -> Varre a pasta, ignora o node_modules e retorna uma string da árvore.

Execução da IA: O Orchestrator envia as regras humanas e a árvore para ai/client.ts. A IA obedece à sua especificação arquitetural e retorna o texto puro.

Finalização: O Orchestrator manda o texto de volta para fs/writer.ts, que grava o arquivo no disco, finalizando o processo.

Esse é o seu contrato arquitetural. Ele garante que a inteligência artificial não tome decisões de estrutura, atuando apenas no passo 5 como um formatador avançado.