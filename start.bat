@echo off
echo ========================================
echo    AXIOO KAS - Aplikasi Kas Kelas
echo    dengan Telegram Bot & Mistral AI
echo ========================================
echo.

echo [1/3] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js tidak ditemukan!
    echo Silakan install Node.js terlebih dahulu.
    pause
    exit /b 1
)

echo [2/3] Installing dependencies...
call yarn install
if errorlevel 1 (
    echo ERROR: Gagal install dependencies!
    echo Mencoba dengan npm...
    call npm install
    if errorlevel 1 (
        echo ERROR: Gagal install dependencies dengan npm juga!
        pause
        exit /b 1
    )
)

echo [3/3] Setting up database...
node setup-database.js
if errorlevel 1 (
    echo ERROR: Gagal setup database!
    echo Pastikan MySQL sudah running dan konfigurasi .env benar.
    pause
    exit /b 1
)

echo.
echo ========================================
echo    SETUP SELESAI!
echo ========================================
echo.
echo Aplikasi siap dijalankan:
echo   Web App: yarn start
echo   Telegram Bot: yarn bot
echo.
echo URL Akses:
echo   Dashboard: http://localhost:3007
echo   Admin Panel: http://localhost:3007/admin
echo   Login: admin / admin123
echo.
pause
