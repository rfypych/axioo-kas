const { executeQuery } = require('./config/database');
require('dotenv').config();

async function testNewEmoji() {
    try {
        console.log('🧪 Testing new emoji for /siswa command...\n');
        
        // Test different money emojis
        const emojiOptions = [
            { name: 'Money Bag', emoji: '💰', code: 'U+1F4B0' },
            { name: 'Dollar Banknote', emoji: '💵', code: 'U+1F4B5' },
            { name: 'Money with Wings', emoji: '💸', code: 'U+1F4B8' },
            { name: 'Coin', emoji: '🪙', code: 'U+1FA99' },
            { name: 'Heavy Dollar Sign', emoji: '💲', code: 'U+1F4B2' },
            { name: 'Chart Increasing', emoji: '📈', code: 'U+1F4C8' }
        ];
        
        console.log('=== EMOJI COMPATIBILITY TEST ===');
        emojiOptions.forEach((option, index) => {
            console.log(`${index + 1}. ${option.emoji} ${option.name} (${option.code})`);
        });
        console.log('');
        
        // Get a sample student (Nanda)
        const result = await executeQuery('SELECT * FROM students WHERE name LIKE "%Nanda%" LIMIT 1');
        
        if (result.success && result.data.length > 0) {
            const student = result.data[0];
            
            // Get total payment
            const paymentResult = await executeQuery(
                'SELECT COALESCE(SUM(amount), 0) as total_paid FROM transactions WHERE student_id = ? AND type = "iuran"',
                [student.id]
            );
            const totalPaid = paymentResult.success ? parseFloat(paymentResult.data[0].total_paid) : 0;
            
            console.log('=== SAMPLE OUTPUT WITH DIFFERENT EMOJIS ===');
            emojiOptions.forEach((option, index) => {
                console.log(`${index + 1}. Using ${option.name}:`);
                console.log(`21. ${student.name}`);
                console.log(`   ${option.emoji} Total bayar: Rp ${totalPaid.toLocaleString('id-ID')}`);
                console.log('');
            });
            
            console.log('=== RECOMMENDED EMOJI ===');
            console.log('💵 Dollar Banknote (U+1F4B5) - Most compatible across devices');
            console.log('This emoji is more widely supported than 💰 Money Bag');
            
        } else {
            console.log('❌ Could not find Nanda in database');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
    
    process.exit(0);
}

testNewEmoji();
