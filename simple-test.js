const { executeQuery } = require('./config/database');
const Student = require('./models/Student');

async function simpleTest() {
    console.log('Testing after database fix...\n');
    
    try {
        // Test 1: Direct query
        console.log('1. Testing direct query...');
        const result = await executeQuery('SELECT COUNT(*) as count FROM students WHERE status = "active" OR status IS NULL');
        if (result.success) {
            console.log(`   ✅ Found ${result.data[0].count} active students`);
        } else {
            console.log(`   ❌ Error: ${result.error}`);
        }
        
        // Test 2: Student model
        console.log('\n2. Testing Student model...');
        const students = await Student.getAll();
        console.log(`   ✅ Student.getAll() returned ${students.length} students`);
        
        if (students.length > 0) {
            console.log('\n   Sample students:');
            students.slice(0, 3).forEach((student, index) => {
                console.log(`   ${index + 1}. ${student.name} - ${student.class_name} (${student.status || 'active'})`);
            });
        }
        
        console.log('\n✅ Test completed successfully!');
        console.log('🚀 Bot should now show students correctly');
        
    } catch (error) {
        console.log(`❌ Test failed: ${error.message}`);
    }
}

simpleTest();
