/**
 * ============================================================================
 * e-EMR Auto-Sync Bookmarklet — Versi Development (Readable)
 * ============================================================================
 *
 * Cara pakai:
 * 1. Buka halaman e-EMR di browser.
 * 2. (Opsional) Copy-paste isi config.js ke Console browser dulu.
 * 3. Copy-paste seluruh kode ini ke Console browser, lalu tekan Enter.
 * 4. Panel "e-EMR Auto-Sync" akan muncul di pojok kanan atas.
 * 5. Pilih salah satu mode:
 *    a) Mode API    : isi URL Google Sheet + API Key
 *    b) Mode Paste  : copy-paste data langsung dari Sheet (tanpa API Key!)
 * 6. Klik "Mulai Sync".
 *
 * Catatan teknis untuk tim IT RS:
 * - Kode ini murni JavaScript ES6+, tanpa library eksternal.
 * - Mode API    : Fetch API → Google Sheets API v4 (read-only).
 * - Mode Paste  : Parse TSV/CSV hasil copy-paste langsung dari Google Sheet.
 * - Mengisi form dengan memicu event 'input', 'change', 'blur' agar
 *   framework frontend (React/Vue/Angular) di e-EMR ikut mendeteksi.
 * - Delay antar submit bisa diatur via config.js (default 1.5 detik).
 * ============================================================================
 */

