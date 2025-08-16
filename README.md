<div align="center">

# 🏦 Axioo Kas - Aplikasi Kas Kelas dengan AI

**Aplikasi web modern untuk manajemen kas kelas yang terintegrasi dengan Telegram Bot dan Mistral AI untuk pemrosesan perintah natural language.**

<p>
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-18.x-green?style=for-the-badge&logo=node.js">
  <img alt="Express.js" src="https://img.shields.io/badge/Express.js-4.x-lightgrey?style=for-the-badge&logo=express">
  <img alt="Database" src="https://img.shields.io/badge/Database-MySQL-blue?style=for-the-badge&logo=mysql">
  <img alt="AI" src="https://img.shields.io/badge/AI-Mistral-orange?style=for-the-badge">
  <img alt="License" src="https://img.shields.io/badge/License-MIT-purple?style=for-the-badge">
</p>

</div>

---

## ✨ Fitur Utama

- **🌐 Dashboard Interaktif**: Statistik real-time, grafik transaksi, dan progress iuran mingguan.
- **🤖 Integrasi Telegram Bot**: Kelola kas langsung dari Telegram menggunakan perintah bahasa Indonesia.
- **🧠 Pemrosesan AI**: Didukung oleh Mistral AI untuk memahami perintah natural seperti `"kas 3000 untuk budi"`.
- **📊 Laporan Dinamis**: Generate laporan rutin dalam format Excel, CSV, atau gambar tabel.
- **⚙️ Sistem Iuran Fleksibel**:
    - Tanggal mulai rutin dapat diatur via perintah bot (`/laporan set-tanggal`).
    - Laporan dan status iuran otomatis menyesuaikan berdasarkan periode 7-harian dari tanggal mulai.
    - Sistem pembayaran iuran bersifat **kumulatif**, di mana pembayaran akan mengisi "slot" periode terlama yang belum lunas.
- **🔐 Keamanan**: Dilengkapi dengan session management, validasi input, dan proteksi dari SQL Injection.
- **📱 Desain Responsif**: Tampilan yang optimal di berbagai perangkat, baik desktop maupun mobile.

## 🚀 Quick Start

### 1. Kebutuhan Sistem
- Node.js (v18 atau lebih baru)
- MySQL Server

### 2. Setup Awal
```bash
# 1. Clone atau download project
git clone https://github.com/username/axioo-kas.git
cd axioo-kas

# 2. Install dependencies
npm install

# 3. Setup database
# (Pastikan service MySQL sudah berjalan)
node setup-database.js
```

### 3. Konfigurasi Environment
Salin file `.env.example` menjadi `.env` dan isi variabel yang dibutuhkan:
```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=axioo_kas

# Web App
PORT=3007

# Admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Mistral AI
MISTRAL_API_KEY=your_mistral_api_key_here
MISTRAL_MODEL=mistral-small-latest
```

### 4. Jalankan Aplikasi
- **Untuk Windows**: Gunakan `start.bat` untuk menjalankan web app dan bot secara bersamaan di terminal terpisah.
- **Manual (semua OS)**:
  ```bash
  # Jalankan web application (di satu terminal)
  npm start

  # Jalankan Telegram bot (di terminal lain)
  npm run bot
  ```

### 5. Akses Aplikasi
- **Web Dashboard**: http://localhost:3007
- **Login**: `admin` / `admin123` (sesuai `.env`)

---

## 📖 Detail & Panduan Lanjutan

<details>
<summary><strong>🤖 Daftar Perintah Telegram Bot</strong></summary>

### Perintah Dasar
- `/start` - Menampilkan menu utama dan panduan singkat.
- `/saldo` - Mengecek saldo kas terkini dan statistik umum.
- `/help` - Menampilkan panduan penggunaan bot yang lebih lengkap.

### Transaksi
- `/iuran [nama] [jumlah]` - Mencatat pembayaran iuran untuk seorang siswa.
- `/tambah [jumlah] [deskripsi]` - Mencatat pemasukan umum di luar iuran siswa (misal: donasi).
- `/kurang [jumlah] [deskripsi]` - Mencatat pengeluaran kas.

### Laporan & Status
- `/iuran status` - Menampilkan status pembayaran iuran kumulatif semua siswa.
- `/riwayat` - Melihat 10 transaksi terakhir yang tercatat.
- `/siswa` - Menampilkan daftar semua siswa yang aktif.

### Laporan Lanjutan
- `/laporan` - Menampilkan menu untuk mengelola laporan otomatis.
- `/laporan test [format]` - Mengirim laporan tes dengan format tertentu (`text`, `excel`, `csv`, `image`).
- `/laporan jadwal [cron_expression]` - Mengubah jadwal pengiriman laporan otomatis.
- `/laporan set-tanggal [YYYY-MM-DD]` - **Penting!** Mengatur tanggal dimulainya siklus iuran rutin.

### Perintah AI
- `/ai [perintah]` - Memproses perintah kompleks menggunakan AI.
- Anda juga bisa mengirim perintah natural language secara langsung tanpa diawali `/ai`.
  - **Contoh**: `bayar kas 6000 untuk muzaki dan nanda`, `beli spidol 15rb`, `dapat donasi 50000 dari kepsek`

</details>

<details>
<summary><strong>🛠️ Detail Teknis (Struktur Proyek & Tech Stack)</strong></summary>

### Struktur Proyek
```
axioo-kas/
├── config/          # Konfigurasi database & AI
├── controllers/     # Logika bisnis aplikasi
├── models/          # Model dan interaksi database
├── routes/          # Rute Express.js
├── services/        # Servis untuk logika spesifik (laporan, AI, dll.)
├── views/           # Template EJS untuk tampilan web
├── app.js           # Entry point utama aplikasi web
├── telegram-bot.js  # Entry point untuk Telegram bot
└── setup-database.js # Skrip untuk inisialisasi database
```

### Tech Stack
- **Backend**: Node.js, Express.js
- **Database**: MySQL (dengan `mysql2`)
- **Frontend**: EJS, Bootstrap 5, Chart.js
- **Bot**: `node-telegram-bot-api`
- **AI**: Mistral AI API
- **Lainnya**: `dotenv`, `express-session`, `cors`

</details>

<details>
<summary><strong>🚀 Panduan Deployment & Troubleshooting</strong></summary>

### Deployment dengan PM2
1. Install PM2 secara global: `npm install -g pm2`
2. Start aplikasi web: `pm2 start app.js --name "axioo-kas-web"`
3. Start bot: `pm2 start telegram-bot.js --name "axioo-kas-bot"`
4. Simpan konfigurasi: `pm2 save`
5. Atur agar PM2 berjalan saat startup: `pm2 startup`

### Troubleshooting Umum
- **Gagal Koneksi Database**: Pastikan service MySQL berjalan dan konfigurasi di `.env` sudah benar.
- **Bot Tidak Merespon**: Cek `TELEGRAM_BOT_TOKEN` di `.env`. Pastikan token valid dan bot memiliki koneksi internet.
- **AI Tidak Bekerja**: Cek `MISTRAL_API_KEY` dan pastikan kuota API Anda masih tersedia.
- **Port Sudah Digunakan**: Ubah `PORT` di `.env` atau matikan proses lain yang menggunakan port tersebut.

</details>

---
<div align="center">
  <p>Dibuat untuk keperluan edukasi dan manajemen kas yang lebih modern.</p>
</div>
