const MistralAI = require('../config/mistral');
const Student = require('../models/Student');
const Transaction = require('../models/Transaction');

class EnhancedAIService {
    constructor(botInstance, weeklyReport, enhancedReport, multiWeekPayment) {
        this.botInstance = botInstance;
        this.bot = botInstance.bot;
        this.weeklyReport = weeklyReport;
        this.enhancedReport = enhancedReport;
        this.multiWeekPayment = multiWeekPayment;
        this.mistral = new MistralAI();

        console.log('🤖 Enhanced AI Service initialized with multi-student support');
    }

    async processEnhancedCommand(message, chatId, userId) {
        try {
            console.log(`Processing enhanced AI command: ${message}`);

            // Step 1: Get simple structured data from AI
            const aiResult = await this.processMultiStudentCommand(message);

            if (!aiResult.success) {
                return {
                    success: false,
                    response: `❌ ${aiResult.error || 'Tidak dapat memproses perintah'}`
                };
            }

            // Step 2: Match extracted names with the student database
            const allStudents = await Student.getAll();
            const { matched, notFound } = await this.findStudentsByNames(aiResult.data.names, allStudents);

            // Step 3: Prepare data for execution
            const executionData = {
                ...aiResult.data,
                matched_students: matched,
                not_found_names: notFound
            };

            // Execute the parsed commands
            const executionResult = await this.executeMultiStudentCommands(executionData, userId);

            return {
                success: true,
                response: executionResult.message,
                data: executionResult.data
            };

        } catch (error) {
            console.error('Enhanced AI processing error:', error);
            return {
                success: false,
                response: '❌ Terjadi kesalahan saat memproses perintah AI'
            };
        }
    }

