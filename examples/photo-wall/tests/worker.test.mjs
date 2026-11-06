import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

function bucket() {
  const data = new Map();
  return {
    async put(key, bytes, options) { data.set(key, { bytes, type: options.httpMetadata.contentType }); },
    async get(key) {
      const item = data.get(key);
      return item && { body: item.bytes, writeHttpMetadata(headers) { headers.set("Content-Type", item.type); } };
    },
    async list({ prefix, limit, cursor }) {
      const keys = [...data.keys()].filter(key => key.startsWith(prefix)).sort();
      const start = Number(cursor || 0);
      const objects = keys.slice(start, start + limit).map(key => ({ key }));
      return { objects, truncated: start + limit < keys.length, cursor: String(start + limit) };
    },
  };
}

const request = (path, options) => new Request(`https://example.com${path}`, options);

test("upload, list, pagination and download use the same R2 object", async () => {
  const env = { PHOTOS: bucket() };
  let id;
  for (let i = 0; i < 25; i++) {
    const response = await worker.fetch(request("/api/photos", {
      method: "POST", headers: { "Content-Type": "image/png", "Content-Length": "4" }, body: "test",
    }), env);
    assert.equal(response.status, 201);
    id = (await response.json()).id;
  }
  const first = await (await worker.fetch(request("/api/photos"), env)).json();
  assert.equal(first.photos.length, 24);
  const second = await (await worker.fetch(request(`/api/photos?cursor=${first.cursor}`), env)).json();
  assert.equal(second.photos.length, 1);
  assert.equal(second.cursor, null);
  const photo = await worker.fetch(request(`/api/photos/${id}`), env);
  assert.equal(await photo.text(), "test");
  assert.equal(photo.headers.get("Content-Type"), "image/png");
  assert.equal(photo.headers.get("X-Content-Type-Options"), "nosniff");
});

test("rejects unsupported and oversized uploads, and missing photos", async () => {
  const env = { PHOTOS: bucket() };
  const upload = (type, length) => worker.fetch(request("/api/photos", {
    method: "POST", headers: { "Content-Type": type, "Content-Length": String(length) }, body: "x",
  }), env);
  assert.equal((await upload("text/html", 1)).status, 415);
  assert.equal((await upload("image/png", 6 * 1024 * 1024)).status, 413);
  assert.equal((await worker.fetch(request("/api/photos/0000000000000-00000000-0000-0000-0000-000000000000"), env)).status, 404);
});
