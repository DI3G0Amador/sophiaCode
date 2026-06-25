import { loadJiraCredentials } from '../src/core/mcp/jiraServer.js';

async function testJira() {
  const basePath = process.cwd();
  console.log('Carregando credenciais do Jira... / Loading credentials...');
  try {
    const creds = await loadJiraCredentials(basePath);
    console.log(`Credenciais carregadas:`);
    console.log(`• URL: ${creds.url}`);
    console.log(`• E-mail: ${creds.email}`);
    
    console.log('\nTestando conexão e buscando projetos... / Fetching projects...');
    const auth = Buffer.from(`${creds.email}:${creds.token}`).toString('base64');
    const response = await fetch(`${creds.url}/rest/api/2/project`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      const projects = (await response.json()) as any[];
      console.log('\n✅ Conexão com o Jira estabelecida com sucesso!');
      console.log(`Projetos encontrados (${projects.length}):`);
      for (const p of projects) {
        console.log(`• [${p.key}] ${p.name}`);
      }
    } else {
      const errText = await response.text();
      console.error(`\n❌ Falha na conexão (status ${response.status}):`, errText);
    }
  } catch (err) {
    console.error('\n❌ Erro:', (err as Error).message);
  }
}

testJira();
