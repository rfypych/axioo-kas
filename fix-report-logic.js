const mysql = require('mysql2/promise');

async function fixReportLogic() {
    console.log('🔧 Fixing Report Logic: Analyzing and fixing payment calculation...\n');
    
    // Database configuration
    const dbConfig = {
        host: 'localhost',
        user: 'root',
        password: 'admin1234',
        database: 'axioo_kas'
    };
    
    let connection;
    
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Database connected successfully\n');
        
        // Get current month data
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        
        console.log(`📅 Analyzing data for ${month}/${year}\n`);
        
        // Calculate weeks in current month
        const weeks = getWeeksInMonth(year, month);
        console.log('📊 Weeks in current month:');
        weeks.forEach(week => {
            console.log(`   - Minggu ${week.number}: ${week.start.toLocaleDateString('id-ID')} - ${week.end.toLocaleDateString('id-ID')}`);
        });
        console.log('');
        
        // Get all students
        const [students] = await connection.execute('SELECT * FROM students ORDER BY name');
        
        // Get all transactions for current month
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        
        const [transactions] = await connection.execute(`
            SELECT t.*, s.name as student_name
            FROM transactions t
            LEFT JOIN students s ON t.student_id = s.id
            WHERE DATE(t.created_at) >= ? AND DATE(t.created_at) <= ?
            AND t.type = 'iuran'
            ORDER BY t.created_at DESC
        `, [
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0]
        ]);
        
        console.log('💰 Processing student payments:');
        
        // Process each student
        const processedStudents = [];
        
        for (const student of students) {
            // Get student's transactions
            const studentTransactions = transactions.filter(t => t.student_id === student.id);
            const totalPaid = studentTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
            
            // Calculate how many weeks this payment covers
            const weeklyAmount = 3000;
            const fullWeeksPaid = Math.floor(totalPaid / weeklyAmount);
            const remainder = totalPaid % weeklyAmount;
            
            // Calculate weekly payment status
            const weeklyPayments = weeks.map(week => {
                let status = '❌'; // Default: not paid
                let paid = 0;
                
                // Simple logic: if student has paid enough for this week number
                if (week.number <= fullWeeksPaid) {
                    status = '✅'; // Fully paid
                    paid = weeklyAmount;
                } else if (week.number === fullWeeksPaid + 1 && remainder > 0) {
                    status = '❕'; // Partially paid
                    paid = remainder;
                }
                
                return {
                    week: week.number,
                    label: week.label,
                    status: status,
                    paid: paid,
                    expected: weeklyAmount
                };
            });
            
            // Calculate overall status
            const paidWeeks = weeklyPayments.filter(w => w.status === '✅').length;
            const partialWeeks = weeklyPayments.filter(w => w.status === '❕').length;
            const paymentPercentage = Math.round((paidWeeks / weeks.length) * 100);
            
            let overallStatus;
            if (paymentPercentage === 100) {
                overallStatus = 'LUNAS';
            } else if (paidWeeks > 0 || partialWeeks > 0) {
                overallStatus = 'SEBAGIAN';
            } else {
                overallStatus = 'BELUM BAYAR';
            }
            
            const processedStudent = {
                ...student,
                totalPaid: totalPaid,
                fullWeeksPaid: fullWeeksPaid,
                remainder: remainder,
                weeklyPayments: weeklyPayments,
                paidWeeks: paidWeeks,
                partialWeeks: partialWeeks,
                totalWeeks: weeks.length,
                paymentPercentage: paymentPercentage,
                status: overallStatus,
                transactions: studentTransactions
            };
            
            processedStudents.push(processedStudent);
            
            // Show details for students with payments
            if (totalPaid > 0) {
                console.log(`   📝 ${student.name}:`);
                console.log(`      - Total Paid: Rp ${totalPaid.toLocaleString('id-ID')}`);
                console.log(`      - Full Weeks: ${fullWeeksPaid}, Remainder: Rp ${remainder.toLocaleString('id-ID')}`);
                console.log(`      - Status: ${overallStatus} (${paymentPercentage}%)`);
                console.log(`      - Weekly Status: ${weeklyPayments.map(w => w.status).join(' ')}`);
                console.log('');
            }
        }
        
        // Show summary for specific students mentioned by user
        console.log('🎯 Summary for specific students:');
        const specificStudents = ['Rofikul Huda', 'Yoga Arif Nurrohman', 'Finza Hidan Firjatullah'];
        
        for (const studentName of specificStudents) {
            const student = processedStudents.find(s => s.name.toLowerCase().includes(studentName.toLowerCase()));
            if (student) {
                console.log(`   📋 ${student.name}:`);
                console.log(`      - Expected: ${studentName === 'Rofikul Huda' ? '4 weeks' : studentName === 'Yoga Arif Nurrohman' ? '1 week' : '3 weeks'}`);
                console.log(`      - Actual: ${student.fullWeeksPaid} full weeks + Rp ${student.remainder.toLocaleString('id-ID')}`);
                console.log(`      - Status: ${student.status}`);
                console.log(`      - Weekly: ${student.weeklyPayments.map((w, i) => `M${i+1}:${w.status}`).join(' ')}`);
                console.log('');
            }
        }
        
        // Generate corrected report data
        console.log('📊 Generating corrected report format:');
        console.log('');
        console.log('LAPORAN PEMBAYARAN KAS MINGGUAN (CORRECTED)');
        console.log(`${new Date().toLocaleDateString('id-ID')} | Iuran: Rp 3.000/minggu`);
        console.log('');
        console.log('No | Nama Siswa | Kelas | Minggu 1 | Minggu 2 | Minggu 3 | Minggu 4 | Total | Status');
        console.log('---|------------|-------|----------|----------|----------|----------|-------|-------');
        
        processedStudents.slice(0, 10).forEach((student, index) => {
            const weekStatuses = student.weeklyPayments.map(w => w.status.padEnd(8)).join(' | ');
            console.log(`${(index + 1).toString().padEnd(2)} | ${student.name.padEnd(20)} | ${(student.class_name || 'X TKJ A').padEnd(5)} | ${weekStatuses} | Rp ${student.totalPaid.toLocaleString('id-ID').padEnd(5)} | ${student.status}`);
        });
        
        console.log('\n✅ Report logic analysis completed!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Helper function to get weeks in month
function getWeeksInMonth(year, month) {
    const weeks = [];
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    
    // Start from first Monday of the month or before
    let currentWeekStart = new Date(firstDay);
    const dayOfWeek = currentWeekStart.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    currentWeekStart.setDate(currentWeekStart.getDate() + daysToMonday);
    
    let weekNumber = 1;
    
    while (currentWeekStart <= lastDay) {
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        // Only include weeks that have days in the current month
        if (weekEnd >= firstDay) {
            weeks.push({
                number: weekNumber,
                start: new Date(currentWeekStart),
                end: new Date(weekEnd),
                label: `Minggu ${weekNumber}`
            });
            weekNumber++;
        }
        
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }
    
    return weeks;
}

fixReportLogic();
