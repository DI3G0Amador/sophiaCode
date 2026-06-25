import readline from 'readline';

/**
 * Result structure returned by the input handler.
 */
export interface InputResult {
  text: string;
  toggleMode: boolean;
  canceled: boolean;
}

/**
 * Prompts the user for a multiline message, supporting line continuation with '\'
 * and mode toggling via the Tab key, preserving any already-typed buffer.
 */
export async function askMultilinePreserved(
  message: string,
  initialBuffer = '',
  placeholder = ''
): Promise<InputResult> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '│  ',
    });

    console.log(`\n◇  ${message}`);
    if (placeholder && !initialBuffer) {
      console.log(`│  \x1b[90m${placeholder}\x1b[0m`);
    }
    rl.prompt();

    // Write initial buffer if we are returning from a toggle
    if (initialBuffer) {
      rl.write(initialBuffer);
    }

    const lines: string[] = [];
    let toggleMode = false;
    let canceled = false;

    // Listener to intercept the Tab keypress event on stdin
    const onKeypress = (chunk: any, key: any) => {
      if (key && key.name === 'tab') {
        toggleMode = true;
        // Capture whatever the user has typed on the current line
        const currentLine = rl.line;
        lines.push(currentLine);
        rl.close();
      }
    };

    process.stdin.on('keypress', onKeypress);

    const onLine = (line: string) => {
      if (line.endsWith('\\')) {
        lines.push(line.slice(0, -1));
        rl.setPrompt('│  ');
        rl.prompt();
      } else {
        lines.push(line);
        rl.close();
      }
    };

    rl.on('line', onLine);

    rl.on('close', () => {
      // Clean up the raw keypress listener
      process.stdin.removeListener('keypress', onKeypress);

      const text = lines.join('\n').trim();
      resolve({
        text,
        toggleMode,
        canceled,
      });
    });

    // Handle Ctrl+C (Interrupt)
    rl.on('SIGINT', () => {
      canceled = true;
      process.stdin.removeListener('keypress', onKeypress);
      rl.close();
      resolve({
        text: '',
        toggleMode: false,
        canceled: true,
      });
    });
  });
}
