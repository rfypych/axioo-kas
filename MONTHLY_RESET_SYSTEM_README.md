# 🔄 Monthly Reset System & Enhanced Commands

## 📋 Overview

Sistem ini telah diperbaiki untuk mengatasi masalah koneksi laporan dengan data dan menambahkan fitur auto-reset bulanan yang memisahkan antara status pembayaran bulanan dan total akumulatif siswa.

## ✨ Fitur Utama

### 🔄 Auto-Reset Bulanan
- **Jadwal**: Setiap tanggal 1 jam 00:01 WIB
- **Timezone**: Asia/Jakarta  
- **Status**: Otomatis berjalan saat server aktif

### 📱 Enhanced Telegram Commands

#### `/iuran status` - Status Pembayaran Bulanan
```
📊 Status Iuran Mingguan:
📅 Bulan: 8/2025
💰 Iuran: Rp 3.000/minggu

✅✅✅✅ Rofikul Huda (Rp 12.000)
✅❌❌❌ Yoga Arif Nurrohman (Rp 3.000)
✅✅✅❌ Finza Hidan Firjatullah (Rp 9.000)
❌❌❌❌ Achmad Muzaki Asror
❌❌❌❌ Adira Putra Raihan

📋 Keterangan:
✅ = Lunas (Rp 3.000)
❕ = Sebagian (< Rp 3.000)
❌ = Belum bayar

💡 Format: Minggu 1-2-3-4
```

#### `/siswa` - Total Akumulatif (Tidak Direset)
```
👥 Daftar Siswa (34 orang):

1. Rofikul Huda
   💰 Total bayar: Rp 12.000

2. Yoga Arif Nurrohman
   💰 Total bayar: Rp 3.000

3. Finza Hidan Firjatullah
   💰 Total bayar: Rp 9.000

📋 Catatan:
• Total bayar = Akumulasi seluruh pembayaran
• Data tidak direset setiap bulan
• Gunakan /iuran status untuk status bulanan
```

## 🔄 Yang Direset Setiap Bulan

### ✅ Direset (Status Tracking)
- Status pembayaran mingguan (`/iuran status`)
- Progress per minggu (✅✅✅❌)
- Perhitungan persentase bulanan
- Laporan mingguan (Excel, CSV, PNG)

### 💾 Tidak Pernah Direset (Data Permanen)
- Data transaksi di database
- Total pembayaran siswa (`/siswa`)
- Saldo kas kelas
- Data master siswa

## 📦 Archive System

Setiap reset bulanan, data bulan sebelumnya disimpan ke tabel `monthly_payment_archive`:

```sql
CREATE TABLE monthly_payment_archive (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT,
    year INT,
    month INT,
    total_paid DECIMAL(15,2),
    weeks_paid INT,
    payment_percentage DECIMAL(5,2),
    status VARCHAR(50),
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🚀 Cara Penggunaan

### 1. Menjalankan Sistem
```bash
# Start web server (dengan auto-reset scheduler)
npm start

# Start telegram bot
npm run bot
```

### 2. Manual Reset (Jika Diperlukan)
```javascript
const MonthlyResetService = require('./services/MonthlyResetService');
const monthlyService = new MonthlyResetService();

// Manual reset
await monthlyService.manualReset();
```

### 3. Cek Status Siswa
```bash
# Status bulanan (direset setiap bulan)
/iuran status

# Total akumulatif (tidak pernah direset)
/siswa
```

## 🔧 Technical Implementation

### MonthlyResetService.js
- **Scheduler**: node-cron dengan timezone Asia/Jakarta
- **Archive**: Menyimpan data bulan sebelumnya
- **Status Calculation**: Berdasarkan transaksi bulan aktif
- **Notification**: Telegram notification (jika bot aktif)

### Enhanced Commands
- **`/iuran status`**: Menggunakan `MonthlyResetService.getAllStudentsCurrentMonthStatus()`
- **`/siswa`**: Query langsung ke tabel transactions (semua waktu)

### Database Queries

#### Current Month Status
```sql
SELECT 
    s.id, s.name,
    COALESCE(SUM(t.amount), 0) as monthly_paid,
    FLOOR(COALESCE(SUM(t.amount), 0) / 3000) as weeks_paid,
    (COALESCE(SUM(t.amount), 0) % 3000) as remainder
FROM students s
LEFT JOIN transactions t ON s.id = t.student_id 
    AND t.type = 'iuran' 
    AND YEAR(t.created_at) = ? 
    AND MONTH(t.created_at) = ?
GROUP BY s.id, s.name
```

#### Total All Time
```sql
SELECT COALESCE(SUM(amount), 0) as total_paid
FROM transactions 
WHERE student_id = ? AND type = 'iuran'
```

## 📊 Laporan System

### Enhanced Report Service
- **Fixed Logic**: Menggunakan logika kumulatif sederhana
- **Accurate Status**: Status sesuai dengan pembayaran aktual
- **Multiple Formats**: Excel, CSV, PNG
- **Monthly Reset**: Laporan direset setiap bulan

### Report Generation
```javascript
const reportService = new EnhancedReportService();

// Generate monthly report
const reportData = await reportService.generateMonthlyData(year, month);

// Generate Excel
await reportService.generateExcelReport(year, month);

// Generate CSV
await reportService.generateCSVReports(year, month);

// Generate Image
await reportService.generateImageReport(year, month);
```

## 🎯 Key Benefits

1. **Clear Separation**: Status bulanan vs total akumulatif
2. **Auto Reset**: Tidak perlu manual reset setiap bulan
3. **Data Integrity**: Transaksi tidak pernah hilang
4. **Visual Status**: Format ✅✅✅❌ mudah dipahami
5. **Archive System**: Riwayat data tersimpan
6. **Accurate Reports**: Laporan sesuai data aktual

## 🔍 Testing

```bash
# Test monthly system
node test-monthly-system.js

# Test telegram commands
node test-telegram-commands.js

# Demo final system
node demo-final-system.js

# Test enhanced reports
node test-enhanced-reports.js
```

## 📅 Scheduler Details

- **Cron Expression**: `1 0 1 * *` (00:01 on 1st day of every month)
- **Timezone**: Asia/Jakarta
- **Auto Start**: Dimulai saat server start
- **Error Handling**: Graceful error handling dengan logging

## 🎉 Result

Sistem sekarang memberikan:
- ✅ Status pembayaran yang akurat per minggu
- ✅ Total akumulatif yang tidak pernah hilang
- ✅ Auto-reset bulanan tanpa kehilangan data
- ✅ Laporan yang sesuai dengan data aktual
- ✅ Interface yang jelas dan mudah dipahami
