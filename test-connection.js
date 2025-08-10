const { testConnection, getDbStats } = require('./config/database');
const MistralAI = require('./config/mistral');
require('dotenv').config();

async function runTests() {
    console.log('🧪 Testing Axioo Kas Connections...\n');
    
    // Test 1: Database Connection
    console.log('1️⃣ Testing Database Connection...');
    try {
        const dbConnected = await testConnection();
        if (dbConnected) {
            console.log('✅ Database connection: SUCCESS');
            
            // Get database stats
            const stats = await getDbStats();
            if (stats) {
                console.log(`   📊 Students: ${stats.students}`);
                console.log(`   💰 Transactions: ${stats.transactions}`);
                console.log(`   📈 Income: Rp ${stats.income.toLocaleString('id-ID')}`);
                console.log(`   📉 Expenses: Rp ${stats.expenses.toLocaleString('id-ID')}`);
            }
        } else {
            console.log('❌ Database connection: FAILED');
        }
    } catch (error) {
        console.log('❌ Database connection: ERROR');
        console.log(`   Error: ${error.message}`);
    }
    
    console.log('');
    
    // Test 2: Mistral AI Connection
    console.log('2️⃣ Testing Mistral AI Connection...');
    try {
        const mistral = new MistralAI();
        
        if (!process.env.MISTRAL_API_KEY) {
            console.log('⚠️ Mistral AI: API key not configured');
            console.log('   Set MISTRAL_API_KEY in .env file to enable AI features');
        } else {
            console.log('✅ Mistral AI: API key configured');
            
            // Test AI processing
            const testCommand = "kas 5000 test";
            const sampleStudents = [
                { id: 1, name: 'Test Student' }
            ];
            
            console.log('   🧠 Testing AI command processing...');
            const result = await mistral.processCommand(testCommand, sampleStudents);
            
            if (result.success) {
                console.log('✅ Mistral AI processing: SUCCESS');
                console.log(`   📝 Interpreted: ${JSON.stringify(result.data, null, 2)}`);
            } else {
                console.log('❌ Mistral AI processing: FAILED');
                console.log(`   Error: ${result.error}`);
            }
        }
    } catch (error) {
        console.log('❌ Mistral AI: ERROR');
        console.log(`   Error: ${error.message}`);
    }
    
    console.log('');
    
    // Test 3: Environment Variables
    console.log('3️⃣ Testing Environment Configuration...');
    
    const requiredEnvVars = [
        'DB_HOST',
        'DB_USER', 
        'DB_NAME',
        'PORT',
        'ADMIN_USERNAME',
        'ADMIN_PASSWORD',
        'SESSION_SECRET'
    ];
    
    const optionalEnvVars = [
        'TELEGRAM_BOT_TOKEN',
        'MISTRAL_API_KEY'
    ];
    
    let envScore = 0;
    const totalRequired = requiredEnvVars.length;
    
    requiredEnvVars.forEach(varName => {
        if (process.env[varName]) {
            console.log(`✅ ${varName}: configured`);
            envScore++;
        } else {
            console.log(`❌ ${varName}: missing`);
        }
    });
    
    optionalEnvVars.forEach(varName => {
        if (process.env[varName]) {
            console.log(`✅ ${varName}: configured (optional)`);
        } else {
            console.log(`⚠️ ${varName}: not configured (optional)`);
        }
    });
    
    console.log(`\n📊 Environment Score: ${envScore}/${totalRequired} required variables`);
    
    console.log('');
    
    // Test 4: Port Availability
    console.log('4️⃣ Testing Port Availability...');
    const port = process.env.PORT || 3007;
    
    try {
        const net = require('net');
        const server = net.createServer();
        
        await new Promise((resolve, reject) => {
            server.listen(port, () => {
                console.log(`✅ Port ${port}: available`);
                server.close(resolve);
            });
            
            server.on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    console.log(`⚠️ Port ${port}: already in use`);
                    console.log('   You may need to stop existing process or change PORT in .env');
                } else {
                    console.log(`❌ Port ${port}: error - ${err.message}`);
                }
                reject(err);
            });
        });
    } catch (error) {
        // Port test failed, but that's okay
    }
    
    console.log('');
    
    // Test Summary
    console.log('📋 Test Summary:');
    console.log('================');
    
    if (envScore === totalRequired) {
        console.log('✅ Environment: All required variables configured');
    } else {
        console.log(`❌ Environment: ${totalRequired - envScore} required variables missing`);
    }
    
    console.log('');
    console.log('🚀 Next Steps:');
    console.log('1. Fix any failed tests above');
    console.log('2. Run: yarn start (or node app.js)');
    console.log('3. Open: http://localhost:' + port);
    console.log('4. Login: admin / admin123');
    console.log('');
    console.log('📱 Optional: Start Telegram bot with: yarn bot');
    console.log('');
}

// Run tests if this file is executed directly
if (require.main === module) {
    runTests().catch(error => {
        console.error('Test runner error:', error);
        process.exit(1);
    });
}

module.exports = { runTests };
