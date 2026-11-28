// =========================================================================
// MỤC 1: TÍNH LIỀU THUỐC THEO CÂN NẶNG / MÉT VUÔNG DA
// Dễ dàng thêm hoặc sửa thuốc ngay trong mảng DRUGS_CONFIG bên dưới.
// =========================================================================

const DRUGS_CONFIG = [
  {
    name: 'Ceftazidime',
    packaging: '2g/lọ',
    doses: [
      {
        label: 'liều',
        dosePerKg: 50,
        unit: 'mg',
        maxDose: 2000,
        freqText: 'x 3 lần/ngày',
        note: 'tiêm tĩnh mạch chậm cách nhau 8h'
      }
    ]
  },
  {
    name: 'Amikaxin',
    packaging: '500mg/lọ',
    doses: [
      {
        label: 'liều',
        dosePerKg: 15,
        unit: 'mg',
        maxDose: 1500,
        freqText: 'x 1 lần/ngày',
        note: 'hòa NaCl 0.9% truyền 60p'
      }
    ]
  },
  {
    name: 'Colistin',
    packaging: '',
    doses: [
      {
        label: 'liều bolus',
        dosePerKg: 150000,
        unit: 'UI',
        maxDose: null,
        freqText: 'x 1 lần duy nhất',
        note: 'hòa NaCl 0.9% truyền 60p'
      },
      {
        label: 'liều duy trì',
        dosePerKg: 75000,
        unit: 'UI',
        maxDose: null,
        freqText: 'x 2 lần/ngày',
        note: 'hòa NaCl 0.9% truyền 60p cách 12h'
      }
    ]
  },
  {
    name: 'Caspofungin',
    basis: 'm2', // Đánh dấu tính theo mét vuông da (bỏ trống sẽ mặc định tính theo kg)
    packaging: '50mg/lọ',
    doses: [
      {
        label: 'liều bolus',
        dosePerM2: 70,
        unit: 'mg',
        maxDose: null,
        freqText: 'x 1 lần duy nhất',
        note: 'hòa NaCl 0.9% truyền 120 phút'
      },
      {
        label: 'liều duy trì',
        dosePerM2: 50,
        unit: 'mg',
        maxDose: null,
        freqText: 'x 1 lần/ngày',
        note: 'hòa NaCl 0.9% truyền 120 phút'
      }
    ]
  },
  {
    name: 'Meropenem',
    packaging: '1000mg/lọ',
    doses: [
      {
        label: 'liều thường',
        dosePerKg: 20,
        unit: 'mg',
        maxDose: null,
        freqText: 'x 3 lần/ngày',
        note: 'hòa NaCl 0.9% truyền 180p'
      },
      {
        label: 'liều cao',
        dosePerKg: 40,
        unit: 'mg',
        maxDose: null,
        freqText: 'x 3 lần/ngày',
        note: 'hòa NaCl 0.9% truyền 180p'
      }
    ]
  },
  {
    name: 'Vancomycin',
    packaging: '1000mg/lọ',
    doses: [
      {
        label: 'liều',
        dosePerKg: 20,
        unit: 'mg',
        maxDose: null,
        freqText: 'x 3 lần/ngày',
        note: 'hòa NaCl 0.9% truyền 120p'
      }
    ]
  },
  {
    name: 'Linezolid',
    packaging: '600mg/túi',
    doses: [
      {
        label: 'liều',
        dosePerKg: 10,
        unit: 'mg',
        maxDose: null,
        freqText: 'x 3 lần/ngày',
        note: 'truyền 60p'
      }
    ]
  },
  {
    name: 'Amphot',
    packaging: '50mg/lọ',
    doses: [
      {
        label: 'liều',
        dosePerKg: 1,
        unit: 'mg',
        maxDose: null,
        freqText: 'x 1 lần/ngày',
        note: 'hòa dung dịch glucose 5% đủ 200ml truyền tĩnh mạch 50ml/h'
      }
    ]
  },
  {
    name: 'Fluconazole',
    packaging: '200mg/chai',
    doses: [
      {
        label: 'liều nạp',
        dosePerKg: 12,
        unit: 'mg',
        maxDose: null,
        freqText: 'x 1 lần duy nhất',
        note: 'truyền 60p'
      },
      {
        label: 'liều duy trì',
        dosePerKg: 6,
        unit: 'mg',
        maxDose: null,
        freqText: 'x 1 lần/ngày',
        note: 'truyền 60p'
      }
    ]
  }
];

