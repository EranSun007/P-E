import { describe, it, expect, beforeEach } from 'vitest';
import { DataMigration } from './dataMigration';

describe('DataMigration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('migrates tasks by adding new fields', async () => {
    localStorage.setItem('tasks', JSON.stringify([{ id: '1', title: 'Old Task', status: 'todo', created_date: new Date().toISOString() }]));
    await DataMigration.migrateTasksSchema();
    const tasks = JSON.parse(localStorage.getItem('tasks'));
    expect(Array.isArray(tasks)).toBe(true);
    expect(tasks[0]).toHaveProperty('due_date');
  });
});


