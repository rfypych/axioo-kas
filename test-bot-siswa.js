const Student = require('./models/Student');
const { executeQuery } = require('./config/database');
require('dotenv').config();

async function testBotSiswaLogic() {
    console.log('🤖 Testing Bot Siswa Logic (Exact Simulation)\n');
    console.log('=============================================\n');

    try {
        // Simulate exact logic from telegram-bot.js handleSiswa method
        console.log('1️⃣ Calling Student.getAll()...');
        const students = await Student.getAll();
        console.log(`   📊 Result: ${students.length} students\n`);

        if (students.length === 0) {
            console.log('❌ Bot would show: "👥 Belum ada data siswa"');
            console.log('\n🔍 Debugging why no students found...\n');
            
            // Debug: Check direct query
            console.log('2️⃣ Testing direct database query...');
            const directResult = await executeQuery('SELECT COUNT(*) as count FROM students');
            if (directResult.success) {
                console.log(`   📊 Direct count: ${directResult.data[0].count} students in database`);
                
                if (directResult.data[0].count > 0) {
                    console.log('\n3️⃣ Checking status filter...');
                    const statusResult = await executeQuery('SELECT status, COUNT(*) as count FROM students GROUP BY status');
                    if (statusResult.success) {
                        console.log('   📊 Status breakdown:');
                        statusResult.data.forEach(row => {
                            console.log(`      ${row.status || 'NULL'}: ${row.count} students`);
                        });
                    }
                    
                    console.log('\n4️⃣ Testing Student model query...');
                    const modelQuery = 'SELECT * FROM students WHERE status = "active" OR status IS NULL ORDER BY name ASC';
                    const modelResult = await executeQuery(modelQuery);
                    if (modelResult.success) {
                        console.log(`   📊 Model query result: ${modelResult.data.length} students`);
                        if (modelResult.data.length > 0) {
                            console.log('   👥 Sample results:');
                            modelResult.data.slice(0, 3).forEach((student, index) => {
                                console.log(`      ${index + 1}. ${student.name} (${student.status || 'NULL'})`);
                            });
                        }
                    } else {
                        console.log(`   ❌ Model query failed: ${modelResult.error}`);
                    }
                }
            }
            
            return;
        }

        console.log('✅ Bot would show student list!\n');
        
        // Simulate the payment calculation logic
        console.log('2️⃣ Testing payment calculations...');
        const studentsWithTotals = await Promise.all(students.slice(0, 3).map(async (student) => {
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

        console.log('   💰 Payment calculations:');
        studentsWithTotals.forEach((student, index) => {
            console.log(`      ${index + 1}. ${student.name}: Rp ${student.total_paid.toLocaleString('id-ID')}`);
        });

        // Simulate the exact message format
        console.log('\n3️⃣ Simulating bot message...');
        let message = `👥 *Daftar Siswa (${students.length} orang):*\n\n`;

        studentsWithTotals.forEach((student, index) => {
            const statusIcon = student.status === 'active' ? '🟢' : 
                              student.status === 'inactive' ? '🔴' : '⚪';
            
            message += `${index + 1}. ${student.name} - ${student.class_name || 'No Class'} ${statusIcon}\n`;
            message += `   💰 Total: Rp ${student.total_paid.toLocaleString('id-ID')}\n`;
            message += `   📊 Pembayaran: ${student.payment_count || 0} kali\n\n`;
        });

        if (students.length > 3) {
            message += `... dan ${students.length - 3} siswa lainnya\n\n`;
        }

        message += `📊 *Ringkasan:*\n`;
        message += `👥 Total Siswa: ${students.length}\n`;
        message += `🟢 Aktif: ${students.filter(s => s.status === 'active' || !s.status).length}\n`;
        message += `🔴 Tidak Aktif: ${students.filter(s => s.status === 'inactive').length}`;

        console.log('📱 Bot message preview:');
        console.log('========================');
        console.log(message);
        console.log('========================\n');

        console.log('✅ Bot logic test completed successfully!');
        console.log('🚀 The bot should now work correctly');

    } catch (error) {
        console.log(`❌ Test failed: ${error.message}`);
        console.log(`   Stack: ${error.stack}`);
        
        console.log('\n🔧 Possible solutions:');
        console.log('1. npm run fix:database');
        console.log('2. Check database connection');
        console.log('3. Verify table structure');
    }
}

// Also test the Student model methods individually
async function testStudentModelMethods() {
    console.log('\n🧪 Testing Student Model Methods\n');
    console.log('================================\n');

    try {
        // Test getAll with different parameters
        console.log('1️⃣ Testing Student.getAll()...');
        const activeStudents = await Student.getAll();
        console.log(`   Active students: ${activeStudents.length}`);

        console.log('2️⃣ Testing Student.getAll(true)...');
        const allStudents = await Student.getAll(true);
        console.log(`   All students (including inactive): ${allStudents.length}`);

        console.log('3️⃣ Testing Student.getStatistics()...');
        const stats = await Student.getStatistics();
        console.log(`   Statistics:`, stats);

        console.log('4️⃣ Testing Student.searchByKeyword()...');
        const searchResults = await Student.searchByKeyword('a');
        console.log(`   Search results for 'a': ${searchResults.length} students`);

    } catch (error) {
        console.log(`❌ Model methods test failed: ${error.message}`);
    }
}

async function main() {
    await testBotSiswaLogic();
    await testStudentModelMethods();
    
    console.log('\n🎯 Summary:');
    console.log('===========');
    console.log('If the test shows students, your bot should work correctly.');
    console.log('If it shows 0 students, run: npm run fix:database');
    console.log('\nTo start the bot: npm run bot');
    console.log('Then test with: /siswa');
}

// Run if executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('Test error:', error);
        process.exit(1);
    });
}

module.exports = { testBotSiswaLogic, testStudentModelMethods };
