/**
 * popup.js — UI & Controller untuk e-EMR Auto-Sync Extension v1.1
 * Mendukung: Paste manual, Upload file CSV/TSV, dan Drag & Drop.
 */

const DEFAULT_CONFIG = {
  MAPPING: {
    tanggal: '#field-tanggal',
    nama_tindakan: '#field-tindakan',
    waktu: '#field-waktu',
    keterangan: '#field-keterangan',
    status: '#field-status',
  },
  SUBMIT_BUTTON: '#btn-submit',
  DELAY_MS: 1500,
  STOP_ON_ERROR: false,
};

// Data yang sudah diparse (dari paste ATAU file)
let parsedRows = null;

// ======================= Util =======================

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseData(rawText) {
  const trimmed = rawText.trim();
  if (!trimmed) throw new Error('Data kosong.');
  const lines = trimmed.split(/\r?\n/);
  if (lines.length < 2) throw new Error('Butuh header + minimal 1 baris data.');

  const hasTab = lines.some((l) => l.includes('\t'));
  const delimiter = hasTab ? '\t' : ',';

  return lines.map((line) => {
    if (delimiter === ',') {
      const result = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
          else { inQuotes = !inQuotes; }
        } else if (ch === ',' && !inQuotes) {
          result.push(cur.trim()); cur = '';
        } else { cur += ch; }
      }
      result.push(cur.trim());
      return result;
    }
    return line.split('\t').map((s) => s.trim());
  });
}

function logPopup(msg, type) {
  const area = document.getElementById('logArea');
  if (!area) return;
  const div = document.createElement('div');
  div.className = 'line ' + (type || '');
  const t = new Date().toLocaleTimeString('id-ID', { hour12: false });
  div.textContent = `[${t}] ${msg}`;
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
}

function showFileInfo(name, rows, cols) {
  const info = document.getElementById('fileInfo');
  info.style.display = 'block';
  info.innerHTML = `✅ <strong>${name}</strong> — ${rows} baris × ${cols} kolom <span class="remove-file" id="removeFile" title="Hapus file">&times;</span>`;
  document.getElementById('removeFile').addEventListener('click', clearFile);
}

function clearFile() {
  parsedRows = null;
  document.getElementById('fileInfo').style.display = 'none';
  document.getElementById('fileInput').value = '';
  logPopup('📁 File dihapus. Silakan pilih file lain atau paste data.', '');
}

// ======================= Tab Switching =======================

function setupTabs() {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
      document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    });
  });
}

// ======================= File Upload & Drag-Drop =======================

function setupFileUpload() {
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');

  // Klik untuk pilih file
  dropZone.addEventListener('click', () => fileInput.click());

  // File dipilih via input
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFile(e.target.files[0]);
  });

  // Drag-over effect
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  // Drop file
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  });
}

function handleFile(file) {
  const validExtensions = ['.csv', '.tsv', '.txt'];
  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  if (!validExtensions.includes(ext)) {
    logPopup('❌ Format file tidak didukung. Gunakan .csv, .tsv, atau .txt', 'err');
    return;
  }

  logPopup(`📁 Membaca file: ${file.name}...`, 'ok');

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      parsedRows = parseData(e.target.result);
      if (!parsedRows || parsedRows.length < 2) {
        throw new Error('File kosong atau tidak memiliki header + data.');
      }
      const cols = parsedRows[0].length;
      showFileInfo(file.name, parsedRows.length, cols);
      logPopup(`✅ File terbaca: ${parsedRows.length} baris, ${cols} kolom. Header: ${parsedRows[0].join(', ')}`, 'ok');
    } catch (err) {
      logPopup('❌ Gagal membaca file: ' + err.message, 'err');
      parsedRows = null;
    }
  };
  reader.onerror = () => {
    logPopup('❌ Gagal membaca file.', 'err');
  };
  reader.readAsText(file, 'UTF-8');
}

// ======================= Config IO =======================

