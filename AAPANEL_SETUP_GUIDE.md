# Axioo Kas - aaPanel Setup Guide

## 🚨 Masalah Umum di aaPanel

Jika bot Telegram menampilkan **0 siswa** padahal database sudah disetup, kemungkinan penyebabnya:

1. **Konfigurasi database tidak sesuai dengan aaPanel**
2. **Permission database user terbatas**
3. **MySQL socket path berbeda**
4. **Tabel tidak terbuat dengan benar**
5. **Data siswa tidak ada atau status tidak aktif**

## 🔧 Solusi Otomatis (Recommended)

### 1. Jalankan Diagnostic Tool
```bash
node diagnose-aapanel.js
```

Tool ini akan:
- ✅ Mendeteksi environment aaPanel
- ✅ Mengecek koneksi database
- ✅ Memverifikasi struktur tabel
- ✅ Menganalisis data siswa
- ✅ Memberikan solusi spesifik

### 2. Auto-Fix (Jika diagnostic menemukan masalah)
```bash
node diagnose-aapanel.js --fix
```
atau
```bash
node aapanel-setup.js
```

Tool ini akan:
- 🔍 Auto-detect konfigurasi MySQL yang benar
- 🏗️ Membuat database dan tabel jika belum ada
- ⚙️ Update konfigurasi database otomatis
- 📊 Menambahkan data siswa contoh jika kosong

### 3. Test Khusus Siswa
```bash
node test-siswa-aapanel.js
```

Untuk menambah data contoh:
```bash
node test-siswa-aapanel.js --add-sample
```

## 🛠️ Solusi Manual

### 1. Cek Koneksi Database

```bash
# Test koneksi dasar
node test-connection.js

# Jika gagal, coba konfigurasi alternatif
```

### 2. Konfigurasi Database untuk aaPanel

Edit `config/database.js` dengan konfigurasi yang sesuai:

#### Opsi A: Socket Connection (Umum di aaPanel)
```javascript
const dbConfig = {
    socketPath: '/tmp/mysql.sock', // atau path socket lainnya
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'axioo_kas',
    // ... config lainnya
};
```

#### Opsi B: Host dengan Port Alternatif
```javascript
const dbConfig = {
    host: '127.0.0.1', // gunakan IP instead of localhost
    port: 3306, // atau 3307, 3308
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'axioo_kas',
    // ... config lainnya
};
```

### 3. Buat Database dan Tabel Manual

```sql
-- 1. Buat database
CREATE DATABASE IF NOT EXISTS axioo_kas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE axioo_kas;

-- 2. Buat tabel students
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    class_name VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(255),
    status ENUM('active', 'inactive', 'graduated') DEFAULT 'active',
    exit_date DATE NULL,
    exit_reason TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. Buat tabel transactions
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT,
    type ENUM('income', 'expense', 'iuran') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    week_number INT,
    year INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL
);

-- 4. Buat tabel student_changes
CREATE TABLE IF NOT EXISTS student_changes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT,
    change_type ENUM('create', 'update', 'delete', 'status_change') NOT NULL,
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    changed_by VARCHAR(100),
    change_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 5. Tambah data siswa contoh
INSERT INTO students (name, class_name, phone, email, status) VALUES
('Ahmad Fauzi', 'XI TKJ A', '081234567890', 'ahmad@email.com', 'active'),
('Siti Nurhaliza', 'XI TKJ A', '081234567891', 'siti@email.com', 'active'),
('Budi Santoso', 'XI TKJ B', '081234567892', 'budi@email.com', 'active'),
('Dewi Sartika', 'XI TKJ B', '081234567893', 'dewi@email.com', 'active'),
('Rizki Pratama', 'XI TKJ A', '081234567894', 'rizki@email.com', 'active');
```

### 4. Update File .env

