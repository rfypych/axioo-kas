const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class EmergencyFix {
    constructor() {
        this.dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'axioo_kas',
            charset: 'utf8mb4',
            timezone: '+00:00'
        };
    }

    async runEmergencyFix() {
        console.log('🚨 EMERGENCY FIX - Axioo Kas Database\n');
        console.log('====================================\n');

        try {
            // Step 1: Test connection
            await this.testConnection();
            
            // Step 2: Fix database structure
            await this.fixDatabaseStructure();
            
            // Step 3: Verify fixes
            await this.verifyFixes();
            
            // Step 4: Update Student model to be more robust
            await this.updateStudentModel();
            
            console.log('\n🎉 EMERGENCY FIX COMPLETED!');
            console.log('✅ Database structure fixed');
            console.log('✅ Student model updated');
            console.log('✅ Error handling improved');
            console.log('\n🚀 Now restart the bot: npm run bot');
            
        } catch (error) {
            console.error('❌ Emergency fix failed:', error.message);
            console.log('\n🔧 Manual steps required:');
            console.log('1. Check database connection');
            console.log('2. Verify database credentials');
            console.log('3. Run SQL commands manually');
        }
    }

    async testConnection() {
        console.log('1️⃣ Testing database connection...');
        
        try {
            const connection = await mysql.createConnection(this.dbConfig);
            await connection.ping();
            console.log('   ✅ Database connection successful');
            await connection.end();
        } catch (error) {
            console.log(`   ❌ Connection failed: ${error.message}`);
            throw error;
        }
    }

    async fixDatabaseStructure() {
        console.log('\n2️⃣ Fixing database structure...');
        
        const connection = await mysql.createConnection(this.dbConfig);
        
        try {
            // Check current students table structure
            const [columns] = await connection.execute('DESCRIBE students');
            const columnNames = columns.map(col => col.Field);
            
            console.log(`   📋 Current columns: ${columnNames.join(', ')}`);
            
            // Add missing columns
            const requiredColumns = {
                'status': "ENUM('active', 'inactive', 'graduated') DEFAULT 'active'",
                'exit_date': 'DATE NULL',
                'exit_reason': 'TEXT NULL',
                'created_at': 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
                'updated_at': 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
            };

            for (const [column, definition] of Object.entries(requiredColumns)) {
                if (!columnNames.includes(column)) {
                    console.log(`   ➕ Adding column: ${column}`);
                    try {
                        await connection.execute(`ALTER TABLE students ADD COLUMN ${column} ${definition}`);
                        console.log(`   ✅ Added: ${column}`);
                    } catch (error) {
                        console.log(`   ⚠️ Column ${column} might already exist: ${error.message}`);
                    }
                }
            }

            // Update existing students to have active status
            const [updateResult] = await connection.execute(
                "UPDATE students SET status = 'active' WHERE status IS NULL OR status = ''"
            );
            console.log(`   ✅ Updated ${updateResult.affectedRows} students to active status`);

            // Check transactions table
            console.log('\n   📊 Checking transactions table...');
            try {
                const [transColumns] = await connection.execute('DESCRIBE transactions');
                const transColumnNames = transColumns.map(col => col.Field);
                console.log(`   📋 Transaction columns: ${transColumnNames.join(', ')}`);
                
                // Add missing columns to transactions
                const transRequiredColumns = {
                    'week_number': 'INT',
                    'year': 'INT'
                };

                for (const [column, definition] of Object.entries(transRequiredColumns)) {
                    if (!transColumnNames.includes(column)) {
                        console.log(`   ➕ Adding transaction column: ${column}`);
                        try {
                            await connection.execute(`ALTER TABLE transactions ADD COLUMN ${column} ${definition}`);
                            console.log(`   ✅ Added: ${column}`);
                        } catch (error) {
                            console.log(`   ⚠️ Column ${column} might already exist: ${error.message}`);
                        }
                    }
                }
            } catch (error) {
                console.log(`   ⚠️ Transactions table check failed: ${error.message}`);
            }

        } finally {
            await connection.end();
        }
    }

    async verifyFixes() {
        console.log('\n3️⃣ Verifying fixes...');
        
        const connection = await mysql.createConnection(this.dbConfig);
        
        try {
            // Test the problematic query
            const [students] = await connection.execute(
                'SELECT * FROM students WHERE status = "active" OR status IS NULL ORDER BY name ASC LIMIT 5'
            );
            console.log(`   ✅ Status query works: ${students.length} students found`);
            
            // Test count
            const [count] = await connection.execute('SELECT COUNT(*) as total FROM students');
            console.log(`   📊 Total students: ${count[0].total}`);
            
            // Show sample
            if (students.length > 0) {
                console.log('   👥 Sample students:');
                students.slice(0, 3).forEach((student, index) => {
                    console.log(`      ${index + 1}. ${student.name} (${student.status || 'NULL'})`);
                });
            }
            
        } finally {
            await connection.end();
        }
    }

    async updateStudentModel() {
        console.log('\n4️⃣ Creating robust Student model...');
        
        const modelContent = `const { executeQuery } = require('../config/database');

class Student {
    static async getAll(includeInactive = false) {
        try {
            let query;
            if (includeInactive) {
                query = 'SELECT * FROM students ORDER BY name ASC';
            } else {
                // Robust query that handles missing status column
                query = \`SELECT * FROM students 
                        WHERE (status = 'active' OR status IS NULL OR status = '') 
                        ORDER BY name ASC\`;
            }
            
            const result = await executeQuery(query);
            
            if (!result.success) {
                console.error('Student.getAll error:', result.error);
                
                // Fallback query without status filter
                if (result.error.includes('Unknown column')) {
                    console.log('Falling back to query without status filter...');
                    const fallbackResult = await executeQuery('SELECT * FROM students ORDER BY name ASC');
                    return fallbackResult.success ? fallbackResult.data : [];
                }
                return [];
            }
            
            // Add payment calculations
            const studentsWithPayments = await Promise.all(
                result.data.map(async (student) => {
                    const paymentResult = await executeQuery(
                        'SELECT COALESCE(SUM(amount), 0) as total_paid, COUNT(*) as payment_count FROM transactions WHERE student_id = ? AND type = "iuran"',
                        [student.id]
                    );
                    
                    const totalPaid = paymentResult.success ? parseFloat(paymentResult.data[0].total_paid) : 0;
                    const paymentCount = paymentResult.success ? parseInt(paymentResult.data[0].payment_count) : 0;
                    
                    return {
                        ...student,
                        total_paid: totalPaid,
                        payment_count: paymentCount,
                        status: student.status || 'active' // Default to active if null
                    };
                })
            );
            
            return studentsWithPayments;
            
        } catch (error) {
            console.error('Student.getAll exception:', error);
            return [];
        }
    }

    static async getById(id) {
        try {
            const result = await executeQuery('SELECT * FROM students WHERE id = ?', [id]);
            return result.success && result.data.length > 0 ? result.data[0] : null;
        } catch (error) {
            console.error('Student.getById error:', error);
            return null;
        }
    }

    static async searchByKeyword(keyword) {
        try {
            const result = await executeQuery(
                'SELECT * FROM students WHERE name LIKE ? OR class_name LIKE ? ORDER BY name ASC',
                [\`%\${keyword}%\`, \`%\${keyword}%\`]
            );
            return result.success ? result.data : [];
        } catch (error) {
            console.error('Student.searchByKeyword error:', error);
            return [];
        }
    }

    static async getStatistics() {
        try {
            const totalResult = await executeQuery('SELECT COUNT(*) as total FROM students');
            const activeResult = await executeQuery(
                'SELECT COUNT(*) as active FROM students WHERE (status = "active" OR status IS NULL OR status = "")'
            );
            
            // Fallback if status column doesn't exist
            let activeCount = 0;
            if (activeResult.success) {
                activeCount = activeResult.data[0].active;
            } else if (totalResult.success) {
                activeCount = totalResult.data[0].total; // Assume all active if no status column
            }
            
            return {
                total: totalResult.success ? totalResult.data[0].total : 0,
                active: activeCount,
                inactive: totalResult.success ? (totalResult.data[0].total - activeCount) : 0
            };
        } catch (error) {
            console.error('Student.getStatistics error:', error);
            return { total: 0, active: 0, inactive: 0 };
        }
    }

    static async create(studentData) {
        try {
            const { name, class_name, phone, email } = studentData;
            const result = await executeQuery(
                'INSERT INTO students (name, class_name, phone, email, status) VALUES (?, ?, ?, ?, ?)',
                [name, class_name, phone, email, 'active']
            );
            return result.success ? { id: result.data.insertId, ...studentData } : null;
        } catch (error) {
            console.error('Student.create error:', error);
            return null;
        }
    }

    static async update(id, studentData) {
        try {
            const { name, class_name, phone, email, status } = studentData;
            const result = await executeQuery(
                'UPDATE students SET name = ?, class_name = ?, phone = ?, email = ?, status = ? WHERE id = ?',
                [name, class_name, phone, email, status || 'active', id]
            );
            return result.success;
        } catch (error) {
            console.error('Student.update error:', error);
            return false;
        }
    }

    static async delete(id) {
        try {
            const result = await executeQuery('DELETE FROM students WHERE id = ?', [id]);
            return result.success;
        } catch (error) {
            console.error('Student.delete error:', error);
            return false;
        }
    }
}

module.exports = Student;`;

        const modelPath = path.join(__dirname, 'models', 'Student.js');
        const backupPath = path.join(__dirname, 'models', 'Student.js.backup');
        
        // Backup original
        if (fs.existsSync(modelPath)) {
            fs.copyFileSync(modelPath, backupPath);
            console.log('   💾 Original model backed up');
        }
        
        // Write new robust model
        fs.writeFileSync(modelPath, modelContent);
        console.log('   ✅ Robust Student model created');
    }
}

// CLI interface
async function main() {
    const fix = new EmergencyFix();
    await fix.runEmergencyFix();
}

// Run if executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('Emergency fix error:', error);
        process.exit(1);
    });
}

module.exports = EmergencyFix;
