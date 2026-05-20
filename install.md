# 📘 Panduan Instalasi e-EMR Auto-Sync

> **Untuk:** Perawat / Admin IT Rumah Sakit  
> **Tingkat kesulitan:** Mudah, tidak perlu instalasi program  
> **Waktu setup pertama kali:** ±10 menit

---

## 🎯 Apa yang Akan Dilakukan

Anda akan memasang alat bantu otomatisasi pengisian e-EMR. Setiap hari cukup:

1. Copy data dari Google Sheet (`Ctrl+C`).
2. Buka e-EMR, klik icon extension di Chrome.
3. Paste (`Ctrl+V`) → klik **Mulai Sync**.
4. Form e-EMR terisi otomatis satu per satu.

**Tersedia 2 bentuk:**
- **A. Chrome Extension** (Direkomendasikan) — lebih praktis, config tersimpan, tidak hilang saat reload.
- **B. Bookmarklet** (Alternatif / Backup) — tanpa install extension, cukup save bookmark.

---

## ✅ SOLUSI A: Chrome Extension (Direkomendasikan)

Lebih mudah karena:
- Config mapping **tersimpan otomatis** di browser.
- **Tidak perlu buka Console** (F12) setiap reload halaman.
- Panel progress langsung muncul di halaman e-EMR.

### A1. Install Extension

1. Buka Chrome/Edge, ketik di address bar: `chrome://extensions`
2. Aktifkan toggle **Developer mode** (pojok kanan atas).
3. Klik tombol **Load unpacked**.
4. Pilih folder **`chrome-extension`** di dalam project ini.
5. Extension akan muncul di toolbar (icon puzzle 🧩). Klik icon 🧩 → klik **📌 pin** agar selalu terlihat.

### A2. Konfigurasi Mapping Pertama Kali

1. Buka halaman **e-EMR** di browser.
2. Klik kanan pada field form (contoh: input "Nama Tindakan") → **Inspect**.
3. Di jendela Developer Tools, catat nilai atribut `id` atau `class`-nya.

   Contoh:
   ```html
   <input id="txtTindakan" class="form-control" ...>
   ```
   Maka selector-nya adalah: `#txtTindakan`

4. Lakukan untuk semua field yang ingin diisi otomatis.
5. Klik icon **e-EMR Auto-Sync** di toolbar.
6. Klik bagian **"⚙️ Mapping & Konfigurasi"**.
7. Ganti selector default dengan selector asli dari e-EMR.
8. Isi juga **Selector Tombol Submit** (contoh: `#btnSimpan`).
9. Klik **💾 Simpan Config**.

> **Penting:** Nama key mapping (`nama_tindakan`, `waktu`, dsb) harus **sama persis** dengan header baris pertama di Google Sheet (tidak peduli huruf besar/kecil, spasi otomatis jadi underscore).

### A3. Cara Pakai Sehari-hari

1. Buka **Google Sheet** perawat.
2. **Blok / seleksi** cell yang mau di-sync (termasuk header baris pertama).

   ```
   Contoh blok:
   A1: tanggal      B1: nama_tindakan      C1: waktu ...
   A2: 2026-05-20   B2: Observasi           C2: 08:00 ...
   ...
   ```

3. Tekan **`Ctrl+C`** (Copy).
4. Buka halaman **e-EMR**, pastikan halaman form input sudah terbuka.
5. Klik icon **e-EMR Auto-Sync** di toolbar.
6. Di popup:
   - Paste (`Ctrl+V`) ke kotak **"Copy-Paste Data dari Google Sheet"**.
   - Pilih **Filter Tanggal** (kosongkan jika mau semua data).
   - Sesuaikan **Jeda (ms)** jika e-EMR terasa lambat merespons (default 1500ms).
7. Klik **▶️ Mulai Sync**.
8. Panel kecil muncul di pojok kanan atas **halaman e-EMR** (bukan popup).
9. Tunggu sampai muncul **`🏁 SELESAI`**.

> ⚠️ **Jangan tutup browser atau refresh halaman** saat proses berjalan!

---

