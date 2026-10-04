import { describe, it, expect } from 'vitest';
import { createTree } from '../../src/entities/Tree';

describe('Tree', () => {
  it('returns a non-null view container', () => {
    const tree = createTree(4);
    expect(tree.view).toBeDefined();
  });
});
