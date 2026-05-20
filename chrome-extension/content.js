/**
 * content.js — Script yang diinject ke halaman e-EMR
 * Menampilkan panel progress di dalam halaman dan mengisi form secara otomatis.
 */

(function () {
  'use strict';

  // Hindari double-inject
  if (window.__emrSyncInjected) return;
  window.__emrSyncInjected = true;

  let isRunning = false;
  let shouldStop = false;

  // ===================== UTIL =====================
  function qs(s) { return document.querySelector(s); }

  function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }

  function log(msg, type) {
    type = type || 'info';
    const area = qs('#emr-sync-log');
    if (!area) return;
    const line = document.createElement('div');
    line.style.marginBottom = '3px';
    line.style.lineHeight = '1.4';
    line.style.color = type === 'error' ? '#dc3545' : type === 'success' ? '#198754' : type === 'warn' ? '#fd7e14' : '#212529';
    const t = new Date().toLocaleTimeString('id-ID', { hour12: false });
    line.textContent = `[${t}] ${msg}`;
    area.appendChild(line);
    area.scrollTop = area.scrollHeight;
  }

  function setFieldValue(selector, value) {
    const el = qs(selector);
    if (!el) {
      log(`⚠️ Selector tidak ditemukan: ${selector}`, 'warn');
      return false;
    }
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.value = value;
    else if (el.tagName === 'SELECT') el.value = value;
    else if (el.isContentEditable) el.textContent = value;
    else { el.setAttribute('value', value); el.value = value; }
    ['focus', 'input', 'change', 'blur'].forEach((n) => el.dispatchEvent(new Event(n, { bubbles: true })));
    return true;
  }

  function clickSubmit(sel) {
    const btn = qs(sel);
    if (!btn) { log(`❌ Tombol submit tidak ditemukan: ${sel}`, 'error'); return false; }
    btn.click();
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    return true;
  }

  // ===================== PANEL UI =====================
  function createPanel() {
    if (qs('#emr-sync-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'emr-sync-panel';
    panel.style.cssText = [
      'position:fixed','top:12px','right:12px','width:380px','max-height:92vh',
      'background:#fff','border:2px solid #0d6efd','border-radius:10px',
      'box-shadow:0 8px 24px rgba(0,0,0,0.35)','z-index:2147483647',
      'font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif',
      'font-size:13px','color:#212529','display:flex','flex-direction:column','overflow:hidden'
    ].join(';');

    const header = document.createElement('div');
    header.style.cssText = 'background:#0d6efd;color:#fff;padding:10px 14px;cursor:move;display:flex;justify-content:space-between;align-items:center;font-weight:600;user-select:none;';
    header.innerHTML = '<span>🔄 e-EMR Auto-Sync</span><span id="emr-sync-minimize" style="cursor:pointer;font-size:16px;">−</span>';

    const body = document.createElement('div');
    body.id = 'emr-sync-body';
    body.style.cssText = 'padding:12px;overflow-y:auto;flex:1;';
    body.innerHTML = `
      <div id="emr-sync-status" style="font-weight:600;margin-bottom:8px;color:#0d6efd;">Siap</div>
      <div style="display:flex;gap:8px;margin-bottom:10px;">
        <button id="emr-btn-stop" style="flex:1;padding:6px 0;background:#dc3545;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:600;font-size:12px;">⏹️ Stop</button>
      </div>
      <div id="emr-sync-log" style="background:#f8f9fa;border:1px solid #dee2e6;border-radius:4px;padding:8px;height:140px;overflow-y:auto;font-family:monospace;font-size:12px;line-height:1.4;"></div>
    `;

    panel.appendChild(header);
    panel.appendChild(body);
    document.body.appendChild(panel);

    // Minimize
    let minimized = false;
    qs('#emr-sync-minimize').addEventListener('click', () => {
      minimized = !minimized;
      body.style.display = minimized ? 'none' : 'block';
      qs('#emr-sync-minimize').textContent = minimized ? '+' : '−';
    });

    // Stop button on panel
    qs('#emr-btn-stop').addEventListener('click', () => {
      shouldStop = true;
      log('⏹️ Permintaan stop diterima. Menghentikan setelah baris ini...', 'warn');
    });

    // Drag header
    let dragging = false, ox, oy;
    header.addEventListener('mousedown', (e) => { dragging = true; ox = e.clientX - panel.offsetLeft; oy = e.clientY - panel.offsetTop; e.preventDefault(); });
    document.addEventListener('mousemove', (e) => { if (!dragging) return; panel.style.left = e.clientX - ox + 'px'; panel.style.top = e.clientY - oy + 'px'; panel.style.right = 'auto'; });
    document.addEventListener('mouseup', () => dragging = false);
  }

  function setStatus(text) {
    const el = qs('#emr-sync-status');
    if (el) el.textContent = text;
  }

  // ===================== SYNC LOGIC =====================
  async function startSync(rows, dateFilter, cfg) {
    if (isRunning) { log('⚠️ Sync sedang berjalan.', 'warn'); return; }

    createPanel();
    isRunning = true;
    shouldStop = false;
    qs('#emr-sync-log').innerHTML = '';
    log('🚀 Memulai sinkronisasi...');
    setStatus('Sedang berjalan...');

    try {
      const headers = rows[0].map((h) => String(h || '').trim().toLowerCase().replace(/\s+/g, '_'));
      const dataRows = rows.slice(1);

      log(`📋 Header: ${headers.join(', ')}`);
      log(`📊 Baris data: ${dataRows.length}`);

      let successCount = 0, skipCount = 0, failCount = 0;

      for (let i = 0; i < dataRows.length; i++) {
        if (shouldStop) { log('⏹️ Proses dihentikan oleh user.', 'warn'); break; }

        const rawRow = dataRows[i];
        const row = {};
        headers.forEach((h, idx) => { row[h] = rawRow[idx] !== undefined ? String(rawRow[idx]).trim() : ''; });

        // Tanggal filter
        if (dateFilter) {
          const possible = ['tanggal','tgl','date','waktu','jam'];
          const dateVal = possible.map((f) => row[f]).find((v) => v && v.length > 0);
          if (dateVal && !dateVal.replace(/\//g, '-').includes(dateFilter)) { skipCount++; continue; }
        }

        log(`▶️ [${i + 1}/${dataRows.length}] ${row['nama_tindakan'] || '(no name)'}`);
        setStatus(`Mengisi ${i + 1}/${dataRows.length}...`);

        let anyFieldMissing = false;
        for (const [colName, selector] of Object.entries(cfg.MAPPING)) {
          const value = row[colName] || '';
          if (!value) continue;
          const ok = setFieldValue(selector, value);
          if (!ok) {
            anyFieldMissing = true;
            if (cfg.STOP_ON_ERROR) { log(`⏹️ Berhenti: selector "${selector}" tidak ditemukan.`, 'error'); break; }
          }
        }
        if (anyFieldMissing && cfg.STOP_ON_ERROR) { failCount++; break; }

        const submitOk = clickSubmit(cfg.SUBMIT_BUTTON);
        if (!submitOk) {
          failCount++;
          if (cfg.STOP_ON_ERROR) { log('⏹️ Berhenti: gagal klik submit.', 'error'); break; }
        }

        successCount++;
        log(`✅ Baris ${i + 1} berhasil.`);

        if (i < dataRows.length - 1) await delay(cfg.DELAY_MS || 1500);
      }

      log('');
      log('========================================', 'success');
      log('🏁 SELESAI', 'success');
      log(`   ✅ Sukses : ${successCount}`, 'success');
      log(`   ⏭️ Skip   : ${skipCount}`, 'warn');
      log(`   ❌ Gagal  : ${failCount}`, 'error');
      log(`   📊 Total  : ${dataRows.length}`, 'info');
      log('========================================', 'success');
      setStatus('Selesai');
    } catch (err) {
      log(`❌ ERROR: ${err.message}`, 'error');
      setStatus('Error');
      console.error('[e-EMR Auto-Sync]', err);
    } finally {
      isRunning = false;
      shouldStop = false;
    }
  }

  // ===================== MESSAGE LISTENER =====================
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'START_SYNC') {
      startSync(request.rows, request.dateFilter || '', request.config || {});
      sendResponse({ status: 'started' });
    }
    if (request.action === 'STOP_SYNC') {
      shouldStop = true;
      sendResponse({ status: 'stopping' });
    }
    return true;
  });
})();