## 🔖 SOLUSI B: Bookmarklet (Alternatif)

Gunakan jika:
- Browser tidak bisa install extension (komputer bersama dengan policy ketat).
- Butuh solusi **super cepat tanpa file**.

### B1. Install Bookmarklet

1. Buka file **`bookmarklet.js`**.
2. Copy **seluruh isi** file (dimulai dari `javascript:...` sampai akhir).
3. Di Chrome/Edge, tekan `Ctrl+Shift+B` untuk menampilkan **Bookmarks Bar**.
4. Klik kanan di area kosong Bookmarks Bar → **Add page...**.
5. Isi:
   - **Name:** `🔄 Auto-Sync e-EMR`
   - **URL:** Paste isi `bookmarklet.js`
6. Klik **Save**.

### B2. Cara Pakai Bookmarklet

1. Buka e-EMR.
2. Klik bookmark **`🔄 Auto-Sync e-EMR`**.
3. Panel muncul di halaman.
4. Pilih salah satu mode:
   - **Mode Paste:** Copy data dari Sheet → paste ke kotak "Paste Data Langsung" → klik Mulai Sync.
   - **Mode API:** Isi URL Sheet + API Key → klik Mulai Sync.

---

## 🧪 Uji Coba Tanpa Akses e-EMR

Jika e-EMR belum bisa diakses untuk inspeksi, latihan dulu:

1. Buka file **`test.html`** di browser (double-click).
2. Ini adalah form palsu yang menyerupai e-EMR.
3. Install extension (atau jalankan bookmarklet).
4. Copy data dari **`dummy_sheet_paste.txt`** → paste ke extension/bookmarklet.
5. Klik **Mulai Sync** → lihat form otomatis terisi dan tabel log bertambah.

---

## 🔧 Troubleshooting

| Masalah | Kemungkinan Penyebab | Solusi |
|---------|---------------------|--------|
| ❌ "Data paste kosong" | Belum copy data dari Sheet | Copy blok cell (termasuk header) dari Google Sheet |
| ❌ "Butuh header + data" | Hanya copy 1 baris / dari tempat lain | Pastikan minimal header + 1 baris data |
| ⚠️ "Selector tidak ditemukan" | ID/class field di e-EMR beda dengan config | Inspect ulang e-EMR, update mapping di settings extension |
| ❌ Tombol submit tidak ter-klik | Selector tombol salah / disabled | Cek selector tombol di Inspect |
| 🔄 Field terisi tapi tidak tersimpan | e-EMR pakai framework JS (React/Vue/Angular) | Naikkan **Jeda (ms)** jadi 2000–3000 di settings |
| 🐢 Proses sangat lambat | Delay default 1.5 detik per form | Itu normal. Jangan dipendekkan |
| Extension tidak muncul di toolbar | Belum di-pin / Developer mode mati | Buka `chrome://extensions` → aktifkan Developer mode → Load unpacked → Pin extension |

### Cara Lihat Error Detail

1. Saat di halaman e-EMR, tekan **`F12`**.
2. Pilih tab **Console**.
3. Lihat pesan error berwarna merah. Screenshot untuk dikirim ke tim IT.

---

## 🛡️ Catatan Keamanan & Privasi

- **Mode Paste (direkomendasikan)** adalah cara **paling aman**:
  - Tidak perlu API Key.
  - Google Sheet **tidak perlu di-share public** ke internet.
  - Data hanya dari clipboard browser langsung ke e-EMR intranet.
- Script berjalan **100% di sisi browser**. Tidak ada data pasien yang dikirim ke server luar.
- Config extension disimpan lokal di browser (tidak sync ke cloud).

---

## 📞 Butuh Bantuan?

Simpan informasi berikut sebelum menghubungi IT:
1. Solusi yang dipakai: **Extension** atau **Bookmarklet**?
2. Tanggal & jam kejadian.
3. Pesan error persis dari log (screenshot lebih baik).
4. Versi browser (Chrome/Edge) yang dipakai.

---

*Dokumen ini merupakan bagian dari proof-of-concept e-EMR Auto-Sync.*
