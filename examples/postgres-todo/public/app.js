const form = document.querySelector("#todo-form");
const titleInput = document.querySelector("#todo-title");
const addButton = form.querySelector("button");
const reloadButton = document.querySelector("#reload");
const list = document.querySelector("#todos");
const template = document.querySelector("#todo-template");
const status = document.querySelector("#status");
const errorBox = document.querySelector("#error");
const empty = document.querySelector("#empty");
const pendingCount = document.querySelector("#pending-count");
const completedCount = document.querySelector("#completed-count");
const filters = [...document.querySelectorAll("[data-filter]")];

let todos = [];
let filter = "all";
let loaded = false;
let busy = false;

async function api(path = "", { method = "GET", body } = {}) {
  const response = await fetch("/api/todos" + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (response.status === 204) return;

  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "请求失败。");
  return result;
}

function render() {
  const completed = todos.filter((todo) => todo.completed).length;
  completedCount.textContent = loaded ? String(completed) : "—";
  pendingCount.textContent = loaded ? String(todos.length - completed) : "—";

  const visible = todos.filter((todo) => {
    if (filter === "pending") return !todo.completed;
    if (filter === "completed") return todo.completed;
    return true;
  });

  const rows = visible.map((todo) => {
    const row = template.content.firstElementChild.cloneNode(true);
    row.dataset.id = todo.id;
    const checkbox = row.querySelector("input");
    checkbox.checked = todo.completed;
    checkbox.disabled = busy;
    row.querySelector(".task-title").textContent = todo.title;
    const remove = row.querySelector(".remove");
    remove.disabled = busy;
    remove.setAttribute("aria-label", "删除待办：" + todo.title);
    return row;
  });

  list.replaceChildren(...rows);
  empty.hidden = !loaded || rows.length > 0;
  empty.textContent = {
    all: "还没有待办，先记下一件吧。",
    pending: "没有待完成的事项。",
    completed: "没有已完成的事项。",
  }[filter];
  for (const button of filters) {
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.filter === filter),
    );
  }
}

async function update(message, operation) {
  if (busy) return false;
  busy = true;
  errorBox.hidden = true;
  status.textContent = message;
  addButton.disabled = true;
  reloadButton.disabled = true;
  list.setAttribute("aria-busy", "true");
  for (const control of list.querySelectorAll("button, input"))
    control.disabled = true;

  try {
    await operation();
    status.textContent = "";
    return true;
  } catch (error) {
    status.textContent = "";
    errorBox.textContent = error.message || "请求失败，请稍后重试。";
    errorBox.hidden = false;
    return false;
  } finally {
    busy = false;
    addButton.disabled = !loaded;
    reloadButton.disabled = false;
    list.setAttribute("aria-busy", "false");
    render();
  }
}

function loadTodos() {
  return update("正在读取待办…", async () => {
    todos = (await api()).items;
    loaded = true;
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = titleInput.value.trim();
  if (!title) {
    titleInput.focus();
    return;
  }

  const saved = await update("正在添加待办…", async () => {
    const todo = await api("", { method: "POST", body: { title } });
    todos = [todo, ...todos].slice(0, 100);
    if (filter === "completed") filter = "all";
  });

  if (saved && titleInput.value.trim() === title) form.reset();
  titleInput.focus();
});

list.addEventListener("change", async (event) => {
  const control = event.target.closest("input[type=checkbox]");
  if (!control) return;

  const row = control.closest("[data-id]");
  const id = row.dataset.id;
  const completed = control.checked;
  await update("正在保存状态…", async () => {
    const todo = await api("/" + id, { method: "PATCH", body: { completed } });
    todos = todos.map((entry) => (entry.id === id ? todo : entry));
  });
  list.querySelector(`[data-id="${id}"] input`)?.focus();
});

list.addEventListener("click", (event) => {
  const remove = event.target.closest(".remove");
  if (!remove) return;

  const id = remove.closest("[data-id]").dataset.id;
  void update("正在删除待办…", async () => {
    await api("/" + id, { method: "DELETE" });
    todos = todos.filter((todo) => todo.id !== id);
  });
});

for (const button of filters) {
  button.addEventListener("click", () => {
    filter = button.dataset.filter;
    render();
  });
}

reloadButton.addEventListener("click", loadTodos);
void loadTodos();
