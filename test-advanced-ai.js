// Set dummy env vars to prevent script from exiting
process.env.IS_TESTING = 'true';
process.env.TELEGRAM_BOT_TOKEN = 'test-token';
process.env.MISTRAL_API_KEY = 'test-key';

const AxiooKasBot = require('./telegram-bot.js');
const Student = require('./models/Student');
const Transaction = require('./models/Transaction');

// --- Manual Mocking ---
// Mock the bot object to prevent network calls
const mockBot = {
    sendMessage: (chatId, text, options) => {
        console.log(`[BOT MOCK] sendMessage called for chatId ${chatId}.`);
        console.log("   - Text:", text.substring(0, 80) + "...");
    },
    editMessageText: (text, options) => {
        console.log(`[BOT MOCK] editMessageText called.`);
    },
    setMyCommands: () => {},
    onText: () => {},
    on: () => {},
    confirmTransactionDeletion: async (chatId, transaction) => {
        console.log("✅ `confirmTransactionDeletion` was called by the service.");
        console.log("   - Chat ID:", chatId);
        console.log("   - Transaction to be deleted:", JSON.stringify(transaction, null, 2));
        return { success: true, message: "Confirmation requested." };
    }
};

// Mock database-dependent methods to remove DB dependency
const dummyStudents = [
    { id: 1, name: 'Achmad Muzaki Asror' }, { id: 2, name: 'Adira Putra Raihan' },
    { id: 3, name: 'Afif Fadila Arub' }, { id: 4, name: 'Airlangga Setyo Putro' },
    { id: 29, name: 'Rofikul Huda' }, { id: 34, name: 'Yoga Arif Nurrohman' }
];
Student.getAll = async () => {
    console.log("[DB MOCK] Student.getAll() called. Returning dummy students.");
    return dummyStudents;
};
Transaction.findRecentIuranTransaction = async (studentId, amount) => {
    console.log(`[DB MOCK] findRecentIuranTransaction called for student ${studentId}, amount ${amount}.`);
    return { id: 999, student_id: studentId, amount: amount, description: 'Dummy Transaction' };
};
Transaction.create = async () => {
    console.log("[DB MOCK] Transaction.create called. Returning dummy success.");
    return { success: true };
};


console.log("📝 Starting Advanced AI Feature Test (with DB Mocking)...");

async function runTest() {
    const botInstance = new AxiooKasBot();
    botInstance.bot = mockBot;

    const enhancedAI = botInstance.enhancedAI;

    if (!enhancedAI) {
        console.error("❌ Enhanced AI Service not initialized. Exiting test.");
        return;
    }

    // --- Test 1: Exclusion Command ---
    console.log("\n--- 🧪 Test 1: Exclusion Command ---");
    const exclusionCommand = "semua siswa kecuali yoga dan rofikul kas 3k";
    console.log(`Input: "${exclusionCommand}"`);

    // Mock the AI response
    enhancedAI.processMultiStudentCommand = async () => ({
        success: true,
        data: {
            type: 'multi_iuran',
            operation: 'pay_all_except',
            payments: [{ amount: 3000 }],
            excluded_students: ['yoga', 'rofikul'],
            description: 'Iuran kas',
            confidence: 0.95
        }
    });

    await enhancedAI.processEnhancedCommand(exclusionCommand, 'test-chat', 'test-user');


    // --- Test 2: Deletion Command ---
    console.log("\n--- 🧪 Test 2: Deletion Command ---");
    const deletionCommand = "hapus iuran 5000 dari rofikul huda";
    console.log(`Input: "${deletionCommand}"`);

    // Mock the AI response
    enhancedAI.processMultiStudentCommand = async () => ({
        success: true,
        data: {
            type: 'expense',
            operation: 'delete_transaction',
            payments: [{ student_name: 'rofikul huda', amount: 5000 }],
            description: 'Penghapusan iuran 5k dari rofikul huda',
            confidence: 0.98
        }
    });

    await enhancedAI.processEnhancedCommand(deletionCommand, 'test-chat', 'test-user');

    console.log("\n✅ Advanced AI tests finished.");
}

runTest().catch(error => {
    console.error("❌ Test script failed:", error);
    process.exit(1);
});
