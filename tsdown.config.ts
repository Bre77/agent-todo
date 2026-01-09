import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    'mcp-server': 'src/mcp-server.ts',
    'worker': 'src/worker.ts',
  },
  format: ['esm'],
  platform: 'node',
  clean: true,
  shims: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
  treeshake: true,
  bundle: true,
  skipNodeModulesBundle: false,
});
