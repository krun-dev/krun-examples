const PREFIX = "files/";
const MAX_SIZE = 10 * 1024 * 1024;
const IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
]);

function json(value, status = 200) {
  return Response.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function failure(message, status) {
  return json({ error: message }, status);
}

function describe(object) {
  return {
    key: object.key.slice(PREFIX.length),
    name: object.customMetadata?.name || object.key.split("/").at(-1),
    size: object.size,
    type: object.httpMetadata?.contentType || "application/octet-stream",
    uploaded: object.uploaded,
    etag: object.etag,
  };
}

function parseKey(path) {
  try {
    const key = decodeURIComponent(path.slice("/api/objects/".length));
    if (
      !/^[a-f0-9-]{36}\/[^/\\]+$/i.test(key) ||
      key.includes("..") ||
      key.length > 250
    ) {
      return null;
    }
    return PREFIX + key;
  } catch {
    return null;
  }
}

async function upload(request, bucket) {
  let name;
  try {
    name = decodeURIComponent(request.headers.get("X-File-Name") || "")
      .normalize("NFC")
      .trim();
  } catch {
    return failure("文件名无效", 400);
  }
  if (
    !name ||
    /[/\\\x00-\x1f\x7f]/.test(name) ||
    name.includes("..") ||
    new TextEncoder().encode(name).length > 180
  ) {
    return failure("文件名不能为空，且不能包含路径或特殊控制字符", 400);
  }
  const declared = request.headers.get("Content-Length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > MAX_SIZE)) {
    return failure("单个文件不能超过 10 MB", 413);
  }
  // The upload bound is checked against actual bytes, including chunked bodies.
  // Bounded buffering deliberately keeps the demo independent of provider-specific
  // behavior for unknown-length streams.
  const reader = request.body?.getReader();
  const chunks = [];
  let size = 0;
  if (reader) {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_SIZE) {
        await reader.cancel();
        return failure("单个文件不能超过 10 MB", 413);
      }
      chunks.push(value);
    }
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const key = PREFIX + crypto.randomUUID() + "/" + name;
  const object = await bucket.put(key, bytes, {
    httpMetadata: {
      contentType:
        request.headers.get("Content-Type")?.split(";")[0] ||
        "application/octet-stream",
    },
    customMetadata: { name },
  });
  return json({ file: describe(object) }, 201);
}

async function objects(request, env, url) {
  if (!env.FILES)
    return failure("对象存储尚未绑定，请为 Worker 配置 FILES", 503);

  if (url.pathname === "/api/status" && request.method === "GET") {
    await env.FILES.list({ prefix: PREFIX, limit: 1 });
    return json({ connected: true, binding: "FILES", maxFileSize: MAX_SIZE });
  }

  if (url.pathname === "/api/objects") {
    if (request.method === "POST") return upload(request, env.FILES);
    if (request.method !== "GET") return failure("请求方法不支持", 405);
    const page = await env.FILES.list({
      prefix: PREFIX,
      limit: 64,
      include: ["httpMetadata", "customMetadata"],
      ...(url.searchParams.get("cursor")
        ? { cursor: url.searchParams.get("cursor") }
        : {}),
    });
    return json({
      files: page.objects.map(describe),
      cursor: page.truncated ? page.cursor : null,
    });
  }

  if (!url.pathname.startsWith("/api/objects/"))
    return failure("接口不存在", 404);
  const key = parseKey(url.pathname);
  if (!key) return failure("文件路径无效", 400);
  if (request.method === "DELETE") {
    await env.FILES.delete(key);
    return new Response(null, { status: 204 });
  }
  if (!["GET", "HEAD"].includes(request.method))
    return failure("请求方法不支持", 405);
  const object =
    request.method === "HEAD"
      ? await env.FILES.head(key)
      : await env.FILES.get(key);
  if (!object) return failure("文件不存在或已被删除", 404);
  const type = object.httpMetadata?.contentType || "application/octet-stream";
  const inline =
    url.searchParams.get("preview") === "1" && IMAGE_TYPES.has(type);
  const filename = object.customMetadata?.name || key.split("/").at(-1);
  const headers = new Headers({
    "Content-Type": type,
    "Content-Length": String(object.size),
    ETag: object.httpEtag,
    "Cache-Control": "private, max-age=0, must-revalidate",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
    "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="download"; filename*=UTF-8''${encodeURIComponent(filename)}`,
  });
  return new Response(request.method === "HEAD" ? null : object.body, {
    headers,
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    try {
      return await objects(request, env, url);
    } catch (error) {
      console.error("Object operation failed", error.name);
      return failure("存储服务暂时不可用，请稍后重试", 502);
    }
  },
};
