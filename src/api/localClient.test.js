import { describe, it, expect, beforeEach } from 'vitest';
import { localClient } from './localClient';

describe('localClient.Entities.Task', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates task with defaults', async () => {
    const created = await localClient.entities.Task.create({ title: 'Test Task' });
    expect(created.id).toBeDefined();
    expect(created.created_date).toBeDefined();
    expect(created.due_date).toBeNull();
    const tasks = await localClient.entities.Task.list();
    expect(tasks.length).toBe(1);
  });
});


