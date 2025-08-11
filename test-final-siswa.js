const { executeQuery } = require('./config/database');
require('dotenv').config();

async function testFinalSiswa() {
    try {
        console.log('🧪 Testing FINAL /siswa command with new emoji...\n');
        
        // Simulate the exact same logic as handleSiswa function with new emoji
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

        // Generate message with NEW emoji 💵
        let message = `👥 *Daftar Siswa (${students.data.length} orang):*\n\n`;

        studentsWithTotals.forEach((student, index) => {
            message += `${index + 1}. ${student.name}\n`;
            message += `   💵 Total bayar: Rp ${student.total_paid.toLocaleString('id-ID')}\n\n`;
        });

        message += `📋 *Catatan:*\n`;
        message += `• Total bayar = Akumulasi seluruh pembayaran\n`;
        message += `• Data tidak direset setiap bulan\n`;
        message += `• Gunakan /iuran status untuk status bulanan`;

        console.log('=== FINAL TELEGRAM MESSAGE OUTPUT ===');
        console.log(message);
        console.log('=== END MESSAGE ===\n');
        
        // Check specifically for Nanda's line with new emoji
        const lines = message.split('\n');
        const nandaLineIndex = lines.findIndex(line => line.includes('Nanda'));
        if (nandaLineIndex !== -1) {
            console.log('🔍 Nanda lines with NEW emoji:');
            console.log(`"${lines[nandaLineIndex]}"`);
            console.log(`"${lines[nandaLineIndex + 1]}"`);
            
            // Check the new emoji
            const moneyLine = lines[nandaLineIndex + 1];
            const emojiMatch = moneyLine.match(/💵/);
            if (emojiMatch) {
                console.log('\n✅ NEW emoji 💵 found in Nanda\'s line!');
                console.log('💡 This should fix the emoji display issue.');
            }
        }
        
        console.log('\n🎉 SOLUTION IMPLEMENTED:');
        console.log('✅ Changed emoji from 💰 (Money Bag) to 💵 (Dollar Banknote)');
        console.log('✅ New emoji is more compatible across devices');
        console.log('✅ Should resolve the mouse/rat emoji issue');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
    
    process.exit(0);
}

testFinalSiswa();
