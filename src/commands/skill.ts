import * as p from '@clack/prompts';
import fs from 'fs/promises';
import path from 'path';
import { checkConfigExist, saveSkillConfig } from '../core/fs/writer.js';

export async function runSkillCommand(basePath: string): Promise<void> {
  // 1. Verify that context has been initialized first
  const initialized = await checkConfigExist(basePath);
  if (!initialized) {
    p.log.error('❌ Erro: O sophiaContext não está inicializado neste repositório.');
    p.log.info('Execute o comando "sophiacode init" primeiro.');
    return;
  }

  p.intro('🛠️ Configuração de Skills (Automações & MCP)');

  const initializeMcp = await p.confirm({
    message:
      'Deseja configurar ou inicializar um template de servidor MCP (Model Context Protocol)?',
    initialValue: true,
  });

  if (p.isCancel(initializeMcp)) {
    p.outro('Operação cancelada.');
    return;
  }

  if (initializeMcp) {
    const mcpType = await p.select({
      message: 'Selecione qual template de servidor MCP deseja inicializar:',
      options: [
        {
          value: 'sqlite',
          label: 'SQLite Explorer',
          hint: 'Provê ferramentas de consulta SQL a bancos de dados SQLite locais',
        },
        {
          value: 'filesystem',
          label: 'Local Filesystem',
          hint: 'Permite leitura/escrita restrita de diretórios específicos pelo agente',
        },
        {
          value: 'brave-search',
          label: 'Web Search',
          hint: 'Habilita buscas na internet para buscar referências e documentações atualizadas',
        },
        {
          value: 'custom-script',
          label: 'Script de Automação Customizado',
          hint: 'Gera um script shell para que o agente rode comandos pré-aprovados',
        },
      ],
    });

    if (p.isCancel(mcpType)) {
      p.outro('Operação cancelada.');
      return;
    }

    const skillsDir = path.join(basePath, 'sophiAgents', 'skills');

    let mcpConfig: any = {};
    if (mcpType === 'sqlite') {
      mcpConfig = {
        mcpServers: {
          sqlite: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-sqlite', '--db', './sqlite.db'],
          },
        },
      };
      await saveSkillConfig(basePath, mcpConfig);
      p.log.success(
        '✅ Template de MCP SQLite salvo com sucesso em "sophiAgents/skills/mcp-config.json"'
      );
    } else if (mcpType === 'filesystem') {
      mcpConfig = {
        mcpServers: {
          filesystem: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem', './src', './tests'],
          },
        },
      };
      await saveSkillConfig(basePath, mcpConfig);
      p.log.success(
        '✅ Template de MCP Filesystem salvo com sucesso em "sophiAgents/skills/mcp-config.json"'
      );
    } else if (mcpType === 'brave-search') {
      mcpConfig = {
        mcpServers: {
          'brave-search': {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-brave-search'],
            env: {
              BRAVE_API_KEY: 'INSIRA_SUA_CHAVE_AQUI',
            },
          },
        },
      };
      await saveSkillConfig(basePath, mcpConfig);
      p.log.success(
        '✅ Template de MCP Brave Search salvo com sucesso em "sophiAgents/skills/mcp-config.json"'
      );
    } else if (mcpType === 'custom-script') {
      const scriptContent =
        `#!/bin/bash\n` +
        `# Script de automação para tarefas repetitivas pré-aprovadas\n` +
        `# A IA pode executar este script para rodar builds locais ou migrations\n\n` +
        `echo "🚀 Executando validação de código local..."\n` +
        `npm run lint && npm run typecheck\n` +
        `if [ $? -eq 0 ]; then\n` +
        `  echo "✅ Tudo limpo!"\n` +
        `else\n` +
        `  echo "❌ Encontrado problemas estáticos. Corrija-os antes de commitar."\n` +
        `  exit 1\n` +
        `fi\n`;

      const scriptPath = path.join(skillsDir, 'verify-quality.sh');
      await fs.mkdir(skillsDir, { recursive: true });
      await fs.writeFile(scriptPath, scriptContent, { encoding: 'utf-8', mode: 0o755 });

      p.log.success('✅ Script customizado gerado em "sophiAgents/skills/verify-quality.sh"');
    }
  }

  p.outro('Configuração de Skills concluída.');
}
