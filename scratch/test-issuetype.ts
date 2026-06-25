import { loadJiraCredentials } from '../src/core/mcp/jiraServer.js';

async function testIssueTypes() {
  const basePath = process.cwd();
  try {
    const creds = await loadJiraCredentials(basePath);
    const auth = Buffer.from(`${creds.email}:${creds.token}`).toString('base64');
    const response = await fetch(`${creds.url}/rest/api/2/issue/createmeta?projectKeys=SCRUM&expand=projects.issuetypes`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json() as any;
      const project = data.projects.find((p: any) => p.key === 'SCRUM');
      if (project) {
        console.log(`Tipos de itens válidos para o projeto SCRUM:`);
        for (const type of project.issuetypes) {
          console.log(`• ID: ${type.id} | Nome: ${type.name} | Subtask: ${type.subtask}`);
        }
      } else {
        console.log('Projeto SCRUM não encontrado nos dados.');
      }
    } else {
      console.error('Falha ao buscar tipos de itens:', response.status, await response.text());
    }
  } catch (err) {
    console.error('Erro:', (err as Error).message);
  }
}

testIssueTypes();
