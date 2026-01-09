#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { TaskQueue } from './queue.js';

const queue = new TaskQueue();

const server = new Server(
  {
    name: 'agent-todo',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'queue_task',
        description:
          'Queue a task for later execution. This adds a task to the queue with a repository path, base branch, and prompt for Claude Code to execute.',
        inputSchema: {
          type: 'object',
          properties: {
            repoPath: {
              type: 'string',
              description: 'Absolute path to the git repository',
            },
            baseBranch: {
              type: 'string',
              description: 'Base branch to create worktree from (e.g., main, master)',
            },
            prompt: {
              type: 'string',
              description: 'The prompt/task for Claude Code to execute',
            },
          },
          required: ['repoPath', 'baseBranch', 'prompt'],
        },
      },
      {
        name: 'list_tasks',
        description: 'List all tasks in the queue with their current status',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'remove_task',
        description: 'Remove a task from the queue by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: {
              type: 'string',
              description: 'The ID of the task to remove',
            },
          },
          required: ['taskId'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'queue_task': {
      const { repoPath, baseBranch, prompt } = args as {
        repoPath: string;
        baseBranch: string;
        prompt: string;
      };

      const task = queue.addTask(repoPath, baseBranch, prompt);

      return {
        content: [
          {
            type: 'text',
            text: `Task queued successfully!\n\nID: ${task.id}\nRepository: ${task.repoPath}\nBase Branch: ${task.baseBranch}\nCreated: ${task.createdAt}\n\nRun 'agent-todo-worker' to process this task.`,
          },
        ],
      };
    }

    case 'list_tasks': {
      const tasks = queue.listTasks();

      if (tasks.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No tasks in queue.',
            },
          ],
        };
      }

      const taskList = tasks
        .map(
          (t) =>
            `[${t.status.toUpperCase()}] ${t.id}\n  Repo: ${t.repoPath}\n  Branch: ${t.baseBranch}\n  Created: ${t.createdAt}\n  Prompt: ${t.prompt.substring(0, 100)}${t.prompt.length > 100 ? '...' : ''}`
        )
        .join('\n\n');

      return {
        content: [
          {
            type: 'text',
            text: `Tasks in queue:\n\n${taskList}`,
          },
        ],
      };
    }

    case 'remove_task': {
      const { taskId } = args as { taskId: string };
      queue.removeTask(taskId);

      return {
        content: [
          {
            type: 'text',
            text: `Task ${taskId} removed from queue.`,
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Agent Todo MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
