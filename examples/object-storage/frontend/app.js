import "./style.css";

const paths = {
  folder: '<path d="M3 7h6l2 2h10v11H3z"/><path d="M3 7V4h6l2 3"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  image:
    '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  box: '<path d="m12 3 9 5-9 5-9-5zM3 8v10l9 5 9-5V8M12 13v10M7 5l9 5"/>',
  layers: '<path d="m12 3 10 5-10 5L2 8zM2 12l10 5 10-5M2 16l10 5 10-5"/>',
  cloud:
    '<path d="M20 16a4 4 0 0 0-2-7.5A6 6 0 0 0 6 8a4 4 0 0 0 0 8h3M12 12v9m-3-3 3 3 3-3"/>',
  home: '<path d="m3 10 9-7 9 7v11h-6v-7H9v7H3z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  upload: '<path d="M12 16V3m-4 4 4-4 4 4M4 15v6h16v-6"/>',
  download: '<path d="M12 3v13m-4-4 4 4 4-4M4 16v5h16v-5"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  list: '<path d="M9 5h12M9 12h12M9 19h12M3 5h1M3 12h1M3 19h1"/>',
  refresh:
    '<path d="M20 11a8 8 0 0 0-14-5L3 9M3 3v6h6M4 13a8 8 0 0 0 14 5l3-3m0 6v-6h-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  database:
    '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  external: '<path d="M14 3h7v7m0-7L10 14M10 3H4v17h17v-6"/>',
};
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
for (const element of $$("[data-icon]")) {
  element.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[element.dataset.icon]}</svg>`;
}

const state = {
  files: [],
  cursor: null,
  category: "all",
  query: "",
  sort: "newest",
  selected: null,
  loading: false,
  busy: 0,
  generation: 0,
};
let toastTimeout;
const formatBytes = (size) => {
  if (!size) return "0 B";
  const index = Math.min(3, Math.floor(Math.log(size) / Math.log(1024)));
  return `${(size / 1024 ** index).toFixed(index && size / 1024 ** index < 10 ? 1 : 0)} ${["B", "KB", "MB", "GB"][index]}`;
};
const shortDate = (date) =>
  new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit" }).format(
    new Date(date),
  );
const fullDate = (date) =>
  new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));

function category(file) {
  if (file.type.startsWith("image/")) return "images";
  if (
    file.type.startsWith("text/") ||
    /\.(pdf|docx?|xlsx?|pptx?|csv|json|md)$/i.test(file.name)
  )
    return "documents";
  return "other";
}
function visual(file) {
  if (category(file) === "images") return "image";
  if (/\.(csv|xlsx?)$/i.test(file.name)) return "sheet";
  if (/\.(json|js|ts|html|css|py|sh)$/i.test(file.name)) return "code";
  return category(file) === "documents" ? "document" : "other";
}
const isPreviewable = (file) =>
  ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"].includes(
    file.type,
  );
const objectURL = (file, preview = false) =>
  `/api/objects/${encodeURIComponent(file.key)}${preview ? "?preview=1" : ""}`;

function toast(message, error = false) {
  clearTimeout(toastTimeout);
  const element = $("#toast");
  element.textContent = message;
  element.classList.toggle("error", error);
  element.hidden = false;
  toastTimeout = setTimeout(() => {
    element.hidden = true;
  }, 4500);
}

async function api(path, options) {
  const response = await fetch(path, options);
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error || `请求未完成（${response.status}）`);
  }
  return response.status === 204 ? null : response.json();
}

function makePreview(file, large = false) {
  if (isPreviewable(file)) {
    const image = new Image();
    image.src = objectURL(file, true);
    image.alt = file.name;
    image.loading = large ? "eager" : "lazy";
    image.addEventListener("error", () => image.replaceWith(fileSymbol(file)), {
      once: true,
    });
    return image;
  }
  return fileSymbol(file);
}
function fileSymbol(file) {
  const element = document.createElement("span");
  element.className = "large-file-icon";
  const suffix = file.name.includes(".")
    ? file.name
        .split(".")
        .at(-1)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 5)
    : "FILE";
  element.textContent = suffix || "FILE";
  return element;
}

function render() {
  const files = state.files.filter(
    (file) =>
      (state.category === "all" || category(file) === state.category) &&
      file.name.toLocaleLowerCase().includes(state.query.toLocaleLowerCase()),
  );
  files.sort((a, b) =>
    state.sort === "name"
      ? a.name.localeCompare(b.name, "zh-CN")
      : state.sort === "size"
        ? b.size - a.size
        : new Date(b.uploaded) - new Date(a.uploaded),
  );
  const grid = $("#file-grid");
  const fragment = document.createDocumentFragment();
  for (const file of files) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "file-card";
    card.setAttribute("aria-label", `查看 ${file.name}`);
    card.innerHTML =
      '<div class="file-visual"></div><div class="file-info"><h3 class="file-name"></h3><div class="file-sub"><span class="file-size"></span><span class="file-date"></span></div></div><span class="file-more" aria-hidden="true">⋯</span>';
    card.querySelector(".file-visual").classList.add(`visual-${visual(file)}`);
    card.querySelector(".file-visual").append(makePreview(file));
    card.querySelector(".file-name").textContent = file.name;
    card.querySelector(".file-name").title = file.name;
    card.querySelector(".file-size").textContent = formatBytes(file.size);
    card.querySelector(".file-date").textContent = shortDate(file.uploaded);
    card.addEventListener("click", () => showDetails(file));
    fragment.append(card);
  }
  grid.replaceChildren(fragment);
  $("#result-count").textContent =
    `${files.length} 个文件${state.cursor ? " · 还有更多" : ""}`;
  $("#nav-count").textContent =
    `${state.files.length}${state.cursor ? "+" : ""}`;
  $("#stat-files").textContent =
    `${state.files.length}${state.cursor ? "+" : ""}`;
  $("#stat-size").textContent = formatBytes(
    state.files.reduce((total, file) => total + file.size, 0),
  );
  $("#stat-images").textContent = state.files.filter(
    (file) => category(file) === "images",
  ).length;
  const latest = [...state.files].sort(
    (a, b) => new Date(b.uploaded) - new Date(a.uploaded),
  )[0];
  $("#stat-recent").textContent = latest
    ? shortDate(latest.uploaded)
    : "尚无文件";
  $("#stat-recent-note").textContent = latest
    ? fullDate(latest.uploaded).split(" ").at(-1)
    : "等待第一份文件";
  $("#empty-state").hidden = files.length > 0;
  $("#empty-state h3").textContent =
    state.query || state.category !== "all"
      ? "暂时没有找到这份灵感。"
      : "这里，还留着一些空白。";
  $("#empty-state p").textContent =
    state.query || state.category !== "all"
      ? "换个关键词或分类，再找找看。"
      : "上传第一份文件，开始收拾你的灵感。";
  $("#load-more").hidden = !state.cursor;
}

async function loadFiles(more = false) {
  const generation = ++state.generation;
  state.loading = true;
  $("#refresh-button").disabled = true;
  $("#load-more").disabled = true;
  $("#error-banner").hidden = true;
  if (!state.files.length) {
    $("#empty-state").hidden = true;
    $("#file-grid").innerHTML = '<div class="skeleton"></div>'.repeat(4);
  }
  try {
    const data = await api(
      `/api/objects${more && state.cursor ? `?cursor=${encodeURIComponent(state.cursor)}` : ""}`,
    );
    if (generation !== state.generation) return;
    state.files = more
      ? [
          ...state.files,
          ...data.files.filter(
            (file) =>
              !state.files.some((existing) => existing.key === file.key),
          ),
        ]
      : data.files;
    state.cursor = data.cursor;
    render();
    setConnection(true);
  } catch (error) {
    if (generation !== state.generation) return;
    $("#error-banner").textContent = error.message;
    $("#error-banner").hidden = false;
    setConnection(false);
    render();
  } finally {
    if (generation === state.generation) {
      state.loading = false;
      $("#refresh-button").disabled = false;
      $("#load-more").disabled = false;
    }
  }
}
function setConnection(connected) {
  $("#connection").classList.toggle("connected", connected);
  $("#connection").classList.toggle("disconnected", !connected);
  $("#connection span").textContent = connected
    ? "云端存储已连接"
    : "存储连接中断";
}

function setCategory(value) {
  state.category = value;
  $$("[data-category]").forEach((button) =>
    button.classList.toggle("active", button.dataset.category === value),
  );
  const titles = {
    all: ["我的文件", "所有文件", "全部文件"],
    images: ["图片与影像", "图片与影像", "图片与影像"],
    documents: ["文档资料", "文档资料", "文档资料"],
    other: ["其他收藏", "其他文件", "其他文件"],
  };
  $("#page-title").replaceChildren(document.createTextNode(titles[value][0]));
  const dot = document.createElement("span");
  dot.className = "heading-dot";
  dot.textContent = ".";
  $("#page-title").append(dot);
  $("#breadcrumb-title").textContent = titles[value][1];
  $("#section-title").textContent = titles[value][2];
  render();
}
$$("[data-category]").forEach((button) =>
  button.addEventListener("click", () => setCategory(button.dataset.category)),
);
$("#search").addEventListener("input", (event) => {
  state.query = event.target.value;
  render();
});
$("#sort").addEventListener("change", (event) => {
  state.sort = event.target.value;
  render();
});
$("#refresh-button").addEventListener("click", () => loadFiles());
$("#load-more").addEventListener("click", () => loadFiles(true));

function setView(list) {
  $("#file-grid").classList.toggle("file-list", list);
  $("#grid-view").classList.toggle("active", !list);
  $("#list-view").classList.toggle("active", list);
  $("#grid-view").setAttribute("aria-pressed", String(!list));
  $("#list-view").setAttribute("aria-pressed", String(list));
  try {
    localStorage.setItem("object-studio-view", list ? "list" : "grid");
  } catch {
    /* Browser storage is optional. */
  }
}
$("#grid-view").addEventListener("click", () => setView(false));
$("#list-view").addEventListener("click", () => setView(true));
try {
  setView(localStorage.getItem("object-studio-view") === "list");
} catch {
  /* Use grid when storage is unavailable. */
}

function showDetails(file) {
  state.selected = file;
  $("#detail-name").textContent = file.name;
  $("#detail-preview").replaceChildren(makePreview(file, true));
  $("#detail-preview").className = `detail-preview visual-${visual(file)}`;
  $("#detail-meta").replaceChildren();
  for (const [name, value] of [
    ["文件大小", formatBytes(file.size)],
    ["文件类型", file.type],
    ["上传时间", fullDate(file.uploaded)],
    ["对象标识", file.etag],
  ]) {
    const label = document.createElement("dt");
    label.textContent = name;
    const detail = document.createElement("dd");
    detail.textContent = value;
    $("#detail-meta").append(label, detail);
  }
  $("#download-file").href = objectURL(file);
  $("#download-file").download = file.name;
  $("#details-dialog").showModal();
}
$("#close-details").addEventListener("click", () =>
  $("#details-dialog").close(),
);
$("#delete-file").addEventListener("click", () => {
  $("#details-dialog").close();
  $("#delete-description").textContent =
    `「${state.selected.name}」将从云端永久删除。`;
  $("#delete-dialog").showModal();
});
$("#cancel-delete").addEventListener("click", () => {
  $("#delete-dialog").close();
  showDetails(state.selected);
});
$("#confirm-delete").addEventListener("click", async () => {
  const file = state.selected;
  $("#confirm-delete").disabled = true;
  try {
    await api(objectURL(file), { method: "DELETE" });
    state.files = state.files.filter((item) => item.key !== file.key);
    state.selected = null;
    $("#delete-dialog").close();
    render();
    toast("文件已删除，给下一份灵感腾个位置。");
  } catch (error) {
    toast(error.message, true);
  } finally {
    $("#confirm-delete").disabled = false;
  }
});
for (const dialog of $$("dialog")) {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
        dialog.close();
    }
  });
}

const chooseFiles = () => $("#file-input").click();
$("#upload-button").addEventListener("click", chooseFiles);
$("#empty-upload").addEventListener("click", chooseFiles);
$("#dropzone").addEventListener("click", chooseFiles);
$("#dropzone").addEventListener("keydown", (event) => {
  if (["Enter", " "].includes(event.key)) {
    event.preventDefault();
    chooseFiles();
  }
});
$("#file-input").addEventListener("change", (event) => {
  enqueueUploads([...event.target.files]);
  event.target.value = "";
});
let dragDepth = 0;
document.addEventListener("dragover", (event) => {
  if (event.dataTransfer.types.includes("Files")) event.preventDefault();
});
document.addEventListener("drop", (event) => {
  if (!event.dataTransfer.files.length) return;
  event.preventDefault();
  dragDepth = 0;
  $("#dropzone").classList.remove("dragging");
  enqueueUploads([...event.dataTransfer.files]);
});
$("#dropzone").addEventListener("dragenter", (event) => {
  if (event.dataTransfer.types.includes("Files")) {
    dragDepth++;
    $("#dropzone").classList.add("dragging");
  }
});
$("#dropzone").addEventListener("dragleave", () => {
  if (--dragDepth <= 0) {
    dragDepth = 0;
    $("#dropzone").classList.remove("dragging");
  }
});
$("#close-uploads").addEventListener("click", () => {
  if (state.busy) toast("文件仍在上传，完成后可以收起。");
  else $("#upload-panel").hidden = true;
});

let uploadQueue = Promise.resolve();
function enqueueUploads(files) {
  if (files.length > 20) {
    toast("每次最多上传 20 个文件，请分批选择。", true);
    return;
  }
  $("#upload-panel").hidden = false;
  for (const file of files) {
    const item = document.createElement("li");
    item.className = "upload-item";
    item.innerHTML =
      '<div><span class="upload-name"></span><span class="upload-state">等待上传</span></div><progress max="100" value="0"></progress>';
    item.querySelector(".upload-name").textContent = file.name;
    $("#upload-items").append(item);
    state.busy++;
    uploadQueue = uploadQueue
      .then(() => uploadFile(file, item))
      .finally(() => {
        state.busy--;
      });
  }
}
async function uploadFile(file, item) {
  const status = item.querySelector(".upload-state");
  const progress = item.querySelector("progress");
  try {
    if (file.size > 10 * 1024 * 1024) throw new Error("超过 10 MB");
    const result = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/objects");
      xhr.setRequestHeader("X-File-Name", encodeURIComponent(file.name));
      xhr.setRequestHeader(
        "Content-Type",
        file.type || "application/octet-stream",
      );
      xhr.timeout = 120000;
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          progress.value = percent;
          status.textContent = percent === 100 ? "正在保存" : `${percent}%`;
        }
      };
      xhr.onload = () => {
        let body;
        try {
          body = JSON.parse(xhr.responseText);
        } catch {
          reject(new Error("存储服务返回了异常响应"));
          return;
        }
        if (xhr.status >= 200 && xhr.status < 300) resolve(body);
        else reject(new Error(body.error || "上传失败"));
      };
      xhr.onerror = () => reject(new Error("网络连接中断"));
      xhr.ontimeout = () => reject(new Error("上传超时，请重试"));
      status.textContent = "正在上传";
      xhr.send(file);
    });
    state.generation++;
    state.loading = false;
    $("#refresh-button").disabled = false;
    $("#load-more").disabled = false;
    state.files.unshift(result.file);
    progress.value = 100;
    status.textContent = "已保存 ✓";
    render();
    setConnection(true);
  } catch (error) {
    item.classList.add("failed");
    status.textContent = "上传失败";
    item.title = error.message;
    toast(`${file.name}：${error.message}`, true);
  }
}

loadFiles();
