# File Compressor

Shrink **PDF, Word, PowerPoint, Excel, LibreOffice, EPUB and JPG/PNG/WEBP** files right in your browser. Nothing is uploaded to any server.

**Demo:** https://hoangpham.is-a.dev/file-compressor/


## Features

- Drag and drop or pick **several files** at once: `.pdf`, `.docx`, `.pptx`, `.xlsx`
- Three levels: **Strong · Recommended · High quality**
- Shows the size before and after and the percentage saved; download files one by one or **all as a ZIP**
- Files that are already optimized are kept as they are
- **Vietnamese / English** interface that follows light or dark mode

## How it works

- **Word, PowerPoint and Excel** files are ZIP archives. The tool opens the file and re-compresses the images inside (`word/media`, `ppt/media`, `xl/media`), downscaling oversized images and converting non-transparent ones to JPEG, then packs it again. Text, tables and formatting stay unchanged.
- **Macro-enabled files** (`.docm`, `.pptm`, `.xlsm`) are handled the same way as Word, PowerPoint and Excel.
- **LibreOffice** (`.odt`, `.ods`, `.odp`) and **EPUB** files are also ZIP archives. Images inside are downscaled and re-compressed but keep their format and file names, and the `mimetype` file stays first and uncompressed, as the standard requires.
- **JPG/PNG/WEBP images** are downscaled by level and re-compressed; non-transparent PNGs are converted to JPG.
- **PDFs** are compressed with [Ghostscript](https://www.ghostscript.com/) compiled to WebAssembly ([@jspawn/ghostscript-wasm](https://www.npmjs.com/package/@jspawn/ghostscript-wasm)), and text stays selectable. The roughly 15 MB library loads on first use.
- No build step: just HTML, CSS and JavaScript, with [fflate](https://github.com/101arrowz/fflate) for reading and writing ZIP files.

> Legacy Word, PowerPoint and Excel files (`.doc`, `.ppt`, `.xls`) are not supported yet. Save them in the newer format first.

## Run locally

```bash
git clone https://github.com/hoangpham2263/file-compressor.git
cd file-compressor
python3 -m http.server 8000
```

Open http://localhost:8000

## License

[AGPL-3.0](./LICENSE), because it uses Ghostscript (AGPL).
© [Phạm Quốc Hoàng](https://hoangpham.is-a.dev)
