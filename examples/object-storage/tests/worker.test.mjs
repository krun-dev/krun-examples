import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

function fixture() {
  const objects = new Map();
  const env = {
    FILES: {
      async put(key, bytes, options) {
        const object = {
          key,
          bytes,
          size: bytes.byteLength,
          uploaded: new Date(),
          etag: "test-etag",
          httpEtag: '"test-etag"',
          ...options,
        };
        objects.set(key, object);
        return object;
      },
      async list({ prefix }) {
        return {
          objects: [...objects.values()].filter((object) =>
            object.key.startsWith(prefix),
          ),
          truncated: false,
        };
      },
      async get(key) {
        const object = objects.get(key);
        return object ? { ...object, body: object.bytes } : null;
      },
      async head(key) {
        return objects.get(key) || null;
      },
      async delete(key) {
        objects.delete(key);
      },
    },
    ASSETS: {
      fetch() {
        return new Response("static page");
      },
    },
  };
  return {
    env,
    objects,
    fetch: (path, init) =>
      worker.fetch(new Request("https://example.test" + path, init), env),
  };
}

test("uploads, lists, reads, inspects and deletes a Unicode file through its own namespace", async () => {
  const app = fixture();
  const upload = await app.fetch("/api/objects", {
    method: "POST",
    headers: {
      "X-File-Name": encodeURIComponent("灵感清单.txt"),
      "Content-Type": "text/plain",
    },
    body: "真实内容，不是预签名地址。",
  });
  assert.equal(upload.status, 201);
  const { file } = await upload.json();
  assert.equal(file.name, "灵感清单.txt");
  assert.match(
    [...app.objects.keys()][0],
    /^files\/[a-f0-9-]{36}\/灵感清单.txt$/,
  );
  const list = await (await app.fetch("/api/objects")).json();
  assert.equal(list.files.length, 1);
  assert.equal(list.files[0].name, file.name);
  const path = "/api/objects/" + encodeURIComponent(file.key);
  const read = await app.fetch(path);
  assert.equal(await read.text(), "真实内容，不是预签名地址。");
  assert.match(read.headers.get("Content-Disposition"), /^attachment;/);
  assert.equal(
    (await app.fetch(path, { method: "HEAD" })).headers.get("Content-Length"),
    String(file.size),
  );
  assert.equal((await app.fetch(path, { method: "DELETE" })).status, 204);
  assert.equal((await app.fetch(path)).status, 404);
});

test("rejects traversal, control characters and uploads beyond the actual byte limit", async () => {
  const app = fixture();
  for (const name of ["../escape.txt", "folder/file.txt", "bad\r\nname", ""]) {
    assert.equal(
      (
        await app.fetch("/api/objects", {
          method: "POST",
          headers: { "X-File-Name": encodeURIComponent(name) },
          body: "x",
        })
      ).status,
      400,
    );
  }
  assert.equal(
    (
      await app.fetch("/api/objects", {
        method: "POST",
        headers: { "X-File-Name": "big.bin" },
        body: new Uint8Array(10 * 1024 * 1024 + 1),
      })
    ).status,
    413,
  );
  assert.equal(
    (await app.fetch("/api/objects/" + encodeURIComponent("wrong/prefix")))
      .status,
    400,
  );
  assert.equal(app.objects.size, 0);
});

test("keeps active file types downloadable and allows safe images inline", async () => {
  const app = fixture();
  for (const [name, type, disposition] of [
    ["image.svg", "image/svg+xml", "attachment"],
    ["image.png", "image/png", "inline"],
    ["page.html", "text/html", "attachment"],
  ]) {
    const { file } = await (
      await app.fetch("/api/objects", {
        method: "POST",
        headers: { "X-File-Name": name, "Content-Type": type },
        body: "test",
      })
    ).json();
    const response = await app.fetch(
      "/api/objects/" + encodeURIComponent(file.key) + "?preview=1",
    );
    assert.ok(
      response.headers.get("Content-Disposition").startsWith(disposition),
    );
    assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  }
});

test("supports empty files and reports unavailable bindings without exposing credentials", async () => {
  const app = fixture();
  const empty = await app.fetch("/api/objects", {
    method: "POST",
    headers: { "X-File-Name": "empty.txt" },
  });
  assert.equal((await empty.json()).file.size, 0);
  assert.equal(
    (await worker.fetch(new Request("https://example.test/api/status"), {}))
      .status,
    503,
  );
  assert.equal(await (await app.fetch("/")).text(), "static page");
});
