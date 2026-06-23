# Contributing to SophiaCode

Read this in other languages: [English](CONTRIBUTING.md) | [Português (Brasil)](CONTRIBUTING.pt.md)

Welcome to SophiaCode! We are thrilled that you are interested in contributing. As an open-source project, we rely on community contributions to make this AI orchestrator a powerful tool for developers and agents.

To ensure a smooth, professional, and collaborative development workflow, please read and follow these contribution guidelines.

---

## 1. Setting Up the Development Environment

To begin development, make sure you have Node.js (version 18 or higher) and npm installed.

```bash
# Clone the repository
git clone https://github.com/D13GO91/sophiaCode.git
cd sophiaCode

# Install dependencies
npm install
```

---

## 2. Development Workflow

Before submitting a Pull Request, verify that all validation steps compile and run cleanly on your local machine.

### Compiling the Code
The project is written in TypeScript and must be compiled to JavaScript to execute:
```bash
npm run build
```

### Running Unit Tests
We use Vitest for automated unit testing. Ensure that all tests are green and write new tests for any added features or bug fixes:
```bash
# Run tests once and exit
npm run test:run

# Run tests in interactive watch mode
npm run test
```

### Running Code Quality Checks
We maintain strict quality control rules for code style and formatting:
```bash
# Check TypeScript compilation errors
npm run typecheck

# Check formatting with Prettier
npm run format:check

# Auto-format your code changes
npm run format

# Run linter checks with ESLint
npm run lint
```

---

## 3. Commit Message Guidelines

We enforce the **Conventional Commits** specification. This helps us generate clean changelogs and automate version releases.

Your commit messages should follow this format:
```text
<type>(<scope>): <short description>
```

Common types include:
- **feat**: A new feature (e.g. `feat(i18n): add spanish dictionary translations`)
- **fix**: A bug fix (e.g. `fix(task): resolve directory path parsing issues on Windows`)
- **docs**: Documentation updates (e.g. `docs: update setup guidelines in README`)
- **style**: Changes that do not affect the meaning of the code (formatting, white-space, missing semi-colons, etc.)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **test**: Adding missing tests or correcting existing tests
- **chore**: Internal tooling updates, package dependency updates, build tasks, etc.

---

## 4. Coding Standards

To maintain consistency and make it easy for both human contributors and AI agents to work in the codebase, follow these rules:
- **TypeScript Only**: All code must be strictly typed. Avoid using `any` unless absolutely necessary.
- **Architectural Isolation**:
  - Do not make direct calls to AI SDKs outside of `src/core/ai/providers.ts`.
  - Keep CLI shell user prompts limited to the `src/commands/` directory using `@clack/prompts`.
  - Encapsulate all file system interactions under `src/core/fs/` modules.
- **Internationalization**: Do not write hardcoded user-facing strings in command files. Register and retrieve them through `src/core/i18n.ts`.

---

## 5. Submitting Pull Requests

1. Create a descriptive branch for your feature or bug fix:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Make your changes and commit them following the Conventional Commit rules.
3. Ensure that `npm run test:run`, `npm run lint`, and `npm run format:check` all pass with zero warnings.
4. Push the branch to your GitHub fork and open a Pull Request.
5. Provide a clear description in your Pull Request detailing what changes were made, why they are needed, and what issues they address.
