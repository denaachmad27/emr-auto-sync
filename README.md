# 🔄 e-EMR Auto-Sync

> **Proof-of-Concept (POC)** — Otomasi pengisian jobdesk harian perawat dari Google Sheet ke sistem e-EMR Rumah Sakit.

---

## 📖 Latar Belakang

Seorang perawat mengisi list jobdesk harian (handover) di **Google Sheet** menggunakan PC di nurse station. Setelah itu, perawat harus mengisi data yang **sama secara manual** ke sistem web internal rumah sakit (**e-EMR**) yang hanya bisa diakses via intranet. Setiap 1 jobdesk = 1× pengisian form + 1× klik submit.

**Tujuan:** Membuat tool yang mengotomasi pengisian e-EMR dari data Google Sheet, **tanpa perlu instalasi program** di PC (karena keterbatasan akses administrator).

---

## 🚀 Solusi yang Dibangun

### 1. Chrome Extension (Direkomendasikan)

Extension berbasis **Manifest V3** yang berjalan di browser Chrome/Edge.

**Keunggulan:**
- ✅ Tidak perlu paste ke Console setiap reload halaman.
- ✅ UI popup di toolbar browser.
- ✅ Config mapping tersimpan otomatis di browser.
- ✅ Panel progress muncul langsung di halaman e-EMR.
- ✅ Mode utama: **Copy-Paste** dari Google Sheet (tanpa API Key, tanpa share public).

**File:** [`chrome-extension/`](chrome-extension/)

### 2. Browser Bookmarklet (Alternatif / Backup)

Script JavaScript yang disimpan sebagai bookmark. Berguna jika browser tidak mengizinkan install extension (policy ketat).

**Keunggulan:**
- ✅ Tanpa file instalasi.
- ✅ Cukup save bookmark di browser.
- ✅ Dua mode: Paste langsung atau Google Sheets API.

**File:** [`bookmarklet.js`](bookmarklet.js) (minified) & [`bookmarklet.dev.js`](bookmarklet.dev.js) (readable)

---

## 📂 Struktur Repository

```
emr-auto-sync/
│
├── chrome-extension/           ← Chrome Extension (Manifest V3)
│   ├── manifest.json
│   ├── popup.html              ← UI popup
│   ├── popup.css               ← Styling popup
│   ├── popup.js                ← Logic popup
│   ├── content.js              ← Script injector ke halaman e-EMR
│   ├── background.js           ← Service worker
│   └── README.md               ← Panduan khusus extension
│
├── bookmarklet.js              ← Bookmarklet minified (copy seluruh isi → save bookmark)
├── bookmarklet.dev.js          ← Versi readable untuk development/debug
├── config.js                   ← File konfigurasi mapping (placeholder selector)
│
├── test.html                   ← Form dummy untuk uji coba tanpa akses e-EMR
│
├── dummy_sheet.csv             ← Data dummy CSV (import ke Google Sheet)
├── dummy_sheet.json            ← Data dummy format Sheets API response
├── dummy_sheet_paste.txt       ← Data dummy siap copy-paste (TSV format)
│
├── install.md                  ← Panduan instalasi lengkap (Bahasa Indonesia)
├── README.md                   ← File ini
└── .gitignore
```

---

## ⚡ 3 Cara Memasukkan Data

Dikarenakan **role hanya Viewer** (bukan pemilik Sheet), tersedia 3 mode input:

### 📋 Mode Paste (Direkomendasikan)
1. Buka Google Sheet → **blok cell** (termasuk header) → `Ctrl+C`.
2. Buka e-EMR → klik extension / bookmarklet.
3. **Paste** (`Ctrl+V`) ke tab **Paste**.
4. Klik **Mulai Sync**.

### 📁 Mode Upload File (Baru! ✨)
1. Di Google Drive, klik kanan Sheet → **Download** → pilih format **CSV** atau **TSV**.
2. Buka e-EMR → klik extension / bookmarklet.
3. Di tab **Upload File**, **drag & drop** file CSV/TSV yang sudah diunduh.
4. Klik **Mulai Sync**.

> 💡 Cocok jika Anda sudah mengunduh file dari Drive dan ingin menyimpannya sebagai arsip.

### 🔗 Mode API (Opsional, Butuh Setting)
1. Buat API Key di Google Cloud Console.
2. Share Sheet sebagai **"Anyone with the link = Viewer"**.
3. Isi URL Sheet + API Key di tab **API**.

**Perbandingan:**

