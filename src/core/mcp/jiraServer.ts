import readline from 'readline';
import { readProjectConfig } from '../fs/writer.js';
import { readGlobalConfig } from '../fs/global-config.js';

export interface JiraConfig {
  url: string;
  email: string;
  token: string;
}

/**
 * Loads Jira credentials from environment, project config, or global config.
 */
export async function loadJiraCredentials(basePath: string = process.cwd()): Promise<JiraConfig> {
  let url = process.env.JIRA_URL;
  let email = process.env.JIRA_EMAIL;
  let token = process.env.JIRA_API_TOKEN;

  // Try project config
  if (!url || !email || !token) {
    try {
      const projectConfig = await readProjectConfig(basePath);
      if (projectConfig.jira) {
        url = url || projectConfig.jira.url;
        email = email || projectConfig.jira.email;
        token = token || projectConfig.jira.token;
      }
    } catch {
      // Ignore
    }
  }

  // Try global config
  if (!url || !email || !token) {
    try {
      const globalConfig = (await readGlobalConfig()) as any;
      if (globalConfig.jira) {
        url = url || globalConfig.jira.url;
        email = email || globalConfig.jira.email;
        token = token || globalConfig.jira.token;
      }
    } catch {
      // Ignore
    }
  }

  if (!url || !email || !token) {
    throw new Error(
      'Jira credentials are not fully configured. Please configure JIRA_URL, JIRA_EMAIL, and JIRA_API_TOKEN.'
    );
  }

  return { url, email, token };
}

/**
 * Starts the Jira MCP server listening on stdin/stdout.
 */
export function startJiraMcpServer(basePath: string = process.cwd()): void {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  rl.on('line', async (line) => {
    try {
      const request = JSON.parse(line);
      const response = await handleMcpRequest(request, basePath);
      if (response) {
        console.log(JSON.stringify(response));
      }
    } catch (err) {
      console.log(
        JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32700, message: 'Parse error' },
        })
      );
    }
  });
}

async function handleMcpRequest(req: any, basePath: string): Promise<any> {
  const { jsonrpc, id, method, params } = req;
  if (jsonrpc !== '2.0') return;

  switch (method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: 'sophiacode-jira-mcp',
            version: '1.0.0',
          },
        },
      };

    case 'tools/list':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          tools: [
            {
              name: 'jira_create_issue',
              description: 'Create a new Jira issue (task, bug, story, epic, etc.)',
              inputSchema: {
                type: 'object',
                properties: {
                  projectKey: { type: 'string', description: 'The project key, e.g. PROJ' },
                  summary: { type: 'string', description: 'Brief summary of the issue' },
                  description: { type: 'string', description: 'Detailed description string' },
                  issueType: { type: 'string', description: 'Issue type (e.g. Task, Bug, Story)' },
                  parentKey: { type: 'string', description: 'Parent issue key if creating a sub-task' },
                },
                required: ['projectKey', 'summary', 'description'],
              },
            },
            {
              name: 'jira_get_issue',
              description: 'Retrieve details of a specific Jira issue by key',
              inputSchema: {
                type: 'object',
                properties: {
                  issueKey: { type: 'string', description: 'Jira issue key, e.g. PROJ-123' },
                },
                required: ['issueKey'],
              },
            },
            {
              name: 'jira_search_issues',
              description: 'Search for issues using Jira Query Language (JQL)',
              inputSchema: {
                type: 'object',
                properties: {
                  jql: { type: 'string', description: 'JQL string, e.g. project = PROJ AND status = Open' },
                  maxResults: { type: 'number', description: 'Maximum number of results to return (default 50)' },
                },
                required: ['jql'],
              },
            },
            {
              name: 'jira_update_issue',
              description: 'Update fields or transition status of an existing Jira issue',
              inputSchema: {
                type: 'object',
                properties: {
                  issueKey: { type: 'string', description: 'Jira issue key, e.g. PROJ-123' },
                  fields: { type: 'object', description: 'Fields to update, e.g. { summary: "New Summary" }' },
                  transitionId: { type: 'string', description: 'Transition ID to change status' },
                },
                required: ['issueKey'],
              },
            },
            {
              name: 'jira_get_transitions',
              description: 'Get available status transition pathways for a specific Jira issue',
              inputSchema: {
                type: 'object',
                properties: {
                  issueKey: { type: 'string', description: 'Jira issue key, e.g. PROJ-123' },
                },
                required: ['issueKey'],
              },
            },
          ],
        },
      };

    case 'tools/call': {
      const { name, arguments: args } = params;
      try {
        const credentials = await loadJiraCredentials(basePath);
        const result = await executeTool(name, args, credentials, basePath);
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          },
        };
      } catch (err) {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            isError: true,
            content: [{ type: 'text', text: `Error executing Jira tool: ${(err as Error).message}` }],
          },
        };
      }
    }

    default:
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: 'Method not found' },
      };
  }
}

