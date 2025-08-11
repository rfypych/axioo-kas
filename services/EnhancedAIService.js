const MistralAI = require('../config/mistral');
const Student = require('../models/Student');
const Transaction = require('../models/Transaction');

class EnhancedAIService {
    constructor(bot, weeklyReport, enhancedReport, multiWeekPayment) {
        this.bot = bot;
        this.weeklyReport = weeklyReport;
        this.enhancedReport = enhancedReport;
        this.multiWeekPayment = multiWeekPayment;
        this.mistral = new MistralAI();

        console.log('🤖 Enhanced AI Service initialized with multi-student support');
    }

    async processEnhancedCommand(message, chatId, userId) {
        try {
            console.log(`Processing enhanced AI command: ${message}`);

            // Get all students for AI processing
            const students = await Student.getAll();

            // Process command with enhanced multi-student AI
            const aiResult = await this.processMultiStudentCommand(message, students);

            if (!aiResult.success) {
                return {
                    success: false,
                    response: `❌ ${aiResult.error || 'Tidak dapat memproses perintah'}`
                };
            }

            // Execute the parsed commands
            const executionResult = await this.executeMultiStudentCommands(aiResult.data, userId);

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

    async processMultiStudentCommand(message, studentsList) {
        if (!this.mistral.apiKey) {
            return { success: false, error: 'Mistral AI not configured' };
        }

        try {
            const prompt = this.buildMultiStudentPrompt(message, studentsList);

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

    buildMultiStudentPrompt(message, studentsList) {
        const studentsText = studentsList.map(s => `- ${s.name} (ID: ${s.id})`).join('\n');

        return `
Analisis perintah kas multi-siswa berikut: "${message}"

Daftar siswa yang tersedia:
${studentsText}

TUGAS: Deteksi dan parse pembayaran multiple siswa dengan format beragam:

FORMAT YANG DIDUKUNG:
1. "danu, huda, nanda, agil kas 5k" -> semua siswa bayar 5000
2. "agil kas 3k, danu 5k, nanda 2k, putra 8k" -> masing-masing jumlah berbeda
3. "kas 3k danu huda nanda" -> danu, huda, nanda masing-masing 3000
4. "danu 3000 huda 5000 nanda 2000" -> masing-masing jumlah berbeda
5. "kas danu 3k, huda 5k" -> kombinasi format

ATURAN PARSING:
- Deteksi semua nama siswa yang disebutkan (gunakan fuzzy matching)
- Ekstrak jumlah untuk setiap siswa
- Jika hanya 1 jumlah disebutkan untuk multiple siswa, gunakan jumlah yang sama
- Support format: 3k=3000, 5rb=5000, 2000, dll
- Jika ada siswa yang tidak ditemukan, tetap proses yang ditemukan

CONTOH PARSING:
Input: "danu, huda kas 5k"
Output: [
  {"student_name": "danu", "amount": 5000},
  {"student_name": "huda", "amount": 5000}
]

Input: "agil 3k, danu 5k"
Output: [
  {"student_name": "agil", "amount": 3000},
  {"student_name": "danu", "amount": 5000}
]

Berikan response dalam format JSON:
{
    "type": "multi_iuran|single_iuran|income|expense|reset",
    "payments": [
        {
            "student_id": number_or_null,
            "student_name": "string",
            "amount": number,
            "confidence": 0.0-1.0
        }
    ],
    "total_amount": number,
    "description": "string",
    "confidence": 0.0-1.0,
    "not_found": ["nama1", "nama2"]
}

PENTING:
- Jika hanya 1 siswa terdeteksi, gunakan type: "single_iuran"
- Jika multiple siswa, gunakan type: "multi_iuran"
- Confidence tinggi (>0.8) jika nama siswa jelas cocok
- Sertakan nama yang tidak ditemukan di array "not_found"`;
    }

    parseMultiStudentResponse(aiResponse) {
        try {
            // Clean the response to extract JSON
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in AI response');
            }

            const parsed = JSON.parse(jsonMatch[0]);

            // Validate required fields
            if (!parsed.type || !parsed.payments || !Array.isArray(parsed.payments)) {
                throw new Error('Invalid multi-student response format');
            }

            // Validate each payment
            const validPayments = parsed.payments.filter(payment => {
                return payment.student_name &&
                       typeof payment.amount === 'number' &&
                       payment.amount > 0;
            });

            if (validPayments.length === 0) {
                throw new Error('No valid payments found');
            }

            return {
                success: true,
                data: {
                    type: parsed.type,
                    payments: validPayments,
                    total_amount: parsed.total_amount || validPayments.reduce((sum, p) => sum + p.amount, 0),
                    description: parsed.description || 'Pembayaran kas',
                    confidence: parsed.confidence || 0.7,
                    not_found: parsed.not_found || []
                }
            };

        } catch (error) {
            console.error('Error parsing multi-student AI response:', error.message);
            return { success: false, error: 'Failed to parse AI response' };
        }
    }

    async executeMultiStudentCommands(aiData, userId) {
        try {
            const { type, payments, description, not_found } = aiData;

            if (type === 'single_iuran' && payments.length === 1) {
                // Handle single student payment
                return await this.executeSinglePayment(payments[0], description, userId);
            } else if (type === 'multi_iuran' && payments.length > 1) {
                // Handle multiple student payments
                return await this.executeMultiplePayments(payments, description, userId, not_found);
            } else {
                return {
                    success: false,
                    message: '❌ Format pembayaran tidak valid'
                };
            }

        } catch (error) {
            console.error('Error executing multi-student commands:', error);
            return {
                success: false,
                message: '❌ Gagal memproses pembayaran'
            };
        }
    }

    async executeSinglePayment(payment, description, userId) {
        try {
            // Find student by name
            const student = await this.findStudentByName(payment.student_name);

            if (!student) {
                return {
                    success: false,
                    message: `❌ Siswa "${payment.student_name}" tidak ditemukan`
                };
            }

            // Process payment using MultiWeekPaymentService
            const result = await this.multiWeekPayment.processMultiWeekPayment(
                student.id,
                payment.amount,
                description,
                `telegram_${userId}`
            );

            if (result.success) {
                const message = `✅ *Pembayaran Berhasil*\n\n` +
                              `👤 *Siswa:* ${student.name}\n` +
                              `💰 *Jumlah:* Rp ${payment.amount.toLocaleString('id-ID')}\n` +
                              `📝 *Keterangan:* ${description}\n\n` +
                              `${result.summary}`;

                return {
                    success: true,
                    message: message,
                    data: { student, payment: result }
                };
            } else {
                return {
                    success: false,
                    message: `❌ Gagal memproses pembayaran: ${result.error}`
                };
            }

        } catch (error) {
            console.error('Error executing single payment:', error);
            return {
                success: false,
                message: '❌ Terjadi kesalahan saat memproses pembayaran'
            };
        }
    }

    async executeMultiplePayments(payments, description, userId, notFound = []) {
        try {
            const results = [];
            const errors = [];
            let totalAmount = 0;

            // Process each payment
            for (const payment of payments) {
                const student = await this.findStudentByName(payment.student_name);

                if (!student) {
                    errors.push(`❌ ${payment.student_name}: Siswa tidak ditemukan`);
                    continue;
                }

                // Process payment
                const result = await this.multiWeekPayment.processMultiWeekPayment(
                    student.id,
                    payment.amount,
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
            if (notFound.length > 0) {
                message += `\n❓ *Nama Tidak Ditemukan:*\n`;
                notFound.forEach(name => {
                    message += `• ${name}\n`;
                });
            }

            return {
                success: results.length > 0,
                message: message,
                data: {
                    successful: results,
                    errors: errors,
                    notFound: notFound,
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

    async findStudentByName(searchName) {
        try {
            // First try exact match (case insensitive)
            const students = await Student.getAll();

            // Exact match
            let found = students.find(s =>
                s.name.toLowerCase() === searchName.toLowerCase()
            );

            if (found) return found;

            // Partial match (contains)
            found = students.find(s =>
                s.name.toLowerCase().includes(searchName.toLowerCase()) ||
                searchName.toLowerCase().includes(s.name.toLowerCase())
            );

            if (found) return found;

            // Use AI for fuzzy matching if available
            if (this.mistral.apiKey) {
                const aiMatch = await this.mistral.findBestMatch(searchName, students);
                if (aiMatch && aiMatch.confidence >= 0.6) {
                    return students.find(s => s.id === aiMatch.id);
                }
            }

            return null;

        } catch (error) {
            console.error('Error finding student by name:', error);
            return null;
        }
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
}

module.exports = EnhancedAIService;
