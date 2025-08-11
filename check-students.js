const { executeQuery } = require('./config/database');
require('dotenv').config();

async function checkStudents() {
    try {
        console.log('🔍 Checking student data...\n');
        
        const result = await executeQuery('SELECT id, name FROM students ORDER BY name ASC');
        
        if (result.success) {
            console.log('=== DAFTAR SISWA ===');
            result.data.forEach((student, index) => {
                console.log(`${index + 1}. ID: ${student.id}, Name: "${student.name}"`);
                
                // Check for special characters in name
                const nameBytes = Buffer.from(student.name, 'utf8');
                const hexBytes = Array.from(nameBytes).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ');
                
                console.log(`   Hex bytes: ${hexBytes}`);
                console.log(`   Length: ${student.name.length} chars`);
                
                // Check specifically for Nanda
                if (student.name.includes('Nanda')) {
                    console.log(`   ⚠️ FOUND NANDA: "${student.name}"`);
                    // Check each character
                    for (let i = 0; i < student.name.length; i++) {
                        const char = student.name[i];
                        const code = char.charCodeAt(0);
                        console.log(`     Char ${i}: "${char}" (U+${code.toString(16).padStart(4, '0').toUpperCase()})`);
                    }
                }
                console.log('');
            });
        } else {
            console.error('❌ Error:', result.error);
        }
    } catch (error) {
        console.error('❌ Error:', error);
    }
    
    process.exit(0);
}

checkStudents();
