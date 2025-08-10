const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { executeQuery } = require('./config/database');
const Student = require('./models/Student');
require('dotenv').config();

class AAPanelDiagnostic {
    constructor() {
        this.issues = [];
        this.solutions = [];
    }

    async runDiagnostic() {
        console.log('🔍 Axioo Kas - aaPanel Diagnostic Tool\n');
        console.log('=====================================\n');

        await this.checkEnvironment();
        await this.checkDatabaseConnection();
        await this.checkDatabaseStructure();
        await this.checkStudentData();
        await this.checkTelegramBot();
        
        this.showResults();
    }

    async checkEnvironment() {
        console.log('1️⃣ Checking Environment...');
        
        // Check if running on aaPanel
        const aaPanelIndicators = [
            '/www/server',
            '/www/wwwroot',
            '/www/server/mysql'
        ];

        let isAAPanel = false;
        for (const indicator of aaPanelIndicators) {
            if (fs.existsSync(indicator)) {
                isAAPanel = true;
                console.log(`   ✅ aaPanel detected: ${indicator}`);
                break;
            }
        }

        if (!isAAPanel) {
            console.log('   ⚠️ aaPanel not detected (might be different environment)');
        }

        // Check Node.js version
        const nodeVersion = process.version;
        console.log(`   📦 Node.js version: ${nodeVersion}`);
        
        if (parseInt(nodeVersion.slice(1)) < 14) {
            this.issues.push('Node.js version too old');
            this.solutions.push('Update Node.js to version 14 or higher');
        }

        // Check required files
        const requiredFiles = [
            '.env',
            'config/database.js',
            'models/Student.js',
            'telegram-bot.js'
        ];

        for (const file of requiredFiles) {
            if (fs.existsSync(path.join(__dirname, file))) {
                console.log(`   ✅ ${file} exists`);
            } else {
                console.log(`   ❌ ${file} missing`);
                this.issues.push(`Missing file: ${file}`);
            }
        }

        console.log('');
    }

    async checkDatabaseConnection() {
        console.log('2️⃣ Checking Database Connection...');

        try {
            // Test basic connection
            const { testConnection } = require('./config/database');
            const connected = await testConnection();
            
            if (connected) {
                console.log('   ✅ Database connection successful');
            } else {
                console.log('   ❌ Database connection failed');
                this.issues.push('Database connection failed');
                this.solutions.push('Run: node aapanel-setup.js to auto-configure');
                return;
            }

            // Test query execution
            const result = await executeQuery('SELECT 1 as test');
            if (result.success) {
                console.log('   ✅ Query execution works');
            } else {
                console.log('   ❌ Query execution failed');
                this.issues.push('Query execution failed');
            }

            // Check database name
            const dbResult = await executeQuery('SELECT DATABASE() as current_db');
            if (dbResult.success && dbResult.data[0].current_db) {
                console.log(`   ✅ Current database: ${dbResult.data[0].current_db}`);
            } else {
                console.log('   ⚠️ No database selected');
                this.issues.push('No database selected');
            }

        } catch (error) {
            console.log(`   ❌ Database error: ${error.message}`);
            this.issues.push(`Database error: ${error.message}`);
            
            // Common aaPanel issues
            if (error.message.includes('ECONNREFUSED')) {
                this.solutions.push('MySQL service might be stopped. Check: systemctl status mysql');
            }
            if (error.message.includes('Access denied')) {
                this.solutions.push('Check database credentials in .env file');
            }
            if (error.message.includes('Unknown database')) {
                this.solutions.push('Database does not exist. Run: node aapanel-setup.js');
            }
        }

        console.log('');
    }

    async checkDatabaseStructure() {
        console.log('3️⃣ Checking Database Structure...');

        try {
            // Check if tables exist
            const tablesResult = await executeQuery('SHOW TABLES');
            
            if (!tablesResult.success) {
                console.log('   ❌ Cannot check tables');
                this.issues.push('Cannot access database tables');
                return;
            }

            const tables = tablesResult.data.map(row => Object.values(row)[0]);
            const requiredTables = ['students', 'transactions', 'student_changes'];
            
            console.log(`   📊 Found ${tables.length} tables: ${tables.join(', ')}`);

            for (const table of requiredTables) {
                if (tables.includes(table)) {
                    console.log(`   ✅ Table '${table}' exists`);
                    
                    // Check table structure
                    const structureResult = await executeQuery(`DESCRIBE ${table}`);
                    if (structureResult.success) {
                        console.log(`      📋 ${table}: ${structureResult.data.length} columns`);
                    }
                } else {
                    console.log(`   ❌ Table '${table}' missing`);
                    this.issues.push(`Missing table: ${table}`);
                    this.solutions.push('Run: node aapanel-setup.js to create missing tables');
                }
            }

        } catch (error) {
            console.log(`   ❌ Structure check error: ${error.message}`);
            this.issues.push(`Structure check failed: ${error.message}`);
        }

        console.log('');
    }

