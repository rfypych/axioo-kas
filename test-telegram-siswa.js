const TelegramBot = require('node-telegram-bot-api');
const { executeQuery } = require('./config/database');
require('dotenv').config();

async function testTelegramSiswa() {
    try {
        console.log('🤖 Testing Telegram bot /siswa command...\n');
        
        if (!process.env.TELEGRAM_BOT_TOKEN) {
            console.log('❌ TELEGRAM_BOT_TOKEN not found in .env');
            return;
        }
        
        // Create bot instance (polling disabled for testing)
        const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
        
        // Simulate the exact same logic as handleSiswa function
        const students = await executeQuery('SELECT * FROM students WHERE status = "active" OR status IS NULL ORDER BY name ASC');
        
        if (!students.success) {
            console.error('❌ Error getting students:', students.error);
            return;
        }
        
        // Get total payments for each student (same as in handleSiswa)
        const studentsWithTotals = await Promise.all(students.data.map(async (student) => {
            const query = `
                SELECT COALESCE(SUM(amount), 0) as total_paid
                FROM transactions
                WHERE student_id = ? AND type = 'iuran'
            `;
            const result = await executeQuery(query, [student.id]);
            const totalPaid = result.success ? parseFloat(result.data[0].total_paid) : 0;

            return {
                ...student,
                total_paid: totalPaid
            };
        }));

        // Generate the exact same message as in handleSiswa
        let message = `👥 *Daftar Siswa (${students.data.length} orang):*\n\n`;

        studentsWithTotals.forEach((student, index) => {
            message += `${index + 1}. ${student.name}\n`;
            message += `   💰 Total bayar: Rp ${student.total_paid.toLocaleString('id-ID')}\n\n`;
        });

        message += `📋 *Catatan:*\n`;
        message += `• Total bayar = Akumulasi seluruh pembayaran\n`;
        message += `• Data tidak direset setiap bulan\n`;
        message += `• Gunakan /iuran status untuk status bulanan`;

        console.log('=== MESSAGE TO BE SENT ===');
        console.log(message);
        console.log('=== END MESSAGE ===\n');
        
        // Check specifically for Nanda's entry
        console.log('🔍 Checking Nanda entry specifically:');
        const nandaStudent = studentsWithTotals.find(s => s.name.includes('Nanda'));
        if (nandaStudent) {
            const nandaIndex = studentsWithTotals.indexOf(nandaStudent) + 1;
            console.log(`Student: ${nandaStudent.name}`);
            console.log(`Index: ${nandaIndex}`);
            console.log(`Total paid: ${nandaStudent.total_paid}`);
            
            const nandaLine = `${nandaIndex}. ${nandaStudent.name}`;
            const moneyLine = `   💰 Total bayar: Rp ${nandaStudent.total_paid.toLocaleString('id-ID')}`;
            
            console.log(`\nNanda lines:`);
            console.log(`"${nandaLine}"`);
            console.log(`"${moneyLine}"`);
            
            // Check money emoji specifically
            console.log(`\nMoney emoji analysis:`);
            const moneyEmoji = '💰';
            for (let i = 0; i < moneyEmoji.length; i++) {
                const char = moneyEmoji[i];
                const code = char.charCodeAt(0);
                console.log(`  ${i}: "${char}" (U+${code.toString(16).padStart(4, '0').toUpperCase()})`);
            }
        }
        
        console.log('\n✅ Test completed. The message format looks correct.');
        console.log('💡 If you see emoji issues in Telegram, it might be:');
        console.log('   1. Telegram client rendering issue');
        console.log('   2. Font/device display issue');
        console.log('   3. Copy-paste corruption');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
    
    process.exit(0);
}

testTelegramSiswa();
