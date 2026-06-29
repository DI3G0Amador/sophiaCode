# Como Contribuir para o SophiaCode

Leia este documento em outros idiomas: [English](CONTRIBUTING.md) | [Português (Brasil)](CONTRIBUTING.pt.md)

Bem-vindo ao SophiaCode! Ficamos muito felizes pelo seu interesse em contribuir. Como um projeto de código aberto, dependemos das contribuições da comunidade para tornar este orquestrador de IA uma ferramenta poderosa para desenvolvedores e agentes.

Para garantir um fluxo de desenvolvimento colaborativo fluido, profissional e seguro, por favor, leia e siga estas diretrizes de contribuição.

---

## 1. Configurando o Ambiente de Desenvolvimento

Para começar a desenvolver, certifique-se de ter o Node.js (versão 18 ou superior) e o npm instalados em sua máquina.

```bash
# Clone o repositório
git clone https://github.com/DI3G0Amador/sophiaCode.git
cd sophiaCode

# Instale as dependências
npm install
```

---

## 2. Fluxo de Trabalho de Desenvolvimento

Antes de enviar um Pull Request, verifique se todas as etapas de validação compilam e executam perfeitamente na sua máquina local.

### Compilando o Código
O projeto é escrito em TypeScript e deve ser compilado para JavaScript para que seja executado:
```bash
npm run build
```

### Executando Testes Unitários
Usamos o Vitest para testes unitários automatizados. Certifique-se de que todos os testes estejam no verde e escreva novos testes para quaisquer novas features ou correções de bugs adicionadas:
```bash
# Executa todos os testes uma vez e finaliza
npm run test:run

# Executa os testes em modo interativo de monitoramento (watch)
npm run test
```

### Executando Verificações de Qualidade de Código
Mantemos regras rígidas de controle de estilo e qualidade para a escrita do código:
```bash
# Verifica erros de compilação do TypeScript
npm run typecheck

# Verifica a formatação com o Prettier
npm run format:check

# Formata automaticamente os arquivos alterados
npm run format

# Executa análise estática de regras com o ESLint
npm run lint
```

---

## 3. Diretrizes de Mensagens de Commit

Nós adotamos a especificação de **Conventional Commits** para as mensagens de commit. Isso nos ajuda a gerar logs de alterações (changelogs) limpos e a automatizar lançamentos de versão.

Suas mensagens de commit devem seguir o formato abaixo:
```text
<tipo>(<escopo>): <descrição curta>
```

Tipos comuns que você pode utilizar:
- **feat**: Uma nova funcionalidade (ex: `feat(i18n): add spanish dictionary translations`)
- **fix**: Uma correção de bug (ex: `fix(task): resolve directory path parsing issues on Windows`)
- **docs**: Atualizações de documentação (ex: `docs: update setup guidelines in README`)
- **style**: Alterações estéticas que não alteram o sentido do código (formatação, espaços em branco, ponto e vírgula ausentes, etc.)
- **refactor**: Uma alteração de código que não corrige um bug nem adiciona uma nova funcionalidade
- **test**: Adição de testes ausentes ou correção de testes existentes
- **chore**: Atualizações de ferramentas internas, atualizações de dependências de pacotes, tarefas de compilação, etc.

---

## 4. Padrões de Código

Para manter a consistência e facilitar o trabalho de contribuidores humanos e de agentes de IA na base de código, siga estas regras:
- **TypeScript Estrito**: Todo o código deve ser tipado. Evite usar `any` a menos que seja estritamente necessário.
- **Isolamento de Responsabilidade**:
  - Não faça chamadas diretas a SDKs de IA fora do arquivo `src/core/ai/providers.ts`.
  - Mantenha prompts e interações de terminal com o usuário limitados ao diretório `src/commands/` utilizando `@clack/prompts`.
  - Encapsule todas as interações com o sistema de arquivos sob os módulos em `src/core/fs/`.
- **Internacionalização**: Não escreva strings de interface hardcoded nos arquivos de comandos. Cadastre e recupere todas as mensagens através de `src/core/i18n.ts`.

---

## 5. Enviando Pull Requests

1. Crie uma branch descritiva para sua feature ou correção:
   ```bash
   git checkout -b feat/nome-da-sua-feature
   ```
2. Faça as alterações necessárias e faça o commit seguindo os padrões do Conventional Commits.
3. Certifique-se de que os comandos `npm run test:run`, `npm run lint` e `npm run format:check` rodem com sucesso sem avisos.
4. Envie a branch para o seu fork do GitHub e abra um Pull Request.
5. Forneça uma descrição detalhada no Pull Request explicando quais alterações foram feitas, o porquê de serem necessárias e quais issues elas resolvem.
