import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { TaskQueue } from './queue.js';

export async function startServer() {
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
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === 'queue_task') {
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
            text: `Task queued successfully!\n\nID: ${task.id}\nRepository: ${task.repoPath}\nBase Branch: ${task.baseBranch}\nCreated: ${task.createdAt}\n\nRun 'agent-todo' to process this task.`,
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Agent Todo MCP Server running on stdio');
}
