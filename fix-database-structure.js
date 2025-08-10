const { executeQuery } = require('./config/database');
require('dotenv').config();

class DatabaseStructureFixer {
    constructor() {
        this.fixes = [];
        this.errors = [];
    }

    async fixDatabaseStructure() {
        console.log('🔧 Fixing Database Structure for aaPanel\n');
        console.log('======================================\n');

        await this.checkAndFixStudentsTable();
        await this.checkAndFixTransactionsTable();
        await this.checkAndFixStudentChangesTable();
        
        this.showResults();
    }

    async checkAndFixStudentsTable() {
        console.log('1️⃣ Checking Students Table Structure...');
        
        try {
            // Check if table exists
            const tableCheck = await executeQuery('SHOW TABLES LIKE "students"');
            if (!tableCheck.success || tableCheck.data.length === 0) {
                console.log('   ❌ Students table does not exist - creating...');
                await this.createStudentsTable();
                return;
            }

            // Check current structure
            const structure = await executeQuery('DESCRIBE students');
            if (!structure.success) {
                this.errors.push('Cannot check students table structure');
                return;
            }

            const columns = structure.data.map(col => col.Field);
            console.log(`   📋 Current columns: ${columns.join(', ')}`);

            // Check for missing columns
            const requiredColumns = {
                'status': "ENUM('active', 'inactive', 'graduated') DEFAULT 'active'",
                'exit_date': 'DATE NULL',
                'exit_reason': 'TEXT NULL',
                'created_at': 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
                'updated_at': 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
            };

            for (const [column, definition] of Object.entries(requiredColumns)) {
                if (!columns.includes(column)) {
                    console.log(`   ➕ Adding missing column: ${column}`);
                    const alterQuery = `ALTER TABLE students ADD COLUMN ${column} ${definition}`;
                    const result = await executeQuery(alterQuery);
                    
                    if (result.success) {
                        console.log(`   ✅ Added column: ${column}`);
                        this.fixes.push(`Added column ${column} to students table`);
                    } else {
                        console.log(`   ❌ Failed to add column: ${column} - ${result.error}`);
                        this.errors.push(`Failed to add column ${column}: ${result.error}`);
                    }
                }
            }

            // Update existing records to have active status
            const updateResult = await executeQuery("UPDATE students SET status = 'active' WHERE status IS NULL");
            if (updateResult.success) {
                console.log('   ✅ Updated existing students to active status');
                this.fixes.push('Updated existing students to active status');
            }

        } catch (error) {
            console.log(`   ❌ Error checking students table: ${error.message}`);
            this.errors.push(`Students table error: ${error.message}`);
        }

        console.log('');
    }

    async createStudentsTable() {
        const createQuery = `
            CREATE TABLE IF NOT EXISTS students (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                class_name VARCHAR(100),
                phone VARCHAR(20),
                email VARCHAR(255),
                status ENUM('active', 'inactive', 'graduated') DEFAULT 'active',
                exit_date DATE NULL,
                exit_reason TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;

        const result = await executeQuery(createQuery);
        if (result.success) {
            console.log('   ✅ Students table created successfully');
            this.fixes.push('Created students table');
        } else {
            console.log(`   ❌ Failed to create students table: ${result.error}`);
            this.errors.push(`Failed to create students table: ${result.error}`);
        }
    }

    async checkAndFixTransactionsTable() {
        console.log('2️⃣ Checking Transactions Table Structure...');
        
        try {
            const tableCheck = await executeQuery('SHOW TABLES LIKE "transactions"');
            if (!tableCheck.success || tableCheck.data.length === 0) {
                console.log('   ❌ Transactions table does not exist - creating...');
                await this.createTransactionsTable();
                return;
            }

            const structure = await executeQuery('DESCRIBE transactions');
            if (structure.success) {
                const columns = structure.data.map(col => col.Field);
                console.log(`   📋 Current columns: ${columns.join(', ')}`);
                
                // Check for missing columns
                const requiredColumns = {
                    'week_number': 'INT',
                    'year': 'INT'
                };

                for (const [column, definition] of Object.entries(requiredColumns)) {
                    if (!columns.includes(column)) {
                        console.log(`   ➕ Adding missing column: ${column}`);
                        const alterQuery = `ALTER TABLE transactions ADD COLUMN ${column} ${definition}`;
                        const result = await executeQuery(alterQuery);
                        
                        if (result.success) {
                            console.log(`   ✅ Added column: ${column}`);
                            this.fixes.push(`Added column ${column} to transactions table`);
                        } else {
                            console.log(`   ❌ Failed to add column: ${column} - ${result.error}`);
                            this.errors.push(`Failed to add column ${column}: ${result.error}`);
                        }
                    }
                }
            }

        } catch (error) {
            console.log(`   ❌ Error checking transactions table: ${error.message}`);
            this.errors.push(`Transactions table error: ${error.message}`);
        }

        console.log('');
    }

    async createTransactionsTable() {
        const createQuery = `
            CREATE TABLE IF NOT EXISTS transactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT,
                type ENUM('income', 'expense', 'iuran') NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                description TEXT,
                week_number INT,
                year INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;

        const result = await executeQuery(createQuery);
        if (result.success) {
            console.log('   ✅ Transactions table created successfully');
            this.fixes.push('Created transactions table');
        } else {
            console.log(`   ❌ Failed to create transactions table: ${result.error}`);
            this.errors.push(`Failed to create transactions table: ${result.error}`);
        }
    }

