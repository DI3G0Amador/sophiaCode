import { describe, it, expect } from 'vitest';
import { buildTreeString } from '../fs/scanner.js';

describe('buildTreeString()', () => {
  it('should format a single file correctly', () => {
    const input = ['index.ts'];
    const expected = '└── index.ts\n';

    const result = buildTreeString(input);

    expect(result).toBe(expected);
  });

  it('should format nested files and sort files/folders alphabetically', () => {
    const input = [
      'src/index.ts',
      'package.json',
      'src/cli/prompts.ts'
    ];

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