```env
# Database Configuration untuk aaPanel
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=axioo_kas
DB_PORT=3306

# Jika menggunakan socket, tambahkan:
# DB_SOCKET=/tmp/mysql.sock

# ... konfigurasi lainnya
```

## 🔍 Troubleshooting

### Error: "ECONNREFUSED"
```bash
# Cek status MySQL
systemctl status mysql
# atau
service mysql status

# Start MySQL jika tidak berjalan
systemctl start mysql
```

### Error: "Access denied"
```bash
# Cek user database di aaPanel
# Pastikan user memiliki permission:
# - SELECT, INSERT, UPDATE, DELETE
# - CREATE, DROP, ALTER
# - INDEX, REFERENCES
```

### Error: "Unknown database"
```bash
# Buat database manual via aaPanel atau command line
mysql -u root -p
CREATE DATABASE axioo_kas;
```

### Bot masih menampilkan 0 siswa
```bash
# 1. Cek data langsung
mysql -u root -p axioo_kas
SELECT COUNT(*) FROM students;
SELECT * FROM students LIMIT 5;

# 2. Cek status siswa
SELECT status, COUNT(*) FROM students GROUP BY status;

# 3. Test model
node test-siswa-aapanel.js
```

## 📋 Checklist Setup

- [ ] MySQL service berjalan
- [ ] Database `axioo_kas` ada
- [ ] Tabel `students`, `transactions`, `student_changes` ada
- [ ] User database memiliki permission penuh
- [ ] File `.env` konfigurasi benar
- [ ] `config/database.js` sesuai environment
- [ ] Ada data siswa dengan status 'active'
- [ ] Test koneksi berhasil: `node test-connection.js`
- [ ] Test siswa berhasil: `node test-siswa-aapanel.js`
- [ ] Bot Telegram berjalan: `node telegram-bot.js`
- [ ] Command `/siswa` menampilkan data

## 🚀 Quick Start untuk aaPanel

```bash
# 1. Clone/download project
cd /www/wwwroot/your-domain/axioo-kas

# 2. Install dependencies
npm install

# 3. Setup untuk aaPanel (OTOMATIS)
npm run aapanel:setup

# 4. Test setup lengkap
npm run aapanel:test

# 5. Jika ada masalah, auto-fix
npm run aapanel:fix

# 6. Start bot
npm run bot

# 7. Test di Telegram
/start
/siswa
```

## 📋 NPM Scripts untuk aaPanel

```bash
# Setup otomatis untuk aaPanel
npm run aapanel:setup

# Test lengkap (diagnostic + siswa)
npm run aapanel:test

# Auto-fix masalah yang ditemukan
npm run aapanel:fix

# Diagnostic saja
npm run aapanel:diagnose

# Test khusus data siswa
npm run test:siswa

# Tambah data siswa contoh
npm run test:siswa:sample
```

## 📞 Support

Jika masih mengalami masalah:

1. **Jalankan diagnostic lengkap:**
   ```bash
   node diagnose-aapanel.js
   ```

2. **Cek log error detail:**
   ```bash
   node telegram-bot.js
   # Lihat error di console
   ```

3. **Test step by step:**
   ```bash
   node test-connection.js
   node test-siswa-aapanel.js
   node simple-debug.js
   ```

4. **Manual verification:**
   - Login ke aaPanel → Database → Check tables
   - Login ke aaPanel → File Manager → Check .env
   - SSH ke server → Check MySQL service

## 🔄 Update Konfigurasi

Jika pindah server atau ganti konfigurasi:

```bash
# Backup konfigurasi lama
cp config/database.js config/database.js.backup
cp .env .env.backup

# Jalankan setup ulang
node aapanel-setup.js

# Test ulang
node test-connection.js
```

---

**💡 Tips:** Selalu gunakan tool otomatis (`aapanel-setup.js`) terlebih dahulu sebelum konfigurasi manual. Tool ini dirancang khusus untuk mendeteksi dan mengatasi masalah umum di environment aaPanel.
