import { describe, it, expect } from 'vitest';
import { askMultilinePreserved } from '../src/core/cli/input-handler.js';

describe('Input Handler Module', () => {
  it('should export askMultilinePreserved helper', () => {
    expect(askMultilinePreserved).toBeDefined();
    expect(typeof askMultilinePreserved).toBe('function');
  });
});
