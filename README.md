# SophiaCode CLI

Read this in other languages: [English](README.md) | [Português (Brasil)](README.pt.md)

Manage your project context, feature specifications (MVPs), and long-term memory for AI agents in an automated and structured way.

SophiaCode is a Command Line Interface (CLI) tool designed to simplify and automate architectural alignment and context coordination between human developers and autonomous AI agents (such as Claude Code, Cursor, GitHub Copilot, or OpenCode).

It scans your workspace, executes local static analysis of dependencies, and generates structured guideline files in the `sophiAgents/` folder. This ensures that agents read clear rules and stay focused within the project's scope.

---

## Quick Start

You can run SophiaCode directly using npx:

```bash
# Start the interactive general dashboard
npx sophiacode
```

---

## Interactive Dashboard

Running `sophiacode` without any subcommands launches the Interactive Dashboard. This terminal interface allows you to run all CLI workflows sequentially and manage your workspace in a continuous loop:

```bash
npx sophiacode
```

---

## CLI Command Reference

If you need to automate workflows (e.g. in CI/CD pipelines), you can run specific subcommands directly:

- **`sophiacode init`**: Runs static analysis on your project, queries you on context details via a 3-question gap analysis with LLMs, and initializes the `/sophiAgents` directory.
- **`sophiacode mvp`**: Launches the MVP/feature designer. Generates a strict technical specification JSON file saved under `sophiAgents/mvps/`.
- **`sophiacode task`**: Selects a planned MVP and splits it into sequential tasks, generating action plans (`plan.md`) and checkboxes checklists (`subtasks.json`) in task folders under `sophiAgents/tasks/`.
- **`sophiacode dev`**: Launches Engineer Mode. Displays planned task checklists, updates completion states, and provides copy-pasteable prompts to direct developer agents (like Claude Code) on the next subtask steps.
- **`sophiacode skill`**: Configures Model Context Protocol (MCP) server templates (SQLite, local filesystem, Brave web search) or custom automation script templates under `sophiAgents/skills/`.
- **`sophiacode bridge`**: Configures redirection config files in the project root (`CLAUDE.md`, `.cursorrules`, `AGENTS.md`, `llms.txt`) so third-party agents load the `sophiAgents/` context automatically.

---

## Installation Options

Depending on your preference, you can install SophiaCode in one of the following ways:

### Option 1: Local or Git Installation (Recommended for development/customization)
You can install SophiaCode directly from the local folder or a Git repository. Thanks to the build lifecycle hooks, TypeScript compilation is handled automatically:
```bash
# Install from a local folder
npm install -g /path/to/sophiaCode

# Or install directly from a remote Git repository
npm install -g git+https://github.com/D13GO91/sophiaCode.git
```

### Option 2: Global Installation from npm
Once published to the npm registry, you can install it on any machine using:
```bash
npm install -g sophiacode
```

---

## Jira MCP Server Setup

SophiaCode comes with a built-in Jira MCP server. To use it with your favorite AI client (like Claude Desktop or Cursor):

### 1. Claude Desktop Configuration
Add the server configuration in your `%APPDATA%\Claude\claude_desktop_config.json` (Windows) or `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):
```json
{
  "mcpServers": {
    "sophiacode-jira": {
      "command": "sophiacode",
      "args": ["jira-mcp"],
      "env": {
        "JIRA_URL": "https://your-domain.atlassian.net",
        "JIRA_EMAIL": "your-email@company.com",
        "JIRA_API_TOKEN": "YOUR_JIRA_API_TOKEN"
      }
    }
  }
}
```

### 2. Cursor Configuration
1. Open Cursor Settings (`Ctrl + ,` or `Cmd + ,`) and navigate to **Features** -> **MCP**.
2. Click **+ Add New MCP Server**.
3. Set the following details:
   - **Name**: `sophiacode-jira`
   - **Type**: `command`
   - **Command**: `sophiacode jira-mcp`
4. Provide the environment variables (`JIRA_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`) either in your system environment or within your local project `.env` file before launching Cursor.

---

## Local Development and Contribution

If you want to contribute to this open-source tool, you can set up the developer environment:

```bash
# Clone the repository
git clone https://github.com/D13GO91/sophiaCode.git
cd sophiaCode

# Install dependencies
npm install

# Compile TypeScript code
npm run build

# Run unit tests
npm run test:run

# Run linter and formatting checks
npm run lint
npm run format:check
```

Please refer to [docs/architecture.md](docs/architecture.md) for structural details. Pull Requests are highly welcome!

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