function uiToConfig() {
  return {
    MAPPING: {
      tanggal: document.getElementById('sel-tanggal').value.trim(),
      nama_tindakan: document.getElementById('sel-nama_tindakan').value.trim(),
      waktu: document.getElementById('sel-waktu').value.trim(),
      keterangan: document.getElementById('sel-keterangan').value.trim(),
      status: document.getElementById('sel-status').value.trim(),
    },
    SUBMIT_BUTTON: document.getElementById('sel-submit').value.trim(),
    DELAY_MS: parseInt(document.getElementById('delayMs').value, 10) || 1500,
    STOP_ON_ERROR: document.getElementById('stopOnError').checked,
  };
}

function configToUI(cfg) {
  document.getElementById('sel-tanggal').value = cfg.MAPPING.tanggal || DEFAULT_CONFIG.MAPPING.tanggal;
  document.getElementById('sel-nama_tindakan').value = cfg.MAPPING.nama_tindakan || DEFAULT_CONFIG.MAPPING.nama_tindakan;
  document.getElementById('sel-waktu').value = cfg.MAPPING.waktu || DEFAULT_CONFIG.MAPPING.waktu;
  document.getElementById('sel-keterangan').value = cfg.MAPPING.keterangan || DEFAULT_CONFIG.MAPPING.keterangan;
  document.getElementById('sel-status').value = cfg.MAPPING.status || DEFAULT_CONFIG.MAPPING.status;
  document.getElementById('sel-submit').value = cfg.SUBMIT_BUTTON || DEFAULT_CONFIG.SUBMIT_BUTTON;
  document.getElementById('delayMs').value = String(cfg.DELAY_MS || DEFAULT_CONFIG.DELAY_MS);
  document.getElementById('stopOnError').checked = !!cfg.STOP_ON_ERROR;
}

async function loadConfig() {
  try {
    const data = await chrome.storage.local.get('emrConfig');
    return data.emrConfig || { ...DEFAULT_CONFIG };
  } catch (e) {
    return { ...DEFAULT_CONFIG };
  }
}

async function saveConfig() {
  const cfg = uiToConfig();
  await chrome.storage.local.set({ emrConfig: cfg });
  logPopup('💾 Config disimpan.', 'ok');
}

// ======================= Sync Trigger =======================

async function startSync() {
  // Ambil data: dari file upload ATAU dari paste
  let rows = null;
  const activeTab = document.querySelector('.tab.active')?.dataset.tab;

  if (activeTab === 'file') {
    rows = parsedRows;
    if (!rows) {
      logPopup('❌ Belum ada file yang diupload. Pilih atau drag file CSV/TSV.', 'err');
      return;
    }
  } else {
    // Tab paste
    const rawPaste = document.getElementById('pasteData').value.trim();
    if (!rawPaste) {
      logPopup('❌ Data paste kosong. Copy data dari Sheet atau pilih tab Upload File.', 'err');
      return;
    }
    try {
      rows = parseData(rawPaste);
    } catch (e) {
      logPopup('❌ ' + e.message, 'err');
      return;
    }
  }

  const dateFilter = document.getElementById('dateFilter').value.trim();
  const config = uiToConfig();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    logPopup('❌ Tidak ada tab aktif.', 'err');
    return;
  }

  logPopup('🚀 Menyiapkan sync...', 'ok');

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js'],
    });

    await chrome.tabs.sendMessage(tab.id, {
      action: 'START_SYNC',
      rows: rows,
      dateFilter: dateFilter,
      config: config,
    });

    logPopup('▶️ Sync dimulai di halaman e-EMR. Lihat panel di halaman untuk progress.', 'ok');
  } catch (err) {
    logPopup('❌ Gagal: ' + err.message, 'err');
    console.error(err);
  }
}

// ======================= Init =======================

document.addEventListener('DOMContentLoaded', async () => {
  const cfg = await loadConfig();
  configToUI(cfg);

  const dateInput = document.getElementById('dateFilter');
  if (dateInput && !dateInput.value) dateInput.value = getTodayStr();

  setupTabs();
  setupFileUpload();

  document.getElementById('btnSave').addEventListener('click', saveConfig);
  document.getElementById('btnSync').addEventListener('click', startSync);
});