# Agent Todo

A task queue system for parallel agent workflows using the Model Context Protocol (MCP). Queue tasks from Claude Code and execute them in parallel git worktrees.

## Overview

Agent Todo is a single binary with two modes:

1. **Worker Mode** (default): Processes queued tasks by creating git worktrees and executing Claude Code
2. **Server Mode**: A Model Context Protocol server that exposes tools for queueing tasks

## Use Case

This tool enables a workflow where:
- An AI agent (like Claude Code) can queue multiple feature requests or bug fixes
- You manually execute these tasks in parallel across different git worktrees
- Each task runs in isolation, allowing concurrent development
- Results can be reviewed and turned into pull requests independently

## Installation

```bash
npm install
npm run build
```

Or install globally:

```bash
npm install -g .
```

## Usage

### 1. Configure the MCP Server

Add the MCP server to your Claude Code configuration. Edit your Claude Code MCP settings file (typically `~/.config/claude/mcp.json` or similar):

```json
{
  "mcpServers": {
    "agent-todo": {
      "command": "node",
      "args": ["/path/to/agent-todo/dist/index.js", "server"]
    }
  }
}
```

Or if installed globally:

```json
{
  "mcpServers": {
    "agent-todo": {
      "command": "agent-todo",
      "args": ["server"]
    }
  }
}
```

### 2. Queue Tasks from Claude Code

Once configured, Claude Code will have access to the `queue_task` tool:

#### `queue_task`

Queue a new task for later execution.

```typescript
// Example usage from Claude Code
queue_task({
  repoPath: "/path/to/your/repo",
  baseBranch: "main",
  prompt: "Add user authentication feature with OAuth support"
})
```

You can view queued tasks by checking `~/.agent-todo/queue.json` directly.

### 3. Process Tasks

Run the worker to process the oldest queued task:

```bash
npm start
# or explicitly:
npm start worker
```

Or if installed globally:

```bash
agent-todo
# or explicitly:
agent-todo worker
```

You can pass additional arguments to Claude Code:

```bash
# Pass Claude Code flags
agent-todo --verbose
agent-todo --model opus

# With explicit worker command
agent-todo worker --verbose --model opus
```

Any arguments after the command (or all arguments if no command is specified) will be forwarded to Claude Code.

The worker will:
1. Find the oldest queued task
2. Create a git worktree in `~/worktrees/`
3. Create a new branch for the task
4. Execute Claude Code with the provided prompt
5. On success: automatically clean up the worktree
6. On failure: leave the worktree for debugging

### 4. Review and Create PR

For successful tasks, the worktree is automatically cleaned up. You can review the changes in the repository and create a PR from the task branch.

For failed tasks, the worktree is left intact for debugging. Clean it up manually when done:

```bash
cd /path/to/original/repo
git worktree remove ~/worktrees/repo-name-task-id
```

## Task Storage

Tasks are stored in `~/.agent-todo/queue.json` as a simple JSON file. Each task includes:

- `id`: Unique task identifier
- `repoPath`: Absolute path to the git repository
- `baseBranch`: Branch to base the new work on
- `prompt`: Instructions for Claude Code
- `createdAt`: ISO timestamp of task creation
- `status`: One of `queued`, `processing`, `completed`, or `failed`

## Workflow Example

```bash
# In Claude Code session
# Queue multiple tasks using the MCP tool
> Use queue_task to add a feature for user authentication
> Use queue_task to add a feature for email notifications
> Use queue_task to fix the login bug

# In terminal - process tasks in parallel
$ agent-todo  # Terminal 1
$ agent-todo  # Terminal 2
$ agent-todo  # Terminal 3

# Or with custom Claude Code flags
$ agent-todo --verbose         # Terminal 1 - verbose output
$ agent-todo --model opus      # Terminal 2 - use Opus model
$ agent-todo --auto-approve    # Terminal 3 - auto-approve changes

# Each worker creates a separate worktree and works independently
# Review and create PRs for each completed task
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev:worker   # Worker mode (default)
npm run dev:server   # Server mode

# Build
npm run build

# Run built version
npm start           # Worker mode (default)
node dist/index.js server  # Server mode
```

## Architecture

- **Main Entry** (`src/index.ts`): Routes to server or worker based on command-line args
- **Queue Manager** (`src/queue.ts`): Handles task storage and retrieval
- **MCP Server** (`src/mcp-server.ts`): Exposes MCP protocol tools over stdio
- **Worker** (`src/worker.ts`): Processes tasks by creating worktrees and running Claude Code

### Build System

This project uses [tsdown](https://github.com/egoist/tsdown) for building, which:
- Bundles all dependencies and modules into a single executable file
- Produces optimized, minified output
- Results in fast startup times and minimal file size
- Automatically includes the shebang (`#!/usr/bin/env node`) for direct execution
- Tree-shakes unused code for smaller bundles

### Continuous Integration

GitHub Actions automatically builds and releases the project when PRs are merged to the main branch:
- Builds with tsdown
- Creates timestamped releases
- Attaches compiled binaries as release artifacts

## Requirements

- Node.js 18+
- Git
- Claude Code CLI (`claude code`)

## License

Apache-2.0
