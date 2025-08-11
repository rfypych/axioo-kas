const MultiWeekPaymentService = require('./services/MultiWeekPaymentService');

function checkSeptemberCalendar() {
    console.log('📅 Analisis Kalender September 2025\n');
    console.log('==================================\n');

    // Check September 1, 2025
    const sept1 = new Date(2025, 8, 1); // Month is 0-indexed, so 8 = September
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    
    console.log(`📅 1 September 2025 = ${dayNames[sept1.getDay()]}\n`);
    
    // Show September 2025 calendar
    console.log('📅 Kalender September 2025:');
    console.log('===========================');
    console.log('Min  Sen  Sel  Rab  Kam  Jum  Sab');
    console.log('---  ---  ---  ---  ---  ---  ---');
    
    // Get first day of September and how many days
    const firstDay = sept1.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysInSeptember = new Date(2025, 9, 0).getDate(); // 30 days
    
    let calendar = '';
    let dayCount = 1;
    
    // First week - add spaces for days before September 1
    for (let i = 0; i < firstDay; i++) {
        calendar += '     ';
    }
    
    // Add all days of September
    for (let day = 1; day <= daysInSeptember; day++) {
        calendar += day.toString().padStart(3, ' ') + '  ';
        
        // New line after Saturday
        if ((firstDay + day - 1) % 7 === 6) {
            calendar += '\n';
        }
    }
    
    console.log(calendar);
    console.log('');
    
    // Analyze weeks using the system's logic
    const multiWeekService = new MultiWeekPaymentService();
    
    console.log('🔢 Analisis Minggu Menggunakan Sistem:');
    console.log('=====================================');
    
    // Check key dates in September
    const keyDates = [
        new Date(2025, 8, 1),   // Sept 1
        new Date(2025, 8, 7),   // Sept 7
        new Date(2025, 8, 14),  // Sept 14
        new Date(2025, 8, 21),  // Sept 21
        new Date(2025, 8, 28),  // Sept 28
        new Date(2025, 8, 30),  // Sept 30 (last day)
    ];
    
    keyDates.forEach(date => {
        const weekNum = multiWeekService.getWeekNumber(date);
        const dayName = dayNames[date.getDay()];
        const dateStr = date.toLocaleDateString('id-ID');
        
        console.log(`${dateStr} (${dayName}) = Minggu ke-${weekNum} tahun 2025`);
    });
    
    console.log('');
    
    // Check when week 4 ends and week 1 of next month starts
    console.log('🔄 Analisis Perpindahan Minggu:');
    console.log('===============================');
    
    // Find the last day of week 4 in September
    const lastDaySept = new Date(2025, 8, 30);
    const lastWeekSept = multiWeekService.getWeekNumber(lastDaySept);
    
    console.log(`📅 30 September 2025 = Minggu ke-${lastWeekSept}`);
    
    // Check first days of October
    const oct1 = new Date(2025, 9, 1);
    const oct7 = new Date(2025, 9, 7);
    const weekOct1 = multiWeekService.getWeekNumber(oct1);
    const weekOct7 = multiWeekService.getWeekNumber(oct7);
    
    console.log(`📅 1 Oktober 2025 = Minggu ke-${weekOct1} (${dayNames[oct1.getDay()]})`);
    console.log(`📅 7 Oktober 2025 = Minggu ke-${weekOct7} (${dayNames[oct7.getDay()]})`);
    
    console.log('');
    
    // Explain the reset logic
    console.log('💡 Penjelasan Reset Sistem:');
    console.log('===========================');
    console.log('1. Reset BULANAN terjadi setiap tanggal 1 jam 00:01 WIB');
    console.log('2. Reset ini untuk STATUS PEMBAYARAN, bukan minggu kalender');
    console.log('3. Minggu kalender tetap mengikuti ISO week numbering');
    console.log('4. Status pembayaran direset untuk tracking bulan baru');
    console.log('');
    
    // Show monthly vs weekly reset difference
    console.log('🔄 Perbedaan Reset Bulanan vs Mingguan:');
    console.log('======================================');
    console.log('📅 RESET BULANAN (1 Sept 00:01):');
    console.log('   • Status pembayaran siswa direset');
    console.log('   • Progress ✅✅✅❌ kembali ke ❌❌❌❌');
    console.log('   • Laporan bulan baru dimulai');
    console.log('   • Data transaksi TETAP ADA (tidak hilang)');
    console.log('');
    console.log('📅 MINGGU KALENDER:');
    console.log('   • Tetap mengikuti sistem ISO week');
    console.log('   • Minggu 1-52/53 per tahun');
    console.log('   • Tidak terpengaruh reset bulanan');
    console.log('');
    
    // Show practical example
    console.log('🎯 Contoh Praktis September 2025:');
    console.log('=================================');
    
    if (sept1.getDay() === 1) { // Monday
        console.log('✅ 1 September 2025 = SENIN');
        console.log('📊 Minggu ke-1 September: 1-7 September');
        console.log('📊 Minggu ke-2 September: 8-14 September');
        console.log('📊 Minggu ke-3 September: 15-21 September');
        console.log('📊 Minggu ke-4 September: 22-28 September');
        console.log('📊 Sisa hari: 29-30 September (masuk minggu ke-5 atau minggu 1 Oktober)');
    } else {
        console.log(`❌ 1 September 2025 = ${dayNames[sept1.getDay()]} (bukan Senin)`);
        console.log('📊 Minggu akan dimulai dari hari Senin terdekat');
    }
    
    console.log('');
    console.log('🔄 Reset Berikutnya:');
    console.log('1 Oktober 2025 jam 00:01 WIB - Status pembayaran direset lagi');
}

// Run the analysis
checkSeptemberCalendar();
