// =========================================================================
// DANH SÁCH CÁC MỤC HIỂN THỊ TRONG APP
// Muốn đổi thứ tự tab: chỉ cần đổi vị trí trong mảng TOOLS bên dưới.
// Muốn thêm mục mới: import file từ ./tools/ rồi thêm tên biến vào mảng TOOLS.
// =========================================================================

import lieuThuoc from './lieu-thuoc.js';
import buDienGiai from './bu-dien-giai.js';
import tinhNgay from './tinh-ngay.js';
import nhacViec from './nhac-viec.js';

export const TOOLS = [
  lieuThuoc,
  buDienGiai,
  tinhNgay,
  nhacViec
];