(function () {
  'use strict';

  // ========================== KONFIGURASI DEFAULT ==========================
  const DEFAULT_CONFIG = {
    GOOGLE_API_KEY: 'ISI_API_KEY_DISINI',
    MAPPING: {
      'tanggal':       '#field-tanggal',
      'nama_tindakan': '#field-tindakan',
      'waktu':         '#field-waktu',
      'keterangan':    '#field-keterangan',
      'status':        '#field-status',
    },
    SUBMIT_BUTTON: '#btn-submit',
    DELAY_MS: 1500,
    STOP_ON_ERROR: false,
  };

  const CFG = window.EMR_CONFIG || DEFAULT_CONFIG;

  // ========================== STATE GLOBAL ==========================
  let isRunning = false;
  let shouldStop = false;

  // ========================== UTILITAS ==========================

  function qs(selector) {
    return document.querySelector(selector);
  }

  function getTodayStr() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function parseSheetId(raw) {
    const trimmed = raw.trim();
    if (trimmed.includes('/spreadsheets/d/')) {
      const m = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9\-_]+)/);
      if (m && m[1]) return m[1];
    }
    return trimmed;
  }

  function parseRange(raw) {
    return raw.trim() || 'Sheet1!A1:Z1000';
  }

  /**
   * Parse data hasil copy-paste dari Google Sheet.
   * Google Sheet secara default copy sebagai TSV (tab-separated).
   * Kita deteksi delimiter otomatis (tab atau koma).
   */
  function parsePastedData(rawText) {
    const trimmed = rawText.trim();
    if (!trimmed) throw new Error('Data paste kosong.');

    const lines = trimmed.split(/\r?\n/);
    if (lines.length < 2) {
      throw new Error('Data paste kurang dari 2 baris (butuh header + minimal 1 baris data).');
    }

    // Deteksi delimiter: cek apakah ada tab di salah satu baris
    const hasTab = lines.some((l) => l.includes('\t'));
    const delimiter = hasTab ? '\t' : ',';

    const rows = lines.map((line) => {
      if (delimiter === ',') {
        // Parser CSV sederhana dengan support quoted fields
        const result = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
              cur += '"';
              i++; // skip escaped quote
            } else {
              inQuotes = !inQuotes;
            }
          } else if (ch === ',' && !inQuotes) {
            result.push(cur.trim());
            cur = '';
          } else {
            cur += ch;
          }
        }
        result.push(cur.trim());
        return result;
      }
      // TSV mode
      return line.split('\t').map((s) => s.trim());
    });

    return rows; // Array of arrays, sama format dengan response Sheets API
  }

  function log(msg, type) {
    type = type || 'info';
    const container = qs('#emr-sync-log');
    if (!container) return;

    const line = document.createElement('div');
    line.style.marginBottom = '3px';
    line.style.lineHeight = '1.4';

    if (type === 'error') line.style.color = '#dc3545';
    else if (type === 'success') line.style.color = '#198754';
    else if (type === 'warn') line.style.color = '#fd7e14';
    else line.style.color = '#212529';

    const time = new Date().toLocaleTimeString('id-ID', { hour12: false });
    line.textContent = `[${time}] ${msg}`;
    container.appendChild(line);
    container.scrollTop = container.scrollHeight;
  }

  // ========================== INTERAKSI FORM ==========================

  function setFieldValue(selector, value) {
    const el = qs(selector);
    if (!el) {
      log(`⚠️ Selector tidak ditemukan: ${selector}`, 'warn');
      return false;
    }

    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.value = value;
    } else if (el.tagName === 'SELECT') {
      el.value = value;
    } else if (el.isContentEditable) {
      el.textContent = value;
    } else {
      el.setAttribute('value', value);
      el.value = value;
    }

    ['focus', 'input', 'change', 'blur'].forEach((evtName) => {
      const event = new Event(evtName, { bubbles: true });
      el.dispatchEvent(event);
    });

    return true;
  }

  function clickSubmit() {
    const btn = qs(CFG.SUBMIT_BUTTON);
    if (!btn) {
      log(`❌ Tombol submit tidak ditemukan: ${CFG.SUBMIT_BUTTON}`, 'error');
      return false;
    }
    btn.click();
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    return true;
  }

  // ========================== GOOGLE SHEETS API ==========================

  async function fetchSheetData(sheetId, range, apiKey) {
    if (!apiKey || apiKey === 'ISI_API_KEY_DISINI') {
      throw new Error('Google API Key belum diisi. Isi di config.js atau input panel.');
    }

    const encodedRange = encodeURIComponent(range);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedRange}?key=${apiKey}`;

    log('📡 Mengambil data dari Google Sheet (mode API)...');

    const res = await fetch(url);
    if (!res.ok) {
      let detail = '';
      try {
        const errBody = await res.json();
        detail = errBody.error?.message || JSON.stringify(errBody);
      } catch (_) {
        detail = res.statusText;
      }
      throw new Error(`Gagal mengambil data Sheet: ${detail}`);
    }

    const payload = await res.json();
    if (!payload.values || payload.values.length === 0) {
      throw new Error('Sheet kosong atau range tidak mengandung data.');
    }

    return payload.values;
  }

  // ========================== UI PANEL ==========================

  function createPanel() {
    if (qs('#emr-sync-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'emr-sync-panel';
    panel.style.cssText = [
      'position:fixed',
      'top:12px',
      'right:12px',
      'width:400px',
      'max-height:94vh',
      'background:#ffffff',
      'border:2px solid #0d6efd',
      'border-radius:10px',
      'box-shadow:0 8px 24px rgba(0,0,0,0.35)',
      'z-index:2147483647',
      'font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif',
      'font-size:13px',
      'color:#212529',
      'display:flex',
      'flex-direction:column',
      'overflow:hidden',
    ].join(';');

    const header = document.createElement('div');
    header.id = 'emr-sync-header';
    header.style.cssText = [
      'background:#0d6efd',
      'color:#fff',
      'padding:10px 14px',
      'cursor:move',
      'display:flex',
      'justify-content:space-between',
      'align-items:center',
      'font-weight:600',
      'user-select:none',
    ].join(';');
    header.innerHTML = '<span>🔄 e-EMR Auto-Sync</span><span id="emr-sync-minimize" style="cursor:pointer;font-size:16px;">−</span>';

    const body = document.createElement('div');
    body.id = 'emr-sync-body';
    body.style.cssText = 'padding:12px;overflow-y:auto;flex:1;';

    body.innerHTML = `
      <div style="margin-bottom:10px;">
        <label style="display:block;margin-bottom:3px;font-weight:600;">🔗 URL / ID Google Sheet (mode API)</label>
        <input id="emr-in-sheet" type="text" placeholder="https://docs.google.com/spreadsheets/d/..." autocomplete="off"
          style="width:100%;padding:5px 7px;border:1px solid #ced4da;border-radius:4px;box-sizing:border-box;font-size:13px;">
        <div style="font-size:11px;color:#6c757d;margin-top:2px;">Kosongkan jika menggunakan mode copy-paste di bawah.</div>
      </div>
      <div style="margin-bottom:10px;">
        <label style="display:block;margin-bottom:3px;font-weight:600;">📄 Nama Range (mode API)</label>
        <input id="emr-in-range" type="text" value="Sheet1!A1:E100" autocomplete="off"
          style="width:100%;padding:5px 7px;border:1px solid #ced4da;border-radius:4px;box-sizing:border-box;font-size:13px;">
      </div>
      <div style="margin-bottom:10px;">
        <label style="display:block;margin-bottom:3px;font-weight:600;">📋 ATAU Paste Data Langsung dari Sheet (mode tanpa API)</label>
        <textarea id="emr-in-paste" rows="5" placeholder="Copy cell dari Google Sheet lalu paste di sini (Ctrl+V)..."
          style="width:100%;padding:5px 7px;border:1px solid #ced4da;border-radius:4px;box-sizing:border-box;font-size:13px;resize:vertical;"></textarea>
        <div style="font-size:11px;color:#6c757d;margin-top:2px;">Tips: Blok cell di Sheet → Ctrl+C → klik kotak ini → Ctrl+V.</div>
      </div>
      <div style="margin-bottom:10px;">
        <label style="display:block;margin-bottom:3px;font-weight:600;">📅 Tanggal (filter)</label>
        <input id="emr-in-date" type="date"
          style="width:100%;padding:5px 7px;border:1px solid #ced4da;border-radius:4px;box-sizing:border-box;font-size:13px;">
      </div>
      <div style="margin-bottom:10px;">
        <label style="display:block;margin-bottom:3px;font-weight:600;">🔑 Google API Key (override, khusus mode API)</label>
        <input id="emr-in-apikey" type="text" placeholder="Kosongkan jika sudah di config.js" autocomplete="off"
          style="width:100%;padding:5px 7px;border:1px solid #ced4da;border-radius:4px;box-sizing:border-box;font-size:13px;">
      </div>
      <div style="display:flex;gap:8px;margin-bottom:10px;">
        <button id="emr-btn-start"
          style="flex:1;padding:7px 0;background:#0d6efd;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:600;font-size:13px;">
          Mulai Sync
        </button>
        <button id="emr-btn-stop"
          style="flex:1;padding:7px 0;background:#dc3545;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:600;font-size:13px;">
          Stop
        </button>
      </div>
      <div id="emr-sync-log"
        style="background:#f8f9fa;border:1px solid #dee2e6;border-radius:4px;padding:8px;height:140px;overflow-y:auto;font-family:monospace;font-size:12px;line-height:1.4;">
      </div>
    `;

    panel.appendChild(header);
    panel.appendChild(body);
    document.body.appendChild(panel);

    const dateInput = qs('#emr-in-date');
    if (dateInput) dateInput.value = getTodayStr();

    qs('#emr-btn-start').addEventListener('click', () => startSync());
    qs('#emr-btn-stop').addEventListener('click', () => {
      shouldStop = true;
      log('⏹️ Permintaan stop diterima. Menghentikan setelah baris ini...', 'warn');
    });

    let minimized = false;
    qs('#emr-sync-minimize').addEventListener('click', () => {
      minimized = !minimized;
      body.style.display = minimized ? 'none' : 'block';
      qs('#emr-sync-minimize').textContent = minimized ? '+' : '−';
    });

    let dragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    header.addEventListener('mousedown', (e) => {
      dragging = true;
      dragOffsetX = e.clientX - panel.offsetLeft;
      dragOffsetY = e.clientY - panel.offsetTop;
      e.preventDefault();
    });

    function onMouseMove(e) {
      if (!dragging) return;
      panel.style.left = `${e.clientX - dragOffsetX}px`;
      panel.style.top = `${e.clientY - dragOffsetY}px`;
      panel.style.right = 'auto';
    }

    function onMouseUp() {
      dragging = false;
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    panel._cleanupDrag = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }

  // ========================== LOGIKA UTAMA SYNC ==========================

  async function startSync() {
    if (isRunning) {
      log('⚠️ Sync sedang berjalan. Tunggu selesai atau klik Stop.', 'warn');
      return;
    }

    const sheetRaw = qs('#emr-in-sheet').value.trim();
    const rangeRaw = qs('#emr-in-range').value.trim();
    const pasteRaw = qs('#emr-in-paste').value.trim();
    const dateFilter = qs('#emr-in-date').value.trim();
    const apiKeyRaw = qs('#emr-in-apikey').value.trim();

    // Validasi minimal: harus ada URL atau paste data
    if (!sheetRaw && !pasteRaw) {
      log('❌ Isi URL Google Sheet ATAU paste data langsung dari Sheet.', 'error');
      return;
    }

    isRunning = true;
    shouldStop = false;
    qs('#emr-btn-start').disabled = true;
    qs('#emr-btn-start').style.opacity = '0.6';
    qs('#emr-sync-log').innerHTML = '';
    log('🚀 Memulai sinkronisasi...');

    try {
      let rows;

      if (pasteRaw) {
        // ===================== MODE PASTE (tanpa API) =====================
        log('📋 Mode: Paste langsung dari Sheet (tanpa API Key).');
        rows = parsePastedData(pasteRaw);
      } else {
        // ===================== MODE API =====================
        const apiKey = apiKeyRaw || CFG.GOOGLE_API_KEY;
        if (!apiKey || apiKey === 'ISI_API_KEY_DISINI') {
          log('❌ Mode API membutuhkan Google API Key. Isi di config.js atau input panel. Atau gunakan mode paste data.', 'error');
          return;
        }
        const sheetId = parseSheetId(sheetRaw);
        const range = parseRange(rangeRaw);
        rows = await fetchSheetData(sheetId, range, apiKey);
      }

      // Baris pertama diasumsikan header
      const headers = rows[0].map((h) =>
        String(h || '')
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '_')
      );
      const dataRows = rows.slice(1);

      log(`📋 Header terdeteksi: ${headers.join(', ')}`);
      log(`📊 Jumlah baris data (tanpa header): ${dataRows.length}`);

      let successCount = 0;
      let skipCount = 0;
      let failCount = 0;

      for (let i = 0; i < dataRows.length; i++) {
        if (shouldStop) {
          log('⏹️ Proses dihentikan oleh user.', 'warn');
          break;
        }

        const rawRow = dataRows[i];
        // Bangun object baris dari header
        const row = {};
        headers.forEach((h, idx) => {
          row[h] = rawRow[idx] !== undefined ? String(rawRow[idx]).trim() : '';
        });

        // --- Filter tanggal (jika user mengisi filter) ---
        if (dateFilter) {
          const possibleDateFields = ['tanggal', 'tgl', 'date', 'waktu', 'jam'];
          const dateVal = possibleDateFields
            .map((f) => row[f])
            .find((v) => v && v.length > 0);

          if (dateVal) {
            const normalized = dateVal.replace(/\//g, '-');
            if (!normalized.includes(dateFilter)) {
              skipCount++;
              continue;
            }
          }
        }

        log(`▶️ [${i + 1}/${dataRows.length}] Mengisi form: ${row['nama_tindakan'] || '(no name)'}`);

        let anyFieldMissing = false;

        // --- Mapping & pengisian field ---
        for (const [colName, selector] of Object.entries(CFG.MAPPING)) {
          const value = row[colName] || '';
          if (!value) continue;

          const ok = setFieldValue(selector, value);
          if (!ok) {
            anyFieldMissing = true;
            if (CFG.STOP_ON_ERROR) {
              log(`⏹️ Berhenti karena selector "${selector}" tidak ditemukan.`, 'error');
              break;
            }
          }
        }

        if (anyFieldMissing && CFG.STOP_ON_ERROR) {
          failCount++;
          break;
        }

        // --- Submit form ---
        const submitOk = clickSubmit();
        if (!submitOk) {
          failCount++;
          if (CFG.STOP_ON_ERROR) {
            log('⏹️ Berhenti karena gagal mengklik submit.', 'error');
            break;
          }
        }

        successCount++;
        log(`✅ Baris ${i + 1} berhasil disubmit.`);

        // --- Delay antar submit (kecuali baris terakhir) ---
        if (i < dataRows.length - 1) {
          await delay(CFG.DELAY_MS || 1500);
        }
      }

      // ----- Ringkasan akhir -----
      log('');
      log('========================================', 'success');
      log(`🏁 SELESAI`, 'success');
      log(`   ✅ Sukses : ${successCount}`, 'success');
      log(`   ⏭️ Skip   : ${skipCount}`, 'warn');
      log(`   ❌ Gagal  : ${failCount}`, 'error');
      log(`   📊 Total  : ${dataRows.length}`, 'info');
      log('========================================', 'success');
    } catch (err) {
      log(`❌ ERROR: ${err.message}`, 'error');
      console.error('[e-EMR Auto-Sync]', err);
    } finally {
      isRunning = false;
      shouldStop = false;
      const btnStart = qs('#emr-btn-start');
      if (btnStart) {
        btnStart.disabled = false;
        btnStart.style.opacity = '1';
      }
    }
  }

  // ========================== INJECT SAAT LOAD ==========================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createPanel);
  } else {
    createPanel();
  }
})();
