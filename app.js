// File Compressor — shrink PDF (Ghostscript WASM) and Word/PowerPoint/Excel files
// (re-encode embedded images) in the browser. Nothing is uploaded.

const GS_VERSION = "0.0.2";
const GS_BASE = `https://cdn.jsdelivr.net/npm/@jspawn/ghostscript-wasm@${GS_VERSION}/`;

const LEVELS = {
  strong: { pdf: "screen", quality: 0.6, maxSide: 1280 },
  recommended: { pdf: "ebook", quality: 0.75, maxSide: 1920 },
  high: { pdf: "printer", quality: 0.85, maxSide: 2560 },
};

const TEXT = {
  vi: {
    title: "Giảm dung lượng file",
    subtitle: "PDF · Word · PowerPoint · Excel · ảnh · EPUB — chạy ngay trên trình duyệt, file không được tải lên đâu cả.",
    drop: "Kéo thả file vào đây hoặc bấm để chọn",
    dropHint: "Hỗ trợ PDF, Word, PowerPoint, Excel, LibreOffice (.odt .ods .odp), EPUB, ảnh JPG/PNG/WEBP — chọn được nhiều file cùng lúc.",
    level: "Mức nén",
    lvStrong: "Nén mạnh",
    lvRecommended: "Khuyên dùng",
    lvHigh: "Chất lượng cao",
    hints: {
      strong: "File nhỏ nhất — hợp gửi email, Zalo; ảnh trong file sẽ kém nét hơn.",
      recommended: "Cân bằng dung lượng và chất lượng — hợp hầu hết trường hợp.",
      high: "Giữ ảnh nét — hợp file cần in ấn; giảm dung lượng ít hơn.",
    },
    downloadZip: "Tải tất cả (ZIP)",
    clear: "Xóa hết",
    download: "Tải",
    remove: "Xóa",
    waiting: "Đang chờ…",
    processing: "Đang nén…",
    loadingGs: "Đang tải thư viện PDF (~15 MB, chỉ lần đầu)…",
    already: "File đã tối ưu sẵn, giữ nguyên bản gốc",
    unsupported: "Chưa hỗ trợ loại file này — hãy lưu lại thành PDF, Word, PowerPoint, Excel hoặc ảnh",
    error: "Không nén được file này",
    files: "file",
    note: "Word, PowerPoint, Excel, LibreOffice, EPUB: nén lại ảnh bên trong file, chữ và định dạng giữ nguyên. Ảnh: thu nhỏ và nén lại. PDF: nén bằng Ghostscript, chữ vẫn chọn được. Lần đầu nén PDF cần tải thư viện khoảng 15 MB.",
    footer: "Làm bởi",
    switchTo: "EN",
    switchTitle: "English",
    zipName: "file-da-nen",
  },
  en: {
    title: "File compressor",
    subtitle: "PDF · Word · PowerPoint · Excel · images · EPUB — runs in your browser, nothing is uploaded.",
    drop: "Drop files here or click to choose",
    dropHint: "Supports PDF, Word, PowerPoint, Excel, LibreOffice (.odt .ods .odp), EPUB, JPG/PNG/WEBP images — pick several at once.",
    level: "Compression",
    lvStrong: "Strong",
    lvRecommended: "Recommended",
    lvHigh: "High quality",
    hints: {
      strong: "Smallest files — good for email and chat; images inside look softer.",
      recommended: "Balanced size and quality — fits most cases.",
      high: "Keeps images sharp — good for printing; saves less space.",
    },
    downloadZip: "Download all (ZIP)",
    clear: "Clear",
    download: "Download",
    remove: "Remove",
    waiting: "Waiting…",
    processing: "Compressing…",
    loadingGs: "Loading the PDF engine (~15 MB, first time only)…",
    already: "Already optimised — original kept",
    unsupported: "File type not supported — save it as PDF, Word, PowerPoint, Excel or an image",
    error: "Could not compress this file",
    files: "files",
    note: "Word, PowerPoint, Excel, LibreOffice, EPUB: images inside are re-compressed, text and formatting are unchanged. Images: resized and re-compressed. PDF: compressed with Ghostscript, text stays selectable. The first PDF needs a ~15 MB engine download.",
    footer: "Made by",
    switchTo: "VI",
    switchTitle: "Tiếng Việt",
    zipName: "compressed-files",
  },
};

