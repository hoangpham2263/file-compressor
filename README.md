# File Compressor

Giảm dung lượng file **PDF, Word, PowerPoint, Excel, LibreOffice, EPUB và ảnh JPG/PNG/WEBP** ngay trên trình duyệt — file không được tải lên server nào.
Shrink **PDF, Word, PowerPoint and Excel** files right in your browser — nothing is uploaded.

**Demo:** https://hoangpham.is-a.dev/file-compressor/


## Tính năng / Features

- Kéo thả hoặc chọn **nhiều file** cùng lúc: `.pdf`, `.docx`, `.pptx`, `.xlsx` — *drag & drop or pick several files*
- 3 mức nén: **Nén mạnh · Khuyên dùng · Chất lượng cao** — *three levels: Strong · Recommended · High quality*
- Hiện dung lượng trước/sau và % giảm; tải từng file hoặc **tải tất cả thành ZIP** — *before/after size, single or ZIP download*
- Nếu file đã tối ưu sẵn, giữ nguyên bản gốc — *already-optimised files are kept as is*
- Giao diện **Việt / Anh**, tự theo chế độ sáng/tối — *Vietnamese / English UI, light/dark mode*

## Cách hoạt động / How it works

- **Word, PowerPoint, Excel** là file ZIP. Tool mở file, nén lại các ảnh bên trong (`word/media`, `ppt/media`, `xl/media`) — thu nhỏ ảnh quá lớn, chuyển ảnh không trong suốt sang JPEG — rồi đóng gói lại. Chữ, bảng, định dạng giữ nguyên.
- **Bản có macro** (`.docm`, `.pptm`, `.xlsm`) xử lý giống Word/PowerPoint/Excel.
- **LibreOffice** (`.odt`, `.ods`, `.odp`) và **EPUB** cũng là file ZIP: ảnh bên trong được thu nhỏ và nén lại nhưng giữ nguyên định dạng ảnh (không đổi tên file ảnh), file `mimetype` vẫn đứng đầu và không nén theo chuẩn.
- **Ảnh JPG/PNG/WEBP**: thu nhỏ theo mức nén rồi nén lại; PNG không trong suốt chuyển sang JPG.
  *Office files are ZIP archives: embedded images are downscaled and re-encoded, everything else is untouched.*
- **PDF** được nén bằng [Ghostscript](https://www.ghostscript.com/) biên dịch sang WebAssembly ([@jspawn/ghostscript-wasm](https://www.npmjs.com/package/@jspawn/ghostscript-wasm)), chữ vẫn chọn/copy được. Lần đầu cần tải thư viện khoảng 15 MB.
  *PDFs go through Ghostscript compiled to WebAssembly; text stays selectable. The ~15 MB engine loads on first use.*
- Không có bước build — chỉ HTML, CSS, JavaScript; dùng [fflate](https://github.com/101arrowz/fflate) để đọc/ghi ZIP.
  *No build step — plain HTML, CSS and JavaScript, with fflate for ZIP handling.*

> File Word/PowerPoint/Excel đời cũ (`.doc`, `.ppt`, `.xls`) chưa hỗ trợ — hãy lưu lại sang định dạng mới.
> Legacy `.doc`, `.ppt`, `.xls` files are not supported — save them in the newer format first.

## Chạy trên máy / Run locally

```bash
git clone https://github.com/hoangpham2263/file-compressor.git
cd file-compressor
python3 -m http.server 8000
```

Mở / open http://localhost:8000

## License

[AGPL-3.0](./LICENSE) — vì dùng Ghostscript (AGPL) / because it uses Ghostscript (AGPL).
© [Phạm Quốc Hoàng](https://hoangpham.is-a.dev)
