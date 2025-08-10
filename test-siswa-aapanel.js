const { executeQuery } = require('./config/database');
const Student = require('./models/Student');
require('dotenv').config();

class StudentTestAAPanel {
    constructor() {
        this.testResults = [];
    }

    async runAllTests() {
        console.log('🧪 Testing Student Data - aaPanel Specific\n');
        console.log('==========================================\n');

        await this.testDatabaseConnection();
        await this.testDirectQuery();
        await this.testStudentModel();
        await this.testStudentModelMethods();
        await this.testTelegramBotLogic();
        
        this.showSummary();
    }

    async testDatabaseConnection() {
        console.log('1️⃣ Testing Database Connection...');
        
        try {
            const result = await executeQuery('SELECT 1 as test');
            if (result.success) {
                console.log('   ✅ Database connection working');
                this.testResults.push({ test: 'Database Connection', status: 'PASS' });
            } else {
                console.log('   ❌ Database connection failed');
                this.testResults.push({ test: 'Database Connection', status: 'FAIL', error: result.error });
            }
        } catch (error) {
            console.log(`   ❌ Database connection error: ${error.message}`);
            this.testResults.push({ test: 'Database Connection', status: 'ERROR', error: error.message });
        }
        
        console.log('');
    }

    async testDirectQuery() {
        console.log('2️⃣ Testing Direct Student Query...');
        
        try {
            // Test if students table exists
            const tableCheck = await executeQuery('SHOW TABLES LIKE "students"');
            if (!tableCheck.success || tableCheck.data.length === 0) {
                console.log('   ❌ Students table does not exist');
                this.testResults.push({ test: 'Students Table', status: 'FAIL', error: 'Table not found' });
                console.log('');
                return;
            }
            
            console.log('   ✅ Students table exists');
            
            // Test table structure
            const structure = await executeQuery('DESCRIBE students');
            if (structure.success) {
                console.log(`   ✅ Table structure: ${structure.data.length} columns`);
                
                // Show columns
                const columns = structure.data.map(col => col.Field).join(', ');
                console.log(`   📋 Columns: ${columns}`);
            }
            
            // Count total students
            const countResult = await executeQuery('SELECT COUNT(*) as total FROM students');
            if (countResult.success) {
                const total = countResult.data[0].total;
                console.log(`   📊 Total students in database: ${total}`);
                
                if (total === 0) {
                    console.log('   ⚠️ No students found - this explains why bot shows 0');
                    this.testResults.push({ test: 'Student Count', status: 'WARN', message: 'No students in database' });
                } else {
                    this.testResults.push({ test: 'Student Count', status: 'PASS', count: total });
                }
            }
            
            // Get sample students
            const sampleResult = await executeQuery('SELECT * FROM students LIMIT 5');
            if (sampleResult.success && sampleResult.data.length > 0) {
                console.log('   👥 Sample students:');
                sampleResult.data.forEach((student, index) => {
                    console.log(`      ${index + 1}. ${student.name} - ${student.class_name} (${student.status || 'active'})`);
                });
                this.testResults.push({ test: 'Sample Data', status: 'PASS', samples: sampleResult.data.length });
            } else {
                console.log('   ⚠️ No student data found');
                this.testResults.push({ test: 'Sample Data', status: 'WARN', message: 'No data' });
            }
            
        } catch (error) {
            console.log(`   ❌ Direct query error: ${error.message}`);
            this.testResults.push({ test: 'Direct Query', status: 'ERROR', error: error.message });
        }
        
        console.log('');
    }

    async testStudentModel() {
        console.log('3️⃣ Testing Student Model...');
        
        try {
            // Test Student.getAll()
            console.log('   🧪 Testing Student.getAll()...');
            const students = await Student.getAll();
            
            console.log(`   📊 Student.getAll() returned: ${students.length} students`);
            
            if (students.length === 0) {
                console.log('   ⚠️ Student model returns 0 students');
                this.testResults.push({ test: 'Student.getAll()', status: 'WARN', count: 0 });
                
                // Test with includeInactive
                console.log('   🧪 Testing with includeInactive=true...');
                const allStudents = await Student.getAll(true);
                console.log(`   📊 With inactive: ${allStudents.length} students`);
                
                if (allStudents.length > 0) {
                    console.log('   💡 Found students when including inactive - check status field');
                    this.testResults.push({ test: 'Student.getAll(true)', status: 'INFO', count: allStudents.length });
                }
            } else {
                console.log('   ✅ Student model working correctly');
                this.testResults.push({ test: 'Student.getAll()', status: 'PASS', count: students.length });
                
                // Show sample
                if (students.length > 0) {
                    console.log('   👥 Sample from model:');
                    students.slice(0, 3).forEach((student, index) => {
                        console.log(`      ${index + 1}. ${student.name} - ${student.class_name}`);
                        console.log(`         Total paid: Rp ${student.total_paid || 0}`);
                        console.log(`         Payment count: ${student.payment_count || 0}`);
                    });
                }
            }
            
        } catch (error) {
            console.log(`   ❌ Student model error: ${error.message}`);
            this.testResults.push({ test: 'Student Model', status: 'ERROR', error: error.message });
        }
        
        console.log('');
    }

