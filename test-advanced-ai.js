// Set dummy env vars to prevent script from exiting
process.env.IS_TESTING = 'true';
process.env.TELEGRAM_BOT_TOKEN = 'test-token';
process.env.MISTRAL_API_KEY = 'test-key';

const AxiooKasBot = require('./telegram-bot.js');
const Student = require('./models/Student');
const Transaction = require('./models/Transaction');

// --- Manual Mocking ---
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

const dummyStudents = [
    { id: 1, name: 'Achmad Muzaki Asror' }, { id: 2, name: 'Adira Putra Raihan' },
    { id: 29, name: 'Rofikul Huda' }, { id: 34, name: 'Yoga Arif Nurrohman' }
];
Student.getAll = async () => {
    console.log("[DB MOCK] Student.getAll() called.");
    return dummyStudents;
};
Transaction.findRecentIuranTransaction = async (studentId, amount) => {
    console.log(`[DB MOCK] findRecentIuranTransaction called for student ${studentId}, amount ${amount}.`);
    return { id: 999, student_id: studentId, amount: amount, description: 'Dummy Transaction' };
};
Transaction.create = async () => { return { success: true }; };


console.log("📝 Starting Advanced AI Feature Test (v2)...");

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

    enhancedAI.processMultiStudentCommand = async () => ({
        success: true,
        data: {
            operation: 'pay_all_except',
            type: 'multi_iuran',
            names: ['yoga', 'rofikul'],
            amounts: [3000],
            description: 'Iuran kas'
        }
    });

    // Temporarily mock the final execution method to inspect its inputs
    const originalExecutePayAllExcept = enhancedAI.executePayAllExcept;
    enhancedAI.executePayAllExcept = async (amount, excludedStudents, description, userId) => {
        console.log("✅ `executePayAllExcept` was called correctly.");
        console.log(`   - Amount: ${amount}`);
        console.log(`   - Excluded Students:`, excludedStudents.map(s => s.name));
    };
    await enhancedAI.processEnhancedCommand(exclusionCommand, 'test-chat', 'test-user');
    enhancedAI.executePayAllExcept = originalExecutePayAllExcept; // Restore


    // --- Test 2: Deletion Command ---
    console.log("\n--- 🧪 Test 2: Deletion Command ---");
    const deletionCommand = "hapus iuran 5000 dari rofikul huda";
    console.log(`Input: "${deletionCommand}"`);

    enhancedAI.processMultiStudentCommand = async () => ({
        success: true,
        data: {
            operation: 'delete_transaction',
            type: 'expense',
            names: ['rofikul huda'],
            amounts: [5000],
            description: 'Penghapusan iuran 5k dari rofikul huda'
        }
    });

    const originalHandleDeletion = enhancedAI.handleTransactionDeletionRequest;
    enhancedAI.handleTransactionDeletionRequest = async (student, amount, userId) => {
        console.log("✅ `handleTransactionDeletionRequest` was called correctly.");
        console.log(`   - Student:`, student.name);
        console.log(`   - Amount:`, amount);
    };
    await enhancedAI.processEnhancedCommand(deletionCommand, 'test-chat', 'test-user');
    enhancedAI.handleTransactionDeletionRequest = originalHandleDeletion; // Restore

    console.log("\n✅ Advanced AI tests finished.");
}

runTest().catch(error => {
    console.error("❌ Test script failed:", error);
    process.exit(1);
});
