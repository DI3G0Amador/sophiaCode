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
