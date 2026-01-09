#!/usr/bin/env node

import { startServer } from './mcp-server.js';
import { runWorker } from './worker.js';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  // Default to worker if no command specified
  if (!command || command === 'worker') {
    await runWorker();
  } else if (command === 'server') {
    await startServer();
  } else {
    console.error(`Unknown command: ${command}`);
    console.error('\nUsage:');
    console.error('  agent-todo         Run worker (process next queued task)');
    console.error('  agent-todo worker  Run worker (process next queued task)');
    console.error('  agent-todo server  Run MCP server');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
