# Prompt Guidelines for AI Models 🤖

Este documento detalha como os prompts da inteligência artificial são estruturados e mantidos no **SophiaCode CLI** para garantir que as IAs gerem documentações úteis e sigam contratos rígidos de resposta.

---

## 🏗️ Lógica do System Prompt

O `SYSTEM_PROMPT` (localizado em [prompts.ts](file:///c:/Projetos/sophiaCode/src/core/ai/prompts.ts)) define a personalidade e as regras básicas de comportamento da IA. Ele instrui o modelo a agir como o **SophiaCode AI Workspace Architect**.

### Diretrizes de Comportamento
1. **Foco Prático**: O modelo deve ser pragmático e direto.
2. **Saída Estruturada**: Deve responder sempre em formato JSON estrito, batendo com o esquema solicitado (Structured Outputs).
3. **Mapeamento de Pontes**: Escrever links relativos para redirecionar outros agentes à pasta `sophiAgents/` de forma consistente.

---

## 📝 Construção do User Prompt

O prompt enviado pelo usuário é dinâmico e combina:
1. **Regras Humanas**: Capturadas pelas respostas do desenvolvedor nos prompts de console (objetivos, exclusões, restrições).
2. **Contexto de Máquina**: O relatório da análise estática local feito no repositório.

A função `buildUserPrompt` combina estas partes no seguinte formato estruturado:

```markdown
Você está inicializando o gerenciador de contexto do SophiaCode para o seguinte workspace.

=== DIRETRIZES DO DESENVOLVEDOR (HUMANO) ===
- Objetivo Principal: {objective}
- Fora de Escopo: {outOfScope}
- Erros Aceitáveis / Restrições: {acceptableErrors}

=== ANÁLISE ARQUITETURAL LOCAL DO PROJETO ===
{analysisReport}

Por favor, gere os seguintes 4 arquivos com base na estrutura acima...
```

---

## 🛡️ Saídas Estruturadas (Structured Outputs)

Para garantir que o parsing da resposta da IA não falhe (impedindo erros de formatação que quebram o fluxo da CLI), usamos esquemas JSON estritos suportados nativamente pelos SDKs do Google Gemini e OpenAI.

O esquema esperado de resposta da IA é:

```json
{
  "type": "OBJECT",
  "properties": {
    "mapContent": { 
      "type": "STRING",
      "description": "Conteúdo markdown completo para o arquivo MAP.md"
    },
    "agentsContent": { 
      "type": "STRING",
      "description": "Conteúdo markdown completo para o arquivo Agents.md"
    },
    "claudeContent": {
      "type": "STRING",
      "description": "Conteúdo markdown completo para o CLAUDE.md na raiz"
    },
    "rootAgentsContent": {
      "type": "STRING",
      "description": "Conteúdo markdown completo para o AGENTS.md na raiz"
    }
  },
  "required": ["mapContent", "agentsContent", "claudeContent", "rootAgentsContent"]
}
```

Qualquer alteração na especificação das pontes ou do `MAP.md` deve ser refletida tanto no schema quanto no `SYSTEM_PROMPT` para evitar erros de geração.
