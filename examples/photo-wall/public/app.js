const photos = document.querySelector("#photos");
const status = document.querySelector("#status");
const more = document.querySelector("#more");
const file = document.querySelector("#file");
let cursor = null;

async function load(reset = false) {
  if (reset) { photos.replaceChildren(); cursor = null; }
  status.textContent = "正在加载照片…";
  more.hidden = true;
  try {
    const response = await fetch(`/api/photos${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`);
    if (!response.ok) throw new Error("照片加载失败，请刷新重试。");
    const data = await response.json();
    for (const id of data.photos) {
      const link = document.createElement("a");
      const image = document.createElement("img");
      link.href = `/api/photos/${encodeURIComponent(id)}`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.setAttribute("aria-label", "打开原图");
      image.src = link.href;
      image.alt = "收藏的照片";
      image.loading = "lazy";
      link.append(image);
      photos.append(link);
    }
    cursor = data.cursor;
    more.hidden = !cursor;
    status.textContent = photos.childElementCount ? "" : "还没有照片，上传第一张吧。";
  } catch (error) { status.textContent = error.message; more.hidden = !cursor; }
}

file.addEventListener("change", async () => {
  const image = file.files[0];
  if (!image) return;
  file.disabled = true;
  status.textContent = "正在上传照片…";
  try {
    const response = await fetch("/api/photos", { method: "POST", headers: { "Content-Type": image.type }, body: image });
    if (!response.ok) throw new Error(await response.text());
    await load(true);
  } catch (error) { status.textContent = error.message || "上传失败，请重试。"; }
  finally { file.value = ""; file.disabled = false; }
});
more.addEventListener("click", () => load());
load();