const $ = (id) => document.getElementById(id);
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
};
const state = {
  lang: store.get("fc-lang") || (navigator.language.startsWith("vi") ? "vi" : "en"),
  level: "recommended",
  items: [], // { file, kind, status: waiting|processing|done|error, out?: Blob, note? }
  run: 0,
  gsLoading: false,
};
const t = (key) => TEXT[state.lang][key];
const formatBytes = (n) =>
  n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`;
const extOf = (name) => (name.match(/\.([^.]+)$/)?.[1] || "").toLowerCase();
const kindOf = (file) => {
  const ext = extOf(file.name);
  if (ext === "pdf") return "pdf";
  if (["docx", "docm", "pptx", "pptm", "xlsx", "xlsm"].includes(ext)) return "office";
  if (["odt", "ods", "odp"].includes(ext)) return "odf";
  if (ext === "epub") return "epub";
  if (["jpg", "jpeg", "png", "webp"].includes(ext)) return "image";
  return "unsupported";
};
// Yield so the UI can repaint (setTimeout keeps running in background tabs, unlike rAF)
const nextFrame = () => new Promise((r) => setTimeout(r, 16));

// ---------- PDF via Ghostscript ----------
let gsFactory;
async function loadGs() {
  if (!gsFactory) {
    state.gsLoading = true;
    render();
    gsFactory = (await import(`${GS_BASE}gs.mjs`)).default;
  }
  return gsFactory;
}

async function compressPdf(file, level) {
  const factory = await loadGs();
  // A fresh module per file: Ghostscript exits after each run
  const gs = await factory({ locateFile: (f) => GS_BASE + f, print: () => {}, printErr: () => {}, noInitialRun: true });
  state.gsLoading = false;
  render();
  await nextFrame();
  gs.FS.writeFile("in.pdf", new Uint8Array(await file.arrayBuffer()));
  const code = gs.callMain([
    "-sDEVICE=pdfwrite",
    "-dCompatibilityLevel=1.5",
    `-dPDFSETTINGS=/${LEVELS[level].pdf}`,
    "-dDetectDuplicateImages=true",
    "-dCompressFonts=true",
    "-dNOPAUSE",
    "-dQUIET",
    "-dBATCH",
    "-sOutputFile=out.pdf",
    "in.pdf",
  ]);
  if (code !== 0) throw new Error(`gs exit ${code}`);
  return new Blob([gs.FS.readFile("out.pdf")], { type: "application/pdf" });
}

// ---------- Office: re-encode embedded images ----------
const MEDIA = {
  office: /^(word|ppt|xl)\/media\/[^/]+\.(png|jpe?g|bmp)$/i,
  odf: /^Pictures\/[^/]+\.(png|jpe?g)$/i,
  epub: /\.(png|jpe?g)$/i,
};

// keepFormat: write back in the same format (for files whose image names cannot change)
async function reencode(bytes, ext, level, keepFormat = false) {
  const { quality, maxSide } = LEVELS[level];
  const mime = ext === "png" ? "image/png" : ext === "bmp" ? "image/bmp" : ext === "webp" ? "image/webp" : "image/jpeg";
  const bmp = await createImageBitmap(new Blob([bytes], { type: mime }));
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close?.();

  // PNG with transparency stays PNG (only resized); opaque images become JPEG
  let transparent = false;
  if (ext === "png" || ext === "webp") {
    const data = ctx.getImageData(0, 0, w, h).data;
    for (let i = 3; i < data.length; i += 4 * 7) if (data[i] < 255) { transparent = true; break; }
  }
  const outMime =
    ext === "webp" ? "image/webp" : keepFormat && ext === "png" ? "image/png" : transparent ? "image/png" : "image/jpeg";
  if (outMime === "image/jpeg") {
    // White background behind any soft edges
    const tmp = ctx.getImageData(0, 0, w, h);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    const c2 = document.createElement("canvas");
    c2.width = w;
    c2.height = h;
    c2.getContext("2d").putImageData(tmp, 0, 0);
    ctx.drawImage(c2, 0, 0);
  }
  const blob = await new Promise((r) => canvas.toBlob(r, outMime, quality));
  return { bytes: new Uint8Array(await blob.arrayBuffer()), ext: outMime.split("/")[1] };
}

// A single image: resize + re-encode; opaque PNG becomes JPG
async function compressImage(file, level) {
  const ext = extOf(file.name);
  const out = await reencode(new Uint8Array(await file.arrayBuffer()), ext, level);
  const outExt = out.ext === "jpeg" ? (ext === "jpeg" ? "jpeg" : "jpg") : out.ext;
  return { blob: new Blob([out.bytes], { type: `image/${out.ext}` }), name: file.name.replace(/\.[^.]+$/, `.${outExt}`) };
}

// Word/PowerPoint/Excel, OpenDocument and EPUB are ZIP files: re-compress the images inside
async function compressZip(file, level, kind) {
  const { unzipSync, zipSync, strToU8, strFromU8 } = window.fflate;
  const files = unzipSync(new Uint8Array(await file.arrayBuffer()));
  const renames = []; // [oldPath, newPath]
  let addJpeg = false;

  for (const path of Object.keys(files)) {
    if (!MEDIA[kind].test(path)) continue;
    const ext = extOf(path);
    try {
      // Only Office files can rename images (via .rels); others keep the same format
      const out = await reencode(files[path], ext, level, kind !== "office");
      if (out.bytes.length >= files[path].length) continue; // keep the smaller one
      if (kind === "office" && out.ext === "jpeg" && ext !== "jpeg" && ext !== "jpg") {
        const newPath = path.replace(/\.[^.]+$/, ".jpeg");
        if (files[newPath]) continue;
        delete files[path];
        files[newPath] = out.bytes;
        renames.push([path, newPath]);
        addJpeg = true;
      } else {
        files[path] = out.bytes;
      }
      await nextFrame();
    } catch {
      // unreadable image: leave it as is
    }
  }

  // Point relationships at renamed images
  if (renames.length) {
    for (const path of Object.keys(files)) {
      if (!path.endsWith(".rels")) continue;
      let xml = strFromU8(files[path]);
      let changed = false;
      for (const [oldPath, newPath] of renames) {
        const oldName = oldPath.split("/").pop();
        const newName = newPath.split("/").pop();
        const re = new RegExp(`(Target="[^"]*media/)${oldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`, "g");
        if (re.test(xml)) {
          xml = xml.replace(re, `$1${newName}"`);
          changed = true;
        }
      }
      if (changed) files[path] = strToU8(xml);
    }
  }
  if (addJpeg && files["[Content_Types].xml"]) {
    let ct = strFromU8(files["[Content_Types].xml"]);
    if (!/Extension="jpeg"/i.test(ct)) {
      ct = ct.replace("</Types>", '<Default Extension="jpeg" ContentType="image/jpeg"/></Types>');
      files["[Content_Types].xml"] = strToU8(ct);
    }
  }

  // OpenDocument and EPUB need "mimetype" first and uncompressed
  const ordered = {};
  if (files.mimetype) ordered.mimetype = [files.mimetype, { level: 0 }];
  for (const [k, v] of Object.entries(files)) if (k !== "mimetype") ordered[k] = v;
  const zipped = zipSync(ordered, { level: 9 });
  return new Blob([zipped], { type: file.type || "application/octet-stream" });
}