// Tự động sắp xếp danh sách thuốc theo thứ tự A -> Z
const SORTED_DRUGS = [...DRUGS_CONFIG].sort((a, b) =>
  a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' })
);

function formatNumber(num) {
  const rounded = Math.round(num * 100) / 100;
  if (rounded >= 10000) {
    const parts = rounded.toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return parts.join(',');
  }
  return rounded.toString();
}

function calculateDrugText(drug, metricValue) {
  const isM2 = drug.basis === 'm2';

  const segments = drug.doses.map((d, idx) => {
    const doseRate = isM2 ? (d.dosePerM2 ?? d.dosePerKg) : d.dosePerKg;
    const rawDose = doseRate * metricValue;
    let finalDose = rawDose;
    let isMax = false;

    if (d.maxDose !== null && d.maxDose !== undefined && rawDose >= d.maxDose) {
      finalDose = d.maxDose;
      isMax = true;
    }

    const labelText = idx === 0
      ? d.label
      : d.label.charAt(0).toUpperCase() + d.label.slice(1);

    const maxTag = isMax ? ' (max)' : '';
    const notePart = d.note ? `, ${d.note}` : '';
    return `${labelText} ${formatNumber(finalDose)}${d.unit}/lần${maxTag} ${d.freqText}${notePart}`;
  });

  const packPart = drug.packaging ? `${drug.packaging}, ` : '';
  return `${drug.name}: ${packPart}${segments.join('. ')}`;
}

function formatBaseDoseText(drug) {
  const isM2 = drug.basis === 'm2';
  const perUnitText = isM2 ? 'm2 da/lần' : 'kg/lần';

  const segments = drug.doses.map((d, idx) => {
    const doseRate = isM2 ? (d.dosePerM2 ?? d.dosePerKg) : d.dosePerKg;
    const labelText = idx === 0
      ? d.label
      : d.label.charAt(0).toUpperCase() + d.label.slice(1);

    const maxPart = (d.maxDose !== null && d.maxDose !== undefined)
      ? `, tối đa ${formatNumber(d.maxDose)}${d.unit}`
      : '';
    const notePart = d.note ? `, ${d.note}` : '';

    return `${labelText} ${formatNumber(doseRate)}${d.unit}/${perUnitText} ${d.freqText}${maxPart}${notePart}`;
  });

  const packPart = drug.packaging ? `${drug.packaging}, ` : '';
  return `Liều gốc: ${packPart}${segments.join('. ')}`;
}

