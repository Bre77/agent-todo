import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export interface Task {
  id: string;
  repoPath: string;
  baseBranch: string;
  prompt: string;
  createdAt: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
}

export class TaskQueue {
  private queueDir: string;
  private queueFile: string;

  constructor() {
    this.queueDir = join(homedir(), '.agent-todo');
    this.queueFile = join(this.queueDir, 'queue.json');
    this.ensureQueueDir();
  }

  private ensureQueueDir(): void {
    if (!existsSync(this.queueDir)) {
      mkdirSync(this.queueDir, { recursive: true });
    }
    if (!existsSync(this.queueFile)) {
      this.saveTasks([]);
    }
  }

  private loadTasks(): Task[] {
    try {
      const data = readFileSync(this.queueFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  private saveTasks(tasks: Task[]): void {
    writeFileSync(this.queueFile, JSON.stringify(tasks, null, 2), 'utf-8');
  }

  addTask(repoPath: string, baseBranch: string, prompt: string): Task {
    const tasks = this.loadTasks();
    const task: Task = {
      id: this.generateId(),
      repoPath,
      baseBranch,
      prompt,
      createdAt: new Date().toISOString(),
      status: 'queued',
    };
    tasks.push(task);
    this.saveTasks(tasks);
    return task;
  }

  getOldestQueuedTask(): Task | null {
    const tasks = this.loadTasks();
    const queuedTasks = tasks.filter(t => t.status === 'queued');
    return queuedTasks.length > 0 ? queuedTasks[0] : null;
  }

  updateTaskStatus(taskId: string, status: Task['status']): void {
    const tasks = this.loadTasks();
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      task.status = status;
      this.saveTasks(tasks);
    }
  }

  listTasks(): Task[] {
    return this.loadTasks();
  }

  removeTask(taskId: string): void {
    const tasks = this.loadTasks();
    const filteredTasks = tasks.filter(t => t.id !== taskId);
    this.saveTasks(filteredTasks);
  }

  private generateId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
