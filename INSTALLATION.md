# 📦 Panduan Instalasi Axioo Kas

Panduan lengkap instalasi aplikasi kas kelas dengan Telegram Bot dan Mistral AI integration.

## 🔧 Persyaratan Sistem

### Software Requirements
- **Node.js** v16.0.0 atau lebih baru
- **MySQL** v5.7 atau lebih baru (atau MariaDB)
- **Yarn** atau **npm** (package manager)
- **Git** (opsional, untuk clone repository)

### Hardware Requirements
- **RAM**: Minimal 512MB, disarankan 1GB+
- **Storage**: Minimal 100MB free space
- **Network**: Koneksi internet untuk API calls

## 🚀 Instalasi Cepat (Windows)

### 1. Download dan Extract
```bash
# Download project atau extract ZIP file
cd axioo-kas
```

### 2. Jalankan Setup Otomatis
```bash
# Double-click file ini atau jalankan di Command Prompt
start.bat
```

Setup otomatis akan:
- ✅ Check Node.js installation
- ✅ Install dependencies dengan Yarn/npm
- ✅ Setup database MySQL
- ✅ Insert sample data
- ✅ Konfigurasi environment

### 3. Jalankan Aplikasi
```bash
# Web Application
start-web.bat

# Telegram Bot (terminal terpisah)
start-bot.bat
```

## 🔧 Instalasi Manual

### Step 1: Install Dependencies
```bash
# Menggunakan Yarn (recommended)
yarn install

# Atau menggunakan npm
npm install
```

### Step 2: Konfigurasi Environment
Buat file `.env` atau edit yang sudah ada:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=axioo_kas

# Web App Configuration
PORT=3007
NODE_ENV=development

# Admin Configuration
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
SESSION_SECRET=axioo-kas-secret-key-2024

# Telegram Bot Configuration (Optional)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# Mistral AI Configuration (Optional)
MISTRAL_API_KEY=your_mistral_api_key
MISTRAL_MODEL=mistral-large-latest

# Security
JWT_SECRET=axioo-jwt-secret-2024
BCRYPT_ROUNDS=12

# Features
ENABLE_TELEGRAM_BOT=true
ENABLE_AI_FEATURES=true
ENABLE_NOTIFICATIONS=true
```

### Step 3: Setup Database
```bash
# Jalankan setup database
node setup-database.js
```

Script ini akan:
- Membuat database `axioo_kas`
- Membuat tabel `students` dan `transactions`
- Insert 27 sample siswa XI TKJ A
- Insert sample transaksi
- Membuat database views

### Step 4: Test Koneksi
```bash
# Test semua koneksi
node test-connection.js
```

### Step 5: Jalankan Aplikasi
```bash
# Web Application
yarn start
# atau
node app.js

# Telegram Bot (terminal terpisah)
yarn bot
# atau
node telegram-bot.js
```

## 🔑 Konfigurasi API Keys

### Telegram Bot Token
1. Buka [@BotFather](https://t.me/botfather) di Telegram
2. Kirim `/newbot` dan ikuti instruksi
3. Copy token yang diberikan
4. Masukkan ke `.env` sebagai `TELEGRAM_BOT_TOKEN`

### Mistral AI API Key
1. Daftar di [Mistral AI](https://mistral.ai/)
2. Buat API key di dashboard
3. Masukkan ke `.env` sebagai `MISTRAL_API_KEY`

## 🗄️ Konfigurasi Database

### MySQL Setup
```sql
-- Buat user khusus (opsional)
CREATE USER 'axioo_kas'@'localhost' IDENTIFIED BY 'password123';
GRANT ALL PRIVILEGES ON axioo_kas.* TO 'axioo_kas'@'localhost';
FLUSH PRIVILEGES;

-- Atau gunakan root user
-- Update .env dengan credentials yang sesuai
```

### Database Structure
```sql
-- Students table
CREATE TABLE students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    class_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NULL,
    email VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Transactions table
