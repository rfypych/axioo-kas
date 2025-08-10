const mysql = require('mysql2/promise');

async function simpleDebug() {
    console.log('🔍 Simple Debug: Checking database connection and data...\n');
    
    // Database configuration
    const dbConfig = {
        host: 'localhost',
        user: 'root',
        password: 'admin1234',
        database: 'axioo_kas'
    };
    
    let connection;
    
    try {
        // Test connection
        console.log('1. Testing database connection...');
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Database connected successfully\n');
        
        // Check students
        console.log('2. Checking students data:');
        const [students] = await connection.execute('SELECT id, name FROM students LIMIT 10');
        console.log(`   Found ${students.length} students:`);
        students.forEach(student => {
            console.log(`   - ID: ${student.id}, Name: ${student.name}`);
        });
        console.log('');
        
        // Check transactions
        console.log('3. Checking transactions data:');
        const [transactions] = await connection.execute(`
            SELECT t.id, t.student_id, t.amount, t.type, t.description, t.created_at, s.name as student_name
            FROM transactions t
            LEFT JOIN students s ON t.student_id = s.id
            WHERE t.type = 'iuran'
            ORDER BY t.created_at DESC
            LIMIT 20
        `);
        console.log(`   Found ${transactions.length} iuran transactions:`);
        transactions.forEach(transaction => {
            console.log(`   - ${transaction.student_name}: Rp ${transaction.amount} (${transaction.created_at})`);
        });
        console.log('');
        
        // Check specific students mentioned by user
        console.log('4. Checking specific students:');
        const specificStudents = ['Rofikul Huda', 'Yoga Arif Nurrohman', 'Finza Hidan Firjatullah'];
        
        for (const studentName of specificStudents) {
            console.log(`   📝 Checking ${studentName}:`);
            
            // Find student
            const [studentResult] = await connection.execute(
                'SELECT * FROM students WHERE name LIKE ?', 
                [`%${studentName}%`]
            );
            
            if (studentResult.length > 0) {
                const student = studentResult[0];
                console.log(`      - Found: ID ${student.id}, Name: ${student.name}`);
                
                // Get transactions for this student
                const [studentTransactions] = await connection.execute(`
                    SELECT * FROM transactions 
                    WHERE student_id = ? AND type = 'iuran'
                    ORDER BY created_at DESC
                `, [student.id]);
                
                const totalPaid = studentTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
                console.log(`      - Total transactions: ${studentTransactions.length}`);
                console.log(`      - Total paid: Rp ${totalPaid}`);
                
                studentTransactions.forEach(t => {
                    console.log(`        * Rp ${t.amount} - ${t.description} (${t.created_at})`);
                });
            } else {
                console.log(`      - ❌ Not found in database`);
            }
            console.log('');
        }
        
        // Check table structure
        console.log('5. Checking table structures:');
        
        console.log('   Students table:');
        const [studentsColumns] = await connection.execute('DESCRIBE students');
        studentsColumns.forEach(col => {
            console.log(`   - ${col.Field}: ${col.Type}`);
        });
        
        console.log('\n   Transactions table:');
        const [transactionsColumns] = await connection.execute('DESCRIBE transactions');
        transactionsColumns.forEach(col => {
            console.log(`   - ${col.Field}: ${col.Type}`);
        });
        
        console.log('\n✅ Debug completed successfully!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

simpleDebug();