async function executeTool(name: string, args: any, config: JiraConfig, basePath: string): Promise<any> {
  const { url, email, token } = config;
  const auth = Buffer.from(`${email}:${token}`).toString('base64');
  const headers = {
    Authorization: `Basic ${auth}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  switch (name) {
    case 'jira_create_issue': {
      const resolvedType = await resolveIssueType(basePath, args.projectKey, args.issueType || 'Task');
      const body: any = {
        fields: {
          project: { key: args.projectKey },
          summary: args.summary,
          description: args.description,
          issuetype: { name: resolvedType },
        },
      };
      if (args.parentKey) {
        body.fields.parent = { key: args.parentKey };
      }
      const response = await fetch(`${url}/rest/api/2/issue`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Jira API error (${response.status}): ${errorText}`);
      }
      return await response.json();
    }

    case 'jira_get_issue': {
      const response = await fetch(`${url}/rest/api/2/issue/${args.issueKey}`, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: 'application/json',
        },
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Jira API error (${response.status}): ${errorText}`);
      }
      return await response.json();
    }

    case 'jira_search_issues': {
      const response = await fetch(`${url}/rest/api/2/search`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          jql: args.jql,
          maxResults: args.maxResults || 50,
          fields: ['summary', 'description', 'status', 'issuetype', 'parent'],
        }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Jira API error (${response.status}): ${errorText}`);
      }
      return await response.json();
    }

    case 'jira_update_issue': {
      if (args.fields) {
        const response = await fetch(`${url}/rest/api/2/issue/${args.issueKey}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ fields: args.fields }),
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Jira API error updating fields (${response.status}): ${errorText}`);
        }
      }
      if (args.transitionId) {
        const response = await fetch(`${url}/rest/api/2/issue/${args.issueKey}/transitions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ transition: { id: args.transitionId } }),
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Jira API error transitioning issue (${response.status}): ${errorText}`);
        }
      }
      return { success: true, message: `Issue ${args.issueKey} updated successfully.` };
    }

    case 'jira_get_transitions': {
      const response = await fetch(`${url}/rest/api/2/issue/${args.issueKey}/transitions`, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: 'application/json',
        },
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Jira API error getting transitions (${response.status}): ${errorText}`);
      }
      return await response.json();
    }

    default:
      throw new Error(`Tool ${name} is not implemented`);
  }
}

/**
 * Checks if Jira is configured in the environment or configuration.
 */
export async function isJiraConfigured(basePath?: string): Promise<boolean> {
  try {
    await loadJiraCredentials(basePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates a Jira issue directly using loaded credentials.
 */
export async function createJiraIssue(
  basePath: string,
  projectKey: string,
  summary: string,
  description: string,
  issueType = 'Task',
  parentKey?: string
): Promise<{ key: string; self: string; id: string }> {
  const credentials = await loadJiraCredentials(basePath);
  const auth = Buffer.from(`${credentials.email}:${credentials.token}`).toString('base64');
  const resolvedType = await resolveIssueType(basePath, projectKey, issueType);
  const body: any = {
    fields: {
      project: { key: projectKey },
      summary,
      description,
      issuetype: { name: resolvedType },
    },
  };
  if (parentKey) {
    body.fields.parent = { key: parentKey };
  }
  const response = await fetch(`${credentials.url}/rest/api/2/issue`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Jira API error (${response.status}): ${errorText}`);
  }

  return await response.json();
}

