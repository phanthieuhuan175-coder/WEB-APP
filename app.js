import { TOOLS } from './tools/registry.js';

const stageEl = document.getElementById('tool-stage');
const navEl = document.getElementById('bottom-nav');
const headerTitle = document.getElementById('header-title');
const headerSubtitle = document.getElementById('header-subtitle');
const refreshBtn = document.getElementById('btn-refresh');
const toastEl = document.getElementById('toast');

let toastTimer = null;
function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove('show');
  }, 2000);
}

async function copyText(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    showToast('Đã copy vào bộ nhớ tạm ✓');
    return true;
  } catch (err) {
    showToast('Không thể copy tự động');
    return false;
  }
}

const panels = new Map();
const navButtons = new Map();

function activateTool(toolId) {
  const tool = TOOLS.find(t => t.id === toolId) || TOOLS[0];
  if (!tool) return;

  panels.forEach((panel, id) => {
    panel.classList.toggle('active', id === tool.id);
  });

  navButtons.forEach((btn, id) => {
    btn.classList.toggle('active', id === tool.id);
  });

  headerTitle.textContent = tool.title || tool.name;
  headerSubtitle.textContent = tool.subtitle || '';

  try {
    localStorage.setItem('active_tool_id', tool.id);
  } catch (_) {}

  window.scrollTo({ top: 0, behavior: 'instant' });
}

function initApp() {
  const helpers = { copyText, showToast };

  TOOLS.forEach(tool => {
    // 1. Khởi tạo panel riêng cho từng mục (giữ nguyên dữ liệu đã nhập khi chuyển tab)
    const panel = document.createElement('section');
    panel.className = 'tool-panel';
    panel.id = `panel-${tool.id}`;
    stageEl.appendChild(panel);
    tool.render(panel, helpers);
    panels.set(tool.id, panel);

    // 2. Tạo nút trên thanh điều hướng dưới cùng
    const navBtn = document.createElement('button');
    navBtn.type = 'button';
    navBtn.className = 'nav-item';
    navBtn.dataset.accent = tool.accent || 'autumn';
    navBtn.innerHTML = `${tool.icon || ''}<span>${tool.name}</span>`;
    navBtn.addEventListener('click', () => activateTool(tool.id));
    navEl.appendChild(navBtn);
    navButtons.set(tool.id, navBtn);
  });

  // Khôi phục mục mở gần nhất
  let savedId = null;
  try {
    savedId = localStorage.getItem('active_tool_id');
  } catch (_) {}
  activateTool(savedId || (TOOLS[0] && TOOLS[0].id));
}

// Nút ép tải lại phiên bản code mới nhất (xóa cache cũ)
refreshBtn.addEventListener('click', async () => {
  if (!navigator.onLine) {
    showToast('Đang offline — dùng bản lưu trên máy');
    return;
  }
  refreshBtn.classList.add('spinning');
  showToast('Đang kiểm tra bản cập nhật...');

  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.update()));
    }
  } catch (_) {}

  setTimeout(() => {
    window.location.reload();
  }, 450);
});

// Đăng ký Service Worker hỗ trợ chạy Offline 100%
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

initApp();
