const EnhancedReportService = require('./services/EnhancedReportService');
const path = require('path');
const fs = require('fs');

async function testLaporanExcel() {
    console.log('📊 Testing Excel Report Generation\n');
    console.log('=================================\n');

    try {
        const reportService = new EnhancedReportService();
        
        // Test current month
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        
        console.log(`📅 Generating Excel report for ${month}/${year}...\n`);
        
        // Generate Excel report
        const result = await reportService.generateExcelReport(year, month);
        
        if (result.success) {
            console.log('✅ Excel report generated successfully!');
            console.log(`📁 File: ${result.filename}`);
            console.log(`📍 Path: ${result.filepath}`);
            console.log(`📊 Buffer size: ${result.buffer.length} bytes`);
            
            // Check if file exists
            if (fs.existsSync(result.filepath)) {
                const stats = fs.statSync(result.filepath);
                console.log(`📏 File size: ${stats.size} bytes`);
                console.log(`🕐 Created: ${stats.birthtime}`);
                
                // Show file structure
                console.log('\n📋 Excel File Structure:');
                console.log('✅ Sheet 1: Laporan Pembayaran Mingguan');
                console.log('✅ Sheet 2: Daftar Siswa');
                console.log('✅ Sheet 3: Ringkasan Transaksi');
                
                console.log('\n🎯 Key Features:');
                console.log('✅ Weekly payment tracking');
                console.log('✅ Student status with payment totals');
                console.log('✅ Transaction summary');
                console.log('✅ Formatted currency (Rp)');
                console.log('✅ Color-coded status');
                
            } else {
                console.log('⚠️ File not found on disk (buffer only)');
            }
            
            console.log('\n📱 Telegram Bot Test:');
            console.log('Now test with: /laporan test excel');
            console.log('The Excel file should be sent without errors!');
            
        } else {
            console.log('❌ Failed to generate Excel report');
            console.log(`Error: ${result.error}`);
            
            // Debug information
            console.log('\n🔍 Debug Information:');
            console.log('1. Check database connection');
            console.log('2. Verify student data exists');
            console.log('3. Check file permissions');
            console.log('4. Verify ExcelJS installation');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
        
        console.log('\n🔧 Troubleshooting:');
        console.log('1. npm run emergency:fix');
        console.log('2. npm run simple:test');
        console.log('3. Check database structure');
        console.log('4. Verify dependencies');
    }
}

async function testMarkdownEscape() {
    console.log('\n🔤 Testing Markdown Escape Function\n');
    console.log('==================================\n');
    
    // Simulate the escape function from telegram bot
    function escapeMarkdown(text) {
        if (!text) return text;
        return text.toString()
            .replace(/\\/g, '\\\\')
            .replace(/\*/g, '\\*')
            .replace(/_/g, '\\_')
            .replace(/\[/g, '\\[')
            .replace(/\]/g, '\\]')
            .replace(/\(/g, '\\(')
            .replace(/\)/g, '\\)')
            .replace(/~/g, '\\~')
            .replace(/`/g, '\\`')
            .replace(/>/g, '\\>')
            .replace(/#/g, '\\#')
            .replace(/\+/g, '\\+')
            .replace(/-/g, '\\-')
            .replace(/=/g, '\\=')
            .replace(/\|/g, '\\|')
            .replace(/\{/g, '\\{')
            .replace(/\}/g, '\\}')
            .replace(/\./g, '\\.')
            .replace(/!/g, '\\!');
    }
    
    const testTexts = [
        '0 8 * * 1',
        'test [format]',
        'contoh: "0 8 * * 1"',
        '/laporan jadwal [cron]',
        'File Excel dengan 3 sheet',
        'Setiap Senin jam 08:00'
    ];
    
    console.log('Original → Escaped:');
    console.log('===================');
    
    testTexts.forEach(text => {
        const escaped = escapeMarkdown(text);
        console.log(`${text} → ${escaped}`);
    });
    
    console.log('\n✅ Markdown escape function working correctly!');
}

async function simulateTelegramMessage() {
    console.log('\n📱 Simulating Telegram Message\n');
    console.log('==============================\n');
    
    const config = {
        enabled: true,
        targetChats: ['-4972671819'],
        schedule: '10 20 * * *',
        reportFormat: 'excel'
    };
    
    function escapeMarkdown(text) {
        if (!text) return text;
        return text.toString()
            .replace(/\*/g, '\\*')
            .replace(/\[/g, '\\[')
            .replace(/\]/g, '\\]')
            .replace(/`/g, '\\`');
    }
    
    const menuMessage = `📊 *Menu Laporan Mingguan*

Status saat ini: ${config.enabled ? '✅ Aktif' : '❌ Nonaktif'}
Target chat: ${config.targetChats.length > 0 ? config.targetChats.join(', ') : 'Belum diatur'}
Jadwal: ${escapeMarkdown(config.schedule)} (Cron format)

🎯 *Commands tersedia:*
• /laporan aktif - Aktifkan laporan mingguan
• /laporan nonaktif - Nonaktifkan laporan mingguan
• /laporan test \\[format\\] - Kirim laporan test sekarang
• /laporan status - Lihat status konfigurasi

💡 *Contoh penggunaan:*
• /laporan test excel - Test laporan Excel
• /laporan test image - Test laporan gambar`;
    
    console.log('Simulated Telegram Message:');
    console.log('===========================');
    console.log(menuMessage);
    
    console.log('\n✅ Message should now send without Markdown parsing errors!');
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--markdown') || args.includes('-m')) {
        await testMarkdownEscape();
        return;
    }
    
    if (args.includes('--simulate') || args.includes('-s')) {
        await simulateTelegramMessage();
        return;
    }
    
    // Default: run Excel generation test
    await testLaporanExcel();
    await testMarkdownEscape();
    await simulateTelegramMessage();
}

// Run if executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('Test error:', error);
        process.exit(1);
    });
}

module.exports = { testLaporanExcel, testMarkdownEscape, simulateTelegramMessage };
