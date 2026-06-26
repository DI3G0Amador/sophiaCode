import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { buildTreeString, scanDirectory } from '../src/core/fs/scanner.js';

describe('buildTreeString()', () => {
  it('should format a single file correctly', () => {
    const input = ['index.ts'];
    const expected = '└── index.ts\n';

    const result = buildTreeString(input);

    expect(result).toBe(expected);
  });

  it('should format nested files and sort files/folders alphabetically', () => {
    const input = ['src/index.ts', 'package.json', 'src/cli/prompts.ts'];

    // O comportamento esperado da função buildTreeString atual é:
    // - Para "package.json", o nó raiz terá "package.json": null
    // - Para "src", teremos "src": { "index.ts": null, "cli": { "prompts.ts": null } }
    // As chaves ordenam diretórios no topo, arquivos embaixo.
    // Assim: "src" (diretório) vem antes de "package.json" (arquivo).
    // Dentro de "src", "cli" (diretório) vem antes de "index.ts" (arquivo).
    const expected =
      '├── src\n' +
      '│   ├── cli\n' +
      '│   │   └── prompts.ts\n' +
      '│   └── index.ts\n' +
      '└── package.json\n';

    const result = buildTreeString(input);

    expect(result).toBe(expected);
  });
});

describe('scanDirectory() with .gitignore', () => {
  const tempWorkspace = path.join(__dirname, 'temp-scanner-workspace');

  beforeAll(async () => {
    await fs.rm(tempWorkspace, { recursive: true, force: true });
    await fs.mkdir(tempWorkspace, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(tempWorkspace, { recursive: true, force: true });
  });

  it('should scan files correctly and respect .gitignore rules', async () => {
    // 1. Create a dummy file structure
    await fs.writeFile(path.join(tempWorkspace, 'keep-me.ts'), '// keep');
    await fs.writeFile(path.join(tempWorkspace, 'should-ignore.log'), 'logs');

    const nestedDir = path.join(tempWorkspace, 'ignored-folder');
    await fs.mkdir(nestedDir, { recursive: true });
    await fs.writeFile(path.join(nestedDir, 'nested.ts'), '// nested ignored');

    const srcDir = path.join(tempWorkspace, 'src');
    await fs.mkdir(srcDir, { recursive: true });
    await fs.writeFile(path.join(srcDir, 'index.ts'), '// index');

    // Create a .gitignore file
    const gitignoreContent = `
# ignores log files
*.log

# ignores folder
ignored-folder/
`;
    await fs.writeFile(path.join(tempWorkspace, '.gitignore'), gitignoreContent);

    // 2. Scan the directory
    const files = await scanDirectory(tempWorkspace);

    // 3. Verify
    // normalize separators to forward slashes for cross-platform comparison
    const normalizedFiles = files.map((f) => f.replace(/\\/g, '/'));

    expect(normalizedFiles).toContain('keep-me.ts');
    expect(normalizedFiles).toContain('src/index.ts');
    expect(normalizedFiles).toContain('.gitignore');

    expect(normalizedFiles).not.toContain('should-ignore.log');
    expect(normalizedFiles).not.toContain('ignored-folder/nested.ts');
  });
});
