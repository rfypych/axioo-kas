# 🏦 Axioo Kas - Aplikasi Kas Kelas dengan AI Integration

Aplikasi web modern untuk manajemen kas kelas yang terintegrasi dengan Telegram Bot dan Mistral AI untuk pemrosesan perintah natural language.

## ✨ Fitur Utama

### 🌐 Web Application
- **Dashboard Interaktif** - Statistik real-time, grafik transaksi, progress iuran
- **Manajemen Transaksi** - CRUD lengkap dengan filter dan pencarian
- **Data Siswa** - Kelola data siswa dan tracking pembayaran
- **Iuran Mingguan** - Sistem tracking iuran dengan progress bar
- **Laporan** - Analisis dan export data
- **Admin Panel** - Kontrol penuh sistem dengan safety features

### 🤖 Telegram Bot Integration
- **Natural Language Commands** - Perintah dalam bahasa Indonesia
- **AI Processing** - Mistral AI untuk interpretasi perintah
- **Real-time Notifications** - Alert otomatis untuk transaksi
- **Multi-command Support** - 8+ perintah bot yang lengkap

### 🧠 Mistral AI Features
- **Smart Command Processing** - Contoh: "kas 3000 muzaki"
- **Auto Student Detection** - Pencarian nama siswa otomatis
- **Confidence Scoring** - Validasi akurasi interpretasi AI
- **Fallback Suggestions** - Konfirmasi untuk perintah ambigu

## 🚀 Quick Start

### 1. Setup Awal
```bash
# Clone atau extract project
cd axioo-kas

# Install dependencies
yarn install
# atau
npm install

# Setup database
node setup-database.js
```

### 2. Konfigurasi Environment
Edit file `.env`:
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
```

### 3. Jalankan Aplikasi

#### Windows (Recommended)
```bash
# Setup lengkap (sekali saja)
start.bat

# Jalankan web app
start-web.bat

# Jalankan telegram bot
start-bot.bat
```

#### Manual
```bash
# Web application
yarn start
# atau
node app.js

# Telegram bot (terminal terpisah)
yarn bot
# atau
node telegram-bot.js
```

## 📱 Akses Aplikasi

- **Web Dashboard**: http://localhost:3007
- **Admin Panel**: http://localhost:3007/admin
- **API Test**: http://localhost:3007/test
- **Login**: `admin` / `admin123`

## 🤖 Telegram Bot Commands

### Basic Commands
- `/start` - Menu utama dan panduan
- `/saldo` - Cek saldo kas dan statistik
- `/help` - Bantuan lengkap

### Transaction Commands
- `/tambah [jumlah] [deskripsi]` - Tambah pemasukan/pengeluaran
- `/iuran [nama] [jumlah]` - Bayar iuran siswa
- `/iuran status` - Status iuran mingguan

### Information Commands
- `/riwayat` - 10 transaksi terakhir
- `/siswa` - Daftar semua siswa

### AI Commands
- `/ai [perintah]` - Proses dengan AI
- Atau kirim pesan langsung tanpa `/ai`

### Contoh Penggunaan
```
/tambah 50000 Sumbangan alumni
/iuran muzaki 5000
/ai kas 3000 andi
kas 5000 budi
beli spidol 15000
terima uang 100000 dari wali kelas
```

## 🧠 Mistral AI Integration

### Cara Kerja
1. **Input Processing** - AI menganalisis perintah natural language
2. **Entity Extraction** - Ekstrak jumlah, nama siswa, jenis transaksi
3. **Student Matching** - Pencarian nama siswa dari database
4. **Confidence Scoring** - Validasi akurasi interpretasi (0-1)
5. **Auto Execution** - Eksekusi otomatis jika confidence > 0.7

### Contoh AI Processing
```
Input: "kas 3000 muzaki"
AI Output:
{
  "type": "iuran",
  "amount": 3000,
  "student_name": "Achmad Muzaki Asror",
  "description": "Iuran kas",
  "confidence": 0.95
}
```

### Supported Commands
- **Iuran**: "kas [jumlah] [nama]", "iuran [nama] [jumlah]"
- **Pemasukan**: "terima [jumlah] [deskripsi]", "dapat [jumlah]"
- **Pengeluaran**: "beli [item] [jumlah]", "bayar [deskripsi] [jumlah]"

## 📊 Database Schema

### Students Table
```sql
CREATE TABLE students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    class_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NULL,
    email VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Transactions Table