/**
 * Transitions a Jira issue's status by finding a matching transition name.
 */
export async function transitionJiraIssueByName(
  basePath: string,
  issueKey: string,
  targetStatusName: string
): Promise<boolean> {
  try {
    const credentials = await loadJiraCredentials(basePath);
    const auth = Buffer.from(`${credentials.email}:${credentials.token}`).toString('base64');

    // 1. Get transitions
    const res = await fetch(`${credentials.url}/rest/api/2/issue/${issueKey}/transitions`, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
      },
    });
    if (!res.ok) return false;
    const data = (await res.json()) as any;

    // 2. Find transition matching the targetStatusName (case insensitive)
    const transition = data.transitions.find(
      (t: any) =>
        t.name.toLowerCase().includes(targetStatusName.toLowerCase()) ||
        t.to.name.toLowerCase().includes(targetStatusName.toLowerCase())
    );

    if (transition) {
      // 3. Post transition
      const postRes = await fetch(`${credentials.url}/rest/api/2/issue/${issueKey}/transitions`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          transition: { id: transition.id },
        }),
      });
      return postRes.ok;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Resolves a valid issue type name for a project, falling back to available types to prevent API errors.
 */
export async function resolveIssueType(
  basePath: string,
  projectKey: string,
  desiredType: string
): Promise<string> {
  try {
    const credentials = await loadJiraCredentials(basePath);
    const auth = Buffer.from(`${credentials.email}:${credentials.token}`).toString('base64');
    const response = await fetch(
      `${credentials.url}/rest/api/2/issue/createmeta?projectKeys=${projectKey}&expand=projects.issuetypes`,
      {
        method: 'GET',
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      return desiredType;
    }

    const data = (await response.json()) as any;
    const project = data.projects?.find((p: any) => p.key === projectKey);
    if (!project || !project.issuetypes || project.issuetypes.length === 0) {
      return desiredType;
    }

    const types: any[] = project.issuetypes;
    const desired = desiredType.toLowerCase();

    // 1. Exact match
    let found = types.find((t) => t.name.toLowerCase() === desired && !t.subtask);
    if (found) return found.name;

    // 2. Map logical equivalents
    if (desired === 'story' || desired === 'história' || desired === 'epic') {
      found = types.find(
        (t) =>
          (t.name.toLowerCase().includes('stor') || t.name.toLowerCase().includes('hist')) &&
          !t.subtask
      );
      if (found) return found.name;
      found = types.find(
        (t) =>
          (t.name.toLowerCase().includes('task') || t.name.toLowerCase().includes('taref')) &&
          !t.subtask
      );
      if (found) return found.name;
    } else if (desired === 'task' || desired === 'tarefa') {
      found = types.find(
        (t) =>
          (t.name.toLowerCase().includes('task') || t.name.toLowerCase().includes('taref')) &&
          !t.subtask
      );
      if (found) return found.name;
    } else if (desired === 'sub-task' || desired === 'subtask' || desired === 'subtarefa') {
      found = types.find((t) => t.subtask);
      if (found) return found.name;
    } else if (desired === 'bug' || desired === 'erro') {
      found = types.find(
        (t) =>
          (t.name.toLowerCase().includes('bug') || t.name.toLowerCase().includes('err')) &&
          !t.subtask
      );
      if (found) return found.name;
    }

    // 3. Fallback to first non-subtask
    const fallback = types.find((t) => !t.subtask);
    return fallback ? fallback.name : desiredType;
  } catch {
    return desiredType;
  }
}