    async testStudentModelMethods() {
        console.log('4️⃣ Testing Student Model Methods...');
        
        try {
            // Test getStatistics
            console.log('   🧪 Testing Student.getStatistics()...');
            const stats = await Student.getStatistics();
            console.log(`   📊 Statistics:`, stats);
            this.testResults.push({ test: 'Student.getStatistics()', status: 'PASS', data: stats });
            
            // Test searchByKeyword
            console.log('   🧪 Testing Student.searchByKeyword()...');
            const searchResults = await Student.searchByKeyword('a');
            console.log(`   🔍 Search results: ${searchResults.length} students`);
            this.testResults.push({ test: 'Student.searchByKeyword()', status: 'PASS', count: searchResults.length });
            
        } catch (error) {
            console.log(`   ❌ Model methods error: ${error.message}`);
            this.testResults.push({ test: 'Model Methods', status: 'ERROR', error: error.message });
        }
        
        console.log('');
    }

    async testTelegramBotLogic() {
        console.log('5️⃣ Testing Telegram Bot Logic...');
        
        try {
            // Simulate the exact logic from telegram-bot.js handleSiswa method
            console.log('   🤖 Simulating handleSiswa logic...');
            
            const students = await Student.getAll();
            console.log(`   📊 Students from getAll(): ${students.length}`);
            
            if (students.length === 0) {
                console.log('   ⚠️ Bot would show: "👥 Belum ada data siswa"');
                this.testResults.push({ test: 'Bot Logic', status: 'WARN', message: 'Would show no students' });
            } else {
                console.log('   ✅ Bot would show student list');
                
                // Test the payment calculation logic
                console.log('   💰 Testing payment calculations...');
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
                studentsWithTotals.forEach(student => {
                    console.log(`      ${student.name}: Rp ${student.total_paid}`);
                });
                
                this.testResults.push({ test: 'Bot Logic', status: 'PASS', count: students.length });
            }
            
        } catch (error) {
            console.log(`   ❌ Bot logic error: ${error.message}`);
            this.testResults.push({ test: 'Bot Logic', status: 'ERROR', error: error.message });
        }
        
        console.log('');
    }

    showSummary() {
        console.log('📋 Test Summary');
        console.log('===============\n');
        
        const passed = this.testResults.filter(r => r.status === 'PASS').length;
        const failed = this.testResults.filter(r => r.status === 'FAIL').length;
        const errors = this.testResults.filter(r => r.status === 'ERROR').length;
        const warnings = this.testResults.filter(r => r.status === 'WARN').length;
        
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`🔥 Errors: ${errors}`);
        console.log(`⚠️ Warnings: ${warnings}\n`);
        
        // Show detailed results
        this.testResults.forEach(result => {
            const icon = {
                'PASS': '✅',
                'FAIL': '❌',
                'ERROR': '🔥',
                'WARN': '⚠️',
                'INFO': '💡'
            }[result.status];
            
            console.log(`${icon} ${result.test}: ${result.status}`);
            
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
            if (result.message) {
                console.log(`   Message: ${result.message}`);
            }
            if (result.count !== undefined) {
                console.log(`   Count: ${result.count}`);
            }
        });
        
        console.log('\n🔧 Recommendations:');
        
        if (failed > 0 || errors > 0) {
            console.log('1. Run: node aapanel-setup.js');
            console.log('2. Check database permissions');
            console.log('3. Verify MySQL service is running');
        }
        
        const noStudentsTest = this.testResults.find(r => r.test === 'Student Count' && r.status === 'WARN');
        if (noStudentsTest) {
            console.log('4. Add students via web interface or run setup script');
            console.log('5. Check if students have status="active" or NULL');
        }
        
        const modelIssue = this.testResults.find(r => r.test === 'Student.getAll()' && r.count === 0);
        if (modelIssue) {
            console.log('6. Check Student model query logic');
            console.log('7. Verify status field values in database');
        }
        
        console.log('\n🚀 Next Steps:');
        if (passed === this.testResults.length) {
            console.log('All tests passed! Your setup should work correctly.');
        } else {
            console.log('Fix the issues above, then test again with:');
            console.log('   node test-siswa-aapanel.js');
        }
    }

    // Add sample data for testing
    async addSampleData() {
        console.log('➕ Adding sample student data...\n');
        
        const sampleStudents = [
            { name: 'Ahmad Fauzi', class_name: 'XI TKJ A', phone: '081234567890', email: 'ahmad@email.com' },
            { name: 'Siti Nurhaliza', class_name: 'XI TKJ A', phone: '081234567891', email: 'siti@email.com' },
            { name: 'Budi Santoso', class_name: 'XI TKJ B', phone: '081234567892', email: 'budi@email.com' }
        ];

        try {
            for (const student of sampleStudents) {
                const result = await executeQuery(
                    'INSERT INTO students (name, class_name, phone, email, status) VALUES (?, ?, ?, ?, ?)',
                    [student.name, student.class_name, student.phone, student.email, 'active']
                );
                
                if (result.success) {
                    console.log(`✅ Added: ${student.name}`);
                } else {
                    console.log(`❌ Failed to add: ${student.name} - ${result.error}`);
                }
            }
            
            console.log('\n✅ Sample data added successfully!');
            console.log('Now test again with: node test-siswa-aapanel.js');
            
        } catch (error) {
            console.log(`❌ Error adding sample data: ${error.message}`);
        }
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const tester = new StudentTestAAPanel();
    
    if (args.includes('--add-sample') || args.includes('-s')) {
        await tester.addSampleData();
    } else {
        await tester.runAllTests();
        
        const noData = tester.testResults.find(r => r.test === 'Student Count' && r.status === 'WARN');
        if (noData) {
            console.log('\n💡 Tip: Add sample data with --add-sample flag');
            console.log('   node test-siswa-aapanel.js --add-sample');
        }
    }
}

// Run if executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('Test error:', error);
        process.exit(1);
    });
}

module.exports = StudentTestAAPanel;