// ---------- Queue ----------
async function process() {
  const run = ++state.run;
  for (const item of state.items) {
    if (item.kind === "unsupported") {
      item.status = "error";
      item.note = t("unsupported");
      continue;
    }
    item.status = "waiting";
    item.out = undefined;
    item.note = undefined;
  }
  render();
  for (const item of state.items) {
    if (item.kind === "unsupported") continue;
    item.status = "processing";
    render();
    await nextFrame();
    try {
      let out;
      let outName = item.file.name;
      if (item.kind === "pdf") out = await compressPdf(item.file, state.level);
      else if (item.kind === "image") ({ blob: out, name: outName } = await compressImage(item.file, state.level));
      else out = await compressZip(item.file, state.level, item.kind);
      if (run !== state.run) return;
      if (out.size >= item.file.size) {
        item.out = item.file;
        item.outName = item.file.name;
        item.note = t("already");
      } else {
        item.out = out;
        item.outName = outName;
      }
      item.status = "done";
    } catch (e) {
      if (run !== state.run) return;
      console.error(e);
      item.status = "error";
      item.note = t("error");
    }
    render();
  }
}

function render() {
  const { items } = state;
  $("result").hidden = items.length === 0;
  const doneItems = items.filter((i) => i.status === "done");
  const busy = items.some((i) => i.status === "waiting" || i.status === "processing");
  const totalIn = doneItems.reduce((s, i) => s + i.file.size, 0);
  const totalOut = doneItems.reduce((s, i) => s + i.out.size, 0);
  if (busy) {
    const n = items.filter((i) => i.status === "done" || i.status === "error").length;
    $("summary").textContent = `${t("processing")} ${n}/${items.length}`;
  } else if (doneItems.length) {
    const pct = Math.round((1 - totalOut / totalIn) * 100);
    $("summary").innerHTML = `${items.length} ${t("files")} · ${formatBytes(totalIn)} → <b>${formatBytes(totalOut)}</b> <span class="good">(-${Math.max(0, pct)}%)</span>`;
  } else {
    $("summary").textContent = "";
  }
  $("zip").disabled = busy || !doneItems.length;

  $("list").replaceChildren(
    ...items.map((item) => {
      const li = document.createElement("li");
      const badge = document.createElement("span");
      badge.className = `badge ${extOf(item.file.name)}`;
      badge.textContent = extOf(item.file.name).toUpperCase() || "?";
      const info = document.createElement("div");
      info.className = "info";
      const name = document.createElement("div");
      name.className = "name";
      name.textContent = item.file.name;
      const meta = document.createElement("div");
      meta.className = "meta";
      if (item.status === "done") {
        const pct = Math.round((1 - item.out.size / item.file.size) * 100);
        meta.innerHTML = `${formatBytes(item.file.size)} → <b>${formatBytes(item.out.size)}</b> ${pct > 0 ? `<span class="good">(-${pct}%)</span>` : ""}`;
        if (item.note) meta.innerHTML += ` · ${item.note}`;
      } else if (item.status === "processing") {
        meta.textContent = item.kind === "pdf" && state.gsLoading ? t("loadingGs") : t("processing");
      } else if (item.status === "error") {
        meta.innerHTML = `<span class="warn"></span>`;
        meta.firstChild.textContent = item.note;
      } else {
        meta.textContent = t("waiting");
      }
      info.append(name, meta);

      const btns = document.createElement("div");
      btns.className = "row-actions";
      const dl = document.createElement("button");
      dl.type = "button";
      dl.className = "btn-sm";
      dl.title = t("download");
      dl.disabled = item.status !== "done";
      dl.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg><span></span>`;
      dl.querySelector("span").textContent = t("download");
      dl.onclick = () => download(item);
      const rm = document.createElement("button");
      rm.type = "button";
      rm.className = "btn-sm btn-icon";
      rm.textContent = "✕";
      rm.title = t("remove");
      rm.onclick = () => {
        state.items = state.items.filter((i) => i !== item);
        render();
      };
      btns.append(dl, rm);
      li.append(badge, info, btns);
      return li;
    })
  );
}

function saveBlob(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

const download = (item) => item.status === "done" && saveBlob(item.out, item.outName);

async function downloadZip() {
  const { zipSync } = window.fflate;
  const entries = {};
  for (const item of state.items.filter((i) => i.status === "done")) {
    let name = item.outName;
    let k = 1;
    while (entries[name]) name = item.outName.replace(/(\.[^.]+)$/, `-${k++}$1`);
    entries[name] = [new Uint8Array(await item.out.arrayBuffer()), { level: 0 }];
  }
  saveBlob(new Blob([zipSync(entries)], { type: "application/zip" }), `${t("zipName")}.zip`);
}

function addFiles(files) {
  const next = [...files].map((file) => ({ file, kind: kindOf(file), status: "waiting" }));
  if (!next.length) return;
  state.items.push(...next);
  process();
}

function applyLang() {
  document.documentElement.lang = state.lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
  $("lang").textContent = t("switchTo");
  $("lang").title = t("switchTitle");
  syncLevel();
  render();
}

function syncLevel() {
  [...$("level").children].forEach((b) => b.classList.toggle("active", b.dataset.level === state.level));
  $("levelHint").textContent = t("hints")[state.level];
}

// ---------- Events ----------
$("drop").onclick = () => $("file").click();
$("file").onchange = (e) => {
  addFiles(e.target.files);
  e.target.value = "";
};
$("drop").ondragover = (e) => {
  e.preventDefault();
  $("drop").classList.add("over");
};
$("drop").ondragleave = () => $("drop").classList.remove("over");
$("drop").ondrop = (e) => {
  e.preventDefault();
  $("drop").classList.remove("over");
  addFiles(e.dataTransfer.files);
};
$("level").onclick = (e) => {
  const lv = e.target.closest("[data-level]")?.dataset.level;
  if (!lv || lv === state.level) return;
  state.level = lv;
  syncLevel();
  if (state.items.length) process();
};
$("zip").onclick = downloadZip;
$("clear").onclick = () => {
  state.run++;
  state.items = [];
  render();
};
$("lang").onclick = () => {
  state.lang = state.lang === "vi" ? "en" : "vi";
  store.set("fc-lang", state.lang);
  applyLang();
};

applyLang();
