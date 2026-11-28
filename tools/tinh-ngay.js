// =========================================================================
// MỤC 3: TÍNH NGÀY HẸN & ĐẾM KHOẢNG CÁCH NGÀY
// Giữ nguyên 100% logic tính ngày, tính số ngày cấp thuốc và tự động lùi Thứ 7 / Chủ nhật về Thứ 6.
// =========================================================================

function getTodayISO() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function parseLocalDate(dateStr) {
  const [yyyy, mm, dd] = dateStr.split('-').map(Number);
  return new Date(yyyy, mm - 1, dd);
}

function getVietnameseDay(date) {
  const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  return days[date.getDay()];
}

function formatShortDate(date) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatDate(date) {
  return `${getVietnameseDay(date)}, ngày ${formatShortDate(date)}`;
}

export default {
  id: 'tinh-ngay',
  name: 'Tính ngày',
  title: 'Tính Ngày Hẹn',
  subtitle: 'Đếm số ngày, tính cấp thuốc & tái khám tự tránh cuối tuần',
  accent: 'river',
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="3"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
    <circle cx="12" cy="15.5" r="1.4" fill="currentColor" stroke="none"/>
  </svg>`,

  render(container, { copyText }) {
    container.innerHTML = `
      <div class="card">
        <div class="card-title">
          <span>Mốc thời gian</span>
          <button type="button" class="btn-mini" id="tn-today-btn">Hôm nay</button>
        </div>

        <div class="form-grid one-col">
          <div class="field">
            <label for="tn-hien-tai">Ngày hiện tại</label>
            <input type="date" id="tn-hien-tai" value="${getTodayISO()}" />
          </div>

          <div class="field">
            <label for="tn-ngay-truoc">Ngày mốc 2 (tùy chọn — đếm ngày & tính cấp thuốc)</label>
            <input type="date" id="tn-ngay-truoc" />
          </div>
        </div>

        <hr class="date-divider" />

        <div class="card-title" style="margin-bottom:10px;">
          <span>Tính theo đánh số ngày điều trị</span>
        </div>

        <div class="form-grid">
          <div class="field warm-focus">
            <label for="tn-so-hien-tai">Đánh số hiện tại</label>
            <input type="number" inputmode="numeric" id="tn-so-hien-tai" placeholder="Ví dụ: 56" />
          </div>

          <div class="field warm-focus">
            <label for="tn-so-ngay-hen">Đánh số ngày hẹn</label>
            <input type="number" inputmode="numeric" id="tn-so-ngay-hen" placeholder="Ví dụ: 84" />
          </div>
        </div>

        <div class="btn-row">
          <button type="button" class="btn btn-river" id="tn-calc-btn">Tính toán</button>
          <button type="button" class="btn btn-ghost" id="tn-reset-btn">Xóa nhập</button>
        </div>
      </div>

      <div id="tn-result-wrap" style="display:none;"></div>
    `;

    const inputNgayHienTai = container.querySelector('#tn-hien-tai');
    const inputNgayTruoc = container.querySelector('#tn-ngay-truoc');
    const inputSoHienTai = container.querySelector('#tn-so-hien-tai');
    const inputSoNgayHen = container.querySelector('#tn-so-ngay-hen');
    const btnToday = container.querySelector('#tn-today-btn');
    const btnCalc = container.querySelector('#tn-calc-btn');
    const btnReset = container.querySelector('#tn-reset-btn');
    const resultWrap = container.querySelector('#tn-result-wrap');

    function calculate() {
      const ngayHienTaiVal = inputNgayHienTai.value;
      const ngayTruocVal = inputNgayTruoc.value;
      const soHienTaiVal = parseInt(inputSoHienTai.value, 10);
      const soNgayHenVal = parseInt(inputSoNgayHen.value, 10);

      const coTinhNgayTruoc = Boolean(ngayTruocVal);
      const coTinhNgayHen = !isNaN(soHienTaiVal) && !isNaN(soNgayHenVal);

      resultWrap.style.display = 'block';

      if (!ngayHienTaiVal || (!coTinhNgayTruoc && !coTinhNgayHen)) {
        resultWrap.innerHTML = `
          <div class="card">
            <div class="result-box error">
              Vui lòng nhập Ngày hiện tại cùng với Ngày mốc 2 hoặc cặp Đánh số.
            </div>
          </div>
        `;
        return;
      }

      const ngayHienTai = parseLocalDate(ngayHienTaiVal);
      const blocks = [];
      const plainLines = [];

      // 1. Đếm khoảng cách giữa Ngày mốc 2 và Ngày hiện tại & Tính số ngày cấp thuốc
      if (coTinhNgayTruoc) {
        const ngayTruoc = parseLocalDate(ngayTruocVal);
        const diffTime = ngayHienTai.getTime() - ngayTruoc.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        const diffCapThuoc = Math.round((ngayTruoc.getTime() - ngayHienTai.getTime()) / (1000 * 60 * 60 * 24));
        const capThuocLabel = `Cấp thuốc từ ${formatShortDate(ngayHienTai)} đến ${formatShortDate(ngayTruoc)}:`;

        let capThuocHtml = '';
        let capThuocPlain = '';

        if (diffCapThuoc >= 0) {
          const soNgayCapThuoc = diffCapThuoc + 1; // Tính cả ngày hiện tại và ngày mốc 2
          capThuocHtml = `<div style="margin-top:6px; padding-top:6px; border-top:1px dashed var(--autumn-border);">${capThuocLabel} <br><span class="date-highlight-warm">${soNgayCapThuoc} ngày</span></div>`;
          capThuocPlain = `${capThuocLabel} ${soNgayCapThuoc} ngày`;
        } else {
          capThuocHtml = `<div style="margin-top:6px; padding-top:6px; border-top:1px dashed var(--autumn-border);">${capThuocLabel} <br><span style="color:#c62828; font-weight:600;">Ngày mốc 2 nhỏ hơn Ngày hiện tại</span></div>`;
          capThuocPlain = `${capThuocLabel} Ngày mốc 2 nhỏ hơn Ngày hiện tại`;
        }

        blocks.push(`
          <div class="date-stat">
            <div>Từ Ngày mốc 2 đến hiện tại:</div>
            <div class="date-highlight-river">${diffDays} ngày</div>
            ${capThuocHtml}
          </div>
        `);
        plainLines.push(`Từ Ngày mốc 2 đến hiện tại: ${diffDays} ngày`);
        plainLines.push(capThuocPlain);
      }

      // 2. Tính Ngày hẹn theo cặp Đánh số
      if (coTinhNgayHen) {
        const khoangCach = soNgayHenVal - soHienTaiVal;
        const ngayHen = new Date(ngayHienTai);
        ngayHen.setDate(ngayHen.getDate() + khoangCach);

        const ngayHenStr = formatDate(ngayHen);
        let htmlBlock = `
          <div class="date-stat">
            <div>Khoảng cách hẹn: <strong>${khoangCach} ngày</strong></div>
            <div style="margin-top:4px;">Ngày hẹn: <span class="date-highlight-warm">${ngayHenStr}</span></div>
        `;
        plainLines.push(`Khoảng cách hẹn: ${khoangCach} ngày`);
        plainLines.push(`Ngày hẹn: ${ngayHenStr}`);

        const dayOfWeek = ngayHen.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          const ngayHenThayThe = new Date(ngayHen);
          if (dayOfWeek === 6) {
            // Thứ 7 lùi về Thứ 6
            ngayHenThayThe.setDate(ngayHenThayThe.getDate() - 1);
          } else {
            // Chủ nhật lùi về Thứ 6
            ngayHenThayThe.setDate(ngayHenThayThe.getDate() - 2);
          }
          const altStr = formatDate(ngayHenThayThe);
          htmlBlock += `<div style="margin-top:6px; padding-top:6px; border-top:1px dashed var(--autumn-border);">Ngày hẹn thay thế (tránh cuối tuần): <br><span class="date-highlight-river">${altStr}</span></div>`;
          plainLines.push(`Ngày hẹn thay thế: ${altStr}`);
        }

        htmlBlock += `</div>`;
        blocks.push(htmlBlock);
      }

      const plainText = plainLines.join('\n');

      resultWrap.innerHTML = `
        <div class="card">
          <div class="card-title">
            <span>Kết quả tính ngày</span>
            <button type="button" class="btn-mini" id="tn-copy-btn">Copy</button>
          </div>
          <div class="result-box river">
            <div class="date-result-block">${blocks.join('')}</div>
          </div>
        </div>
      `;

      const copyBtn = resultWrap.querySelector('#tn-copy-btn');
      copyBtn.addEventListener('click', async () => {
        const ok = await copyText(plainText);
        if (ok) {
          copyBtn.textContent = 'Đã copy ✓';
          setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1200);
        }
      });
    }

    btnToday.addEventListener('click', () => {
      inputNgayHienTai.value = getTodayISO();
    });

    btnCalc.addEventListener('click', calculate);

    btnReset.addEventListener('click', () => {
      inputNgayHienTai.value = getTodayISO();
      inputNgayTruoc.value = '';
      inputSoHienTai.value = '';
      inputSoNgayHen.value = '';
      resultWrap.style.display = 'none';
    });

    container.querySelectorAll('input').forEach(inp => {
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') calculate();
      });
    });
  }
};
