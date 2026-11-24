# Công Cụ Lâm Sàng PWA (Lá Mùa Thu & Sông Xanh)

Ứng dụng web cài ra màn hình chính Android (ColorOS 15) gồm 3 mục độc lập, chạy được offline và cực dễ sửa code / thêm mục mới.

## 1. Cấu trúc thư mục
- `tools/lieu-thuoc.js`: Tính liều thuốc (thêm/sửa thuốc ngay đầu file trong `DRUGS_CONFIG`).
- `tools/bu-dien-giai.js`: Tính bù điện giải & chai chuẩn NaCl 0.9%.
- `tools/tinh-ngay.js`: Đếm khoảng cách ngày & tính ngày hẹn (tự lùi T7/CN về T6).
- `tools/registry.js`: Danh sách các mục hiển thị trên thanh điều hướng dưới cùng.
- `tools/_mau-muc-moi.js`: File mẫu để nhân bản khi muốn thêm mục thứ 4, 5...

## 2. Cách đưa lên chạy miễn phí (GitHub Pages hoặc Cloudflare Pages)
### Cách A — GitHub Pages (Nhanh nhất, kho Public)
1. Tạo 1 repository mới trên GitHub, tải toàn bộ các file bên trong thư mục này lên.
2. Vào **Settings → Pages → Build and deployment**: chọn Branch `main`, thư mục `/ (root)` → **Save**.
3. Sau 30 giây, mở đường link GitHub cung cấp bằng **Chrome** hoặc **Edge** trên điện thoại → Menu (`⋮`) → **Thêm vào màn hình chính → Cài đặt ứng dụng**.

### Cách B — Cloudflare Pages (Giữ mã nguồn Private)
1. Tạo repository **Private** trên GitHub và tải code lên.
2. Đăng nhập [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages → Create → Pages → Connect to Git**.
3. Chọn repo của bạn, giữ nguyên cài đặt mặc định (không cần lệnh build) → **Save and Deploy**.

## 3. Cách sửa code & thêm mục mới về sau
- **Thêm/sửa thuốc:** Mở `tools/lieu-thuoc.js` trên GitHub → sửa mảng `DRUGS_CONFIG` → bấm **Commit**.
- **Thêm mục mới (Mục 4, 5...):**
  1. Tạo file mới trong `tools/` theo cấu trúc của `tools/_mau-muc-moi.js`.
  2. Mở `tools/registry.js`, thêm dòng `import` và điền vào mảng `TOOLS`.
- **Cập nhật trên điện thoại:** Mở app và bấm nút **Làm mới (`↻`)** ở góc trên bên phải để tải ngay code mới nhất.
