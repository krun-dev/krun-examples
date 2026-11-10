import { Client } from "pg";

const taskPath =
  /^\/api\/todos\/([0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12})$/i;
const columns = "id, title, completed, created_at";

function json(body, status = 200, headers = {}) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

async function readObject(request) {
  const type = request.headers
    .get("content-type")
    ?.split(";")[0]
    .trim()
    .toLowerCase();
  if (type !== "application/json") return null;

  try {
    const value = await request.json();
    return value && typeof value === "object" && !Array.isArray(value)
      ? value
      : null;
  } catch {
    return null;
  }
}

async function listTodos(db) {
  const result = await db.query(
    `SELECT ${columns} FROM todos ORDER BY created_at DESC, id DESC LIMIT 100`,
  );
  return json({ items: result.rows });
}

async function createTodo(db, title) {
  const result = await db.query(
    `INSERT INTO todos (title) VALUES ($1) RETURNING ${columns}`,
    [title],
  );
  return json(result.rows[0], 201);
}

async function updateTodo(db, id, completed) {
  const result = await db.query(
    `UPDATE todos SET completed = $2 WHERE id = $1 RETURNING ${columns}`,
    [id, completed],
  );
  return result.rowCount
    ? json(result.rows[0])
    : json({ error: "待办不存在。" }, 404);
}

async function deleteTodo(db, id) {
  const result = await db.query("DELETE FROM todos WHERE id = $1", [id]);
  if (!result.rowCount) return json({ error: "待办不存在。" }, 404);

  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}

async function apiAction(request, path) {
  const method = request.method;
  if (path === "/api/todos") {
    if (method === "GET") return listTodos;
    if (method !== "POST") {
      return json({ error: "不支持此请求方法。" }, 405, { Allow: "GET, POST" });
    }

    const input = await readObject(request);
    const title = typeof input?.title === "string" ? input.title.trim() : "";
    if (!title || [...title].length > 120 || title.includes("\0")) {
      return json({ error: "待办内容须为 1 到 120 个字符。" }, 400);
    }
    return (db) => createTodo(db, title);
  }

  const id = taskPath.exec(path)?.[1];
  if (!id) return json({ error: "接口不存在。" }, 404);
  if (method === "DELETE") return (db) => deleteTodo(db, id);
  if (method !== "PATCH") {
    return json({ error: "不支持此请求方法。" }, 405, {
      Allow: "PATCH, DELETE",
    });
  }

  const input = await readObject(request);
  if (typeof input?.completed !== "boolean") {
    return json({ error: "completed 必须为布尔值。" }, 400);
  }
  return (db) => updateTodo(db, id, input.completed);
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (!path.startsWith("/api/")) return env.ASSETS.fetch(request);

    const action = await apiAction(request, path);
    if (action instanceof Response) return action;

    const connectionString = env.DB?.connectionString;
    if (!connectionString) return json({ error: "数据库尚未绑定。" }, 503);

    const db = new Client({
      connectionString,
      connectionTimeoutMillis: 5000,
      statement_timeout: 5000,
    });
    try {
      await db.connect();
      return await action(db);
    } catch (error) {
      console.error("Todo database request failed", error.code || "unknown");
      return json({ error: "数据库暂不可用，请稍后重试。" }, 503);
    } finally {
      await db.end().catch(() => {});
    }
  },
};