    async checkStudentData() {
        console.log('4️⃣ Checking Student Data...');

        try {
            // Direct query to check students
            const directResult = await executeQuery('SELECT COUNT(*) as count FROM students');
            
            if (directResult.success) {
                const count = directResult.data[0].count;
                console.log(`   📊 Direct query: ${count} students in database`);
                
                if (count === 0) {
                    console.log('   ⚠️ No students found in database');
                    this.issues.push('No student data');
                    this.solutions.push('Add students via web interface or run aapanel-setup.js for sample data');
                } else {
                    // Show sample students
                    const sampleResult = await executeQuery('SELECT id, name, class_name, status FROM students LIMIT 3');
                    if (sampleResult.success) {
                        console.log('   👥 Sample students:');
                        sampleResult.data.forEach(student => {
                            console.log(`      - ${student.name} (${student.class_name}) [${student.status || 'active'}]`);
                        });
                    }
                }
            } else {
                console.log('   ❌ Cannot query students table');
                this.issues.push('Cannot access students table');
            }

            // Test Student model
            console.log('   🧪 Testing Student model...');
            const students = await Student.getAll();
            console.log(`   📊 Student.getAll(): ${students.length} students`);
            
            if (students.length === 0 && directResult.success && directResult.data[0].count > 0) {
                console.log('   ⚠️ Model returns 0 but database has data - possible model issue');
                this.issues.push('Student model not returning data correctly');
                this.solutions.push('Check Student model query logic');
            }

        } catch (error) {
            console.log(`   ❌ Student data check error: ${error.message}`);
            this.issues.push(`Student data check failed: ${error.message}`);
        }

        console.log('');
    }

    async checkTelegramBot() {
        console.log('5️⃣ Checking Telegram Bot Configuration...');

        // Check bot token
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (botToken) {
            console.log('   ✅ Telegram bot token configured');
            
            // Validate token format
            if (botToken.match(/^\d+:[A-Za-z0-9_-]+$/)) {
                console.log('   ✅ Bot token format valid');
            } else {
                console.log('   ⚠️ Bot token format might be invalid');
                this.issues.push('Invalid bot token format');
            }
        } else {
            console.log('   ⚠️ Telegram bot token not configured');
            this.solutions.push('Set TELEGRAM_BOT_TOKEN in .env file');
        }

        // Check if bot file exists and is valid
        const botFile = path.join(__dirname, 'telegram-bot.js');
        if (fs.existsSync(botFile)) {
            console.log('   ✅ telegram-bot.js exists');
            
            try {
                // Try to require the bot file (syntax check)
                delete require.cache[require.resolve('./telegram-bot.js')];
                require('./telegram-bot.js');
                console.log('   ✅ Bot file syntax valid');
            } catch (error) {
                console.log(`   ❌ Bot file error: ${error.message}`);
                this.issues.push(`Bot file error: ${error.message}`);
            }
        }

        console.log('');
    }

    showResults() {
        console.log('📋 Diagnostic Results');
        console.log('====================\n');

        if (this.issues.length === 0) {
            console.log('🎉 No issues found! Your setup looks good.\n');
            console.log('🚀 Try running:');
            console.log('   node telegram-bot.js');
            console.log('   Then test with: /siswa');
        } else {
            console.log(`❌ Found ${this.issues.length} issue(s):\n`);
            
            this.issues.forEach((issue, index) => {
                console.log(`${index + 1}. ${issue}`);
            });

            console.log('\n🔧 Suggested Solutions:\n');
            
            this.solutions.forEach((solution, index) => {
                console.log(`${index + 1}. ${solution}`);
            });

            console.log('\n🚀 Quick Fix:');
            console.log('   node aapanel-setup.js');
            console.log('   (This will auto-detect and fix most aaPanel issues)');
        }

        console.log('\n📞 Need Help?');
        console.log('   1. Check the logs above for specific errors');
        console.log('   2. Verify MySQL service is running');
        console.log('   3. Check database permissions');
        console.log('   4. Run aapanel-setup.js for automatic configuration');
    }

    // Quick fix method
    async quickFix() {
        console.log('🔧 Running Quick Fix...\n');
        
        // Import and run aaPanel setup
        const AAPanelSetup = require('./aapanel-setup');
        const setup = new AAPanelSetup();
        
        const success = await setup.run();
        
        if (success) {
            console.log('\n✅ Quick fix completed! Try running the diagnostic again.');
        } else {
            console.log('\n❌ Quick fix failed. Manual intervention required.');
        }
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const diagnostic = new AAPanelDiagnostic();
    
    if (args.includes('--fix') || args.includes('-f')) {
        await diagnostic.quickFix();
    } else {
        await diagnostic.runDiagnostic();
        
        if (diagnostic.issues.length > 0) {
            console.log('\n💡 Tip: Run with --fix flag to attempt automatic fixes');
            console.log('   node diagnose-aapanel.js --fix');
        }
    }
}

// Run if executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('Diagnostic error:', error);
        process.exit(1);
    });
}

module.exports = AAPanelDiagnostic;