```sql
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

## 🔧 API Endpoints

### Authentication
- `POST /login` - Login admin
- `GET /logout` - Logout

### Dashboard
- `GET /dashboard` - Dashboard utama
- `GET /api/stats` - Statistik real-time
- `GET /api/chart-data` - Data untuk grafik

### Transactions
- `GET /transactions` - List transaksi
- `POST /transactions` - Tambah transaksi
- `PUT /transactions/:id` - Update transaksi
- `DELETE /transactions/:id` - Hapus transaksi
- `POST /api/ai-command` - Proses AI command

### Students
- `GET /students` - List siswa
- `POST /students` - Tambah siswa
- `PUT /students/:id` - Update siswa
- `DELETE /students/:id` - Hapus siswa
- `GET /api/students` - API siswa

### Weekly Payments
- `GET /weekly-payments` - Iuran mingguan
- `POST /api/pay-weekly` - Bayar iuran

## 🛠️ Development

### Project Structure
```
axioo-kas/
├── config/          # Database & AI configuration
├── controllers/     # Business logic
├── models/          # Database models
├── routes/          # Express routes
├── views/           # EJS templates
├── public/          # Static assets
├── utils/           # Utility functions
├── app.js           # Main application
├── telegram-bot.js  # Telegram bot
└── setup-database.js # Database setup
```

### Tech Stack
- **Backend**: Node.js, Express.js
- **Database**: MySQL with mysql2
- **Template Engine**: EJS
- **Frontend**: Bootstrap 5, Chart.js
- **Bot**: node-telegram-bot-api
- **AI**: Mistral AI API
- **Session**: express-session

### Dependencies
```json
{
  "express": "^4.18.2",
  "ejs": "^3.1.9",
  "mysql2": "^3.6.5",
  "node-telegram-bot-api": "^0.66.0",
  "axios": "^1.6.2",
  "dotenv": "^16.3.1",
  "express-session": "^1.17.3",
  "bcryptjs": "^2.4.3",
  "moment": "^2.29.4",
  "cors": "^2.8.5"
}
```

## 🔒 Security Features

- **Session Management** - Secure admin authentication
- **Input Validation** - Sanitasi input untuk mencegah injection
- **CORS Protection** - Cross-origin request protection
- **Error Handling** - Comprehensive error handling
- **SQL Injection Prevention** - Prepared statements

## 📱 Mobile Responsive

- **Bootstrap 5** - Mobile-first responsive design
- **Touch Friendly** - Optimized for mobile interaction
- **Progressive Web App** - PWA capabilities
- **Sidebar Navigation** - Collapsible mobile menu

## 🚀 Deployment

### Production Setup
1. **Environment Variables** - Set production values
2. **Database** - Configure production MySQL
3. **SSL/HTTPS** - Enable secure connections
4. **Process Manager** - Use PM2 for production
5. **Reverse Proxy** - Nginx configuration

### PM2 Configuration
```bash
# Install PM2
npm install -g pm2

# Start applications
pm2 start app.js --name "axioo-kas-web"
pm2 start telegram-bot.js --name "axioo-kas-bot"

# Save PM2 configuration
pm2 save
pm2 startup
```

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Pastikan MySQL running
   - Cek konfigurasi .env
   - Verifikasi user permissions

2. **Telegram Bot Not Responding**
   - Cek TELEGRAM_BOT_TOKEN di .env
   - Pastikan bot token valid
   - Verifikasi network connectivity

3. **Mistral AI Not Working**
   - Cek MISTRAL_API_KEY di .env
   - Verifikasi API key valid
   - Cek quota API

4. **Port Already in Use**
   - Ubah PORT di .env
   - Kill process yang menggunakan port
   - Restart aplikasi

## 📞 Support

Untuk bantuan dan support:
- **Documentation**: Baca README.md lengkap
- **Issues**: Laporkan bug atau request fitur
- **Development**: Kontribusi welcome!

## 📄 License

MIT License - Bebas digunakan untuk keperluan pendidikan dan komersial.

---

**Axioo Kas** - Aplikasi Kas Kelas Modern dengan AI Integration 🚀
