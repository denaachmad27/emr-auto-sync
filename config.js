/**
 * ============================================================================
 * KONFIGURASI MAPPING e-EMR Auto-Sync
 * ============================================================================
 *
 * INSTRUKSI:
 * 1. Setelah mendapatkan akses ke sistem e-EMR, lakukan "Inspect Element"
 *    (klik kanan → Inspect) pada setiap field form.
 * 2. Catat "selector" CSS-nya (contoh: #input-tindakan, .form-waktu, dll).
 * 3. Ganti placeholder di bawah ini dengan selector yang sesuai.
 * 4. Pastikan nama kolom di kiri (nama_tindakan, waktu, dsb) SAMA PERSIS
 *    dengan header baris pertama di Google Sheet (case-insensitive, spasi
 *    akan dianggap underscore).
 *
 * Contoh header di Sheet:
 *   | tanggal | nama_tindakan | waktu | keterangan |
 *   Maka key di MAPPING harus: 'nama_tindakan', 'waktu', 'keterangan'
 * ============================================================================
 */

window.EMR_CONFIG = {
  // --------------------------------------------------------------------------
  // API Key Google Sheets (read-only, tanpa OAuth)
  // Dapatkan dari Google Cloud Console → Credentials → API Key
  // --------------------------------------------------------------------------
  GOOGLE_API_KEY: 'ISI_API_KEY_DISINI',

  // --------------------------------------------------------------------------
  // Mapping: nama kolom Sheet  →  selector elemen form di e-EMR
  // --------------------------------------------------------------------------
  MAPPING: {
    'tanggal':       '#field-tanggal',       // ganti selector sesuai e-EMR
    'nama_tindakan': '#field-tindakan',      // ganti selector sesuai e-EMR
    'waktu':         '#field-waktu',          // ganti selector sesuai e-EMR
    'keterangan':    '#field-keterangan',     // ganti selector sesuai e-EMR
    'status':        '#field-status',         // ganti selector sesuai e-EMR
  },

  // --------------------------------------------------------------------------
  // Selector tombol SUBMIT di form e-EMR
  // --------------------------------------------------------------------------
  SUBMIT_BUTTON: '#btn-submit',

  // --------------------------------------------------------------------------
  // Pengaturan tambahan
  // --------------------------------------------------------------------------
  DELAY_MS: 1500,           // jeda antar submit (ms) — minimal 1000
  STOP_ON_ERROR: false,     // true = berhenti jika ada field tidak ketemu
};
