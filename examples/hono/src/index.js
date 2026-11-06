import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => c.html(`<!doctype html>
<html lang="zh-CN"><meta charset="utf-8"><title>Hono on krun</title>
<body><h1>Hono on krun</h1><p>Hono Worker 正在运行。</p>
<p><a href="/api/hello?name=krun">试试 JSON API</a></p></body></html>`));

app.get('/api/hello', (c) => {
  const name = c.req.query('name')?.trim() || 'world';
  return c.json({ message: `Hello, ${name}!`, framework: 'Hono' });
});

export default app;
