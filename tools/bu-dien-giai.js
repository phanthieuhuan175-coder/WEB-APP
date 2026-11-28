// =========================================================================
// MỤC 2: BÙ ĐIỆN GIẢI NHI KHOA (Cập nhật v1.9)
// Đồng bộ 100% logic v1.9: làm tròn an toàn, tách riêng Phospho pha NaCl 0.9%,
// kiểm tra tham số K+ sau làm tròn, tối ưu bù Kali cấp & chai chuẩn.
// =========================================================================

export default {
  id: 'bu-dien-giai',
  name: 'Bù điện giải',
  title: 'Tính Bù Điện Giải',
  subtitle: 'Dịch duy trì, Phospho pha riêng, Kali cấp & chai chuẩn',
  accent: 'river',
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
    <path d="M9.5 14.5a3.5 3.5 0 0 0 5 0"/>
  </svg>`,

  render(container, { copyText }) {
    container.innerHTML = `
      <div class="card">
        <div class="card-title">
          <span>Chỉ số đầu vào</span>
          <span class="card-title-badge">Holliday–Segar · v1.9</span>
        </div>

        <div class="form-grid">
          <div class="field full warm-focus">
            <label for="bdg-w">Cân nặng (kg) *</label>
            <input type="text" inputmode="decimal" id="bdg-w" placeholder="Nhập cân nặng (VD: 15.5)" autocomplete="off" />
          </div>

          <div class="field">
            <label for="bdg-na">Na máu (mEq/L)</label>
            <input type="text" inputmode="decimal" id="bdg-na" value="135" autocomplete="off" />
          </div>

          <div class="field">
            <label for="bdg-k">K máu (mEq/L)</label>
            <input type="text" inputmode="decimal" id="bdg-k" value="3.5" autocomplete="off" />
          </div>

          <div class="field">
            <label for="bdg-hco3">HCO3- (mEq/L)</label>
            <input type="text" inputmode="decimal" id="bdg-hco3" placeholder="Tuỳ chọn (< 22)" autocomplete="off" />
          </div>

          <div class="field">
            <label for="bdg-ca">Ca (mmol/L)</label>
            <input type="text" inputmode="decimal" id="bdg-ca" placeholder="Tuỳ chọn" autocomplete="off" />
          </div>

          <div class="field">
            <label for="bdg-mg">Mg2+ (mmol/L)</label>
            <input type="text" inputmode="decimal" id="bdg-mg" placeholder="Tuỳ chọn" autocomplete="off" />
          </div>

          <div class="field">
            <label for="bdg-p">Phospho (mmol/L)</label>
            <input type="text" inputmode="decimal" id="bdg-p" placeholder="Tuỳ chọn (< 1.2)" autocomplete="off" />
          </div>
        </div>

        <div class="btn-row">
          <button type="button" class="btn btn-primary" id="bdg-calc-btn">Tính toán</button>
          <button type="button" class="btn btn-ghost" id="bdg-reset-btn">Đặt lại</button>
        </div>
      </div>

      <div id="bdg-result-wrap" style="display:none;"></div>
    `;

    const elW = container.querySelector('#bdg-w');
    const elNa = container.querySelector('#bdg-na');
    const elK = container.querySelector('#bdg-k');
    const elHco3 = container.querySelector('#bdg-hco3');
    const elCa = container.querySelector('#bdg-ca');
    const elMg = container.querySelector('#bdg-mg');
    const elP = container.querySelector('#bdg-p');
    const btnCalc = container.querySelector('#bdg-calc-btn');
    const btnReset = container.querySelector('#bdg-reset-btn');
    const resultWrap = container.querySelector('#bdg-result-wrap');

    // Các hàm làm tròn
    const roundInt = (v) => Math.round(v);
    const roundTen = (v) => Math.round(v / 10) * 10;
    const ceilTen = (v) => Math.ceil(v / 10) * 10;

    function escapeHtml(str) {
      return String(str)
        .replace(/&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"');
    }

    // Đọc số an toàn (hỗ trợ cả dấu phẩy và dấu chấm)
    function parseNumInput(el) {
      if (!el) return { raw: '', num: NaN };
      const raw = String(el.value || '').trim().replace(',', '.');
      return { raw, num: raw === '' ? NaN : parseFloat(raw) };
    }

    function statusTag(isOk, okText, warnText) {
      if (isOk) {
        return `<span style="display:inline-block; padding:1px 7px; border-radius:999px; font-size:11.5px; font-weight:700; background:var(--success-bg); color:var(--success-text); border:1px solid var(--success-border);">${okText}</span>`;
      }
      return `<span style="display:inline-block; padding:1px 7px; border-radius:999px; font-size:11.5px; font-weight:700; background:var(--danger-bg); color:var(--danger-text); border:1px solid var(--danger-border);">${warnText}</span>`;
    }

    // Tối ưu bù Kali cấp có làm tròn & giữ an toàn tuyệt đối dưới ngưỡng tối đa
    function calcOptimalAcuteK(kTargetMeq, w, maxConc, maxRatePerKg) {
      const kclRaw = kTargetMeq / 1.34;
      const kclRound = roundInt(kclRaw);
      const kMaxMeqH = maxRatePerKg * w; // mEq/giờ tối đa

      if (kclRound <= 0) {
        return {
          kclRaw, kclRound: 0, kActual: 0, diluentRound: 0, totalVol: 0,
          concActual: 0, rateMlH: 0, kRateMeqH: 0, kRateMeqKgH: 0, timeH: 0, kMaxMeqH
        };
      }

      const kActual = kclRound * 1.34;
      const minTotalVol = (kActual / maxConc) * 1000;
      const minDiluent = Math.max(0, minTotalVol - kclRound);

      // Làm tròn LÊN hàng chục cho NaCl 0.9% / Glucose 5%
      let diluentRound = ceilTen(minDiluent);
      if (diluentRound === 0) diluentRound = 10;
      let guard = 0;
      while ((kActual / ((diluentRound + kclRound) / 1000)) > maxConc && guard < 500) {
        diluentRound += 10;
        guard++;
      }

      const totalVol = diluentRound + kclRound;
      const concActual = kActual / (totalVol / 1000); // mEq/L sau làm tròn

      // Làm tròn XUỐNG 0.1 ml/h để không vượt tốc độ K+ tối đa
      const maxRateMlHRaw = (kMaxMeqH / concActual) * 1000;
      let rateMlH = Math.floor(maxRateMlHRaw * 10) / 10;
      if (rateMlH <= 0 && maxRateMlHRaw > 0) rateMlH = 0.1;
      guard = 0;
      while (rateMlH > 0.1 && (rateMlH * (concActual / 1000)) > kMaxMeqH && guard < 500) {
        rateMlH = Math.round((rateMlH - 0.1) * 10) / 10;
        guard++;
      }

      const kRateMeqH = rateMlH * (concActual / 1000);
      const kRateMeqKgH = kRateMeqH / w;
      const timeH = rateMlH > 0 ? (totalVol / rateMlH) : 0;

      return {
        kclRaw, kclRound, kActual, diluentRound, totalVol,
        concActual, rateMlH, kRateMeqH, kRateMeqKgH, timeH, kMaxMeqH
      };
    }

    // Tính bù Phospho riêng biệt hoàn toàn với NaCl 0.9% (không trộn điện giải khác)
    function calcSeparatePhospho(w) {
      const P_DOSE_PER_KG = 0.2;    // mmol/kg/ngày
      const P_MMOL_PER_ML = 0.66;   // Phosphorus Aguettant: 0.66 mmol P / ml
      const P_NA_PER_ML = 1.33;     // 1.33 mmol Na / ml
      const P_GLU_PER_ML = 0.66;    // 0.66 mmol Glucose / ml
      const MAX_P_CONC_MMOL_L = 50; // Ngoại biên tối đa 0.05 mmol/ml = 50 mmol/L
      const MAX_P_RATE_KG_H = 0.06; // Tối đa 0.06 mmol/kg/giờ
      const TARGET_HOURS = 6;       // Thời gian truyền chuẩn 6 giờ

      const pNeedMmol = P_DOSE_PER_KG * w;
      const pVolRaw = pNeedMmol / P_MMOL_PER_ML;
      const pVolRound = roundInt(pVolRaw);

      if (pVolRound <= 0) {
        return {
          pNeedMmol, pVolRaw, pVolRound: 0, pActualMmol: 0, naclRound: 0, totalVol: 0,
          concMmolL: 0, rateMlH: 0, pRateMmolH: 0, pRateMmolKgH: 0, timeH: 0,
          naFromDrug: 0, naFromNacl: 0, naTotalSeparate: 0, gluFromDrug: 0,
          maxConcMmolL: MAX_P_CONC_MMOL_L, maxRateKgH: MAX_P_RATE_KG_H
        };
      }

      const pActualMmol = pVolRound * P_MMOL_PER_ML;
      const minTotalVol = (pActualMmol / MAX_P_CONC_MMOL_L) * 1000;
      const minNacl = Math.max(0, minTotalVol - pVolRound);

      // Làm tròn LÊN hàng chục cho NaCl 0.9% pha riêng
      let naclRound = ceilTen(minNacl);
      if (naclRound < 10) naclRound = 10;
      let guard = 0;
      while ((pActualMmol / ((naclRound + pVolRound) / 1000)) > MAX_P_CONC_MMOL_L && guard < 500) {
        naclRound += 10;
        guard++;
      }

      const totalVol = naclRound + pVolRound;
      const concMmolL = pActualMmol / (totalVol / 1000); // mmol/L sau làm tròn

      // Tốc độ truyền dịch (ml/giờ) theo mốc 6 giờ, khống chế không vượt 0.06 mmol/kg/giờ
      const maxPMmolH = MAX_P_RATE_KG_H * w;
      const rateBy6h = totalVol / TARGET_HOURS;
      const maxRateMlH = (maxPMmolH / concMmolL) * 1000;
      let rateMlH = Math.floor(Math.min(rateBy6h, maxRateMlH) * 10) / 10;
      if (rateMlH <= 0) rateMlH = 0.1;
      guard = 0;
      while (rateMlH > 0.1 && (rateMlH * (concMmolL / 1000)) > maxPMmolH && guard < 500) {
        rateMlH = Math.round((rateMlH - 0.1) * 10) / 10;
        guard++;
      }

      const pRateMmolH = rateMlH * (concMmolL / 1000);
      const pRateMmolKgH = pRateMmolH / w;
      const timeH = totalVol / rateMlH;

      const naFromDrug = pVolRound * P_NA_PER_ML;
      const naFromNacl = naclRound * 0.15;
      const naTotalSeparate = naFromDrug + naFromNacl;
      const gluFromDrug = pVolRound * P_GLU_PER_ML;

      return {
        pNeedMmol, pVolRaw, pVolRound, pActualMmol, naclRound, totalVol,
        concMmolL, rateMlH, pRateMmolH, pRateMmolKgH, timeH,
        naFromDrug, naFromNacl, naTotalSeparate, gluFromDrug,
        maxConcMmolL: MAX_P_CONC_MMOL_L, maxRateKgH: MAX_P_RATE_KG_H
      };
    }

    function calculate() {
      try {
        const wIn = parseNumInput(elW);
        const naIn = parseNumInput(elNa);
        const kIn = parseNumInput(elK);
        const hco3In = parseNumInput(elHco3);
        const caIn = parseNumInput(elCa);
        const mgIn = parseNumInput(elMg);
        const pIn = parseNumInput(elP);

        const w = isNaN(wIn.num) ? 0 : wIn.num;
        const na = isNaN(naIn.num) ? 135 : naIn.num;
        const k = isNaN(kIn.num) ? 3.5 : kIn.num;

        resultWrap.style.display = 'block';

        if (w <= 0) {
          resultWrap.innerHTML = `
            <div class="card">
              <div class="result-box error">Lỗi: Yêu cầu nhập cân nặng hợp lệ (> 0 kg).</div>
            </div>
          `;
          return;
        }

        const MAX_K_CONC = 40;       // mEq/L
        const MAX_K_RATE = 0.3;      // mEq/kg/giờ
        const MAX_K_MEQ_H = MAX_K_RATE * w;
        const P_LOW_THRESHOLD = 1.2; // mmol/L

        // 1. Dịch duy trì 24h & làm tròn đến hàng chục
        let fluid_raw = 0;
        if (w <= 10) fluid_raw = w * 100;
        else if (w <= 20) fluid_raw = 1000 + (w - 10) * 50;
        else fluid_raw = 1500 + (w - 20) * 20;

        let fluid = roundTen(fluid_raw);
        if (fluid < 10) fluid = 10;
        const fluid100 = fluid_raw / 100;

        let res_details = `[CHI TIẾT CÁC BƯỚC TÍNH]\n`;
        res_details += `Dịch duy trì Holliday-Segar: ${fluid_raw.toFixed(1)} ml -> Làm tròn hàng chục: ${fluid} ml/24h.\n`;

        // 2. KALI (K) - Phác đồ 24h
        let k_deficit = 0;
        const k_maint = 2 * fluid100;
        let k_total = 0;

        if (k < 3.5) {
          k_deficit = 0.4 * w * (3.5 - k);
          k_total = k_deficit + k_maint;
          res_details += `\n* KALI (K):\n`;
          res_details += `Bệnh nhân có K máu ${k} mEq/L tương đương hạ Kali máu.\n`;
          res_details += `Lượng K thiếu hụt = 0.4 * ${w} * (3.5 - ${k}) = ${k_deficit.toFixed(2)} mEq.\n`;
          res_details += `Lượng K nhu cầu cơ bản = 2 * ${fluid100.toFixed(2)} = ${k_maint.toFixed(2)} mEq.\n`;
          res_details += `Tổng lượng K mục tiêu = ${k_total.toFixed(2)} mEq.\n`;
        } else {
          k_total = k_maint;
          res_details += `\n* KALI (K): K máu bình thường/cao (${k} mEq/L). Chỉ tính nhu cầu cơ bản = 2 * ${fluid100.toFixed(2)} = ${k_total.toFixed(2)} mEq.\n`;
        }

        const kcl_24h_raw = k_total / 1.34;
        let kcl_24h_round = roundInt(kcl_24h_raw);
        const kcl_24h_floor = Math.floor(kcl_24h_raw);

        // Tránh việc làm tròn lên KCl 10% gây vượt trần an toàn
        if (kcl_24h_round > kcl_24h_floor) {
          const cRound = (kcl_24h_round * 1.34) / (fluid / 1000);
          const rRound = ((kcl_24h_round * 1.34) / 24) / w;
          const cFloor = (kcl_24h_floor * 1.34) / (fluid / 1000);
          const rFloor = ((kcl_24h_floor * 1.34) / 24) / w;
          if ((cRound > MAX_K_CONC && cFloor <= MAX_K_CONC) || (rRound > MAX_K_RATE && rFloor <= MAX_K_RATE)) {
            kcl_24h_round = kcl_24h_floor;
          }
        }

        const k_24h_actual = kcl_24h_round * 1.34;
        if (fluid < fluid_raw && (k_24h_actual / (fluid / 1000)) > MAX_K_CONC) {
          fluid = ceilTen(fluid_raw);
        }

        const rate_24h = fluid / 24;
        const k_conc_24h = k_24h_actual / (fluid / 1000);
        const k_rate_24h_meq_h = k_24h_actual / 24;
        const k_rate_24h_kg = k_rate_24h_meq_h / w;

        const k_conc_24h_is_ok = k_conc_24h <= MAX_K_CONC;
        const k_rate_24h_is_ok = k_rate_24h_kg <= MAX_K_RATE;
        const min_fluid_for_k = ceilTen((k_24h_actual / MAX_K_CONC) * 1000);
        const k_conc_24h_ok = k_conc_24h_is_ok
          ? 'Đạt'
          : `VƯỢT NGƯỠNG (Tối đa ${MAX_K_CONC} mEq/L - Cần ≥ ${min_fluid_for_k} ml dịch)`;
        const k_rate_24h_ok = k_rate_24h_is_ok
          ? 'Đạt'
          : `VƯỢT NGƯỠNG (Tối đa ${MAX_K_MEQ_H.toFixed(2)} mEq/h | ${MAX_K_RATE} mEq/kg/h)`;

        res_details += `Quy đổi KCl 10% (1 ml = 1.34 mEq): ${kcl_24h_raw.toFixed(2)} ml -> Làm tròn: ${kcl_24h_round} ml (Thực tế: ${k_24h_actual.toFixed(2)} mEq).\n`;
        res_details += `-> Kiểm tra tham số K+ phác đồ 24h sau làm tròn (${fluid} ml dịch nền):\n`;
        res_details += `   + Nồng độ hòa loãng = ${k_24h_actual.toFixed(2)} / (${fluid}/1000) = ${k_conc_24h.toFixed(1)} mEq/L [${k_conc_24h_ok}].\n`;
        res_details += `   + Tốc độ truyền K+ = ${k_24h_actual.toFixed(2)} / 24 = ${k_rate_24h_meq_h.toFixed(2)} mEq/giờ (${k_rate_24h_kg.toFixed(3)} mEq/kg/giờ) [${k_rate_24h_ok}].\n`;

        // 3. Tóm tắt phần đầu
        const labs = [`Na ${na}`, `K ${k}`];
        if (hco3In.raw !== '') labs.push(`HCO3- ${hco3In.raw}`);
        if (caIn.raw !== '') labs.push(`Ca ${caIn.raw}`);
        if (mgIn.raw !== '') labs.push(`Mg2+ ${mgIn.raw}`);
        if (pIn.raw !== '') labs.push(`Phospho ${pIn.raw}`);

        let res_summary = `[THÔNG SỐ CƠ BẢN]\n`;
        res_summary += `Cân nặng: ${w} kg | Dịch duy trì (làm tròn): ${fluid} ml/24h | Tốc độ: ${rate_24h.toFixed(1)} ml/giờ\n`;
        res_summary += `Xét nghiệm: ${labs.join(' | ')}\n\n`;
        res_summary += `[KẾT QUẢ TÓM TẮT DỊCH DUY TRÌ 24H (ĐÃ LÀM TRÒN)]\n`;
        res_summary += `1. KCl 10%: ${kcl_24h_round} ml (Thực tế ${k_24h_actual.toFixed(2)} mEq | Nồng độ: ${k_conc_24h.toFixed(1)} mEq/L | Tốc độ: ${k_rate_24h_meq_h.toFixed(2)} mEq/h ~ ${k_rate_24h_kg.toFixed(3)} mEq/kg/h)\n`;

        const summaryItems = [];
        summaryItems.push(
          `<strong>1. KCl 10%:</strong> ${kcl_24h_round} ml <span style="color:var(--text-muted);">(Thực tế ${k_24h_actual.toFixed(2)} mEq)</span>` +
          `<div style="margin-top:4px; font-size:12px; color:var(--text-muted); display:flex; flex-wrap:wrap; gap:6px; align-items:center;">` +
          `<span>Nồng độ: <strong>${k_conc_24h.toFixed(1)}</strong> mEq/L ${statusTag(k_conc_24h_is_ok, 'Đạt', `Vượt >40 · cần ≥${min_fluid_for_k}ml`)}</span>` +
          `<span>· Tốc độ: <strong>${k_rate_24h_meq_h.toFixed(2)}</strong> mEq/h (<strong>${k_rate_24h_kg.toFixed(3)}</strong> mEq/kg/h) ${statusTag(k_rate_24h_is_ok, 'Đạt', 'Vượt >0.3')}</span>` +
          `</div>`
        );

        // 4. NATRI (Na)
        let na_total = 0;
        const na_maint = 3 * fluid100;
        if (na < 135) {
          const na_deficit = 0.6 * w * (135 - na);
          na_total = na_deficit + na_maint;
          res_details += `\n* NATRI (Na):\n`;
          res_details += `Bệnh nhân có Na máu ${na} mEq/L tương đương hạ Natri máu.\n`;
          res_details += `Lượng Na thiếu hụt = 0.6 * ${w} * (135 - ${na}) = ${na_deficit.toFixed(2)} mEq.\n`;
          res_details += `Lượng Na nhu cầu cơ bản = 3 * ${fluid100.toFixed(2)} = ${na_maint.toFixed(2)} mEq.\n`;
          res_details += `Tổng lượng Na mục tiêu = ${na_total.toFixed(2)} mEq.\n`;
        } else {
          na_total = na_maint;
          res_details += `\n* NATRI (Na): Na máu bình thường/cao (${na} mEq/L). Chỉ tính nhu cầu cơ bản = 3 * ${fluid100.toFixed(2)} = ${na_total.toFixed(2)} mEq.\n`;
        }

        const na_from_nacl09 = fluid * 0.15;
        const nacl_vol_glucose_raw = na_total / 1.7;
        const nacl_vol_glucose_round = roundInt(nacl_vol_glucose_raw);
        const na_remaining = na_total - na_from_nacl09;
        const nacl_vol_nacl09_raw = na_remaining > 0 ? (na_remaining / 1.7) : 0;
        const nacl_vol_nacl09_round = roundInt(nacl_vol_nacl09_raw);

        res_summary += `2. NaCl 10% (nếu dịch hòa là Glucose 5%): ${nacl_vol_glucose_round} ml\n`;
        res_details += `Quy đổi NaCl 10% (1 ml = 1.7 mEq) nếu hòa Glucose 5%: ${nacl_vol_glucose_raw.toFixed(1)} ml -> Làm tròn: ${nacl_vol_glucose_round} ml.\n`;
        if (na_remaining > 0) {
          res_summary += `   NaCl 10% (nếu dịch hòa là NaCl 0.9%): ${nacl_vol_nacl09_round} ml\n`;
          res_details += `Dịch hòa NaCl 0.9% (${fluid} ml) cung cấp: ${na_from_nacl09.toFixed(2)} mEq Na -> Bù thêm: ${na_remaining.toFixed(2)} mEq -> NaCl 10%: ${nacl_vol_nacl09_raw.toFixed(1)} ml -> Làm tròn: ${nacl_vol_nacl09_round} ml.\n`;
          summaryItems.push(
            `<strong>2. NaCl 10%:</strong> ${nacl_vol_glucose_round} ml <em>(nếu hòa Glucose 5%)</em><br>` +
            `    hoặc ${nacl_vol_nacl09_round} ml <em>(nếu hòa NaCl 0.9%)</em>`
          );
        } else {
          res_summary += `   NaCl 10% (nếu dịch hòa là NaCl 0.9%): 0 ml (Đã đủ Na)\n`;
          res_details += `Dịch hòa NaCl 0.9% (${fluid} ml) cung cấp: ${na_from_nacl09.toFixed(2)} mEq Na (Đã đủ/vượt tổng nhu cầu ${na_total.toFixed(2)} mEq).\n`;
          summaryItems.push(
            `<strong>2. NaCl 10%:</strong> ${nacl_vol_glucose_round} ml <em>(nếu hòa Glucose 5%)</em><br>` +
            `    hoặc <strong>0 ml</strong> <em>(nếu hòa NaCl 0.9% — đã đủ Na)</em>`
          );
        }

        // 5. CANXI (Ca)
        const ca_maint = 0.5 * fluid100;
        const cacl2_raw = ca_maint / 1.36;
        const cagluc_raw = ca_maint / 0.45;
        const cacl2_round = roundInt(cacl2_raw);
        const cagluc_round = roundInt(cagluc_raw);

        res_summary += `3. CaCl2 10%: ${cacl2_round} ml HOẶC Calci gluconate 10%: ${cagluc_round} ml (Nhu cầu cơ bản 0.5 mEq/100ml)\n`;
        res_details += `\n* CANXI (Ca):\n`;
        res_details += `Nhu cầu Canxi cơ bản = 0.5 * ${fluid100.toFixed(2)} = ${ca_maint.toFixed(2)} mEq.\n`;
        res_details += `Quy đổi: CaCl2 10% -> ${cacl2_raw.toFixed(1)} ml (Làm tròn: ${cacl2_round} ml) | Calci gluconate 10% -> ${cagluc_raw.toFixed(1)} ml (Làm tròn: ${cagluc_round} ml).\n`;
        summaryItems.push(
          `<strong>3. CaCl2 10%:</strong> ${cacl2_round} ml <strong>HOẶC</strong> Calci gluconate 10%: ${cagluc_round} ml ` +
          `<span style="color:var(--text-muted);">(0.5 mEq/100ml dịch)</span>`
        );

        // 6. BICARBONATE (HCO3-)
        let itemIdx = 4;
        let has_hco3 = false;
        let nahco3_round = 0;
        if (!isNaN(hco3In.num) && hco3In.num < 22) {
          has_hco3 = true;
          const hco3_deficit = 0.3 * w * (24 - hco3In.num);
          const nahco3_raw = hco3_deficit / 1.0;
          nahco3_round = roundInt(nahco3_raw);

          res_summary += `${itemIdx}. NaHCO3 8.4%: ${nahco3_round} ml\n`;
          summaryItems.push(`<strong>${itemIdx}. NaHCO3 8.4%:</strong> ${nahco3_round} ml`);
          itemIdx++;

          res_details += `\n* BICARBONATE (HCO3-):\n`;
          res_details += `HCO3- ${hco3In.num} mEq/L -> Thiếu hụt = 0.3 * ${w} * (24 - ${hco3In.num}) = ${hco3_deficit.toFixed(2)} mEq -> NaHCO3 8.4%: ${nahco3_raw.toFixed(1)} ml -> Làm tròn: ${nahco3_round} ml.\n`;
        }

        // 7. MAGIE (Mg)
        const mg_maint = 0.25 * fluid100;
        const mgso4_raw = mg_maint / 2.5;
        const mgso4_round = roundInt(mgso4_raw);

        res_summary += `${itemIdx}. MgSO4 15%: ${mgso4_round} ml (Nhu cầu cơ bản 0.25 mEq/100ml)\n`;
        summaryItems.push(
          `<strong>${itemIdx}. MgSO4 15%:</strong> ${mgso4_round} ml ` +
          `<span style="color:var(--text-muted);">(0.25 mEq/100ml dịch)</span>`
        );
        itemIdx++;

        res_details += `\n* MAGIE (Mg):\n`;
        res_details += `Nhu cầu Magie cơ bản = 0.25 * ${fluid100.toFixed(2)} = ${mg_maint.toFixed(2)} mEq -> MgSO4 15%: ${mgso4_raw.toFixed(1)} ml -> Làm tròn: ${mgso4_round} ml.\n`;

        res_summary += `${itemIdx}. Dịch hòa: NaCl 0.9% hoặc Glucose 5% thể tích ${fluid} ml\n`;
        summaryItems.push(`<strong>${itemIdx}. Dịch hòa:</strong> NaCl 0.9% hoặc Glucose 5% thể tích <strong>${fluid} ml</strong>`);

        // ==========================================================
        // 8. BÙ PHOSPHO RIÊNG BIỆT (HÒA RIÊNG NaCl 0.9% - KHÔNG TRỘN ĐIỆN GIẢI KHÁC)
        // ==========================================================
        let phosphoHtml = '';
        if (!isNaN(pIn.num)) {
          const pCalc = calcSeparatePhospho(w);
          if (pIn.num < P_LOW_THRESHOLD) {
            res_summary += `\n[BÙ PHOSPHO RIÊNG BIỆT — CHỈ HÒA RIÊNG VỚI NaCl 0.9%]\n`;
            res_summary += `⚠ TUYỆT ĐỐI KHÔNG trộn chung chai/đường truyền với Kali, Canxi, Magie, NaHCO3 hay điện giải khác.\n`;

            let pItemsHtml = '';
            if (pCalc.pVolRound > 0) {
              res_summary += `• Pha riêng: Phosphorus Aguettant ${pCalc.pVolRound} ml + NaCl 0.9% ${pCalc.naclRound} ml (Tổng: ${pCalc.totalVol} ml)\n`;
              res_summary += `• Thực tế sau làm tròn: ${pCalc.pActualMmol.toFixed(2)} mmol P (~${(pCalc.pActualMmol / w).toFixed(2)} mmol/kg/ngày) | Nồng độ: ${pCalc.concMmolL.toFixed(1)} mmol/L (≤ ${pCalc.maxConcMmolL} mmol/L ngoại biên)\n`;
              res_summary += `• Truyền riêng: ${pCalc.rateMlH.toFixed(1)} ml/giờ trong ${pCalc.timeH.toFixed(1)} giờ | Tốc độ P: ${pCalc.pRateMmolH.toFixed(2)} mmol/giờ (${pCalc.pRateMmolKgH.toFixed(3)} mmol/kg/giờ, ≤ ${pCalc.maxRateKgH})\n`;
              res_summary += `• Lưu ý cân đối: Cữ truyền riêng này đưa thêm ${pCalc.totalVol} ml dịch và ${pCalc.naTotalSeparate.toFixed(1)} mEq Na+ (${pCalc.naFromDrug.toFixed(1)} từ thuốc + ${pCalc.naFromNacl.toFixed(1)} từ NaCl 0.9%)\n`;

              pItemsHtml = `
                <ul class="elec-list">
                  <li><strong>Pha riêng:</strong> Phosphorus Aguettant <strong>${pCalc.pVolRound} ml</strong> + NaCl 0.9% <strong>${pCalc.naclRound} ml</strong> <span style="color:var(--text-muted);">(Tổng: ${pCalc.totalVol} ml)</span></li>
                  <li>
                    <strong>Thực tế sau làm tròn:</strong> ${pCalc.pActualMmol.toFixed(2)} mmol P <span style="color:var(--text-muted);">(~${(pCalc.pActualMmol / w).toFixed(2)} mmol/kg/ngày)</span>
                    <div style="margin-top:4px; font-size:12px; color:var(--text-muted); display:flex; flex-wrap:wrap; gap:6px; align-items:center;">
                      <span>Nồng độ: <strong>${pCalc.concMmolL.toFixed(1)}</strong> mmol/L ${statusTag(pCalc.concMmolL <= pCalc.maxConcMmolL, `≤${pCalc.maxConcMmolL} ngoại biên`, `Vượt >${pCalc.maxConcMmolL}`)}</span>
                    </div>
                  </li>
                  <li>
                    <strong>Truyền riêng:</strong> <strong>${pCalc.rateMlH.toFixed(1)} ml/giờ</strong> trong <strong>${pCalc.timeH.toFixed(1)} giờ</strong>
                    <div style="margin-top:4px; font-size:12px; color:var(--text-muted); display:flex; flex-wrap:wrap; gap:6px; align-items:center;">
                      <span>Tốc độ P: <strong>${pCalc.pRateMmolH.toFixed(2)}</strong> mmol/h (<strong>${pCalc.pRateMmolKgH.toFixed(3)}</strong> mmol/kg/h) ${statusTag(pCalc.pRateMmolKgH <= pCalc.maxRateKgH, `≤${pCalc.maxRateKgH}`, `Vượt >${pCalc.maxRateKgH}`)}</span>
                    </div>
                  </li>
                  <li style="font-size:12.5px; color:var(--text-muted);">
                    <strong>Lưu ý cân đối:</strong> Cữ truyền riêng này đưa thêm <strong>${pCalc.totalVol} ml</strong> dịch và <strong>${pCalc.naTotalSeparate.toFixed(1)} mEq Na+</strong> (${pCalc.naFromDrug.toFixed(1)} từ thuốc + ${pCalc.naFromNacl.toFixed(1)} từ NaCl 0.9%).
                  </li>
                </ul>
              `;
            } else {
              res_summary += `• Liều tính toán quá nhỏ (${pCalc.pVolRaw.toFixed(2)} ml < 0.5 ml), cần pha loãng chính xác bằng bơm tiêm theo y lệnh sơ sinh.\n`;
              pItemsHtml = `<div style="font-size:13px;">Liều tính toán quá nhỏ (<strong>${pCalc.pVolRaw.toFixed(2)} ml</strong> < 0.5 ml), cần pha loãng chính xác bằng bơm tiêm theo y lệnh sơ sinh.</div>`;
            }

            phosphoHtml = `
              <div class="result-box autumn" style="margin-bottom:12px;">
                <div class="elec-section-title autumn">Bù Phospho riêng biệt — Chỉ hòa NaCl 0.9%</div>
                <div style="margin-bottom:8px; padding:7px 10px; border-radius:8px; font-size:12px; font-weight:700; line-height:1.45; background:var(--danger-bg); color:var(--danger-text); border:1px solid var(--danger-border);">
                  ⚠ TUYỆT ĐỐI KHÔNG trộn chung chai/đường truyền với Kali, Canxi, Magie, NaHCO3 hay điện giải khác.
                </div>
                ${pItemsHtml}
              </div>
            `;

            res_details += `\n* PHOSPHO RIÊNG BIỆT (Phosphorus Aguettant 10 ml: 1 ml = 0.66 mmol P | 1.33 mmol Na | 0.66 mmol Glucose):\n`;
            res_details += `Phospho máu ${pIn.num} mmol/L (< ${P_LOW_THRESHOLD} mmol/L -> Hạ Phospho máu). Hòa riêng hoàn toàn với NaCl 0.9%, không trộn K/Ca/Mg/HCO3.\n`;
            res_details += `Liều mục tiêu = 0.2 * ${w} = ${pCalc.pNeedMmol.toFixed(2)} mmol/ngày -> Lý thuyết: ${pCalc.pVolRaw.toFixed(2)} ml -> Làm tròn: ${pCalc.pVolRound} ml (${pCalc.pActualMmol.toFixed(2)} mmol P).\n`;
            if (pCalc.pVolRound > 0) {
              res_details += `NaCl 0.9% pha riêng (làm tròn lên hàng chục, giữ nồng độ ≤ 50 mmol/L): ${pCalc.naclRound} ml -> Tổng hỗn hợp: ${pCalc.totalVol} ml.\n`;
              res_details += `Nồng độ sau làm tròn = ${pCalc.pActualMmol.toFixed(2)} / (${pCalc.totalVol}/1000) = ${pCalc.concMmolL.toFixed(1)} mmol/L (${(pCalc.concMmolL / 1000).toFixed(3)} mmol/ml) [≤ 50 mmol/L: Đạt].\n`;
              res_details += `Tốc độ truyền (mục tiêu 6h, tối đa 0.06 mmol/kg/h) = ${pCalc.rateMlH.toFixed(1)} ml/giờ (${pCalc.timeH.toFixed(1)} giờ) -> ${pCalc.pRateMmolH.toFixed(2)} mmol/giờ (${pCalc.pRateMmolKgH.toFixed(3)} mmol/kg/giờ) [Đạt].\n`;
              res_details += `Thành phần đi kèm: ${pCalc.naFromDrug.toFixed(2)} mEq Na+ (thuốc) + ${pCalc.naFromNacl.toFixed(2)} mEq Na+ (NaCl 0.9%) = ${pCalc.naTotalSeparate.toFixed(2)} mEq Na+ | ${pCalc.gluFromDrug.toFixed(2)} mmol Glucose.\n`;
            }
          } else {
            res_details += `\n* PHOSPHO: Phospho máu ${pIn.num} mmol/L (≥ ${P_LOW_THRESHOLD} mmol/L), chưa có chỉ định bù mặc định. (Nếu cần bù riêng 0.2 mmol/kg/ngày: Phosphorus Aguettant ${pCalc.pVolRound} ml pha riêng trong ${pCalc.naclRound} ml NaCl 0.9%).\n`;
          }
        }

        // ==========================================================
        // 9. TỐI ƯU BÙ KALI CẤP SAU LÀM TRÒN (≤ 40 mEq/L | ≤ 0.3 mEq/kg/giờ)
        // ==========================================================
        let acuteKHtml = '';
        if (k < 3.5) {
          const th1 = calcOptimalAcuteK(k_deficit, w, MAX_K_CONC, MAX_K_RATE);
          const th2 = calcOptimalAcuteK(k_total, w, MAX_K_CONC, MAX_K_RATE);

          res_summary += `\n[TỐI ƯU BÙ KALI CẤP SAU LÀM TRÒN (≤ ${MAX_K_CONC} mEq/L | ≤ ${MAX_K_MEQ_H.toFixed(2)} mEq/h ~ ${MAX_K_RATE} mEq/kg/h)]\n`;
          res_summary += `(Chỉ nâng lên 40-80 mEq/L & 0.3-0.5 mEq/kg/h khi có liệt cơ hô hấp, rối loạn nhịp tim)\n`;

          res_summary += `• TH1 - Không tính K nhu cầu/ngày (Mục tiêu ${k_deficit.toFixed(2)} mEq):\n`;
          if (th1.kclRound > 0) {
            res_summary += `  - Pha: KCl 10% ${th1.kclRound} ml + NaCl 0.9%/Glucose 5% ${th1.diluentRound} ml (Tổng: ${th1.totalVol} ml | K+ thực tế: ${th1.kActual.toFixed(2)} mEq)\n`;
            res_summary += `  - Truyền: ${th1.rateMlH.toFixed(1)} ml/giờ | Thời gian: ${th1.timeH.toFixed(1)} giờ\n`;
            res_summary += `  - Sau làm tròn: Nồng độ ${th1.concActual.toFixed(1)} mEq/L | Tốc độ ${th1.kRateMeqH.toFixed(2)} mEq/giờ (${th1.kRateMeqKgH.toFixed(3)} mEq/kg/giờ)\n`;
          } else {
            res_summary += `  - Lượng KCl 10% quá nhỏ (${th1.kclRaw.toFixed(2)} ml < 0.5 ml).\n`;
          }

          res_summary += `• TH2 - Có tính K nhu cầu/ngày (Mục tiêu ${k_total.toFixed(2)} mEq):\n`;
          if (th2.kclRound > 0) {
            res_summary += `  - Pha: KCl 10% ${th2.kclRound} ml + NaCl 0.9%/Glucose 5% ${th2.diluentRound} ml (Tổng: ${th2.totalVol} ml | K+ thực tế: ${th2.kActual.toFixed(2)} mEq)\n`;
            res_summary += `  - Truyền: ${th2.rateMlH.toFixed(1)} ml/giờ | Thời gian: ${th2.timeH.toFixed(1)} giờ\n`;
            res_summary += `  - Sau làm tròn: Nồng độ ${th2.concActual.toFixed(1)} mEq/L | Tốc độ ${th2.kRateMeqH.toFixed(2)} mEq/giờ (${th2.kRateMeqKgH.toFixed(3)} mEq/kg/giờ)\n`;
          } else {
            res_summary += `  - Lượng KCl 10% quá nhỏ (${th2.kclRaw.toFixed(2)} ml < 0.5 ml).\n`;
          }

          const formatAcuteDetail = (label, targetMeq, d) => {
            let s = `\n${label} (Mục tiêu = ${targetMeq.toFixed(2)} mEq -> KCl 10% lý thuyết ${d.kclRaw.toFixed(2)} ml -> Làm tròn: ${d.kclRound} ml):\n`;
            if (d.kclRound <= 0) return s + `  - Thể tích làm tròn = 0 ml (< 0.5 ml).\n`;
            s += `  - K+ thực tế = ${d.kActual.toFixed(2)} mEq | Dịch nền (hàng chục) = ${d.diluentRound} ml | Tổng = ${d.totalVol} ml.\n`;
            s += `  - Nồng độ sau làm tròn = ${d.concActual.toFixed(1)} mEq/L [≤ ${MAX_K_CONC}: Đạt].\n`;
            s += `  - Tốc độ dịch = ${d.rateMlH.toFixed(1)} ml/giờ (${d.timeH.toFixed(1)} giờ) -> Tốc độ K+ = ${d.kRateMeqH.toFixed(2)} mEq/giờ (${d.kRateMeqKgH.toFixed(3)} mEq/kg/giờ) [≤ ${d.kMaxMeqH.toFixed(2)} mEq/h: Đạt].\n`;
            return s;
          };

          res_details += `\n* TỐI ƯU BÙ KALI CẤP (≤ ${MAX_K_CONC} mEq/L | ≤ ${MAX_K_MEQ_H.toFixed(2)} mEq/giờ = ${MAX_K_RATE} mEq/kg/giờ):\n`;
          res_details += formatAcuteDetail('1) TH1 - Không tính K nhu cầu/ngày', k_deficit, th1);
          res_details += formatAcuteDetail('2) TH2 - Có tính K nhu cầu/ngày', k_total, th2);

          const renderAcuteCase = (title, colorVar, targetMeq, d) => {
            if (d.kclRound <= 0) {
              return `
                <li>
                  <div style="font-weight:700; color:${colorVar}; margin-bottom:3px;">${title} (Mục tiêu: ${targetMeq.toFixed(2)} mEq)</div>
                  <div style="color:var(--text-muted);">Lượng KCl 10% quá nhỏ (${d.kclRaw.toFixed(2)} ml < 0.5 ml).</div>
                </li>
              `;
            }
            return `
              <li>
                <div style="font-weight:700; color:${colorVar}; margin-bottom:3px;">${title} (Mục tiêu: ${targetMeq.toFixed(2)} mEq)</div>
                <div>• Pha: <strong>KCl 10% ${d.kclRound} ml</strong> + NaCl 0.9%/Glucose 5% <strong>${d.diluentRound} ml</strong> <span style="color:var(--text-muted);">(Tổng: ${d.totalVol} ml · K+ thực tế: ${d.kActual.toFixed(2)} mEq)</span></div>
                <div>• Truyền: <strong>${d.rateMlH.toFixed(1)} ml/giờ</strong> · Thời gian: <strong>${d.timeH.toFixed(1)} giờ</strong></div>
                <div style="margin-top:3px; font-size:12px; color:var(--text-muted); display:flex; flex-wrap:wrap; gap:6px; align-items:center;">
                  <span>Nồng độ: <strong>${d.concActual.toFixed(1)}</strong> mEq/L ${statusTag(d.concActual <= MAX_K_CONC, '≤40', 'Vượt >40')}</span>
                  <span>· Tốc độ: <strong>${d.kRateMeqH.toFixed(2)}</strong> mEq/h (<strong>${d.kRateMeqKgH.toFixed(3)}</strong> mEq/kg/h) ${statusTag(d.kRateMeqKgH <= MAX_K_RATE, '≤0.3', 'Vượt >0.3')}</span>
                </div>
              </li>
            `;
          };

          acuteKHtml = `
            <div class="result-box autumn" style="margin-bottom:12px;">
              <div class="elec-section-title autumn">Tối ưu bù Kali cấp sau làm tròn (≤ ${MAX_K_CONC} mEq/L | ≤ ${MAX_K_MEQ_H.toFixed(2)} mEq/h)</div>
              <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px; line-height:1.45;">
                Chỉ nâng lên 40–80 mEq/L & 0.3–0.5 mEq/kg/giờ khi có liệt cơ hô hấp, rối loạn nhịp tim.
              </div>
              <ul class="elec-list">
                ${renderAcuteCase('TH1 — Không tính K nhu cầu/ngày', 'var(--autumn-maple)', k_deficit, th1)}
                ${renderAcuteCase('TH2 — Có tính K nhu cầu/ngày', 'var(--river-deep)', k_total, th2)}
              </ul>
            </div>
          `;
        } else {
          res_details += `\n* TỐI ƯU BÙ KALI CẤP: K máu ≥ 3.5 mEq/L, không có chỉ định bù Kali cấp.\n`;
        }

        // ==========================================================
        // 10. PHƯƠNG ÁN THAM KHẢO DÙNG CHAI CHUẨN NaCl 0.9% (Không chứa Phospho)
        // ==========================================================
        let ref_fluid = 500;
        let refGuard = 0;
        while ((k_24h_actual / (ref_fluid / 1000)) > MAX_K_CONC && refGuard < 20) {
          ref_fluid += 500;
          refGuard++;
        }

        const ref_rate = ref_fluid / 24;
        const ref_k_conc = k_24h_actual / (ref_fluid / 1000);
        const ref_k_meq_h = k_24h_actual / 24;
        const ref_k_rate_kg = ref_k_meq_h / w;
        const ref_conc_is_ok = ref_k_conc <= MAX_K_CONC;
        const ref_rate_is_ok = ref_k_rate_kg <= MAX_K_RATE;
        const ref_conc_ok = ref_conc_is_ok ? 'Đạt' : `VƯỢT NGƯỠNG (Tối đa ${MAX_K_CONC} mEq/L)`;
        const ref_rate_ok = ref_rate_is_ok ? 'Đạt' : `VƯỢT NGƯỠNG (Tối đa ${MAX_K_MEQ_H.toFixed(2)} mEq/h | ${MAX_K_RATE} mEq/kg/h)`;

        const na_from_ref = ref_fluid * 0.15;
        const na_rem_ref = na_total - na_from_ref;
        const nacl_vol_ref_round = na_rem_ref > 0 ? roundInt(na_rem_ref / 1.7) : 0;

        res_details += `\n* KIỂM TRA THAM SỐ K+ CHAI CHUẨN SAU LÀM TRÒN (${ref_fluid} ml / 24h | KCl 10%: ${kcl_24h_round} ml = ${k_24h_actual.toFixed(2)} mEq):\n`;
        res_details += `  + Nồng độ K+ = ${ref_k_conc.toFixed(1)} mEq/L [${ref_conc_ok}] | Tốc độ K+ = ${ref_k_meq_h.toFixed(2)} mEq/giờ (${ref_k_rate_kg.toFixed(3)} mEq/kg/giờ) [${ref_rate_ok}].\n`;

        res_summary += `\n[PHƯƠNG ÁN THAM KHẢO DÙNG CHAI CHUẨN NaCl 0.9%]\n`;
        res_summary += `Thể tích cơ sở: ${ref_fluid} ml NaCl 0.9% | Tốc độ (24h): ${ref_rate.toFixed(1)} ml/giờ\n`;
        res_summary += `Sau làm tròn -> Nồng độ K+: ${ref_k_conc.toFixed(1)} mEq/L (≤ 40) | Tốc độ K+: ${ref_k_meq_h.toFixed(2)} mEq/giờ (${ref_k_rate_kg.toFixed(3)} mEq/kg/giờ, ≤ 0.3)\n`;
        res_summary += `Pha thêm vào chai ${ref_fluid} ml (KHÔNG pha Phospho vào chai này):\n`;
        res_summary += `1. KCl 10%: ${kcl_24h_round} ml\n`;

        const refItems = [];
        refItems.push(`<strong>1. KCl 10%:</strong> ${kcl_24h_round} ml`);
        if (na_rem_ref > 0) {
          res_summary += `2. NaCl 10%: ${nacl_vol_ref_round} ml\n`;
          refItems.push(`<strong>2. NaCl 10%:</strong> ${nacl_vol_ref_round} ml`);
        } else {
          res_summary += `2. NaCl 10%: 0 ml (Lượng Na từ ${ref_fluid} ml dịch hòa đã vượt nhu cầu)\n`;
          refItems.push(`<strong>2. NaCl 10%:</strong> 0 ml <span style="color:var(--text-muted);">(Na từ ${ref_fluid} ml dịch hòa đã vượt nhu cầu)</span>`);
        }
        res_summary += `3. CaCl2 10%: ${cacl2_round} ml HOẶC Calci gluconate 10%: ${cagluc_round} ml\n`;
        refItems.push(`<strong>3. CaCl2 10%:</strong> ${cacl2_round} ml <strong>HOẶC</strong> Calci gluconate 10%: ${cagluc_round} ml`);

        let refIdx = 4;
        if (has_hco3) {
          res_summary += `${refIdx}. NaHCO3 8.4%: ${nahco3_round} ml\n`;
          refItems.push(`<strong>${refIdx}. NaHCO3 8.4%:</strong> ${nahco3_round} ml`);
          refIdx++;
        }
        res_summary += `${refIdx}. MgSO4 15%: ${mgso4_round} ml\n`;
        refItems.push(`<strong>${refIdx}. MgSO4 15%:</strong> ${mgso4_round} ml`);

        resultWrap.innerHTML = `
          <div class="card">
            <div class="card-title">
              <span>Thông số cơ bản</span>
              <button type="button" class="btn-mini" id="bdg-copy-btn">Copy tóm tắt</button>
            </div>
            <div class="elec-metrics-bar">
              <div class="metric-pill">
                <span class="m-label">Cân nặng</span>
                <span class="m-val">${w} kg</span>
              </div>
              <div class="metric-pill">
                <span class="m-label">Dịch duy trì</span>
                <span class="m-val">${fluid} ml</span>
              </div>
              <div class="metric-pill">
                <span class="m-label">Tốc độ (24h)</span>
                <span class="m-val">${rate_24h.toFixed(1)} ml/h</span>
              </div>
            </div>
            <div style="font-size:12.5px; color:var(--text-muted); margin-bottom:12px;">
              <strong>Xét nghiệm:</strong> ${escapeHtml(labs.join(' · '))}
            </div>

            <div class="result-box autumn" style="margin-bottom:12px;">
              <div class="elec-section-title autumn">Kết quả tóm tắt dịch duy trì 24h (đã làm tròn)</div>
              <ul class="elec-list">${summaryItems.map(item => `<li>${item}</li>`).join('')}</ul>
            </div>

            ${phosphoHtml}

            ${acuteKHtml}

            <div class="result-box river">
              <div class="elec-section-title">Phương án chai chuẩn NaCl 0.9% (${ref_fluid} ml)</div>
              <div style="font-size:12.5px; margin-bottom:8px; line-height:1.6;">
                <div>Tốc độ (24h): <strong>${ref_rate.toFixed(1)} ml/giờ</strong> <span style="color:var(--text-muted);">· KHÔNG pha Phospho vào chai này</span></div>
                <div style="display:flex; flex-wrap:wrap; gap:6px; align-items:center; margin-top:2px;">
                  <span>Nồng độ K+: <strong>${ref_k_conc.toFixed(1)}</strong> mEq/L ${statusTag(ref_conc_is_ok, '≤40', 'Vượt >40')}</span>
                  <span>· Tốc độ K+: <strong>${ref_k_meq_h.toFixed(2)}</strong> mEq/h (<strong>${ref_k_rate_kg.toFixed(3)}</strong> mEq/kg/h) ${statusTag(ref_rate_is_ok, '≤0.3', 'Vượt >0.3')}</span>
                </div>
              </div>
              <ul class="elec-list river-items">${refItems.map(item => `<li>${item}</li>`).join('')}</ul>
            </div>

            <details class="details-box">
              <summary>Xem chi tiết các bước tính</summary>
              <div class="details-body" id="bdg-details-body"></div>
            </details>
          </div>
        `;

        resultWrap.querySelector('#bdg-details-body').textContent = res_details.trim();

        const copyBtn = resultWrap.querySelector('#bdg-copy-btn');
        copyBtn.addEventListener('click', async () => {
          const ok = await copyText(res_summary.trim());
          if (ok) {
            copyBtn.textContent = 'Đã copy ✓';
            setTimeout(() => { copyBtn.textContent = 'Copy tóm tắt'; }, 1200);
          }
        });

        resultWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } catch (err) {
        resultWrap.style.display = 'block';
        resultWrap.innerHTML = `
          <div class="card">
            <div class="result-box error">Đã xảy ra lỗi khi tính toán: ${escapeHtml(err && err.message ? err.message : String(err))}</div>
          </div>
        `;
      }
    }

    btnCalc.addEventListener('click', calculate);

    btnReset.addEventListener('click', () => {
      elW.value = '';
      elNa.value = '135';
      elK.value = '3.5';
      elHco3.value = '';
      elCa.value = '';
      elMg.value = '';
      elP.value = '';
      resultWrap.style.display = 'none';
      elW.focus();
    });

    // Nhấn Enter ở bất kỳ ô nào cũng tự tính
    container.querySelectorAll('input').forEach(inp => {
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') calculate();
      });
    });
  }
};