export default {
  id: 'lieu-thuoc',
  name: 'Liều thuốc',
  title: 'Tính Liều Thuốc',
  subtitle: 'Liều theo cân nặng (kg) & mét vuông da (m²)',
  accent: 'autumn',
  icon: `<svg viewBox="0 0 100 100" fill="currentColor">
    <path d="M50 8 L57 25 L65 21 L61 44 L76 34 L73 45 L86 42 L82 53 L90 56 L71 72 L74 80 L52 78 L52 94 L48 94 L48 78 L26 80 L29 72 L10 56 L18 53 L14 42 L27 45 L24 34 L39 44 L35 21 L43 25 Z"/>
  </svg>`,

  render(container, { copyText }) {
    let selectedDrug = null;

    container.innerHTML = `
      <div class="card">
        <div class="card-title">
          <span>Thông số bệnh nhân</span>
          <button type="button" class="btn-mini autumn" id="lt-clear-btn">Xóa số</button>
        </div>
        <div class="form-grid">
          <div class="field warm-focus">
            <label for="lt-weight">Cân nặng (kg)</label>
            <input id="lt-weight" type="text" inputmode="decimal" placeholder="VD: 41" autocomplete="off" />
          </div>
          <div class="field">
            <label for="lt-bsa">Mét vuông da (m²)</label>
            <input id="lt-bsa" type="text" inputmode="decimal" placeholder="VD: 1.2" autocomplete="off" />
          </div>
        </div>
      </div>

      <div class="card" id="lt-result-card">
        <div id="lt-result-area">
          <div class="placeholder-text">Nhập cân nặng hoặc m² da, sau đó chạm chọn thuốc bên dưới.</div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">
          <span>Danh mục thuốc</span>
          <span class="card-title-badge">${SORTED_DRUGS.length} thuốc (A–Z)</span>
        </div>
        <div class="drug-search-wrap">
          <svg class="drug-search-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2">
            <circle cx="11" cy="11" r="7"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input id="lt-search" type="text" placeholder="Tìm nhanh tên thuốc..." autocomplete="off" />
        </div>
        <div class="drug-grid" id="lt-drug-grid"></div>
      </div>
    `;

    const weightInput = container.querySelector('#lt-weight');
    const bsaInput = container.querySelector('#lt-bsa');
    const searchInput = container.querySelector('#lt-search');
    const gridEl = container.querySelector('#lt-drug-grid');
    const resultArea = container.querySelector('#lt-result-area');
    const clearBtn = container.querySelector('#lt-clear-btn');

    function parsePositiveInput(inputEl) {
      const raw = inputEl.value.trim().replace(',', '.');
      const val = parseFloat(raw);
      return !isNaN(val) && val > 0 ? val : null;
    }

    function renderResult() {
      if (!selectedDrug) {
        resultArea.innerHTML = `<div class="placeholder-text">Chạm chọn một loại thuốc bên dưới để xem liều dùng.</div>`;
        return;
      }

      const isM2 = selectedDrug.basis === 'm2';
      const metricValue = isM2 ? parsePositiveInput(bsaInput) : parsePositiveInput(weightInput);
      const baseDoseText = formatBaseDoseText(selectedDrug);

      if (metricValue === null) {
        resultArea.innerHTML = `
          <div class="result-box river">
            <div>Vui lòng nhập <strong>${isM2 ? 'mét vuông da (&gt; 0 m²)' : 'cân nặng (&gt; 0 kg)'}</strong> để tính liều cho <strong>${selectedDrug.name}</strong>.</div>
            <div class="base-dose-note">${baseDoseText}</div>
          </div>
        `;
        return;
      }

      const resultText = calculateDrugText(selectedDrug, metricValue);

      resultArea.innerHTML = `
        <div class="result-box autumn">
          <div class="dose-result-header">
            <div class="dose-result-text" id="lt-dose-text"></div>
            <button type="button" class="btn-mini autumn" id="lt-copy-btn">Copy</button>
          </div>
          <div class="base-dose-note" id="lt-base-text"></div>
        </div>
      `;

      resultArea.querySelector('#lt-dose-text').textContent = resultText;
      resultArea.querySelector('#lt-base-text').textContent = baseDoseText;

      const copyBtn = resultArea.querySelector('#lt-copy-btn');
      copyBtn.addEventListener('click', async () => {
        const ok = await copyText(resultText);
        if (ok) {
          copyBtn.textContent = 'Đã copy ✓';
          setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1200);
        }
      });
    }

    function renderDrugGrid(filterText = '') {
      const keyword = filterText.trim().toLowerCase();
      const filtered = SORTED_DRUGS.filter(d => d.name.toLowerCase().includes(keyword));
      gridEl.innerHTML = '';

      if (filtered.length === 0) {
        gridEl.innerHTML = `<div class="placeholder-text" style="grid-column: 1 / -1;">Không tìm thấy thuốc phù hợp.</div>`;
        return;
      }

      filtered.forEach(drug => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'drug-chip' + (selectedDrug && selectedDrug.name === drug.name ? ' active' : '');

        const nameSpan = document.createElement('span');
        nameSpan.textContent = drug.name;
        btn.appendChild(nameSpan);

        if (drug.basis === 'm2') {
          const tag = document.createElement('span');
          tag.className = 'drug-basis-tag';
          tag.textContent = 'm²';
          btn.appendChild(tag);
        }

        btn.addEventListener('click', () => {
          selectedDrug = drug;
          renderDrugGrid(searchInput.value);
          renderResult();
        });

        gridEl.appendChild(btn);
      });
    }

    weightInput.addEventListener('input', renderResult);
    bsaInput.addEventListener('input', renderResult);
    searchInput.addEventListener('input', () => renderDrugGrid(searchInput.value));

    clearBtn.addEventListener('click', () => {
      weightInput.value = '';
      bsaInput.value = '';
      renderResult();
      weightInput.focus();
    });

    renderDrugGrid();
  }
};
