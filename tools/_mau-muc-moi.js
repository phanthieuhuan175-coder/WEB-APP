// =========================================================================
// FILE MẪU ĐỂ THÊM MỤC MỚI
// Bước 1: Tạo file mới trong thư mục tools/ (VD: tools/tinh-bsa.js)
// Bước 2: Copy nội dung mẫu này vào và viết công thức của bạn
// Bước 3: Mở tools/registry.js, import file mới và thêm vào mảng TOOLS
// =========================================================================

export default {
  id: 'muc-moi',            // Mã duy nhất (không dấu, không khoảng trắng)
  name: 'Mục mới',          // Tên ngắn hiển thị trên thanh tab dưới cùng
  title: 'Tiêu Đề Mục Mới', // Tiêu đề hiển thị trên thanh đầu trang
  subtitle: 'Mô tả ngắn gọn công cụ',
  accent: 'autumn',         // Chọn 'autumn' (màu lá thu) hoặc 'river' (màu xanh sông)
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <line x1="12" y1="8" x2="12" y2="16"/>
    <line x1="8" y1="12" x2="16" y2="12"/>
  </svg>`,

  render(container, { copyText, showToast }) {
    container.innerHTML = `
      <div class="card">
        <div class="card-title"><span>Nhập thông số</span></div>
        <div class="form-grid one-col">
          <div class="field warm-focus">
            <label for="demo-val">Giá trị ví dụ</label>
            <input id="demo-val" type="text" inputmode="decimal" placeholder="Nhập số..." />
          </div>
        </div>
        <div class="btn-row">
          <button type="button" class="btn btn-primary" id="demo-btn">Tính toán</button>
        </div>
      </div>
      <div id="demo-out"></div>
    `;

    container.querySelector('#demo-btn').addEventListener('click', () => {
      const val = parseFloat(container.querySelector('#demo-val').value.replace(',', '.'));
      const out = container.querySelector('#demo-out');
      if (isNaN(val)) {
        showToast('Vui lòng nhập số hợp lệ');
        return;
      }
      out.innerHTML = `
        <div class="card">
          <div class="result-box autumn">Kết quả mẫu: <strong>${val * 2}</strong></div>
        </div>
      `;
    });
  }
};
