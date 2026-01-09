#!/usr/bin/env node

import { spawnSync } from 'child_process';
import { homedir } from 'os';
import { join, basename } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { TaskQueue } from './queue.js';

const queue = new TaskQueue();

function createWorktree(repoPath: string, baseBranch: string, taskId: string): string | null {
  const worktreesDir = join(homedir(), 'worktrees');

  // Ensure worktrees directory exists
  if (!existsSync(worktreesDir)) {
    mkdirSync(worktreesDir, { recursive: true });
  }

  // Create a unique branch name
  const branchName = `task-${taskId}`;
  const worktreePath = join(worktreesDir, `${basename(repoPath)}-${taskId}`);

  console.log(`Creating worktree at: ${worktreePath}`);
  console.log(`Branch: ${branchName}`);
  console.log(`Base: ${baseBranch}`);

  // Create the worktree with a new branch
  const result = spawnSync(
    'git',
    ['worktree', 'add', '-b', branchName, worktreePath, baseBranch],
    {
      cwd: repoPath,
      stdio: 'inherit',
    }
  );

  if (result.error || result.status !== 0) {
    console.error('Failed to create worktree');
    return null;
  }

  return worktreePath;
}

function runClaudeCode(worktreePath: string, prompt: string): boolean {
  console.log('\n=== Running Claude Code ===');
  console.log(`Working directory: ${worktreePath}`);
  console.log(`Prompt: ${prompt}\n`);

  const result = spawnSync('claude', ['code', '-m', prompt], {
    cwd: worktreePath,
    stdio: 'inherit',
  });

  if (result.error) {
    console.error('Failed to run Claude Code:', result.error);
    return false;
  }

  return result.status === 0;
}

function cleanupWorktree(repoPath: string, worktreePath: string): void {
  console.log(`\nCleaning up worktree: ${worktreePath}`);

  const result = spawnSync('git', ['worktree', 'remove', worktreePath], {
    cwd: repoPath,
    stdio: 'inherit',
  });

  if (result.error || result.status !== 0) {
    console.error('Warning: Failed to cleanup worktree. You may need to manually run:');
    console.error(`  git worktree remove ${worktreePath}`);
  }
}

async function processTask() {
  const task = queue.getOldestQueuedTask();

  if (!task) {
    console.log('No queued tasks found.');
    return;
  }

  console.log(`\n=== Processing Task ${task.id} ===`);
  console.log(`Repository: ${task.repoPath}`);
  console.log(`Base Branch: ${task.baseBranch}`);
  console.log(`Created: ${task.createdAt}`);
  console.log(`Prompt: ${task.prompt}\n`);

  // Update status to processing
  queue.updateTaskStatus(task.id, 'processing');

  // Create worktree
  const worktreePath = createWorktree(task.repoPath, task.baseBranch, task.id);

  if (!worktreePath) {
    console.error('Failed to create worktree. Marking task as failed.');
    queue.updateTaskStatus(task.id, 'failed');
    return;
  }

  // Run Claude Code
  const success = runClaudeCode(worktreePath, task.prompt);

  if (success) {
    console.log('\n=== Task completed successfully ===');
    console.log(`Worktree location: ${worktreePath}`);
    console.log('\nNext steps:');
    console.log(`  1. Review changes in: ${worktreePath}`);
    console.log(`  2. Create PR if satisfied`);
    console.log(`  3. Cleanup worktree: git worktree remove ${worktreePath}`);

    queue.updateTaskStatus(task.id, 'completed');
  } else {
    console.error('\n=== Task failed ===');
    console.log(`Worktree location: ${worktreePath}`);
    console.log('You can investigate the issue and manually fix it.');

    queue.updateTaskStatus(task.id, 'failed');
  }

  // Ask user if they want to cleanup
  console.log('\nNote: Worktree has been left intact for review.');
  console.log('Run the following command to remove it when done:');
  console.log(`  cd ${task.repoPath} && git worktree remove ${worktreePath}`);
}

// Main execution
processTask().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
