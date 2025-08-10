const { executeQuery } = require('./config/database');
const Student = require('./models/Student');
const Transaction = require('./models/Transaction');
const EnhancedReportService = require('./services/EnhancedReportService');
const MultiWeekPaymentService = require('./services/MultiWeekPaymentService');

async function debugReportData() {
    console.log('🔍 DEBUG: Mengecek data untuk laporan kas mingguan...\n');
    
    try {
        // 1. Cek data siswa
        console.log('1. 📋 Data Siswa:');
        const students = await Student.getAll();
        console.log(`   Total siswa: ${students.length}`);
        
        // Tampilkan beberapa siswa untuk verifikasi
        students.slice(0, 5).forEach(student => {
            console.log(`   - ID: ${student.id}, Nama: ${student.name}`);
        });
        console.log('');
        
        // 2. Cek data transaksi
        console.log('2. 💰 Data Transaksi:');
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        
        const transactionsQuery = `
            SELECT t.*, s.name as student_name
            FROM transactions t
            LEFT JOIN students s ON t.student_id = s.id
            WHERE DATE(t.created_at) >= ? AND DATE(t.created_at) <= ?
            AND t.type = 'iuran'
            ORDER BY t.created_at DESC
        `;
        
        const transactionsResult = await executeQuery(transactionsQuery, [
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0]
        ]);
        
        const transactions = transactionsResult.success ? transactionsResult.data : [];
        console.log(`   Total transaksi iuran bulan ini: ${transactions.length}`);
        
        // Tampilkan transaksi untuk verifikasi
        transactions.slice(0, 10).forEach(transaction => {
            console.log(`   - ${transaction.student_name}: Rp ${transaction.amount} (${transaction.created_at})`);
        });
        console.log('');
        
        // 3. Cek data pembayaran per siswa berdasarkan data yang diberikan user
        console.log('3. 🎯 Verifikasi data siswa spesifik:');
        
        const testStudents = [
            { name: 'Rofikul Huda', expectedAmount: 12000, expectedWeeks: 4 },
            { name: 'Yoga Arif Nurrohman', expectedAmount: 3000, expectedWeeks: 1 },
            { name: 'Finza Hidan Firjatullah', expectedAmount: 9000, expectedWeeks: 3 }
        ];
        
        for (const testStudent of testStudents) {
            const student = students.find(s => s.name.toLowerCase().includes(testStudent.name.toLowerCase()));
            if (student) {
                console.log(`   📝 ${student.name} (ID: ${student.id}):`);
                
                // Cek transaksi siswa ini
                const studentTransactions = transactions.filter(t => t.student_id === student.id);
                const totalPaid = studentTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
                
                console.log(`      - Total transaksi: ${studentTransactions.length}`);
                console.log(`      - Total dibayar: Rp ${totalPaid}`);
                console.log(`      - Expected: Rp ${testStudent.expectedAmount} (${testStudent.expectedWeeks} minggu)`);
                
                studentTransactions.forEach(t => {
                    console.log(`        * Rp ${t.amount} - ${t.description} (${t.created_at})`);
                });
                
                console.log('');
            } else {
                console.log(`   ❌ Siswa "${testStudent.name}" tidak ditemukan di database`);
            }
        }
        
        // 4. Test laporan dengan EnhancedReportService
        console.log('4. 📊 Test EnhancedReportService:');
        const reportService = new EnhancedReportService();
        
        // Get weeks in current month
        const weeks = reportService.getWeeksInMonth(year, month);
        console.log(`   Minggu dalam bulan ${month}/${year}:`);
        weeks.forEach(week => {
            console.log(`   - ${week.labelWithDate}`);
        });
        console.log('');
        
        // Process student weekly payments
        console.log('5. 🔄 Test processStudentWeeklyPayments:');
        const studentsWithWeeklyData = await reportService.processStudentWeeklyPayments(
            students.slice(0, 5), // Test dengan 5 siswa pertama
            transactions,
            weeks,
            year,
            month
        );
        
        studentsWithWeeklyData.forEach(student => {
            console.log(`   📝 ${student.name}:`);
            console.log(`      - Status: ${student.status}`);
            console.log(`      - Total Paid: Rp ${student.totalPaid}`);
            console.log(`      - Paid Weeks: ${student.paidWeeks}/${student.totalWeeks}`);
            console.log(`      - Payment Percentage: ${student.paymentPercentage}%`);
            
            if (student.weeklyPayments) {
                student.weeklyPayments.forEach(weekPayment => {
                    console.log(`        * Minggu ${weekPayment.week}: ${weekPayment.status} (Rp ${weekPayment.paid})`);
                });
            }
            console.log('');
        });
        
        // 6. Test MultiWeekPaymentService
        console.log('6. 🔧 Test MultiWeekPaymentService:');
        const multiWeekService = new MultiWeekPaymentService();
        
        // Test dengan siswa yang ada pembayaran
        const testStudentWithPayment = students.find(s => 
            transactions.some(t => t.student_id === s.id)
        );
        
        if (testStudentWithPayment) {
            console.log(`   Testing dengan ${testStudentWithPayment.name}:`);
            
            for (let weekNum = 1; weekNum <= 4; weekNum++) {
                const weekInfo = multiWeekService.getWeekInfo(year, weekNum);
                const weekPayments = await multiWeekService.getWeekPayments(
                    testStudentWithPayment.id, 
                    weekInfo.year, 
                    weekInfo.week
                );
                
                const totalPaid = weekPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
                console.log(`      - Minggu ${weekNum}: Rp ${totalPaid} (${weekPayments.length} transaksi)`);
            }
        }
        
        console.log('\n✅ Debug selesai!');
        
    } catch (error) {
        console.error('❌ Error during debug:', error);
    }
}

// Jalankan debug
debugReportData().then(() => {
    process.exit(0);
}).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
