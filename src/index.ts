#!/usr/bin/env node

import { startServer } from './mcp-server.js';
import { runWorker } from './worker.js';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'server') {
    await startServer();
  } else if (!command || command === 'worker') {
    // Worker mode - pass any remaining args to Claude Code
    const extraArgs = command === 'worker' ? args.slice(1) : args;
    await runWorker(extraArgs);
  } else {
    // First arg is not 'server' or 'worker', treat as worker with all args
    await runWorker(args);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
