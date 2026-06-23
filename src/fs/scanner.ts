import glob from 'fast-glob';

interface TreeNode {
  [key: string]: TreeNode | null;
}

/**
 * Scans a directory and returns an array of relative file paths,
 * ignoring heavy and system-related directories.
 */
export async function scanDirectory(basePath: string): Promise<string[]> {
  return await glob('**/*', {
    cwd: basePath,
    ignore: [
      'node_modules/**',
      '.git/**',
      'dist/**',
      '.next/**',
      'build/**',
      '.env',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      'sophiAgents/**'
    ],
    onlyFiles: true,
    dot: true
  });
}

/**
 * Converts a list of file paths into a visual folder tree string.
 */
export function buildTreeString(files: string[]): string {
  const root: TreeNode = {};

  // Passo 1: Construir a árvore de objetos aninhados
  for (const file of files) {
    const parts = file.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        // É um arquivo (fim do caminho)
        current[part] = null;
      } else {
        // É um diretório
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part] as TreeNode;
      }
    }
  }

  // Passo 2: Função recursiva para desenhar a árvore
  function draw(node: TreeNode, prefix: string = ''): string {
    let result = '';
    const keys = Object.keys(node).sort((a, b) => {
      const isDirA = node[a] !== null;
      const isDirB = node[b] !== null;
      // Coloca diretórios no topo, arquivos depois (igual ao explorador de arquivos)
      if (isDirA && !isDirB) return -1;
      if (!isDirA && isDirB) return 1;
      return a.localeCompare(b);
    });

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const isLast = i === keys.length - 1;
      const connector = isLast ? '└── ' : '├── ';

      result += `${prefix}${connector}${key}\n`;

      const childNode = node[key];
      if (childNode !== null) {
        // Se for um diretório, desenha recursivamente aumentando o recuo
        const nextPrefix = prefix + (isLast ? '    ' : '│   ');
        result += draw(childNode, nextPrefix);
      }
    }

    return result;
  }

  return draw(root);
}
