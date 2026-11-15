import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@talk-me-down/shared': path.resolve(root, 'packages/shared/src/index.ts'),
      '@talk-me-down/game-core': path.resolve(root, 'packages/game-core/src/index.ts'),
    },
  },
  test: {
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
