const types = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const limit = 5 * 1024 * 1024;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const headers = new Headers({ "X-Content-Type-Options": "nosniff" });
    try {
      if (url.pathname === "/api/photos" && request.method === "GET") {
        const cursor = url.searchParams.get("cursor");
        const page = await env.PHOTOS.list({ prefix: "photos/", limit: 24, ...(cursor ? { cursor } : {}) });
        return Response.json({ photos: page.objects.map(({ key }) => key.slice(7)), cursor: page.truncated ? page.cursor : null });
      }
      if (url.pathname === "/api/photos" && request.method === "POST") {
        const type = request.headers.get("Content-Type");
        const length = Number(request.headers.get("Content-Length"));
        if (!types.has(type)) return new Response("请选择 JPEG、PNG、WebP 或 GIF 图片", { status: 415 });
        if (!length || length > limit) return new Response("图片大小须在 5 MB 以内", { status: 413 });
        const bytes = await request.arrayBuffer();
        if (!bytes.byteLength || bytes.byteLength > limit) return new Response("图片大小须在 5 MB 以内", { status: 413 });
        const id = `${String(9999999999999 - Date.now()).padStart(13, "0")}-${crypto.randomUUID()}`;
        await env.PHOTOS.put(`photos/${id}`, bytes, { httpMetadata: { contentType: type } });
        return Response.json({ id }, { status: 201 });
      }
      const match = url.pathname.match(/^\/api\/photos\/(\d{13}-[a-f0-9-]{36})$/);
      if (match && request.method === "GET") {
        const photo = await env.PHOTOS.get(`photos/${match[1]}`);
        if (!photo || !photo.body) return new Response("图片不存在", { status: 404 });
        photo.writeHttpMetadata(headers);
        headers.set("Cache-Control", "public, max-age=31536000, immutable");
        return new Response(photo.body, { headers });
      }
      return new Response("未找到", { status: 404 });
    } catch (error) {
      console.error(error);
      return new Response("请求失败，请稍后重试", { status: 500 });
    }
  },
};
