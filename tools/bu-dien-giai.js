// =========================================================================
// MỤC 2: BÙ ĐIỆN GIẢI NHI KHOA (Cập nhật v1.7)
// Giữ nguyên 100% công thức Holliday-Segar, quy đổi điện giải,
// kiểm tra 2 tham số an toàn K+ và tối ưu bù Kali cấp.
// =========================================================================

export default {
  id: 'bu-dien-giai',
  name: 'Bù điện giải',
  title: 'Tính Bù Điện Giải',
  subtitle: 'Dịch duy trì, tối ưu bù Kali cấp & chai chuẩn',
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
          <span class="card-title-badge">Holliday–Segar · v1.7</span>
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
            <input type="text" inputmode="decimal" id="bdg-hco3" placeholder="Tuỳ chọn" autocomplete="off" />
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
            <input type="text" inputmode="decimal" id="bdg-p" placeholder="Tuỳ chọn" autocomplete="off" />
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

    function parseNum(str) {
      return parseFloat(String(str || '').trim().replace(',', '.'));
    }

    function statusTag(isOk, okText, warnText) {
      if (isOk) {
        return `<span style="display:inline-block; padding:1px 7px; border-radius:999px; font-size:11.5px; font-weight:700; background:var(--success-bg); color:var(--success-text); border:1px solid var(--success-border);">${okText}</span>`;
      }
      return `<span style="display:inline-block; padding:1px 7px; border-radius:999px; font-size:11.5px; font-weight:700; background:var(--danger-bg); color:var(--danger-text); border:1px solid var(--danger-border);">${warnText}</span>`;
    }

    function calculate() {
      const w = parseNum(elW.value) || 0;
      const na = parseNum(elNa.value) || 135;
      const k = parseNum(elK.value) || 3.5;
      const hco3_val = elHco3.value.trim().replace(',', '.');
      const ca_val = elCa.value.trim().replace(',', '.');
      const mg_val = elMg.value.trim().replace(',', '.');
      const p_val = elP.value.trim().replace(',', '.');

      resultWrap.style.display = 'block';

      if (w <= 0) {
        resultWrap.innerHTML = `
          <div class="card">
            <div class="result-box error">Lỗi: Yêu cầu nhập cân nặng hợp lệ (&gt; 0 kg).</div>
          </div>
        `;
        return;
      }

      // Ngưỡng an toàn bù Kali đường tĩnh mạch thường quy
      const MAX_K_CONC = 40;  // mEq/L
      const MAX_K_RATE = 0.3; // mEq/kg/giờ

      // 1. Dịch duy trì (Holliday-Segar)
      let fluid = 0;
      if (w <= 10) fluid = w * 100;
      else if (w <= 20) fluid = 1000 + (w - 10) * 50;
      else fluid = 1500 + (w - 20) * 20;

      const fluid100 = fluid / 100;
      const rate = fluid / 24;

      const labs = [`Na ${na}`, `K ${k}`];
      if (hco3_val) labs.push(`HCO3- ${hco3_val}`);
      if (ca_val) labs.push(`Ca ${ca_val}`);
      if (mg_val) labs.push(`Mg2+ ${mg_val}`);
      if (p_val) labs.push(`Phospho ${p_val}`);

      let res_summary = `[THÔNG SỐ CƠ BẢN]\n`;
      res_summary += `Cân nặng: ${w} kg | Dịch duy trì: ${fluid} ml/24h | Tốc độ truyền: ${rate.toFixed(1)} ml/giờ\n`;
      res_summary += `Xét nghiệm: ${labs.join(' | ')}\n\n`;
      res_summary += `[KẾT QUẢ TÓM TẮT]\n`;

      let res_details = `[CHI TIẾT CÁC BƯỚC TÍNH]\n`;
      const summaryItems = [];

      // 2. Kali
      let k_deficit = 0;
      const k_maint = 2 * fluid100;
      let k_total = 0;

      if (k < 3.5) {
        k_deficit = 0.4 * w * (3.5 - k);
        k_total = k_deficit + k_maint;

        res_details += `\n* KALI (K):\n`;
        res_details += `Bệnh nhân có K máu ${k} mEq/L tương đương hạ Kali máu.\n`;
        res_details += `Lượng K thiếu hụt ước đoán = 0.4 * ${w} * (3.5 - ${k}) = ${k_deficit.toFixed(2)} mEq.\n`;
        res_details += `Lượng K nhu cầu cơ bản = 2 mEq / 100 ml dịch = 2 * ${fluid100.toFixed(2)} = ${k_maint.toFixed(2)} mEq.\n`;
        res_details += `Tổng lượng K mục tiêu cần thiết = ${k_deficit.toFixed(2)} + ${k_maint.toFixed(2)} = ${k_total.toFixed(2)} mEq.\n`;
      } else {
        k_total = k_maint;
        res_details += `\n* KALI (K): K máu bình thường/cao (${k} mEq/L). Chỉ tính nhu cầu cơ bản = 2 * ${fluid100.toFixed(2)} = ${k_total.toFixed(2)} mEq.\n`;
      }

      // Kiểm tra 2 tham số K+ cho phác đồ dịch duy trì 24h
      const k_conc_24h = k_total / (fluid / 1000);
      const k_rate_24h = (k_total / 24) / w;
      const k_conc_24h_is_ok = k_conc_24h <= MAX_K_CONC;
      const k_rate_24h_is_ok = k_rate_24h <= MAX_K_RATE;
      const k_conc_24h_ok = k_conc_24h_is_ok ? 'Đạt' : `VƯỢT NGƯỠNG (Tối đa ${MAX_K_CONC} mEq/L)`;
      const k_rate_24h_ok = k_rate_24h_is_ok ? 'Đạt' : `VƯỢT NGƯỠNG (Tối đa ${MAX_K_RATE} mEq/kg/giờ)`;

      res_details += `-> Kiểm tra 2 tham số K+ phác đồ 24h (${fluid} ml):\n`;
      res_details += `   + Nồng độ K+ trong dịch = ${k_total.toFixed(2)} / (${fluid}/1000) = ${k_conc_24h.toFixed(1)} mEq/L [${k_conc_24h_ok}].\n`;
      res_details += `   + Tốc độ truyền K+ = (${k_total.toFixed(2)} / 24) / ${w} = ${k_rate_24h.toFixed(3)} mEq/kg/giờ [${k_rate_24h_ok}].\n`;

      const kcl_vol = (k_total / 1.34).toFixed(1);
      res_summary += `1. KCl 10%: ${kcl_vol} ml\n`;
      summaryItems.push(
        `<strong>1. KCl 10%:</strong> ${kcl_vol} ml` +
        `<div style="margin-top:4px; font-size:12px; color:var(--text-muted); display:flex; flex-wrap:wrap; gap:6px; align-items:center;">` +
        `<span>Nồng độ: <strong>${k_conc_24h.toFixed(1)}</strong> mEq/L ${statusTag(k_conc_24h_is_ok, 'Đạt', 'Vượt >40')}</span>` +
        `<span>· Tốc độ: <strong>${k_rate_24h.toFixed(3)}</strong> mEq/kg/h ${statusTag(k_rate_24h_is_ok, 'Đạt', 'Vượt >0.3')}</span>` +
        `</div>`
      );

      // 3. Natri
      let na_total = 0;
      const na_maint = 3 * fluid100;
      if (na < 135) {
        const na_deficit = 0.6 * w * (135 - na);
        na_total = na_deficit + na_maint;

        res_details += `\n* NATRI (Na):\n`;
        res_details += `Bệnh nhân có Na máu ${na} mEq/L tương đương hạ Natri máu.\n`;
        res_details += `Lượng Na thiếu hụt ước đoán = 0.6 * ${w} * (135 - ${na}) = ${na_deficit.toFixed(2)} mEq.\n`;
        res_details += `Lượng Na nhu cầu cơ bản = 3 mEq / 100 ml dịch = 3 * ${fluid100.toFixed(2)} = ${na_maint.toFixed(2)} mEq.\n`;
        res_details += `Tổng lượng Na mục tiêu cần thiết = ${na_deficit.toFixed(2)} + ${na_maint.toFixed(2)} = ${na_total.toFixed(2)} mEq.\n`;
      } else {
        na_total = na_maint;
        res_details += `\n* NATRI (Na): Na máu bình thường/cao (${na} mEq/L). Chỉ tính nhu cầu cơ bản = 3 * ${fluid100.toFixed(2)} = ${na_total.toFixed(2)} mEq.\n`;
      }

      const na_from_nacl09 = fluid * 0.15;
      const nacl_vol_glucose = na_total / 1.7;
      const na_remaining = na_total - na_from_nacl09;
      const nacl_vol_nacl09 = na_remaining > 0 ? (na_remaining / 1.7) : 0;

      res_summary += `2. NaCl 10% (nếu dịch hòa là Glucose 5%): ${nacl_vol_glucose.toFixed(1)} ml\n`;
      if (na_remaining > 0) {
        res_summary += `   NaCl 10% (nếu dịch hòa là NaCl 0.9%): ${nacl_vol_nacl09.toFixed(1)} ml\n`;
        res_details += `Dịch hòa NaCl 0.9% (${fluid} ml) cung cấp: ${fluid} * 0.15 = ${na_from_nacl09.toFixed(2)} mEq Na.\n`;
        res_details += `Lượng Na cần bù thêm (NaCl 10%): ${na_total.toFixed(2)} - ${na_from_nacl09.toFixed(2)} = ${na_remaining.toFixed(2)} mEq.\n`;
        summaryItems.push(
          `<strong>2. NaCl 10%:</strong> ${nacl_vol_glucose.toFixed(1)} ml <em>(nếu hòa Glucose 5%)</em><br>` +
          `&nbsp;&nbsp;&nbsp;&nbsp;hoặc ${nacl_vol_nacl09.toFixed(1)} ml <em>(nếu hòa NaCl 0.9%)</em>`
        );
      } else {
        res_summary += `   NaCl 10% (nếu dịch hòa là NaCl 0.9%): 0 ml (Đã đủ Na)\n`;
        res_details += `Dịch hòa NaCl 0.9% (${fluid} ml) cung cấp: ${fluid} * 0.15 = ${na_from_nacl09.toFixed(2)} mEq Na.\n`;
        res_details += `(Lượng Na từ dịch nền đã vượt quá hoặc bằng tổng nhu cầu ${na_total.toFixed(2)} mEq nên không cần bù thêm NaCl 10%).\n`;
        summaryItems.push(
          `<strong>2. NaCl 10%:</strong> ${nacl_vol_glucose.toFixed(1)} ml <em>(nếu hòa Glucose 5%)</em><br>` +
          `&nbsp;&nbsp;&nbsp;&nbsp;hoặc <strong>0 ml</strong> <em>(nếu hòa NaCl 0.9% — đã đủ Na)</em>`
        );
      }

      // 4. Canxi
      const ca_maint = 0.5 * fluid100;
      const cacl2_vol = ca_maint / 1.36;
      const cagluc_vol = ca_maint / 0.45;
      res_summary += `3. CaCl2 10%: ${cacl2_vol.toFixed(1)} ml HOẶC Calci gluconate 10%: ${cagluc_vol.toFixed(1)} ml (Tính theo liều nhu cầu cơ bản 0.5 mEq/100ml dịch)\n`;
      res_details += `\n* CANXI (Ca):\n`;
      res_details += `Nhu cầu Canxi cơ bản = 0.5 mEq / 100 ml dịch = 0.5 * ${fluid100.toFixed(2)} = ${ca_maint.toFixed(2)} mEq.\n`;
      res_details += `Quy đổi: CaCl2 10% (1ml = 1.36 mEq) -> Cần ${cacl2_vol.toFixed(1)} ml.\n`;
      res_details += `Quy đổi: Calci gluconate 10% (1ml = 0.45 mEq) -> Cần ${cagluc_vol.toFixed(1)} ml.\n`;
      summaryItems.push(
        `<strong>3. CaCl2 10%:</strong> ${cacl2_vol.toFixed(1)} ml <strong>HOẶC</strong> Calci gluconate 10%: ${cagluc_vol.toFixed(1)} ml ` +
        `<span style="color:var(--text-muted);">(0.5 mEq/100ml dịch)</span>`
      );

      // 5. Bicarbonate
      const hasLowHco3 = hco3_val && parseFloat(hco3_val) < 22;
      let nahco3_vol = 0;
      if (hasLowHco3) {
        const hco3 = parseFloat(hco3_val);
        const hco3_deficit = 0.3 * w * (24 - hco3);
        nahco3_vol = hco3_deficit / 1.0;
        res_summary += `4. NaHCO3 8.4%: ${nahco3_vol.toFixed(1)} ml\n`;
        res_details += `\n* BICARBONATE (HCO3-):\n`;
        res_details += `Bệnh nhân có HCO3- ${hco3} mEq/L tương đương toan chuyển hoá.\n`;
        res_details += `Lượng HCO3- thiếu hụt = 0.3 * ${w} * (24 - ${hco3}) = ${hco3_deficit.toFixed(2)} mEq.\n`;
        res_details += `Quy đổi: NaHCO3 8.4% (1ml = 1.0 mEq) -> Cần ${nahco3_vol.toFixed(1)} ml.\n`;
        summaryItems.push(`<strong>4. NaHCO3 8.4%:</strong> ${nahco3_vol.toFixed(1)} ml`);
      }

      // 6. Magie
      const mg_maint = 0.25 * fluid100;
      const mgso4_vol = mg_maint / 2.5;
      res_summary += `5. MgSO4 15%: ${mgso4_vol.toFixed(1)} ml (Tính theo liều nhu cầu cơ bản 0.25 mEq/100ml dịch)\n`;
      res_details += `\n* MAGIE (Mg):\n`;
      res_details += `Nhu cầu Magie cơ bản = 0.25 mEq / 100 ml dịch = 0.25 * ${fluid100.toFixed(2)} = ${mg_maint.toFixed(2)} mEq.\n`;
      res_details += `Quy đổi: MgSO4 15% (1ml = 2.5 mEq) -> Cần ${mgso4_vol.toFixed(1)} ml.\n`;
      summaryItems.push(
        `<strong>5. MgSO4 15%:</strong> ${mgso4_vol.toFixed(1)} ml ` +
        `<span style="color:var(--text-muted);">(0.25 mEq/100ml dịch)</span>`
      );

      res_summary += `6. Dịch hòa: NaCl 0.9% hoặc Glucose 5% thể tích ${fluid} ml\n`;
      summaryItems.push(`<strong>6. Dịch hòa:</strong> NaCl 0.9% hoặc Glucose 5% thể tích <strong>${fluid} ml</strong>`);

      // ==========================================================
      // 7. TỐI ƯU BÙ KALI CẤP (Tối đa 40 mEq/L | Tối đa 0.3 mEq/kg/giờ)
      // ==========================================================
      let acuteKHtml = '';
      if (k < 3.5) {
        const k_meq_per_hr_max = MAX_K_RATE * w;
        const inf_rate_max = (k_meq_per_hr_max / MAX_K_CONC) * 1000;

        // TH1: Không tính K nhu cầu/ngày (chỉ bù k_deficit)
        const k1_kcl = k_deficit / 1.34;
        const k1_vol_opt = (k_deficit / MAX_K_CONC) * 1000;
        const k1_diluent_opt = Math.max(0, k1_vol_opt - k1_kcl);
        const k1_time_opt = k_deficit / k_meq_per_hr_max;
        const k1_check_conc = k_deficit / (k1_vol_opt / 1000);
        const k1_check_rate = (inf_rate_max * (k1_check_conc / 1000)) / w;

        // TH2: Có tính K nhu cầu/ngày (k_total = k_deficit + k_maint)
        const k2_kcl = k_total / 1.34;
        const k2_vol_opt = (k_total / MAX_K_CONC) * 1000;
        const k2_diluent_opt = Math.max(0, k2_vol_opt - k2_kcl);
        const k2_time_opt = k_total / k_meq_per_hr_max;
        const k2_check_conc = k_total / (k2_vol_opt / 1000);
        const k2_check_rate = (inf_rate_max * (k2_check_conc / 1000)) / w;

        res_summary += `\n[TỐI ƯU BÙ KALI CẤP (Tối đa 40 mEq/L | 0.3 mEq/kg/giờ)]\n`;
        res_summary += `(Chỉ nâng lên 40-80 mEq/L & 0.3-0.5 mEq/kg/giờ khi có liệt cơ hô hấp, rối loạn nhịp tim)\n`;

        res_summary += `• TH1 - Không tính K nhu cầu/ngày (Chỉ bù thiếu: ${k_deficit.toFixed(2)} mEq):\n`;
        res_summary += `  - KCl 10%: ${k1_kcl.toFixed(1)} ml + NaCl 0.9%/Glucose 5% vừa đủ ${k1_vol_opt.toFixed(1)} ml (dịch nền ~${k1_diluent_opt.toFixed(1)} ml)\n`;
        res_summary += `  - Tốc độ truyền tối đa: ${inf_rate_max.toFixed(1)} ml/giờ | Thời gian truyền tối thiểu: ${k1_time_opt.toFixed(1)} giờ\n`;

        res_summary += `• TH2 - Có tính K nhu cầu/ngày (Tổng bù + nhu cầu: ${k_total.toFixed(2)} mEq):\n`;
        res_summary += `  - KCl 10%: ${k2_kcl.toFixed(1)} ml + NaCl 0.9%/Glucose 5% vừa đủ ${k2_vol_opt.toFixed(1)} ml (dịch nền ~${k2_diluent_opt.toFixed(1)} ml)\n`;
        res_summary += `  - Tốc độ truyền tối đa: ${inf_rate_max.toFixed(1)} ml/giờ | Thời gian truyền tối thiểu: ${k2_time_opt.toFixed(1)} giờ\n`;

        // Chi tiết các bước tính & kiểm tra 2 tham số
        res_details += `\n* TỐI ƯU BÙ KALI CẤP (Thường quy: Nồng độ ≤ 40 mEq/L | Tốc độ ≤ 0.3 mEq/kg/giờ):\n`;
        res_details += `Lượng K+ truyền tối đa/giờ = 0.3 * ${w} = ${k_meq_per_hr_max.toFixed(2)} mEq/giờ.\n`;
        res_details += `Tốc độ truyền dịch tối đa ở nồng độ 40 mEq/L = (${k_meq_per_hr_max.toFixed(2)} / 40) * 1000 = ${inf_rate_max.toFixed(1)} ml/giờ.\n`;

        res_details += `\n1) TH1 - Không tính K nhu cầu/ngày (Q = ${k_deficit.toFixed(2)} mEq -> KCl 10%: ${k1_kcl.toFixed(1)} ml):\n`;
        res_details += `  - Thể tích dịch tối thiểu (ở 40 mEq/L) = (${k_deficit.toFixed(2)} / 40) * 1000 = ${k1_vol_opt.toFixed(1)} ml.\n`;
        res_details += `  - Thời gian truyền tối thiểu (ở 0.3 mEq/kg/giờ) = ${k_deficit.toFixed(2)} / ${k_meq_per_hr_max.toFixed(2)} = ${k1_time_opt.toFixed(1)} giờ.\n`;
        res_details += `  - Kiểm tra 2 tham số thực tế:\n`;
        res_details += `    + Nồng độ K+ trong dịch = ${k_deficit.toFixed(2)} / (${k1_vol_opt.toFixed(1)}/1000) = ${k1_check_conc.toFixed(1)} mEq/L [Giới hạn: ≤ 40 mEq/L].\n`;
        res_details += `    + Tốc độ truyền K+ = (${inf_rate_max.toFixed(1)} * ${k1_check_conc.toFixed(1)} / 1000) / ${w} = ${k1_check_rate.toFixed(2)} mEq/kg/giờ [Giới hạn: ≤ 0.3 mEq/kg/giờ].\n`;

        res_details += `\n2) TH2 - Có tính K nhu cầu/ngày (Q = ${k_total.toFixed(2)} mEq -> KCl 10%: ${k2_kcl.toFixed(1)} ml):\n`;
        res_details += `  - Thể tích dịch tối thiểu (ở 40 mEq/L) = (${k_total.toFixed(2)} / 40) * 1000 = ${k2_vol_opt.toFixed(1)} ml.\n`;
        res_details += `  - Thời gian truyền tối thiểu (ở 0.3 mEq/kg/giờ) = ${k_total.toFixed(2)} / ${k_meq_per_hr_max.toFixed(2)} = ${k2_time_opt.toFixed(1)} giờ.\n`;
        res_details += `  - Kiểm tra 2 tham số thực tế:\n`;
        res_details += `    + Nồng độ K+ trong dịch = ${k_total.toFixed(2)} / (${k2_vol_opt.toFixed(1)}/1000) = ${k2_check_conc.toFixed(1)} mEq/L [Giới hạn: ≤ 40 mEq/L].\n`;
        res_details += `    + Tốc độ truyền K+ = (${inf_rate_max.toFixed(1)} * ${k2_check_conc.toFixed(1)} / 1000) / ${w} = ${k2_check_rate.toFixed(2)} mEq/kg/giờ [Giới hạn: ≤ 0.3 mEq/kg/giờ].\n`;
        res_details += `(Lưu ý: Ngưỡng 40-80 mEq/L và 0.3-0.5 mEq/kg/giờ chỉ áp dụng khi có liệt cơ hô hấp hoặc rối loạn nhịp tim).\n`;

        acuteKHtml = `
          <div class="result-box autumn" style="margin-bottom:12px;">
            <div class="elec-section-title autumn">Tối ưu bù Kali cấp (≤ 40 mEq/L | ≤ 0.3 mEq/kg/giờ)</div>
            <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px; line-height:1.45;">
              Chỉ nâng lên 40–80 mEq/L &amp; 0.3–0.5 mEq/kg/giờ khi có liệt cơ hô hấp, rối loạn nhịp tim.
            </div>
            <ul class="elec-list">
              <li>
                <div style="font-weight:700; color:var(--autumn-maple); margin-bottom:3px;">
                  TH1 — Không tính K nhu cầu/ngày (Chỉ bù thiếu: ${k_deficit.toFixed(2)} mEq)
                </div>
                <div>• <strong>KCl 10%: ${k1_kcl.toFixed(1)} ml</strong> + NaCl 0.9%/Glucose 5% vừa đủ <strong>${k1_vol_opt.toFixed(1)} ml</strong> <span style="color:var(--text-muted);">(dịch nền ~${k1_diluent_opt.toFixed(1)} ml)</span></div>
                <div>• Tốc độ tối đa: <strong>${inf_rate_max.toFixed(1)} ml/giờ</strong> · Thời gian tối thiểu: <strong>${k1_time_opt.toFixed(1)} giờ</strong></div>
              </li>
              <li>
                <div style="font-weight:700; color:var(--river-deep); margin-bottom:3px;">
                  TH2 — Có tính K nhu cầu/ngày (Tổng bù + nhu cầu: ${k_total.toFixed(2)} mEq)
                </div>
                <div>• <strong>KCl 10%: ${k2_kcl.toFixed(1)} ml</strong> + NaCl 0.9%/Glucose 5% vừa đủ <strong>${k2_vol_opt.toFixed(1)} ml</strong> <span style="color:var(--text-muted);">(dịch nền ~${k2_diluent_opt.toFixed(1)} ml)</span></div>
                <div>• Tốc độ tối đa: <strong>${inf_rate_max.toFixed(1)} ml/giờ</strong> · Thời gian tối thiểu: <strong>${k2_time_opt.toFixed(1)} giờ</strong></div>
              </li>
            </ul>
          </div>
        `;
      } else {
        res_details += `\n* TỐI ƯU BÙ KALI CẤP: K máu ≥ 3.5 mEq/L, không có chỉ định bù Kali cấp.\n`;
      }

      // 8. Phương án tham khảo chai chuẩn NaCl 0.9%
      let ref_fluid = 500;
      if ((k_total / (ref_fluid / 1000)) > MAX_K_CONC) ref_fluid = 1000;
      if ((k_total / (ref_fluid / 1000)) > MAX_K_CONC) ref_fluid = 1500;

      const ref_rate = ref_fluid / 24;
      const ref_k_conc = k_total / (ref_fluid / 1000);
      const ref_k_rate = (k_total / 24) / w;
      const ref_conc_is_ok = ref_k_conc <= MAX_K_CONC;
      const ref_rate_is_ok = ref_k_rate <= MAX_K_RATE;
      const ref_conc_ok = ref_conc_is_ok ? 'Đạt' : `VƯỢT NGƯỠNG (Tối đa ${MAX_K_CONC} mEq/L)`;
      const ref_rate_ok = ref_rate_is_ok ? 'Đạt' : `VƯỢT NGƯỠNG (Tối đa ${MAX_K_RATE} mEq/kg/giờ)`;

      const na_from_ref = ref_fluid * 0.15;
      const na_rem_ref = na_total - na_from_ref;
      const nacl_vol_ref = na_rem_ref > 0 ? (na_rem_ref / 1.7) : 0;

      res_details += `\n* KIỂM TRA 2 THAM SỐ K+ CHAI CHUẨN (${ref_fluid} ml / 24h):\n`;
      res_details += `  + Nồng độ K+ trong dịch truyền = ${k_total.toFixed(2)} / (${ref_fluid}/1000) = ${ref_k_conc.toFixed(1)} mEq/L [${ref_conc_ok}].\n`;
      res_details += `  + Tốc độ truyền K+ = (${k_total.toFixed(2)} / 24) / ${w} = ${ref_k_rate.toFixed(3)} mEq/kg/giờ [${ref_rate_ok}].\n`;

      res_summary += `\n[PHƯƠNG ÁN THAM KHẢO DÙNG CHAI CHUẨN NaCl 0.9%]\n`;
      res_summary += `Sử dụng thể tích cơ sở: ${ref_fluid} ml NaCl 0.9%\n`;
      res_summary += `Tốc độ truyền tối ưu (24h): ${ref_rate.toFixed(1)} ml/giờ\n`;
      res_summary += `Nồng độ K+ đạt: ${ref_k_conc.toFixed(1)} mEq/L (Tối đa 40 mEq/L) | Tốc độ K+: ${ref_k_rate.toFixed(3)} mEq/kg/giờ (Tối đa 0.3)\n`;
      res_summary += `Pha thêm vào chai ${ref_fluid} ml:\n`;
      res_summary += `1. KCl 10%: ${kcl_vol} ml\n`;

      const refItems = [];
      refItems.push(`<strong>1. KCl 10%:</strong> ${kcl_vol} ml`);
      if (na_rem_ref > 0) {
        res_summary += `2. NaCl 10%: ${nacl_vol_ref.toFixed(1)} ml\n`;
        refItems.push(`<strong>2. NaCl 10%:</strong> ${nacl_vol_ref.toFixed(1)} ml`);
      } else {
        res_summary += `2. NaCl 10%: 0 ml (Lượng Na từ ${ref_fluid}ml dịch hòa đã vượt nhu cầu)\n`;
        refItems.push(`<strong>2. NaCl 10%:</strong> 0 ml <span style="color:var(--text-muted);">(Na từ ${ref_fluid}ml dịch hòa đã vượt nhu cầu)</span>`);
      }
      res_summary += `3. CaCl2 10%: ${cacl2_vol.toFixed(1)} ml HOẶC Calci gluconate 10%: ${cagluc_vol.toFixed(1)} ml\n`;
      refItems.push(`<strong>3. CaCl2 10%:</strong> ${cacl2_vol.toFixed(1)} ml <strong>HOẶC</strong> Calci gluconate 10%: ${cagluc_vol.toFixed(1)} ml`);

      let hco3_idx = 4;
      if (hasLowHco3) {
        res_summary += `${hco3_idx}. NaHCO3 8.4%: ${nahco3_vol.toFixed(1)} ml\n`;
        refItems.push(`<strong>${hco3_idx}. NaHCO3 8.4%:</strong> ${nahco3_vol.toFixed(1)} ml`);
        hco3_idx++;
      }
      res_summary += `${hco3_idx}. MgSO4 15%: ${mgso4_vol.toFixed(1)} ml\n`;
      refItems.push(`<strong>${hco3_idx}. MgSO4 15%:</strong> ${mgso4_vol.toFixed(1)} ml`);

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
              <span class="m-val">${rate.toFixed(1)} ml/h</span>
            </div>
          </div>
          <div style="font-size:12.5px; color:var(--text-muted); margin-bottom:12px;">
            <strong>Xét nghiệm:</strong> ${labs.join(' · ')}
          </div>

          <div class="result-box autumn" style="margin-bottom:12px;">
            <div class="elec-section-title autumn">Kết quả tóm tắt</div>
            <ul class="elec-list">${summaryItems.map(item => `<li>${item}</li>`).join('')}</ul>
          </div>

          ${acuteKHtml}

          <div class="result-box river">
            <div class="elec-section-title">Phương án chai chuẩn NaCl 0.9% (${ref_fluid} ml)</div>
            <div style="font-size:12.5px; margin-bottom:8px; line-height:1.6;">
              <div>Tốc độ (24h): <strong>${ref_rate.toFixed(1)} ml/giờ</strong></div>
              <div style="display:flex; flex-wrap:wrap; gap:6px; align-items:center; margin-top:2px;">
                <span>Nồng độ K+: <strong>${ref_k_conc.toFixed(1)}</strong> mEq/L ${statusTag(ref_conc_is_ok, '≤40', 'Vượt >40')}</span>
                <span>· Tốc độ K+: <strong>${ref_k_rate.toFixed(3)}</strong> mEq/kg/h ${statusTag(ref_rate_is_ok, '≤0.3', 'Vượt >0.3')}</span>
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