| | Paste | Upload File | API |
|---|---|---|---|
| Butuh API Key | ❌ | ❌ | ✅ |
| Butuh Sheet public | ❌ | ❌ | ✅ |
| Butuh koordinasi pemilik | ❌ | ❌ | ✅ |
| Aman untuk data pasien | ✅ | ✅ | ⚠️ Risikony |
| Praktis | ✅ Paling cepat | ✅ Drag & drop | ⚠️ Butuh setup |

---

## 🛠️ Cara Install

> Lihat [`install.md`](install.md) untuk panduan langkah demi langkah lengkap dalam Bahasa Indonesia.

### Ringkasan Cepat (Chrome Extension)

1. Buka Chrome/Edge → `chrome://extensions` → aktifkan **Developer mode**.
2. Klik **Load unpacked** → pilih folder [`chrome-extension/`](chrome-extension/).
3. Pin extension ke toolbar.
4. Klik icon extension → buka **⚙️ Mapping & Konfigurasi**.
5. Isi selector form e-EMR sesuai hasil Inspect Element.
6. Klik **💾 Simpan Config**.

### Ringkasan Cepat (Bookmarklet)

1. Buka [`bookmarklet.js`](bookmarklet.js).
2. Copy seluruh isi file.
3. Di browser, tambah bookmark baru dengan URL = isi file tadi.
4. Selesai.

---

## 🧪 Uji Coba

Jika belum ada akses ke e-EMR, gunakan form dummy:

1. Buka [`test.html`](test.html) di browser (double-click file).
2. Install extension atau jalankan bookmarklet.
3. Copy data dari [`dummy_sheet_paste.txt`](dummy_sheet_paste.txt).
4. Paste ke popup extension / panel bookmarklet.
5. Klik **Mulai Sync**.
6. Lihat form otomatis terisi dan tabel log bertambah.

---

## 🔧 Konfigurasi Mapping (Placeholder)

Saat ini selector di [`config.js`](config.js) masih menggunakan **placeholder** karena akses ke e-EMR belum tersedia untuk inspeksi:

```javascript
MAPPING: {
  'nama_tindakan': '#field-tindakan',   // ← akan diupdate setelah inspeksi
  'waktu':         '#field-waktu',
  'keterangan':    '#field-keterangan',
  'status':        '#field-status',
},
SUBMIT_BUTTON: '#btn-submit',
```

**Catatan:** Setelah mendapatkan akses ke e-EMR, lakukan:
1. Klik kanan field form → **Inspect Element**.
2. Catat atribut `id` atau `class` setiap field.
3. Ganti placeholder di config/extension settings.

---

## 📝 Requirement Teknis

- **Pure JavaScript (ES6+)** — tanpa framework, tanpa dependency eksternal.
- **Manifest V3** untuk Chrome Extension.
- **Google Sheets API v4** (opsional, hanya untuk mode API).
- Handle error: field tidak ditemukan, sheet kosong, submit gagal, timeout.
- Delay antar submit: 1–2 detik (konfigurabel).
- UI floating panel tidak mengganggu tampilan e-EMR (bisa di-minimize & drag).
- Kode di-comment dalam Bahasa Indonesia untuk kemudahan tim IT RS.

---

## ⚠️ Status Saat Ini

| Komponen | Status |
|----------|--------|
| Core logic (extension + bookmarklet) | ✅ Selesai |
| Mode copy-paste (tanpa API) | ✅ Selesai |
| Mode API (dengan Google Sheets API Key) | ✅ Selesai |
| Form dummy untuk testing | ✅ Selesai |
| Data dummy | ✅ Selesai |
| Panduan instalasi | ✅ Selesai |
| **Inspeksi selector e-EMR asli** | ⏳ Menunggu akses ke sistem e-EMR |
| **Google Sheet produksi** | ⏳ Menunggu data sheet sebenarnya |

> **Project ini sengaja dicukupkan sampai tahap ini.** Akan dilanjutkan setelah mendapatkan:
> 1. Akses ke halaman form e-EMR untuk inspeksi selector.
> 2. Google Sheet asli yang digunakan perawat.

---

## 🛡️ Keamanan & Privasi

- Tidak ada data pasien yang dikirim ke server luar.
- Mode paste: data hanya melalui clipboard browser → langsung ke e-EMR intranet.
- Config disimpan lokal di browser (`chrome.storage.local`).
- Semua proses berjalan 100% di sisi client (browser).

---

## 📄 Lisensi

Project ini dibuat untuk keperluan internal Rumah Sakit sebagai proof-of-concept.

---

*Dibuat untuk mempermudah kerja perawat dan mengurangi pengisian form berulang.*