    async checkAndFixStudentChangesTable() {
        console.log('3️⃣ Checking Student Changes Table Structure...');
        
        try {
            const tableCheck = await executeQuery('SHOW TABLES LIKE "student_changes"');
            if (!tableCheck.success || tableCheck.data.length === 0) {
                console.log('   ❌ Student changes table does not exist - creating...');
                await this.createStudentChangesTable();
                return;
            }

            console.log('   ✅ Student changes table exists');

        } catch (error) {
            console.log(`   ❌ Error checking student_changes table: ${error.message}`);
            this.errors.push(`Student changes table error: ${error.message}`);
        }

        console.log('');
    }

    async createStudentChangesTable() {
        const createQuery = `
            CREATE TABLE IF NOT EXISTS student_changes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT,
                change_type ENUM('create', 'update', 'delete', 'status_change') NOT NULL,
                field_name VARCHAR(100),
                old_value TEXT,
                new_value TEXT,
                changed_by VARCHAR(100),
                change_reason TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;

        const result = await executeQuery(createQuery);
        if (result.success) {
            console.log('   ✅ Student changes table created successfully');
            this.fixes.push('Created student_changes table');
        } else {
            console.log(`   ❌ Failed to create student_changes table: ${result.error}`);
            this.errors.push(`Failed to create student_changes table: ${result.error}`);
        }
    }

    async addSampleDataIfEmpty() {
        console.log('4️⃣ Checking for Sample Data...');
        
        try {
            const countResult = await executeQuery('SELECT COUNT(*) as count FROM students');
            if (countResult.success) {
                const count = countResult.data[0].count;
                console.log(`   📊 Current student count: ${count}`);
                
                if (count === 0) {
                    console.log('   ➕ Adding sample students...');
                    await this.insertSampleStudents();
                } else {
                    console.log('   ✅ Students already exist, skipping sample data');
                }
            }
        } catch (error) {
            console.log(`   ❌ Error checking sample data: ${error.message}`);
            this.errors.push(`Sample data error: ${error.message}`);
        }

        console.log('');
    }

    async insertSampleStudents() {
        const sampleStudents = [
            { name: 'Ahmad Fauzi', class_name: 'XI TKJ A', phone: '081234567890', email: 'ahmad@email.com' },
            { name: 'Siti Nurhaliza', class_name: 'XI TKJ A', phone: '081234567891', email: 'siti@email.com' },
            { name: 'Budi Santoso', class_name: 'XI TKJ B', phone: '081234567892', email: 'budi@email.com' },
            { name: 'Dewi Sartika', class_name: 'XI TKJ B', phone: '081234567893', email: 'dewi@email.com' },
            { name: 'Rizki Pratama', class_name: 'XI TKJ A', phone: '081234567894', email: 'rizki@email.com' }
        ];

        for (const student of sampleStudents) {
            const result = await executeQuery(
                'INSERT INTO students (name, class_name, phone, email, status) VALUES (?, ?, ?, ?, ?)',
                [student.name, student.class_name, student.phone, student.email, 'active']
            );
            
            if (result.success) {
                console.log(`   ✅ Added: ${student.name}`);
                this.fixes.push(`Added sample student: ${student.name}`);
            } else {
                console.log(`   ❌ Failed to add: ${student.name} - ${result.error}`);
                this.errors.push(`Failed to add ${student.name}: ${result.error}`);
            }
        }
    }

    showResults() {
        console.log('📋 Database Structure Fix Results');
        console.log('=================================\n');

        if (this.fixes.length > 0) {
            console.log('✅ FIXES APPLIED:');
            this.fixes.forEach((fix, index) => {
                console.log(`   ${index + 1}. ${fix}`);
            });
            console.log('');
        }

        if (this.errors.length > 0) {
            console.log('❌ ERRORS ENCOUNTERED:');
            this.errors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error}`);
            });
            console.log('');
        }

        if (this.fixes.length > 0 && this.errors.length === 0) {
            console.log('🎉 Database structure fixed successfully!');
            console.log('\n🚀 Next steps:');
            console.log('1. Test: npm run test:siswa');
            console.log('2. Start bot: npm run bot');
            console.log('3. Test command: /siswa');
        } else if (this.errors.length > 0) {
            console.log('⚠️ Some issues remain. Manual intervention may be required.');
        } else {
            console.log('ℹ️ Database structure is already correct.');
        }
    }

    async run() {
        await this.fixDatabaseStructure();
        await this.addSampleDataIfEmpty();
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const fixer = new DatabaseStructureFixer();
    
    if (args.includes('--sample') || args.includes('-s')) {
        await fixer.addSampleDataIfEmpty();
    } else {
        await fixer.run();
    }
}

// Run if executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('Database fix error:', error);
        process.exit(1);
    });
}

module.exports = DatabaseStructureFixer;
