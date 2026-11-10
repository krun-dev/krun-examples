import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

const origin = process.env.TODO_ORIGIN || "http://127.0.0.1:8787";

async function request(path, options = {}) {
  const { method = "GET", body } = options;
  return fetch(new URL(path, origin), {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10000),
  });
}

test("the static frontend and PostgreSQL-backed API serve from the same origin", async () => {
  const page = await request("/");
  assert.equal(page.status, 200);
  assert.match(await page.text(), /待办事项/);

  for (const file of ["/app.js", "/styles.css"]) {
    const asset = await request(file);
    assert.equal(asset.status, 200);
    await asset.arrayBuffer();
  }

  const list = await request("/api/todos");
  assert.equal(list.status, 200);
  assert.equal(list.headers.get("Cache-Control"), "no-store");
  assert.ok(Array.isArray((await list.json()).items));
});

test("creates, reads, toggles, and deletes a task", async (context) => {
  const title = `冒烟测试 '${randomUUID()}' <demo>`;
  const create = await request("/api/todos", {
    method: "POST",
    body: { title },
  });
  assert.equal(create.status, 201);
  const todo = await create.json();
  const path = "/api/todos/" + todo.id;
  context.after(async () => {
    const cleanup = await request(path, { method: "DELETE" });
    assert.ok([204, 404].includes(cleanup.status));
  });
  assert.equal(todo.title, title);
  assert.equal(todo.completed, false);
  assert.ok(Number.isFinite(Date.parse(todo.created_at)));

  const list = await request("/api/todos");
  assert.equal(list.status, 200);
  assert.ok(
    (await list.json()).items.some(
      (item) => item.id === todo.id && item.title === title,
    ),
  );

  for (const completed of [true, false]) {
    const update = await request(path, {
      method: "PATCH",
      body: { completed },
    });
    assert.equal(update.status, 200);
    assert.equal((await update.json()).completed, completed);
  }

  const remove = await request(path, { method: "DELETE" });
  assert.equal(remove.status, 204);

  const finalList = await request("/api/todos");
  assert.equal(finalList.status, 200);
  assert.ok(
    !(await finalList.json()).items.some((item) => item.id === todo.id),
  );
});

test("rejects invalid input and handles missing rows", async () => {
  for (const title of [" ", "字".repeat(121)]) {
    const invalid = await request("/api/todos", {
      method: "POST",
      body: { title },
    });
    assert.equal(invalid.status, 400);
  }

  const missing = "/api/todos/" + randomUUID();
  const invalidUpdate = await request(missing, {
    method: "PATCH",
    body: { completed: "true" },
  });
  assert.equal(invalidUpdate.status, 400);
  assert.equal((await request(missing, { method: "DELETE" })).status, 404);

  const method = await request("/api/todos", { method: "PUT" });
  assert.equal(method.status, 405);
  assert.equal(method.headers.get("Allow"), "GET, POST");
});
