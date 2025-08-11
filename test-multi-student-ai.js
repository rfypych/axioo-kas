const EnhancedAIService = require('./services/EnhancedAIService');
const Student = require('./models/Student');
require('dotenv').config();

class MultiStudentAITester {
    constructor() {
        this.enhancedAI = new EnhancedAIService(null, null, null, null);
    }

    async runTests() {
        console.log('🧪 Testing Multi-Student AI Commands\n');
        console.log('===================================\n');

        // Test commands
        const testCommands = [
            // Format 1: Multiple students, same amount
            'danu, huda, nanda, agil kas 5k',
            'kas 3k danu huda nanda',
            'danu dan huda kas 3000',
            'bayar kas danu, huda, agil 5000',
            
            // Format 2: Multiple students, different amounts
            'agil kas 3k, danu 5k, nanda 2k, putra 8k',
            'danu 3000 huda 5000 nanda 2000',
            'kas agil 3k, huda 5k',
            'bayar danu 3k, huda 2k, nanda 4k',
            
            // Format 3: Mixed formats
            'kas danu 3k, huda 5k, nanda agil 2k',
            'danu huda 3k, nanda 5k',
            
            // Format 4: Single student (should use standard AI)
            'danu kas 3k',
            'kas 5000 huda',
            
            // Format 5: Edge cases
            'kas 3k semua siswa',
            'bayar iuran danu, siswa yang lain 2k',
            'danu, huda, siswa lain kas 3k'
        ];

        for (let i = 0; i < testCommands.length; i++) {
            const command = testCommands[i];
            console.log(`\n${i + 1}. Testing: "${command}"`);
            console.log('=' .repeat(50));
            
            try {
                // Test detection
                const isMulti = this.testDetection(command);
                console.log(`🔍 Multi-student detected: ${isMulti ? 'YES' : 'NO'}`);
                
                if (isMulti) {
                    // Test AI parsing
                    const students = await Student.getAll();
                    const aiResult = await this.enhancedAI.processMultiStudentCommand(command, students);
                    
                    if (aiResult.success) {
                        console.log('✅ AI Parsing successful');
                        console.log(`📊 Type: ${aiResult.data.type}`);
                        console.log(`💰 Total: Rp ${aiResult.data.total_amount?.toLocaleString('id-ID') || 0}`);
                        console.log(`👥 Students: ${aiResult.data.payments?.length || 0}`);
                        
                        if (aiResult.data.payments) {
                            console.log('\n📋 Payment details:');
                            aiResult.data.payments.forEach((payment, index) => {
                                console.log(`   ${index + 1}. ${payment.student_name}: Rp ${payment.amount?.toLocaleString('id-ID')} (confidence: ${payment.confidence})`);
                            });
                        }
                        
                        if (aiResult.data.not_found && aiResult.data.not_found.length > 0) {
                            console.log(`❓ Not found: ${aiResult.data.not_found.join(', ')}`);
                        }
                    } else {
                        console.log(`❌ AI Parsing failed: ${aiResult.error}`);
                    }
                } else {
                    console.log('ℹ️ Would use standard single-student AI');
                }
                
            } catch (error) {
                console.log(`❌ Test failed: ${error.message}`);
            }
        }
        
        console.log('\n🎯 Test Summary');
        console.log('===============');
        console.log('✅ Multi-student AI commands tested');
        console.log('✅ Detection algorithm tested');
        console.log('✅ AI parsing tested');
        console.log('\n💡 Next steps:');
        console.log('1. Test with real Telegram bot: /ai <command>');
        console.log('2. Verify payment processing works');
        console.log('3. Test edge cases and error handling');
    }

    testDetection(command) {
        // Simulate the detection logic from telegram bot
        const lowerCommand = command.toLowerCase();
        
        const multiStudentPatterns = [
            /,/,
            /\s+dan\s+/,
            /\s+&\s+/,
            /\s+\+\s+/,
        ];
        
        const hasComma = multiStudentPatterns[0].test(lowerCommand);
        const hasMultipleAmounts = (lowerCommand.match(/\d+[k]?/g) || []).length > 1;
        const hasMultipleNames = this.countPotentialNames(lowerCommand) > 1;
        
        return hasComma || hasMultipleAmounts || hasMultipleNames;
    }

    countPotentialNames(command) {
        const words = command.toLowerCase().split(/\s+/);
        const excludeWords = ['kas', 'bayar', 'iuran', 'dan', 'dengan', 'untuk', 'dari', 'ke', 'di', 'yang', 'adalah', 'ini', 'itu', 'semua', 'siswa', 'lain'];
        const nameWords = words.filter(word => 
            word.length > 2 && 
            !excludeWords.includes(word) && 
            !/^\d+[k]?$/.test(word) &&
            !/^rp$/i.test(word)
        );
        
        return nameWords.length;
    }

    async testSpecificCommand(command) {
        console.log(`\n🧪 Testing specific command: "${command}"\n`);
        
        try {
            const students = await Student.getAll();
            const result = await this.enhancedAI.processEnhancedCommand(command, 'test_chat', 'test_user');
            
            console.log('Result:', JSON.stringify(result, null, 2));
            
        } catch (error) {
            console.error('Test error:', error);
        }
    }

    async showStudentList() {
        console.log('\n👥 Available Students:');
        console.log('=====================');
        
        try {
            const students = await Student.getAll();
            students.forEach((student, index) => {
                console.log(`${index + 1}. ${student.name} (ID: ${student.id}) - ${student.class_name || 'No Class'}`);
            });
            console.log(`\nTotal: ${students.length} students\n`);
        } catch (error) {
            console.error('Error getting students:', error);
        }
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const tester = new MultiStudentAITester();
    
    if (args.includes('--students') || args.includes('-s')) {
        await tester.showStudentList();
        return;
    }
    
    if (args.includes('--test') || args.includes('-t')) {
        const command = args[args.indexOf('--test') + 1] || args[args.indexOf('-t') + 1];
        if (command) {
            await tester.testSpecificCommand(command);
        } else {
            console.log('Usage: node test-multi-student-ai.js --test "command here"');
        }
        return;
    }
    
    // Default: run all tests
    await tester.runTests();
}

// Run if executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('Test runner error:', error);
        process.exit(1);
    });
}

module.exports = MultiStudentAITester;
