import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const origin = new URL(process.argv[2] || "http://127.0.0.1:8788");
if (
  origin.protocol !== "https:" &&
  !["127.0.0.1", "localhost"].includes(origin.hostname)
) {
  throw new Error("远程地址必须使用 HTTPS");
}
const payload = new TextEncoder().encode(
  "拾物验收：Workers → R2 binding → 对象存储。\n",
);
const name = `verification-${randomUUID()}.txt`;
async function request(path, options) {
  return fetch(new URL(path, origin), {
    ...options,
    signal: AbortSignal.timeout(30000),
  });
}

const upload = await request("/api/objects", {
  method: "POST",
  headers: {
    "Content-Type": "text/plain",
    "X-File-Name": encodeURIComponent(name),
  },
  body: payload,
});
assert.equal(upload.status, 201, `上传失败：${await upload.clone().text()}`);
const { file } = await upload.json();
const path = `/api/objects/${encodeURIComponent(file.key)}`;
try {
  const download = await request(path);
  assert.equal(download.status, 200);
  assert.deepEqual(new Uint8Array(await download.arrayBuffer()), payload);
  console.log("✓ 上传后原样读取，字节一致");

  const metadata = await request(path, { method: "HEAD" });
  assert.equal(metadata.status, 200);
  assert.equal(
    Number(metadata.headers.get("Content-Length")),
    payload.byteLength,
  );
  console.log("✓ HEAD 元数据与文件大小一致");

  let cursor;
  let found = false;
  for (let page = 0; page < 64; page++) {
    const listing = await request(
      `/api/objects${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
    );
    assert.equal(listing.status, 200);
    const data = await listing.json();
    found = data.files.some((entry) => entry.key === file.key);
    cursor = data.cursor;
    if (found || !cursor) break;
  }
  assert(found, "新文件未出现在列表中，或文件数量超过验收脚本的分页上限");
  console.log("✓ 列表可发现新写入的文件");
} finally {
  assert.equal((await request(path, { method: "DELETE" })).status, 204);
}
assert.equal((await request(path)).status, 404);
console.log("✓ 删除后读取返回 404，验收文件已清理");
