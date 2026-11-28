// =========================================================================
// CÔNG CỤ: DANH SÁCH CÔNG VIỆC (ĐỒNG BỘ GITHUB VỚI TAMPERMONKEY EDGE)
// Tinh gọn cho điện thoại: Không có Popup Nhắc việc / âm báo / đếm ngược
// =========================================================================

const GH_REPO = {
  owner: 'phanthieuhuan175-coder',
  repo: 'WEB-APP',
  branch: 'main',
  filePath: 'data/sticky-notes.json'
};

const STORAGE_NOTES_KEY = 'PWA_STICKY_NOTES_V2';
const STORAGE_DELETED_KEY = 'PWA_STICKY_DELETED_V2';
const STORAGE_TOKEN_KEY = 'PWA_GITHUB_PAT_V1';
const DELETED_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const LEVELS = {
  red: { id: 'red', label: 'Tối cấp', short: 'Đỏ', intervalMs: 90 * 1000, color: '#ef4444', soft: '#fef2f2' },
  yellow: { id: 'yellow', label: 'Gấp', short: 'Vàng', intervalMs: 180 * 1000, color: '#eab308', soft: '#fefce8' },
  green: { id: 'green', label: 'Không gấp', short: 'Xanh lá', intervalMs: 600 * 1000, color: '#22c55e', soft: '#f0fdf4' },
  blue: { id: 'blue', label: 'Vô hạn', short: 'Xanh dương', intervalMs: 10800 * 1000, color: '#2563EB', soft: '#EFF6FF' }
};

