import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
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