    async processMultiStudentCommand(message) {
        if (!this.mistral.apiKey) {
            return { success: false, error: 'Mistral AI not configured' };
        }

        try {
            const prompt = this.buildMultiStudentPrompt(message);

            const response = await this.mistral.makeRequest({
                model: this.mistral.model,
                messages: [
                    {
                        role: 'system',
                        content: 'Kamu adalah asisten kas kelas yang ahli dalam memproses pembayaran multiple siswa. Berikan response dalam format JSON yang valid.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 1000,
                temperature: 0.1
            });

            const aiResponse = response.data.choices[0].message.content;
            return this.parseMultiStudentResponse(aiResponse);

        } catch (error) {
            console.error('Multi-student AI processing error:', error);
            return { success: false, error: 'AI processing failed' };
        }
    }

    buildMultiStudentPrompt(message) {
        return `
Analisis perintah natural language berikut: "${message}"

Tugas Anda adalah mengurai perintah ini menjadi komponen-komponennya dalam format JSON. Fokus pada identifikasi operasi, nama-nama yang terlibat, dan jumlah uang.

OPERASI YANG DIDUKUNG:
- "pay": Pembayaran iuran untuk satu atau lebih siswa.
- "pay_all_except": Pembayaran iuran untuk semua siswa kecuali beberapa.
- "delete_transaction": Perintah untuk menghapus iuran yang sudah ada.
- "income": Pemasukan umum.
- "expense": Pengeluaran umum.
- "reset": Reset data.

ATURAN:
1.  **Operasi & Tipe**: Tentukan 'operation' dan 'type' yang paling sesuai.
2.  **Ekstrak Nama**: Ambil SEMUA nama yang disebutkan dalam perintah. Jangan coba mencocokkan dengan daftar. Tulis apa adanya.
3.  **Ekstrak Jumlah**: Ambil jumlah uang. Jika ada beberapa, pasangkan dengan nama yang sesuai. Jika hanya ada satu jumlah untuk banyak nama, gunakan jumlah itu untuk semua.
4.  **Deskripsi**: Buat deskripsi singkat dari perintah.

CONTOH:

Input: "kas 3k danu, huda, dan nanda"
Output: {
    "operation": "pay",
    "type": "multi_iuran",
    "names": ["danu", "huda", "nanda"],
    "amounts": [3000],
    "description": "Pembayaran iuran 3k untuk danu, huda, nanda"
}

Input: "semua siswa kecuali yoga dan risty kas 5rb"
Output: {
    "operation": "pay_all_except",
    "type": "multi_iuran",
    "names": ["yoga", "risty"],
    "amounts": [5000],
    "description": "Iuran 5rb untuk semua kecuali yoga dan risty"
}

Input: "hapus uang kas danu sebesar 3k"
Output: {
    "operation": "delete_transaction",
    "type": "expense",
    "names": ["danu"],
    "amounts": [3000],
    "description": "Hapus kas danu 3k"
}

Input: "terima donasi 100k dari kepsek"
Output: {
    "operation": "income",
    "type": "income",
    "names": [],
    "amounts": [100000],
    "description": "Donasi 100k dari kepsek"
}

Input: "agil kas 3k, danu 5k, nanda 2k"
Output: {
    "operation": "pay",
    "type": "multi_iuran",
    "names": ["agil", "danu", "nanda"],
    "amounts": [3000, 5000, 2000],
    "description": "Pembayaran iuran untuk agil, danu, nanda"
}

Berikan response HANYA dalam format JSON yang valid.
`;
    }

    parseMultiStudentResponse(aiResponse) {
        try {
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in AI response');
            }
            let parsed;
            try {
                parsed = JSON.parse(jsonMatch[0]);
            } catch (e) {
                throw new Error(`Failed to parse AI response as JSON: ${e.message}`);
            }

            // Basic validation for the new simplified format
            if (!parsed.operation || !parsed.names || !parsed.amounts) {
                throw new Error('Invalid simplified AI response format');
            }

            return { success: true, data: parsed };

        } catch (error) {
            console.error('Error parsing multi-student AI response:', error.message);
            return { success: false, error: 'Failed to parse AI response' };
        }
    }

    async executeMultiStudentCommands(executionData, userId) {
        try {
            const { operation, type, amounts, description, matched_students, not_found_names } = executionData;

            if (operation === 'pay_all_except') {
                return await this.executePayAllExcept(amounts[0], matched_students, description, userId);
            }

            if (operation === 'delete_transaction') {
                const student_to_delete = matched_students[0];
                const amount_to_delete = amounts[0];
                return await this.handleTransactionDeletionRequest(student_to_delete, amount_to_delete, userId);
            }

            if (operation === 'pay') {
                const payments = matched_students.map((student, index) => ({
                    student: student,
                    amount: amounts.length === 1 ? amounts[0] : amounts[index]
                }));
                return await this.executeMultiplePayments(payments, description, userId, not_found_names);
            }

            // Handle other types like income, expense, reset if necessary
            return { success: false, message: '❌ Operasi AI tidak dikenali.' };

        } catch (error) {
            console.error('Error executing multi-student commands:', error);
            return {
                success: false,
                message: '❌ Gagal memproses pembayaran'
            };
        }
    }

    async executeMultiplePayments(payments, description, userId, notFoundNames = []) {
        try {
            const results = [];
            const errors = [];
            let totalAmount = 0;

            // Process each payment
            for (const payment of payments) {
                const { student, amount } = payment;

                // Process payment
                const result = await this.multiWeekPayment.processMultiWeekPayment(
                    student.id,
                    amount,
                    `${description} - ${student.name}`,
                    `telegram_${userId}`
                );

                if (result.success) {
                    results.push({
                        student: student,
                        payment: payment,
                        result: result
                    });
                    totalAmount += payment.amount;
                } else {
                    errors.push(`❌ ${student.name}: ${result.error}`);
                }
            }

            // Generate response message
            let message = '';

            if (results.length > 0) {
                message += `✅ *Pembayaran Multi-Siswa Berhasil*\n\n`;
                message += `💰 *Total:* Rp ${totalAmount.toLocaleString('id-ID')}\n`;
                message += `👥 *Siswa:* ${results.length} orang\n\n`;

                message += `📋 *Detail Pembayaran:*\n`;
                results.forEach((item, index) => {
                    const { student, payment, result } = item;
                    message += `${index + 1}. *${student.name}*\n`;
                    message += `   💰 Rp ${payment.amount.toLocaleString('id-ID')}`;

                    if (result.weeksCount > 0) {
                        message += ` (${result.weeksCount} minggu`;
                        if (result.remainder > 0) {
                            message += ` + Rp ${result.remainder.toLocaleString('id-ID')}`;
                        }
                        message += `)`;
                    }
                    message += `\n`;
                });
            }

            // Add errors if any
            if (errors.length > 0) {
                message += `\n⚠️ *Gagal Diproses:*\n`;
                errors.forEach(error => {
                    message += `${error}\n`;
                });
            }

            // Add not found students
            if (notFoundNames.length > 0) {
                message += `\n❓ *Nama Tidak Ditemukan:*\n`;
                notFoundNames.forEach(name => {
                    message += `• ${name}\n`;
                });
            }

            return {
                success: results.length > 0,
                message: message,
                data: {
                    successful: results,
                    errors: errors,
                    notFound: notFoundNames,
                    totalAmount: totalAmount
                }
            };

        } catch (error) {
            console.error('Error executing multiple payments:', error);
            return {
                success: false,
                message: '❌ Terjadi kesalahan saat memproses pembayaran multiple'
            };
        }
    }

    async findStudentsByNames(names, allStudents) {
        const matched = [];
        const notFound = [];

        for (const name of names) {
            const student = await this.findStudentByName(name, allStudents);
            if (student) {
                matched.push(student);
            } else {
                notFound.push(name);
            }
        }
        return { matched, notFound };
    }

    async findStudentByName(searchName, studentsList) {
        const lowerSearchName = searchName.toLowerCase();

        // 1. Exact match
        let found = studentsList.find(s => s.name.toLowerCase() === lowerSearchName);
        if (found) return found;

        // 2. Starts with match
        found = studentsList.find(s => s.name.toLowerCase().startsWith(lowerSearchName));
        if (found) return found;

        // 3. Partial match (contains)
        found = studentsList.find(s => s.name.toLowerCase().includes(lowerSearchName));
        if (found) return found;

        // 4. Nickname match (first word)
        found = studentsList.find(s => s.name.toLowerCase().split(' ')[0] === lowerSearchName);
        if (found) return found;

        return null;
    }

    // Helper method to add makeRequest to MistralAI if not exists
    async makeAIRequest(requestData) {
        try {
            const axios = require('axios');

            const response = await axios.post(this.mistral.baseURL, requestData, {
                headers: {
                    'Authorization': `Bearer ${this.mistral.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            });

            return response;

        } catch (error) {
            throw error;
        }
    }

    // Test method for development
    async testMultiStudentParsing(testCommands) {
        console.log('🧪 Testing multi-student parsing...\n');

        const students = await Student.getAll();

        for (const command of testCommands) {
            console.log(`Testing: "${command}"`);
            const result = await this.processMultiStudentCommand(command, students);
            console.log('Result:', JSON.stringify(result, null, 2));
            console.log('---');
        }
    }

    async executePayAllExcept(amount, excludedStudents, description, userId) {
        try {
            const allStudents = await Student.getAll();
            const excludedIds = excludedStudents.map(s => s.id);

            const studentsToPay = allStudents.filter(s => !excludedIds.includes(s.id));

            if (studentsToPay.length === 0) {
                return { success: true, message: 'ℹ️ Tidak ada siswa yang perlu membayar setelah pengecualian.' };
            }

            const payments = studentsToPay.map(s => ({ student: s, amount: amount }));

            return await this.executeMultiplePayments(payments, description, userId, []);

        } catch (error) {
            console.error('Error executing pay all except:', error);
            return {
                success: false,
                message: '❌ Terjadi kesalahan saat memproses pembayaran "semua kecuali"'
            };
        }
    }

    async handleTransactionDeletionRequest(student, amount, userId) {
        try {
            if (!student) {
                return { success: false, message: `❌ Siswa tidak ditemukan.` };
            }

            // Find the most recent transaction for this student with the specified amount
            const transaction = await Transaction.findRecentIuranTransaction(student.id, amount);

            if (!transaction) {
                return {
                    success: false,
                    message: `❌ Tidak ditemukan transaksi iuran sebesar Rp ${paymentInfo.amount.toLocaleString('id-ID')} untuk ${student.name}.`
                };
            }

            // Pass to the bot to handle confirmation from the user
            return await this.botInstance.confirmTransactionDeletion(userId, transaction);

        } catch (error) {
            console.error('Error handling transaction deletion request:', error);
            return { success: false, message: '❌ Terjadi kesalahan saat mencari transaksi untuk dihapus.' };
        }
    }
}

module.exports = EnhancedAIService;
