const { executeQuery, testConnection } = require('./config/database');
const Student = require('./models/Student');
require('dotenv').config();

async function quickTest() {
    console.log('⚡ Quick Test - aaPanel Compatibility\n');
    console.log('===================================\n');

    let allPassed = true;

    // Test 1: Database Connection
    console.log('1️⃣ Database Connection...');
    try {
        const connected = await testConnection();
        if (connected) {
            console.log('   ✅ PASS - Database connected');
        } else {
            console.log('   ❌ FAIL - Database connection failed');
            allPassed = false;
        }
    } catch (error) {
        console.log(`   ❌ ERROR - ${error.message}`);
        allPassed = false;
    }

    // Test 2: Students Table
    console.log('\n2️⃣ Students Table...');
    try {
        const result = await executeQuery('SELECT COUNT(*) as count FROM students');
        if (result.success) {
            const count = result.data[0].count;
            console.log(`   ✅ PASS - Found ${count} students in database`);
            
            if (count === 0) {
                console.log('   ⚠️ WARNING - No students found (this explains 0 siswa in bot)');
            }
        } else {
            console.log('   ❌ FAIL - Cannot access students table');
            allPassed = false;
        }
    } catch (error) {
        console.log(`   ❌ ERROR - ${error.message}`);
        allPassed = false;
    }

    // Test 3: Student Model
    console.log('\n3️⃣ Student Model...');
    try {
        const students = await Student.getAll();
        console.log(`   ✅ PASS - Student.getAll() returned ${students.length} students`);
        
        if (students.length === 0) {
            console.log('   ⚠️ WARNING - Model returns 0 students');
        }
    } catch (error) {
        console.log(`   ❌ ERROR - ${error.message}`);
        allPassed = false;
    }

    // Test 4: Bot Logic Simulation
    console.log('\n4️⃣ Bot Logic Simulation...');
    try {
        const students = await Student.getAll();
        
        if (students.length === 0) {
            console.log('   ⚠️ Bot would show: "👥 Belum ada data siswa"');
            console.log('   💡 This matches your reported issue');
        } else {
            console.log(`   ✅ Bot would show list of ${students.length} students`);
        }
    } catch (error) {
        console.log(`   ❌ ERROR - ${error.message}`);
        allPassed = false;
    }

    // Summary
    console.log('\n📊 SUMMARY');
    console.log('==========');
    
    if (allPassed) {
        console.log('✅ All core tests passed!');
        console.log('🚀 Your setup should work correctly');
    } else {
        console.log('❌ Some tests failed');
        console.log('🔧 Run auto-fix: npm run aapanel:fix');
    }

    // Quick recommendations
    console.log('\n💡 QUICK ACTIONS:');
    
    if (!allPassed) {
        console.log('1. npm run aapanel:fix     # Auto-fix issues');
        console.log('2. npm run aapanel:test    # Full diagnostic');
    } else {
        console.log('1. npm run test:siswa:sample  # Add sample data if needed');
        console.log('2. npm run bot                # Start Telegram bot');
    }

    console.log('\n⚡ Quick test completed in ~5 seconds');
}

// Run if executed directly
if (require.main === module) {
    quickTest().catch(error => {
        console.error('Quick test error:', error);
        process.exit(1);
    });
}

module.exports = { quickTest };