const LEVEL_ORDER = ['green', 'yellow', 'red', 'blue'];

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToUtf8(b64) {
  const binary = atob((b64 || '').replace(/\s/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
}

function pruneDeleted(map) {
  const cutoff = Date.now() - DELETED_TTL_MS;
  const out = {};
  for (const [id, ts] of Object.entries(map || {})) {
    if (typeof ts === 'number' && ts >= cutoff) out[id] = ts;
  }
  return out;
}

function injectScopedStyles() {
  if (document.getElementById('nv-scoped-styles')) return;
  const style = document.createElement('style');
  style.id = 'nv-scoped-styles';
  style.textContent = `
    .nv-sync-row {
      display: flex; align-items: center; justify-content: space-between;
      gap: 8px; flex-wrap: wrap;
    }
    .nv-status-pill {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 12.5px; font-weight: 700; color: var(--river-deep);
      background: var(--river-soft); border: 1px solid var(--river-border);
      padding: 5px 10px; border-radius: 999px;
    }
    .nv-status-pill[data-state="error"] {
      background: var(--danger-bg); color: var(--danger-text); border-color: var(--danger-border);
    }
    .nv-status-pill[data-state="ok"] {
      background: var(--success-bg); color: var(--success-text); border-color: var(--success-border);
    }
    .nv-sync-actions { display: flex; gap: 6px; }
    .nv-token-box {
      margin-top: 12px; padding-top: 12px;
      border-top: 1px dashed var(--border-soft);
      display: none;
    }
    .nv-token-box.open { display: block; }
    .nv-level-row {
      display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 6px; margin-top: 2px;
    }
    .nv-level-btn {
      border: 1.5px solid var(--border-soft);
      background: #FFFFFF; border-radius: 10px;
      padding: 8px 4px; font-size: 12px; font-weight: 700;
      color: var(--text-main); cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 5px;
      transition: all 0.14s ease;
    }
    .nv-level-dot {
      width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
    }
    .nv-level-btn.active {
      border-color: var(--lvl-color);
      background: var(--lvl-soft);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--lvl-color) 22%, transparent);
    }
    .nv-filter-tabs {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;
      margin-bottom: 12px;
    }
    .nv-filter-btn {
      border: 1px solid var(--border-soft); background: var(--bg-page);
      color: var(--text-muted); border-radius: 10px;
      padding: 8px 6px; font-size: 12.5px; font-weight: 700; cursor: pointer;
    }
    .nv-filter-btn.active {
      background: var(--river-deep); color: #FFFDF9; border-color: var(--river-deep);
    }
    .nv-list { display: flex; flex-direction: column; gap: 9px; }
    .nv-item {
      background: #FFFFFF;
      border: 1px solid var(--border-soft);
      border-left: 5px solid var(--item-color, #eab308);
      border-radius: 12px;
      padding: 11px 12px;
      display: flex; flex-direction: column; gap: 8px;
    }
    .nv-item.done { opacity: 0.62; background: #FAF7F2; }
    .nv-item-top {
      display: flex; align-items: flex-start; gap: 10px;
    }
    .nv-checkbox {
      width: 20px; height: 20px; margin-top: 2px;
      accent-color: var(--river-deep); cursor: pointer; flex-shrink: 0;
    }
    .nv-item-main { flex: 1; min-width: 0; }
    .nv-item-patient {
      font-size: 12px; font-weight: 700; color: var(--river-main);
      margin-bottom: 3px; word-break: break-word;
    }
    .nv-item-text {
      font-size: 14.5px; font-weight: 600; color: var(--text-main);
      line-height: 1.45; word-break: break-word;
    }
    .nv-item.done .nv-item-text { text-decoration: line-through; color: var(--text-muted); }
    .nv-item-foot {
      display: flex; align-items: center; justify-content: space-between;
      gap: 8px; padding-top: 6px; border-top: 1px dashed var(--border-soft);
      flex-wrap: wrap;
    }
    .nv-meta {
      display: flex; align-items: center; gap: 6px;
      font-size: 11.5px; color: var(--text-muted);
    }
    .nv-lvl-tag {
      font-size: 11px; font-weight: 700; padding: 2px 7px;
      border-radius: 999px; color: #FFFFFF;
    }
    .nv-item-btns { display: flex; gap: 6px; }
    .nv-btn-del {
      border: 1px solid var(--danger-border); background: var(--danger-bg);
      color: var(--danger-text); padding: 4px 9px; font-size: 12px;
      font-weight: 700; border-radius: 8px; cursor: pointer;
    }
  `;
  document.head.appendChild(style);
}

export default {
  id: 'nhac-viec',
  name: 'Công việc',
  title: 'Danh Sách Công Việc',
  subtitle: 'Đồng bộ hai chiều với HIS Edge qua GitHub',
  accent: 'river',
  icon: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 11l3 3L22 4"></path>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
    </svg>
  `,

  render(container, { showToast }) {
    injectScopedStyles();

    let notes = [];
    let deletedIds = {};
    let remoteSha = null;
    let isSyncing = false;
    let pendingPush = false;
    let selectedLevel = 'yellow';
    let filterMode = 'active'; // active | done | all
    let editingId = null;

    function loadLocal() {
      try {
        notes = JSON.parse(localStorage.getItem(STORAGE_NOTES_KEY) || '[]');
      } catch (_) {
        notes = [];
      }
      try {
        deletedIds = pruneDeleted(JSON.parse(localStorage.getItem(STORAGE_DELETED_KEY) || '{}'));
      } catch (_) {
        deletedIds = {};
      }
    }

    function saveLocal() {
      try {
        localStorage.setItem(STORAGE_NOTES_KEY, JSON.stringify(notes));
        localStorage.setItem(STORAGE_DELETED_KEY, JSON.stringify(pruneDeleted(deletedIds)));
      } catch (_) {}
    }

    function getToken() {
      try {
        return (localStorage.getItem(STORAGE_TOKEN_KEY) || '').trim();
      } catch (_) {
        return '';
      }
    }

    function setToken(val) {
      try {
        localStorage.setItem(STORAGE_TOKEN_KEY, (val || '').trim());
      } catch (_) {}
    }

    container.innerHTML = `
      <div class="card">
        <div class="nv-sync-row">
          <div id="nv-status-pill" class="nv-status-pill" data-state="idle">☁️ Chưa đồng bộ</div>
          <div class="nv-sync-actions">
            <button type="button" id="nv-btn-sync" class="btn-mini">↻ Đồng bộ</button>
            <button type="button" id="nv-btn-token-toggle" class="btn-mini autumn">⚙ Token</button>
          </div>
        </div>
        <div id="nv-token-box" class="nv-token-box">
          <div class="field">
            <label for="nv-token-input">
              <span>GitHub PAT (lưu trên máy này)</span>
              <span>${GH_REPO.owner}/${GH_REPO.repo}</span>
            </label>
            <input id="nv-token-input" type="password" placeholder="Dán mã github_pat_... vào đây" autocomplete="off" />
          </div>
          <div class="btn-row">
            <button type="button" id="nv-btn-save-token" class="btn btn-river">Lưu Token & Đồng bộ</button>
          </div>
        </div>
      </div>

      <div class="card">
        <h2 class="card-title">
          <span id="nv-form-heading">Thêm công việc mới</span>
          <span id="nv-editing-badge" class="card-title-badge" style="display:none;">Đang sửa</span>
        </h2>
        <div class="form-grid one-col">
          <div class="field warm-focus">
            <label for="nv-input-text">Nội dung công việc</label>
            <input id="nv-input-text" type="text" placeholder="VD: Xem lại điện giải đồ giường 12..." />
          </div>
          <div class="field">
            <label for="nv-input-patient">Bệnh nhân / Ghi chú phụ (không bắt buộc)</label>
            <input id="nv-input-patient" type="text" placeholder="VD: Nguyễn Văn A (BN12345)" />
          </div>
          <div class="field">
            <label>Mức độ ưu tiên (đồng bộ màu với Edge)</label>
            <div id="nv-level-row" class="nv-level-row"></div>
          </div>
        </div>
        <div class="btn-row">
          <button type="button" id="nv-btn-submit" class="btn btn-primary">+ Thêm việc</button>
          <button type="button" id="nv-btn-cancel-edit" class="btn btn-ghost" style="display:none;">Hủy</button>
        </div>
      </div>

      <div class="card">
        <div class="card-title">
          <span>Danh sách</span>
          <button type="button" id="nv-btn-clear-done" class="btn-mini autumn" style="display:none;">Dọn việc đã xong</button>
        </div>
        <div class="nv-filter-tabs">
          <button type="button" class="nv-filter-btn active" data-filter="active">Chưa xong (<span id="nv-cnt-active">0</span>)</button>
          <button type="button" class="nv-filter-btn" data-filter="done">Đã xong (<span id="nv-cnt-done">0</span>)</button>
          <button type="button" class="nv-filter-btn" data-filter="all">Tất cả (<span id="nv-cnt-all">0</span>)</button>
        </div>
        <div id="nv-list" class="nv-list"></div>
      </div>
    `;

    const statusPill = container.querySelector('#nv-status-pill');
    const syncBtn = container.querySelector('#nv-btn-sync');
    const tokenToggleBtn = container.querySelector('#nv-btn-token-toggle');
    const tokenBox = container.querySelector('#nv-token-box');
    const tokenInput = container.querySelector('#nv-token-input');
    const saveTokenBtn = container.querySelector('#nv-btn-save-token');

    const formHeading = container.querySelector('#nv-form-heading');
    const editingBadge = container.querySelector('#nv-editing-badge');
    const textInput = container.querySelector('#nv-input-text');
    const patientInput = container.querySelector('#nv-input-patient');
    const levelRow = container.querySelector('#nv-level-row');
    const submitBtn = container.querySelector('#nv-btn-submit');
    const cancelEditBtn = container.querySelector('#nv-btn-cancel-edit');

    const clearDoneBtn = container.querySelector('#nv-btn-clear-done');
    const filterBtns = container.querySelectorAll('.nv-filter-btn');
    const cntActiveEl = container.querySelector('#nv-cnt-active');
    const cntDoneEl = container.querySelector('#nv-cnt-done');
    const cntAllEl = container.querySelector('#nv-cnt-all');
    const listEl = container.querySelector('#nv-list');

    function setStatus(state, text) {
      statusPill.dataset.state = state;
      statusPill.textContent = text;
    }

    function renderLevelButtons() {
      levelRow.innerHTML = '';
      for (const key of LEVEL_ORDER) {
        const cfg = LEVELS[key];
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `nv-level-btn ${selectedLevel === key ? 'active' : ''}`;
        btn.style.setProperty('--lvl-color', cfg.color);
        btn.style.setProperty('--lvl-soft', cfg.soft);
        btn.innerHTML = `<span class="nv-level-dot" style="background:${cfg.color}"></span><span>${cfg.label}</span>`;
        btn.addEventListener('click', () => {
          selectedLevel = key;
          renderLevelButtons();
        });
        levelRow.appendChild(btn);
      }
    }

    function resetForm() {
      editingId = null;
      textInput.value = '';
      patientInput.value = '';
      formHeading.textContent = 'Thêm công việc mới';
      editingBadge.style.display = 'none';
      submitBtn.textContent = '+ Thêm việc';
      cancelEditBtn.style.display = 'none';
    }

    function startEdit(note) {
      editingId = note.id;
      textInput.value = note.text || '';
      patientInput.value = note.patient || '';
      selectedLevel = LEVELS[note.level] ? note.level : 'yellow';
      renderLevelButtons();
      formHeading.textContent = 'Chỉnh sửa công việc';
      editingBadge.style.display = 'inline-block';
      submitBtn.textContent = 'Lưu thay đổi';
      cancelEditBtn.style.display = 'inline-flex';
      textInput.focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function mergePayload(remotePayload) {
      const remoteNotes = Array.isArray(remotePayload?.notes) ? remotePayload.notes : [];
      const remoteDeleted = remotePayload?.deletedIds || {};

      const mergedDeleted = pruneDeleted({ ...deletedIds });
      for (const [id, ts] of Object.entries(remoteDeleted)) {
        if (!mergedDeleted[id] || ts > mergedDeleted[id]) {
          mergedDeleted[id] = ts;
        }
      }

      const localMap = new Map(notes.map(n => [n.id, n]));
      const remoteMap = new Map(remoteNotes.map(n => [n.id, n]));
      const allIds = new Set([...localMap.keys(), ...remoteMap.keys()]);
      const mergedNotes = [];

      for (const id of allIds) {
        const loc = localMap.get(id);
        const rem = remoteMap.get(id);
        const locUpd = loc ? (loc.updatedAt || loc.createdAt || 0) : -1;
        const remUpd = rem ? (rem.updatedAt || rem.createdAt || 0) : -1;
        const maxUpd = Math.max(locUpd, remUpd);

        if (mergedDeleted[id] && mergedDeleted[id] >= maxUpd) continue;

        const winner = (remUpd > locUpd ? rem : loc) || rem || loc;
        const cfg = LEVELS[winner.level] || LEVELS.yellow;
        mergedNotes.push({
          id: winner.id,
          text: winner.text || '',
          patient: winner.patient || '',
          level: cfg.id,
          intervalMs: winner.intervalMs || cfg.intervalMs,
          createdAt: winner.createdAt || Date.now(),
          updatedAt: winner.updatedAt || winner.createdAt || Date.now(),
          completed: !!winner.completed,
          pinned: typeof winner.pinned === 'boolean' ? winner.pinned : true
        });
      }

      mergedNotes.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      const sig = (list, del) => JSON.stringify({
        n: list.map(i => [i.id, i.text, i.patient, i.level, i.completed, i.pinned, i.updatedAt]),
        d: Object.entries(del).sort()
      });

      const changedRemote = sig(remoteNotes, pruneDeleted(remoteDeleted)) !== sig(mergedNotes, mergedDeleted);
      notes = mergedNotes;
      deletedIds = mergedDeleted;
      return { changedRemote };
    }

    async function fetchRemote(token) {
      const url = `https://api.github.com/repos/${GH_REPO.owner}/${GH_REPO.repo}/contents/${GH_REPO.filePath}?ref=${encodeURIComponent(GH_REPO.branch)}&_t=${Date.now()}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });

      if (res.status === 404) {
        return { sha: null, payload: { version: 2, updatedAt: 0, notes: [], deletedIds: {} } };
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.content) {
        throw new Error(data.message || `HTTP ${res.status}`);
      }
      return { sha: data.sha, payload: JSON.parse(base64ToUtf8(data.content)) };
    }

    async function putRemote(token, sha) {
      const url = `https://api.github.com/repos/${GH_REPO.owner}/${GH_REPO.repo}/contents/${GH_REPO.filePath}`;
      const payload = {
        version: 2,
        updatedAt: Date.now(),
        notes,
        deletedIds: pruneDeleted(deletedIds)
      };
      const body = {
        message: `sync(mobile): ${notes.filter(n => !n.completed).length} active notes`,
        content: utf8ToBase64(JSON.stringify(payload, null, 2)),
        branch: GH_REPO.branch
      };
      if (sha) body.sha = sha;

      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      return { status: res.status, ok: res.ok, data };
    }

    async function syncGitHub(pushIfNeeded = false, silent = false, attempt = 1) {
      const token = getToken();
      if (!token) {
        setStatus('error', '⚠️ Chưa nhập GitHub Token');
        tokenBox.classList.add('open');
        if (!silent) showToast('Vui lòng dán GitHub PAT để đồng bộ');
        return;
      }
      if (!navigator.onLine) {
        setStatus('idle', '📵 Đang offline (lưu trên máy)');
        if (pushIfNeeded) pendingPush = true;
        return;
      }
      if (isSyncing) {
        if (pushIfNeeded) pendingPush = true;
        return;
      }

      isSyncing = true;
      setStatus('idle', '🔄 Đang đồng bộ...');

      try {
        const remote = await fetchRemote(token);
        remoteSha = remote.sha;
        const { changedRemote } = mergePayload(remote.payload);
        saveLocal();
        renderList();

        if (pushIfNeeded || changedRemote || !remoteSha) {
          const putRes = await putRemote(token, remoteSha);
          if (putRes.ok) {
            remoteSha = putRes.data?.content?.sha || remoteSha;
          } else if ((putRes.status === 409 || putRes.status === 422) && attempt < 3) {
            isSyncing = false;
            return syncGitHub(true, silent, attempt + 1);
          } else {
            throw new Error(putRes.data?.message || `HTTP ${putRes.status}`);
          }
        }

        const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        setStatus('ok', `✓ Đã đồng bộ ${timeStr}`);
        if (!silent) showToast('Đồng bộ GitHub thành công ✓');
      } catch (err) {
        console.error('PWA GitHub Sync Error:', err);
        setStatus('error', '✕ Lỗi đồng bộ GitHub');
        if (!silent) showToast(`Lỗi đồng bộ: ${err.message}`);
      } finally {
        isSyncing = false;
        if (pendingPush) {
          pendingPush = false;
          syncGitHub(true, true);
        }
      }
    }

    function renderList() {
      const activeCount = notes.filter(n => !n.completed).length;
      const doneCount = notes.filter(n => n.completed).length;
      cntActiveEl.textContent = activeCount;
      cntDoneEl.textContent = doneCount;
      cntAllEl.textContent = notes.length;
      clearDoneBtn.style.display = doneCount > 0 ? 'inline-block' : 'none';

      const visible = notes.filter(n => {
        if (filterMode === 'active') return !n.completed;
        if (filterMode === 'done') return n.completed;
        return true;
      });

      if (visible.length === 0) {
        listEl.innerHTML = `<div class="placeholder-text">Không có công việc nào trong mục này.</div>`;
        return;
      }

      listEl.innerHTML = '';
      for (const note of visible) {
        const cfg = LEVELS[note.level] || LEVELS.yellow;
        const item = document.createElement('div');
        item.className = `nv-item ${note.completed ? 'done' : ''}`;
        item.style.setProperty('--item-color', cfg.color);

        const timeStr = new Date(note.updatedAt || note.createdAt || Date.now())
          .toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

        item.innerHTML = `
          <div class="nv-item-top">
            <input type="checkbox" class="nv-checkbox" ${note.completed ? 'checked' : ''} aria-label="Đánh dấu hoàn thành" />
            <div class="nv-item-main">
              ${note.patient ? `<div class="nv-item-patient">👤 ${escapeHtml(note.patient)}</div>` : ''}
              <div class="nv-item-text">${escapeHtml(note.text)}</div>
            </div>
          </div>
          <div class="nv-item-foot">
            <div class="nv-meta">
              <span class="nv-lvl-tag" style="background:${cfg.color}">${cfg.label}</span>
              <span>${timeStr}</span>
            </div>
            <div class="nv-item-btns">
              <button type="button" class="btn-mini nv-edit-btn">Sửa</button>
              <button type="button" class="nv-btn-del nv-del-btn">Xóa</button>
            </div>
          </div>
        `;

        item.querySelector('.nv-checkbox').addEventListener('change', () => {
          note.completed = !note.completed;
          note.updatedAt = Date.now();
          saveLocal();
          renderList();
          syncGitHub(true, true);
        });

        item.querySelector('.nv-edit-btn').addEventListener('click', () => startEdit(note));

        item.querySelector('.nv-del-btn').addEventListener('click', () => {
          if (editingId === note.id) resetForm();
          notes = notes.filter(n => n.id !== note.id);
          deletedIds[note.id] = Date.now();
          saveLocal();
          renderList();
          syncGitHub(true, true);
        });

        listEl.appendChild(item);
      }
    }

    // Sự kiện form
    submitBtn.addEventListener('click', () => {
      const text = textInput.value.trim();
      const patient = patientInput.value.trim();
      if (!text) {
        showToast('Vui lòng nhập nội dung công việc');
        textInput.focus();
        return;
      }
      const cfg = LEVELS[selectedLevel] || LEVELS.yellow;
      const now = Date.now();

      if (editingId) {
        const target = notes.find(n => n.id === editingId);
        if (target) {
          target.text = text;
          target.patient = patient;
          target.level = cfg.id;
          target.intervalMs = cfg.intervalMs;
          target.updatedAt = now;
        }
        resetForm();
        showToast('Đã cập nhật công việc ✓');
      } else {
        notes.unshift({
          id: 'sn_' + now + '_' + Math.random().toString(36).slice(2, 7),
          text,
          patient,
          level: cfg.id,
          intervalMs: cfg.intervalMs,
          createdAt: now,
          updatedAt: now,
          completed: false,
          pinned: true
        });
        textInput.value = '';
        patientInput.value = '';
        showToast('Đã thêm công việc ✓');
      }

      saveLocal();
      renderList();
      syncGitHub(true, true);
    });

    cancelEditBtn.addEventListener('click', resetForm);

    clearDoneBtn.addEventListener('click', () => {
      const now = Date.now();
      notes.filter(n => n.completed).forEach(n => { deletedIds[n.id] = now; });
      notes = notes.filter(n => !n.completed);
      saveLocal();
      renderList();
      showToast('Đã dọn việc hoàn thành');
      syncGitHub(true, true);
    });

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterMode = btn.dataset.filter;
        filterBtns.forEach(b => b.classList.toggle('active', b === btn));
        renderList();
      });
    });

    // Sự kiện đồng bộ & Token
    syncBtn.addEventListener('click', () => syncGitHub(true, false));

    tokenToggleBtn.addEventListener('click', () => {
      tokenBox.classList.toggle('open');
      if (tokenBox.classList.contains('open')) {
        tokenInput.value = getToken();
      }
    });

    saveTokenBtn.addEventListener('click', () => {
      const val = tokenInput.value.trim();
      if (!val) {
        showToast('Token đang trống');
        return;
      }
      setToken(val);
      tokenBox.classList.remove('open');
      syncGitHub(true, false);
    });

    // Tự đồng bộ lại khi mở lại app trên điện thoại hoặc vừa có mạng lại
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && getToken()) {
        syncGitHub(false, true);
      }
    });
    window.addEventListener('online', () => {
      if (getToken()) syncGitHub(pendingPush, true);
    });

    // Khởi tạo ban đầu
    loadLocal();
    renderLevelButtons();
    renderList();

    if (getToken()) {
      syncGitHub(false, true);
    } else {
      setStatus('error', '⚠️ Nhấn ⚙ Token để kết nối');
      tokenBox.classList.add('open');
    }
  }
};