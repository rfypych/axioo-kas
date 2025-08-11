const { executeQuery } = require('./config/database');
require('dotenv').config();

async function testSiswaOutput() {
    try {
        console.log('🧪 Testing /siswa command output...\n');
        
        // Simulate the exact same logic as handleSiswa function
        const students = await executeQuery('SELECT * FROM students WHERE status = "active" OR status IS NULL ORDER BY name ASC');
        
        if (!students.success) {
            console.error('❌ Error getting students:', students.error);
            return;
        }
        
        console.log(`Found ${students.data.length} students\n`);
        
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

        console.log('=== TELEGRAM MESSAGE OUTPUT ===');
        console.log(message);
        console.log('=== END MESSAGE ===\n');
        
        // Check specifically for Nanda's line
        const lines = message.split('\n');
        const nandaLine = lines.find(line => line.includes('Nanda'));
        if (nandaLine) {
            console.log('🔍 Nanda line found:');
            console.log(`"${nandaLine}"`);
            
            // Check each character in the line
            console.log('\nCharacter analysis:');
            for (let i = 0; i < nandaLine.length; i++) {
                const char = nandaLine[i];
                const code = char.charCodeAt(0);
                console.log(`  ${i}: "${char}" (U+${code.toString(16).padStart(4, '0').toUpperCase()})`);
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
    
    process.exit(0);
}

testSiswaOutput();
