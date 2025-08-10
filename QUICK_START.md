# 🚀 Quick Start - Axioo Kas

Panduan cepat untuk menjalankan aplikasi Axioo Kas dalam 5 menit!

## ✅ Status Saat Ini

✅ **Dependencies installed** - npm install selesai
✅ **Code ready** - Semua file aplikasi sudah dibuat
✅ **Data siswa updated** - 34 siswa XI TKJ A sudah dimasukkan
⚠️ **Database setup needed** - Perlu setup MySQL
⚠️ **Optional: API keys** - Telegram Bot & Mistral AI (opsional)

## 🔧 Setup Database (Required)

### Option 1: XAMPP (Recommended untuk Windows)
1. **Download & Install XAMPP**
   - Download dari: https://www.apachefriends.org/
   - Install dengan default settings

2. **Start MySQL**
   - Buka XAMPP Control Panel
   - Klik "Start" pada MySQL
   - Pastikan status menjadi hijau

3. **Setup Database**
   ```bash
   # Di folder axioo-kas
   node setup-database.js
   ```

### Option 2: MySQL Standalone
1. **Install MySQL**
   - Download dari: https://dev.mysql.com/downloads/mysql/
   - Install dengan default settings

2. **Set Password (jika diminta)**
   - Update file `.env`:
   ```env
   DB_PASSWORD=your_mysql_password
   ```

3. **Setup Database**
   ```bash
   node setup-database.js
   ```

## 🚀 Jalankan Aplikasi

### Method 1: Batch Files (Windows)
```bash
# Jalankan web application
start-web.bat

# Buka browser ke: http://localhost:3007
# Login: admin / admin123
```

### Method 2: Manual
```bash
# Start web app
npm start

# Akses: http://localhost:3007
# Login: admin / admin123
```

## 🎯 Fitur yang Langsung Bisa Digunakan

### ✅ Tanpa Setup Tambahan
- ✅ **Web Dashboard** - Statistik kas real-time
- ✅ **Manajemen Transaksi** - Tambah/edit/hapus transaksi
- ✅ **Data 34 Siswa XI TKJ A** - Lengkap dengan sample data
- ✅ **Iuran Mingguan** - Tracking pembayaran siswa
- ✅ **Laporan & Analytics** - Grafik dan export data
- ✅ **Admin Panel** - Kontrol sistem
- ✅ **Mobile Responsive** - Akses dari HP

### 🔧 Perlu Setup Tambahan (Opsional)
- 🤖 **Telegram Bot** - Perlu bot token dari @BotFather
- 🧠 **Mistral AI** - Perlu API key dari mistral.ai

## 📱 URL Akses

Setelah aplikasi berjalan:

- **Dashboard**: http://localhost:3007
- **Login**: `admin` / `admin123`
- **Admin Panel**: http://localhost:3007/admin
- **API Test**: http://localhost:3007/test

## 🎮 Demo Features

### 1. Dashboard
- Lihat saldo kas: **Rp 130.000** (dari sample data)
- Progress iuran mingguan
- Grafik transaksi real-time
- Quick actions untuk transaksi cepat

### 2. Data Siswa
- 34 siswa XI TKJ A sudah tersedia
- Tracking pembayaran per siswa
- Bayar iuran langsung dari interface

### 3. Transaksi
- Sample transaksi sudah ada
- Tambah pemasukan/pengeluaran
- Filter dan pencarian

### 4. Iuran Mingguan
- Progress bar pembayaran
- Status per siswa (paid/pending)
- Bulk payment untuk multiple siswa

## 🔧 Troubleshooting

### Database Connection Failed
```bash
# 1. Pastikan MySQL running (XAMPP/MySQL service)
# 2. Check credentials di .env
# 3. Test connection:
node test-connection.js
```

### Port Already in Use
```bash
# Ubah port di .env
PORT=3008

# Atau kill process:
netstat -ano | findstr :3007
taskkill /PID <PID_NUMBER> /F
```

### Permission Denied
```bash
# Run as Administrator (Windows)
# Atau ubah folder permissions
```

## 🚀 Next Steps (Opsional)

### Setup Telegram Bot
1. Chat dengan @BotFather di Telegram
2. Buat bot baru dengan `/newbot`
3. Copy token ke `.env`:
   ```env
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   ```
4. Jalankan bot:
   ```bash
   start-bot.bat
   # atau
   npm run bot
   ```

### Setup Mistral AI
1. Daftar di https://mistral.ai/
2. Buat API key
3. Update `.env`:
   ```env
   MISTRAL_API_KEY=your_api_key_here
   ```
4. Test AI features di dashboard

## 📊 Sample Data yang Tersedia

### Siswa (34 orang)
- Achmad Muzaki Asror
- Adira Putra Raihan
- Afif Fadila Arub
- ... dan 31 siswa lainnya

### Transaksi Sample
- Saldo awal: Rp 100.000
- Iuran dari 5 siswa: Rp 25.000
- Pengeluaran spidol: Rp 25.000
- Sumbangan alumni: Rp 50.000
- **Total saldo**: Rp 150.000

## 🎉 Selamat!

Aplikasi Axioo Kas siap digunakan! 

### Fitur Utama:
✅ **Web Dashboard** yang modern dan responsive
✅ **34 Siswa XI TKJ A** dengan data lengkap
✅ **Sistem Iuran Mingguan** dengan tracking
✅ **Laporan & Analytics** dengan grafik
✅ **Admin Panel** untuk kontrol sistem
✅ **Mobile Friendly** untuk akses dari HP

### Bonus Features (dengan setup tambahan):
🤖 **Telegram Bot** dengan natural language
🧠 **Mistral AI** untuk smart commands

---

**Happy managing! 🏦💰**

Jika ada pertanyaan, check dokumentasi lengkap di:
- `README.md` - Overview lengkap
- `INSTALLATION.md` - Panduan detail
- `SUMMARY.md` - Ringkasan proyek