CREATE TABLE transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('income', 'expense', 'iuran') NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    description TEXT NOT NULL,
    student_id INT NULL,
    created_by VARCHAR(100) NOT NULL DEFAULT 'system',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL
);
```

## 🌐 Akses Aplikasi

Setelah instalasi berhasil:

### Web Application
- **URL**: http://localhost:3007
- **Login**: `admin` / `admin123`
- **Dashboard**: http://localhost:3007/dashboard
- **Admin Panel**: http://localhost:3007/admin

### API Endpoints
- **Test API**: http://localhost:3007/test
- **Stats API**: http://localhost:3007/api/stats
- **Students API**: http://localhost:3007/api/students

### Telegram Bot
1. Cari bot Anda di Telegram
2. Kirim `/start` untuk memulai
3. Gunakan commands seperti `/saldo`, `/tambah`, dll

## 🔧 Troubleshooting

### Error: Database Connection Failed
```bash
# Check MySQL service
# Windows: Services.msc -> MySQL
# Pastikan MySQL running

# Check credentials di .env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=axioo_kas
```

### Error: Port Already in Use
```bash
# Ubah port di .env
PORT=3008

# Atau kill process yang menggunakan port
netstat -ano | findstr :3007
taskkill /PID <PID_NUMBER> /F
```

### Error: Telegram Bot Not Responding
```bash
# Check token di .env
TELEGRAM_BOT_TOKEN=your_valid_token

# Test token dengan curl
curl https://api.telegram.org/bot<TOKEN>/getMe
```

### Error: Mistral AI Not Working
```bash
# Check API key di .env
MISTRAL_API_KEY=your_valid_api_key

# Test API key
curl -H "Authorization: Bearer <API_KEY>" https://api.mistral.ai/v1/models
```

### Error: Dependencies Installation Failed
```bash
# Clear cache dan reinstall
yarn cache clean
rm -rf node_modules
yarn install

# Atau dengan npm
npm cache clean --force
rm -rf node_modules
npm install
```

## 📱 Mobile Access

Aplikasi sudah responsive dan dapat diakses melalui:
- **Desktop Browser**: Chrome, Firefox, Edge
- **Mobile Browser**: Chrome Mobile, Safari Mobile
- **Tablet**: iPad, Android Tablet

## 🔒 Security Considerations

### Production Deployment
```env
# Set production environment
NODE_ENV=production

# Use strong passwords
ADMIN_PASSWORD=strong_password_here
SESSION_SECRET=random_secret_key_here

# Enable HTTPS
# Configure reverse proxy (Nginx/Apache)
```

### Database Security
- Gunakan user database khusus (bukan root)
- Set password yang kuat
- Batasi akses network jika perlu
- Regular backup database

## 📊 Performance Optimization

### Database Optimization
```sql
-- Add indexes for better performance
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_students_name ON students(name);
```

### Application Optimization
- Enable gzip compression
- Use CDN untuk static assets
- Implement caching strategy
- Monitor memory usage

## 🔄 Updates dan Maintenance

### Update Dependencies
```bash
# Check outdated packages
yarn outdated

# Update packages
yarn upgrade

# Update specific package
yarn upgrade package-name
```

### Database Backup
```bash
# Manual backup
mysqldump -u root -p axioo_kas > backup_$(date +%Y%m%d).sql

# Restore backup
mysql -u root -p axioo_kas < backup_20241208.sql
```

### Log Monitoring
```bash
# Check application logs
tail -f logs/app.log

# Check error logs
tail -f logs/error.log
```

## 📞 Support

Jika mengalami masalah:

1. **Check Documentation**: Baca README.md dan INSTALLATION.md
2. **Run Test**: Jalankan `node test-connection.js`
3. **Check Logs**: Periksa console output untuk error messages
4. **Verify Configuration**: Pastikan .env file sudah benar
5. **Restart Services**: Restart MySQL dan aplikasi

---

**Selamat menggunakan Axioo Kas!** 🎉
