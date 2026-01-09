import { spawnSync } from 'child_process';
import { homedir } from 'os';
import { join, basename } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { TaskQueue } from './queue.js';

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

function runClaudeCode(worktreePath: string, prompt: string, extraArgs: string[]): boolean {
  console.log('\n=== Running Claude Code ===');
  console.log(`Working directory: ${worktreePath}`);
  console.log(`Prompt: ${prompt}`);
  if (extraArgs.length > 0) {
    console.log(`Extra args: ${extraArgs.join(' ')}`);
  }
  console.log();

  const claudeArgs = ['code', '-m', prompt, ...extraArgs];
  const result = spawnSync('claude', claudeArgs, {
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

export async function runWorker(extraArgs: string[] = []) {
  const queue = new TaskQueue();
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

  // Run Claude Code with extra args
  const success = runClaudeCode(worktreePath, task.prompt, extraArgs);

  if (success) {
    console.log('\n=== Task completed successfully ===');
    queue.updateTaskStatus(task.id, 'completed');

    // Cleanup worktree on success
    cleanupWorktree(task.repoPath, worktreePath);
  } else {
    console.error('\n=== Task failed ===');
    console.log(`Worktree location: ${worktreePath}`);
    console.log('You can investigate the issue and manually fix it.');
    console.log('Run the following command to remove it when done:');
    console.log(`  cd ${task.repoPath} && git worktree remove ${worktreePath}`);

    queue.updateTaskStatus(task.id, 'failed');
  }
}
