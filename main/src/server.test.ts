import request from 'supertest';
import { describe, it, expect, vi } from 'vitest';
import { createHttpServer } from './server';

describe('HTTP API server', () => {
  it('invokes IPC handlers and returns their result', async () => {
    const ipc = { invoke: vi.fn(async (_channel: string, ...args: any[]) => ({ ok: true, args })) };
    const app = createHttpServer(ipc as any);

    const res = await request(app)
      .post('/ipc/test')
      .send({ args: ['a', 1] })
      .expect(200);

    expect(res.body).toEqual({ ok: true, args: ['a', 1] });
    expect(ipc.invoke).toHaveBeenCalledWith('test', 'a', 1);
  });

  it('returns 500 when IPC handler throws', async () => {
    const ipc = { invoke: vi.fn(async () => { throw new Error('boom'); }) };
    const app = createHttpServer(ipc as any);

    const res = await request(app)
      .post('/ipc/error')
      .send({ args: [] });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ success: false, error: 'boom' });
  });
});
