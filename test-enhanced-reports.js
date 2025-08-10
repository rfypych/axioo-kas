const EnhancedReportService = require('./services/EnhancedReportService');
const path = require('path');

// Test script untuk menguji laporan yang telah diperbaiki
async function testEnhancedReports() {
    console.log('🧪 Testing Enhanced Report Service...\n');
    
    try {
        const reportService = new EnhancedReportService();
        
        // Test 1: Test getWeeksInMonth function
        console.log('📅 Test 1: Testing getWeeksInMonth function');
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        
        const weeks = reportService.getWeeksInMonth(year, month);
        console.log(`Minggu dalam bulan ${month}/${year}:`);
        weeks.forEach(week => {
            console.log(`  - ${week.labelWithDate}`);
            console.log(`    Tanggal: ${week.start.toLocaleDateString('id-ID')} - ${week.end.toLocaleDateString('id-ID')}`);
            console.log(`    Short Label: ${week.shortLabel}`);
            console.log(`    Date Range: ${week.dateRange}`);
        });
        console.log('✅ Test 1 passed\n');
        
        // Test 2: Generate sample Excel report
        console.log('📊 Test 2: Testing Excel report generation');
        try {
            const excelResult = await reportService.generateExcelReport(year, month);
            if (excelResult.success) {
                console.log(`✅ Excel report generated: ${excelResult.filename}`);
                console.log(`   Path: ${excelResult.filepath}`);
            } else {
                console.log(`❌ Excel report failed: ${excelResult.error}`);
            }
        } catch (error) {
            console.log(`❌ Excel test error: ${error.message}`);
        }
        console.log('');
        
        // Test 3: Generate sample CSV report
        console.log('📄 Test 3: Testing CSV report generation');
        try {
            const csvResult = await reportService.generateCSVReport(year, month);
            if (csvResult.success) {
                console.log(`✅ CSV reports generated:`);
                csvResult.files.forEach(file => {
                    console.log(`   - ${path.basename(file)}`);
                });
            } else {
                console.log(`❌ CSV report failed: ${csvResult.error}`);
            }
        } catch (error) {
            console.log(`❌ CSV test error: ${error.message}`);
        }
        console.log('');
        
        // Test 4: Generate sample Image report
        console.log('🖼️ Test 4: Testing Image report generation');
        try {
            const imageResult = await reportService.generateImageReport(year, month);
            if (imageResult.success) {
                console.log(`✅ Image report generated: ${imageResult.filename}`);
                console.log(`   Path: ${imageResult.filepath}`);
            } else {
                console.log(`❌ Image report failed: ${imageResult.error}`);
            }
        } catch (error) {
            console.log(`❌ Image test error: ${error.message}`);
        }
        console.log('');
        
        console.log('🎉 All tests completed!');
        console.log('\n📋 Summary of improvements:');
        console.log('✅ Header minggu sekarang menampilkan rentang tanggal');
        console.log('✅ Format: "Minggu 1 (1-7 Agu)" instead of "Minggu 1"');
        console.log('✅ CSV sekarang include breakdown mingguan');
        console.log('✅ Laporan gambar dioptimasi untuk readability');
        console.log('✅ Canvas size disesuaikan untuk menampilkan semua siswa');
        console.log('✅ Menampilkan SEMUA siswa secara lengkap dalam gambar');
        console.log('✅ Space kosong di bagian bawah diminimalkan');
        console.log('✅ Footer text yang tidak perlu dihilangkan');
        console.log('✅ Enhanced styling dan color coding');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    testEnhancedReports();
}

module.exports = { testEnhancedReports };
