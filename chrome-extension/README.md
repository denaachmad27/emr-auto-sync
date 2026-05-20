# 🔄 e-EMR Auto-Sync — Chrome Extension

Versi Chrome Extension dari e-EMR Auto-Sync. Lebih praktis dari bookmarklet karena:
- ✅ **Tidak perlu paste ke Console** setiap reload halaman.
- ✅ **UI popup** di toolbar browser (klik icon extension).
- ✅ **Config tersimpan** secara otomatis di browser (mapping selector, delay, dll).
- ✅ **Panel progress** muncul langsung di halaman e-EMR saat sync berjalan.
- ✅ Mode utama: **Copy-Paste** dari Google Sheet (tanpa API Key, tanpa share public).

---

## 📦 Cara Install (Load Unpacked)

1. Buka Chrome/Edge, ketik di address bar: `chrome://extensions`
2. Aktifkan toggle **Developer mode** (pojok kanan atas).
3. Klik tombol **Load unpacked**.
4. Pilih folder **`chrome-extension`** ini.
5. Icon extension akan muncul di toolbar (icon puzzle default). Klik icon 🧩 lalu pin extension agar selalu terlihat.

---

## ⚙️ Konfigurasi Pertama Kali

1. Klik icon extension di toolbar.
2. Klik bagian **"⚙️ Mapping & Konfigurasi"** untuk membuka settings.
3. Isi selector form e-EMR sesuai hasil Inspect Element:
   - Buka e-EMR → klik kanan field → Inspect → catat `id`/`class`
   - Contoh: `#txtTindakan`, `#txtWaktu`, dll.
4. Atur **Selector Tombol Submit** (contoh: `#btnSimpan`).
5. Klik **💾 Simpan Config**.

Config akan tersimpan otomatis di browser Anda.

---

## 🚀 Cara Pakai Sehari-hari

1. Buka **Google Sheet** perawat.
2. **Blok / seleksi** cell yang mau di-sync (termasuk header baris pertama).
3. Tekan **`Ctrl+C`**.
4. Buka halaman **e-EMR** (pastikan halaman form input sudah terbuka).
5. Klik icon **e-EMR Auto-Sync** di toolbar Chrome.
6. Di popup:
   - Paste (`Ctrl+V`) ke kotak **Copy-Paste Data dari Google Sheet**.
   - Pilih **Filter Tanggal** (biarkan kosong jika mau semua data).
   - Klik **▶️ Mulai Sync**.
7. Panel kecil akan muncul di pojok kanan atas halaman e-EMR.
8. Tunggu sampai muncul **`🏁 SELESAI`** di panel.

> 💡 **Tidak perlu khawatir reload:** jika Anda refresh halaman e-EMR, cukup klik icon extension lagi. Tidak perlu paste script ke Console.

---

## 🧪 Uji Coba dengan Form Dummy

1. Buka file **`../test.html`** di browser (double-click).
2. Klik icon extension.
3. Pastikan mapping selector di settings sudah default (`#field-tindakan`, `#field-waktu`, dsb.) — sesuai form dummy.
4. Copy data dari **`../dummy_sheet_paste.txt`** (atau langsung dari CSV).
5. Paste ke popup extension, klik **Mulai Sync**.
6. Lihat form dummy otomatis terisi dan tabel log bertambah.

---

## 🔧 Struktur File Extension

```
chrome-extension/
├── manifest.json      ← Manifest V3
├── popup.html         ← UI popup saat icon diklik
├── popup.css          ← Styling popup
├── popup.js           ← Logic popup (parse data, inject, kirim perintah)
├── content.js         ← Script yang diinject ke halaman e-EMR
├── background.js      ← Service worker (minimal)
└── README.md          ← File ini
```

---

## 📝 Troubleshooting Extension

| Masalah | Solusi |
|---------|--------|
| Tombol "Mulai Sync" tidak bereaksi | Pastikan halaman e-EMR sudah terbuka (bukan tab kosong). |
| Panel tidak muncul di halaman | Cek Console halaman (F12) apakah ada error merah. Bisa jadi selector salah atau halaman menggunakan Shadow DOM (perlu penyesuaian). |
| Field terisi tapi tidak tersimpan | Naikkan **Jeda (ms)** di popup menjadi 2000–3000. Framework JS seperti React/Vue butuh waktu lebih lama mendeteksi perubahan. |
| Config hilang setelah tutup browser | Periksa apakah browser di-set menghapus data saat close. Chrome storage seharusnya persisten. |

---

## 🛡️ Keamanan

- **Tidak ada data pasien** yang dikirim ke server luar.
- Data Google Sheet masuk ke browser Anda via **clipboard** (mode paste).
- Config disimpan lokal di `chrome.storage.local` (tidak sync ke akun Google).

---

*Extension ini merupakan bagian dari proof-of-concept e-EMR Auto-Sync.*
