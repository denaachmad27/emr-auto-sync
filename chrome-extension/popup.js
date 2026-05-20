/**
 * popup.js — UI & Controller untuk e-EMR Auto-Sync Extension
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

// ----------------------- Util -----------------------

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parsePastedData(rawText) {
  const trimmed = rawText.trim();
  if (!trimmed) throw new Error('Data paste kosong.');
  const lines = trimmed.split(/\r?\n/);
  if (lines.length < 2) throw new Error('Butuh header + minimal 1 baris data.');

  const hasTab = lines.some((l) => l.includes('\t'));
  const delimiter = hasTab ? '\t' : ',';

  const rows = lines.map((line) => {
    if (delimiter === ',') {
      const result = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            cur += '"'; i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === ',' && !inQuotes) {
          result.push(cur.trim()); cur = '';
        } else {
          cur += ch;
        }
      }
      result.push(cur.trim());
      return result;
    }
    return line.split('\t').map((s) => s.trim());
  });
  return rows;
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

// ----------------------- Config IO -----------------------

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

// ----------------------- Sync Trigger -----------------------

async function startSync() {
  const rawPaste = document.getElementById('pasteData').value.trim();
  const dateFilter = document.getElementById('dateFilter').value.trim();

  if (!rawPaste) {
    logPopup('❌ Data paste kosong. Copy data dari Google Sheet terlebih dahulu.', 'err');
    return;
  }

  let rows;
  try {
    rows = parsePastedData(rawPaste);
  } catch (e) {
    logPopup('❌ ' + e.message, 'err');
    return;
  }

  const config = uiToConfig();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    logPopup('❌ Tidak ada tab aktif.', 'err');
    return;
  }

  logPopup('🚀 Menyiapkan sync...', 'ok');

  try {
    // Inject content script ke tab aktif
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js'],
    });

    // Kirim perintah ke content script
    await chrome.tabs.sendMessage(tab.id, {
      action: 'START_SYNC',
      rows: rows,
      dateFilter: dateFilter,
      config: config,
    });

    logPopup('▶️ Sync dimulai. Lihat panel di halaman e-EMR untuk progress.', 'ok');
  } catch (err) {
    logPopup('❌ Gagal inject/kirim ke tab: ' + err.message, 'err');
    console.error(err);
  }
}

// ----------------------- Init -----------------------

document.addEventListener('DOMContentLoaded', async () => {
  const cfg = await loadConfig();
  configToUI(cfg);

  const dateInput = document.getElementById('dateFilter');
  if (dateInput && !dateInput.value) dateInput.value = getTodayStr();

  document.getElementById('btnSave').addEventListener('click', saveConfig);
  document.getElementById('btnSync').addEventListener('click', startSync);
});
