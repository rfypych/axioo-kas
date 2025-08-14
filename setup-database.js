const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupDatabase() {
    let connection = null;
    
    try {
        console.log('🔧 Setting up Axioo Kas Database...');
        
        // Connect to MySQL server (without database)
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || ''
        });
        
        console.log('✅ Connected to MySQL server');
        
        // Create database if not exists
        const dbName = process.env.DB_NAME || 'axioo_kas';
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        console.log(`✅ Database '${dbName}' created/verified`);

        // Use the database
        await connection.query(`USE \`${dbName}\``);
        
        // Create students table
        const studentsTable = `
            CREATE TABLE IF NOT EXISTS students (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                class_name VARCHAR(100) NOT NULL,
                phone VARCHAR(20) NULL,
                email VARCHAR(255) NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_name (name),
                INDEX idx_class (class_name)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;

        await connection.query(studentsTable);
        console.log('✅ Students table created/verified');
        
        // Create transactions table
        const transactionsTable = `
            CREATE TABLE IF NOT EXISTS transactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                type ENUM('income', 'expense', 'iuran') NOT NULL,
                amount DECIMAL(15,2) NOT NULL,
                description TEXT NOT NULL,
                student_id INT NULL,
                created_by VARCHAR(100) NOT NULL DEFAULT 'system',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL,
                INDEX idx_type (type),
                INDEX idx_created_at (created_at),
                INDEX idx_student_id (student_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;

        await connection.query(transactionsTable);
        console.log('✅ Transactions table created/verified');
        
        // Create admin users table (optional)
        const usersTable = `
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('admin', 'user') DEFAULT 'user',
                full_name VARCHAR(255) NULL,
                email VARCHAR(255) NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_username (username),
                INDEX idx_role (role)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;

        await connection.query(usersTable);
        console.log('✅ Users table created/verified');
        
        // Add 'status' column to students table if it doesn't exist (for backward compatibility)
        try {
            await connection.query("SELECT status FROM students LIMIT 1");
        } catch (e) {
            if (e.code === 'ER_BAD_FIELD_ERROR') {
                console.log("ℹ️ Column 'status' not found in students table. Adding it now...");
                await connection.query("ALTER TABLE students ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active' AFTER email");
                console.log("✅ Column 'status' added successfully.");
            } else {
                throw e; // Re-throw other errors
            }
        }

        // Insert sample students data - XI TKJ A Real Data
        const sampleStudents = [
            ['Achmad Muzaki Asror', 'XI TKJ A', '081234567890', 'muzaki@email.com'],
            ['Adira Putra Raihan', 'XI TKJ A', '081234567891', 'adira@email.com'],
            ['Afif Fadila Arub', 'XI TKJ A', '081234567892', 'afif@email.com'],
            ['Airlangga Setyo Putro', 'XI TKJ A', '081234567893', 'airlangga@email.com'],
            ['Alfin Agus Viadji', 'XI TKJ A', '081234567894', 'alfin@email.com'],
            ['Almas Nurhayati', 'XI TKJ A', '081234567895', 'almas@email.com'],
            ['Amanda Syafa', 'XI TKJ A', '081234567896', 'amanda@email.com'],
            ['Anaa Wulyani', 'XI TKJ A', '081234567897', 'anaa@email.com'],
            ['Arnetta Exsya Dyandra', 'XI TKJ A', '081234567898', 'arnetta@email.com'],
            ['Ayu Handayaningrum', 'XI TKJ A', '081234567899', 'ayu@email.com'],
            ['Ayundria Puspitasari', 'XI TKJ A', '081234567800', 'ayundria@email.com'],
            ['Bagus Setiyawan', 'XI TKJ A', '081234567801', 'bagus@email.com'],
            ['Clara Najwa Nurylita', 'XI TKJ A', '081234567802', 'clara@email.com'],
            ['Danu Eka Ramdhani', 'XI TKJ A', '081234567803', 'danu@email.com'],
            ['Desi Nur Rita Anggraeni', 'XI TKJ A', '081234567804', 'desi@email.com'],
            ['Dikta Nuraini', 'XI TKJ A', '081234567805', 'dikta@email.com'],
            ['Dinda Ayu Lestari', 'XI TKJ A', '081234567806', 'dinda@email.com'],
            ['Finza Hidan Firjatullah', 'XI TKJ A', '081234567807', 'finza@email.com'],
            ['Mandala Byantara Al Ghozali', 'XI TKJ A', '081234567808', 'mandala@email.com'],
            ['Meyko Alif Putra Nugraha', 'XI TKJ A', '081234567809', 'meyko@email.com'],
            ['Nanda Kurnia Ramadani', 'XI TKJ A', '081234567810', 'nanda@email.com'],
            ['Natasya Kirana Putri', 'XI TKJ A', '081234567811', 'natasya@email.com'],
            ['Nofa Farhan Nuryanto Putra', 'XI TKJ A', '081234567812', 'nofa@email.com'],
            ['Novanda Abi Pradita', 'XI TKJ A', '081234567813', 'novanda@email.com'],
            ['One Brilliant Resendriya Nugraha', 'XI TKJ A', '081234567814', 'one@email.com'],
            ['Rhandika Sandy Nur Kharim', 'XI TKJ A', '081234567815', 'rhandika@email.com'],
            ['Risti Nur Amalia', 'XI TKJ A', '081234567816', 'risti@email.com'],
            ['Rizky Agil Wibowo', 'XI TKJ A', '081234567817', 'rizky@email.com'],
            ['Rofikul Huda', 'XI TKJ A', '081234567818', 'rofikul@email.com'],
            ['Saputra Pramahkota Hati', 'XI TKJ A', '081234567819', 'saputra@email.com'],
            ['Satria Eka Prasetya', 'XI TKJ A', '081234567820', 'satria@email.com'],
            ['Wahyu Putra Nadzar Musthofa', 'XI TKJ A', '081234567821', 'wahyu.putra@email.com'],
            ['Wahyu Teguh Pratama', 'XI TKJ A', '081234567822', 'wahyu.teguh@email.com'],
            ['Yoga Arif Nurrohman', 'XI TKJ A', '081234567823', 'yoga@email.com']
        ];
        
        // Check if students already exist
        const [existingStudents] = await connection.execute('SELECT COUNT(*) as count FROM students');
        
        if (existingStudents[0].count === 0) {
            console.log('📝 Inserting sample students data...');
            
            for (const student of sampleStudents) {
                await connection.execute(
                    'INSERT INTO students (name, class_name, phone, email) VALUES (?, ?, ?, ?)',
                    student
                );
            }
            
            console.log(`✅ Inserted ${sampleStudents.length} students from XI TKJ A`);
        } else {
            console.log(`ℹ️ Students table already has ${existingStudents[0].count} records`);
        }
        
        // Insert sample transactions
        const sampleTransactions = [
            ['income', 100000, 'Saldo awal kas kelas XI TKJ A', null, 'system'],
            ['iuran', 5000, 'Iuran mingguan - Achmad Muzaki Asror', 1, 'system'],
            ['iuran', 5000, 'Iuran mingguan - Adira Putra Raihan', 2, 'system'],
            ['iuran', 5000, 'Iuran mingguan - Afif Fadila Arub', 3, 'system'],
            ['iuran', 5000, 'Iuran mingguan - Rofikul Huda', 29, 'system'],
            ['expense', 25000, 'Beli spidol dan penghapus papan tulis', null, 'system'],
            ['income', 50000, 'Sumbangan dari alumni', null, 'system'],
            ['iuran', 5000, 'Iuran mingguan - Wahyu Teguh Pratama', 33, 'system']
        ];
        
        // Check if transactions already exist
        const [existingTransactions] = await connection.execute('SELECT COUNT(*) as count FROM transactions');
        
        if (existingTransactions[0].count === 0) {
            console.log('💰 Inserting sample transactions...');
            
            for (const transaction of sampleTransactions) {
                await connection.execute(
                    'INSERT INTO transactions (type, amount, description, student_id, created_by) VALUES (?, ?, ?, ?, ?)',
                    transaction
                );
            }
            
            console.log(`✅ Inserted ${sampleTransactions.length} sample transactions`);
        } else {
            console.log(`ℹ️ Transactions table already has ${existingTransactions[0].count} records`);
        }
        
        // Create views for easier queries (using query instead of execute for CREATE VIEW)
        try {
            await connection.query('DROP VIEW IF EXISTS balance_view');
            const balanceView = `
                CREATE VIEW balance_view AS
                SELECT
                    COALESCE(SUM(CASE WHEN type IN ('income', 'iuran') THEN amount ELSE 0 END), 0) as total_income,
                    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense,
                    COALESCE(SUM(CASE WHEN type IN ('income', 'iuran') THEN amount ELSE 0 END), 0) -
                    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as current_balance
                FROM transactions
            `;

            await connection.query(balanceView);
            console.log('✅ Balance view created');
        } catch (error) {
            console.log('⚠️ Balance view creation skipped (may already exist)');
        }

        // The weekly_payments_view is obsolete due to the new routine-based system.
        // It is removed to avoid confusion.
        try {
            await connection.query('DROP VIEW IF EXISTS weekly_payments_view');
            console.log('✅ Obsolete weekly_payments_view removed');
        } catch (error) {
            console.log('⚠️ Could not remove weekly_payments_view (may not exist)');
        }
        
        console.log('');
        console.log('🎉 Database setup completed successfully!');
        console.log('');
        console.log('📊 Database Summary:');
        console.log(`   • Database: ${dbName}`);
        console.log(`   • Students: ${sampleStudents.length} siswa XI TKJ A`);
        console.log(`   • Transactions: ${sampleTransactions.length} sample transactions`);
        console.log('   • Views: balance_view, weekly_payments_view');
        console.log('');
        console.log('🚀 You can now start the web application with:');
        console.log('   yarn start  or  node app.js');
        
    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run setup if this file is executed directly
if (require.main === module) {
    setupDatabase();
}

module.exports = { setupDatabase };
