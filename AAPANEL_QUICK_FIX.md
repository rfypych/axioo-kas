# 🚨 aaPanel Quick Fix - Bot Telegram Menampilkan 0 Siswa

## ⚡ Solusi Cepat (5 Menit)

```bash
# 1. Fix struktur database (PENTING!)
npm run fix:database

# 2. Test sederhana
npm run simple:test

# 3. Auto-fix masalah aaPanel lainnya
npm run aapanel:fix

# 4. Start bot
npm run bot
```

## 🔥 Error "Unknown column 'status'"

Jika muncul error ini, jalankan:
```bash
npm run fix:database
```

Script ini akan:
- ✅ Menambahkan kolom `status` yang hilang
- ✅ Menambahkan kolom `exit_date`, `exit_reason`
- ✅ Menambahkan kolom `week_number`, `year` di transactions
- ✅ Update semua siswa ke status 'active'

## 🔍 Jika Masih Bermasalah

```bash
# Diagnostic lengkap
npm run aapanel:test

# Tambah data siswa contoh
npm run test:siswa:sample

# Test khusus siswa
npm run test:siswa
```

## 📋 Kemungkinan Penyebab

1. **Database tidak terhubung** → Auto-fix akan mendeteksi konfigurasi yang benar
2. **Tabel tidak ada** → Auto-fix akan membuat tabel otomatis  
3. **Tidak ada data siswa** → Gunakan `npm run test:siswa:sample`
4. **Konfigurasi MySQL salah** → Auto-fix akan test berbagai konfigurasi
5. **Permission database** → Cek di aaPanel Database Manager

## 🎯 Target Hasil

Setelah fix, command `/siswa` di bot harus menampilkan:
```
👥 Daftar Siswa (5 orang):

1. Ahmad Fauzi - XI TKJ A
   💰 Total: Rp 0
   📊 Pembayaran: 0 kali

2. Siti Nurhaliza - XI TKJ A  
   💰 Total: Rp 0
   📊 Pembayaran: 0 kali

... dst
```

## 🆘 Jika Tetap Gagal

1. **Cek MySQL service:**
   ```bash
   systemctl status mysql
   systemctl start mysql  # jika tidak berjalan
   ```

2. **Cek permission database di aaPanel:**
   - Login aaPanel → Database → User privileges
   - Pastikan user memiliki SELECT, INSERT, UPDATE, DELETE

3. **Manual test:**
   ```bash
   mysql -u root -p
   USE axioo_kas;
   SELECT COUNT(*) FROM students;
   ```

4. **Cek log error:**
   ```bash
   npm run bot
   # Lihat error di console
   ```

## 📞 Support Commands

```bash
npm run quick              # Test cepat (5 detik)
npm run aapanel:setup      # Setup otomatis
npm run aapanel:fix        # Auto-fix + verify
npm run aapanel:test       # Test lengkap
npm run aapanel:diagnose   # Diagnostic saja
npm run test:siswa         # Test khusus siswa
npm run test:siswa:sample  # Tambah data contoh
```

---

**💡 Tips:** Selalu jalankan `npm run quick` terlebih dahulu untuk identifikasi cepat masalah, lalu gunakan `npm run aapanel:fix` untuk solusi otomatis.
