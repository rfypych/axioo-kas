const TelegramBot = require('node-telegram-bot-api');
const Student = require('./models/Student');
const Transaction = require('./models/Transaction');
const MistralAI = require('./config/mistral');
const WeeklyReportService = require('./services/WeeklyReportService');
const EnhancedReportService = require('./services/EnhancedReportService');
const EnhancedAIService = require('./services/EnhancedAIService');
const MultiWeekPaymentService = require('./services/MultiWeekPaymentService');
const ConfigurableReportService = require('./services/ConfigurableReportService');
require('dotenv').config();

class AxiooKasBot {
    constructor(options = {}) {
        this.token = process.env.TELEGRAM_BOT_TOKEN;
        this.bot = null;
        this.mistral = new MistralAI();
        
        if (!this.token) {
            console.error('❌ Telegram bot token tidak ditemukan di .env');
            return;
        }
        
        const polling = options.polling !== false; // Default to true
        this.bot = new TelegramBot(this.token, { polling });
        this.weeklyReport = new WeeklyReportService(this.bot);
        this.enhancedReport = new EnhancedReportService();
        this.multiWeekPayment = new MultiWeekPaymentService();
        this.configurableReport = ConfigurableReportService;
        this.enhancedAI = new EnhancedAIService(this.bot, this.weeklyReport, this.enhancedReport, this.multiWeekPayment);
        this.setupCommands();
        this.setupHandlers();
        
        console.log('🤖 Axioo Kas Telegram Bot started');
    }

    setupCommands() {
        if (!this.bot) return;
        
        // Set bot commands
        this.bot.setMyCommands([
            { command: 'start', description: 'Mulai menggunakan bot' },
            { command: 'saldo', description: 'Cek saldo kas' },
            { command: 'tambah', description: 'Tambah pemasukan' },
            { command: 'kurang', description: 'Tambah pengeluaran' },
            { command: 'iuran', description: 'Bayar iuran atau cek status' },
            { command: 'riwayat', description: 'Lihat riwayat transaksi' },
            { command: 'siswa', description: 'Daftar siswa' },
            { command: 'ai', description: 'Gunakan AI untuk memproses perintah' },
            { command: 'reset', description: 'Reset saldo dan keuangan siswa' },
            { command: 'laporan', description: 'Kelola laporan mingguan otomatis' },
            { command: 'kelola', description: 'Kelola data siswa (tambah/edit/keluar)' },
            { command: 'help', description: 'Bantuan penggunaan bot' }
        ]);
    }

    setupHandlers() {
        if (!this.bot) return;
        
        // Start command
        this.bot.onText(/\/start/, (msg) => {
            this.handleStart(msg);
        });
        
        // Saldo command
        this.bot.onText(/\/saldo/, (msg) => {
            this.handleSaldo(msg);
        });
        
        // Tambah command
        this.bot.onText(/\/tambah (.+)/, (msg, match) => {
            this.handleTambah(msg, match[1]);
        });

        // Kurang command
        this.bot.onText(/\/kurang (.+)/, (msg, match) => {
            this.handleKurang(msg, match[1]);
        });
        
        // Iuran command
        this.bot.onText(/\/iuran (.+)/, (msg, match) => {
            this.handleIuran(msg, match[1]);
        });
        
        // Riwayat command
        this.bot.onText(/\/riwayat/, (msg) => {
            this.handleRiwayat(msg);
        });
        
        // Siswa command
        this.bot.onText(/\/siswa/, (msg) => {
            this.handleSiswa(msg);
        });
        
        // AI command
        this.bot.onText(/\/ai (.+)/, (msg, match) => {
            this.handleAI(msg, match[1]);
        });
        
        // Help command
        this.bot.onText(/\/help/, (msg) => {
            this.handleHelp(msg);
        });

        // Reset command with options
        this.bot.onText(/\/reset$/, (msg) => {
            this.handleResetMenu(msg);
        });

        this.bot.onText(/\/reset (.+)/, (msg, match) => {
            this.handleResetCommand(msg, match[1]);
        });

        // Confirmation commands
        this.bot.onText(/\/ya/, (msg) => {
            this.handleConfirmation(msg, true);
        });

        this.bot.onText(/\/tidak/, (msg) => {
            this.handleConfirmation(msg, false);
        });

        // Laporan command
        this.bot.onText(/\/laporan$/, (msg) => {
            this.handleLaporanMenu(msg);
        });

        this.bot.onText(/\/laporan (.+)/, (msg, match) => {
            this.handleLaporanCommand(msg, match[1]);
        });

        // Student management commands
        this.bot.onText(/\/kelola$/, (msg) => {
            this.handleKelolaMenu(msg);
        });

        this.bot.onText(/\/kelola (.+)/, (msg, match) => {
            this.handleKelolaCommand(msg, match[1]);
        });

        // Handle text messages (for AI processing)
        this.bot.on('message', (msg) => {
            if (msg.text && !msg.text.startsWith('/')) {
                this.handleTextMessage(msg);
            }
        });
        
        // Error handling
        this.bot.on('error', (error) => {
            console.error('Telegram bot error:', error);
        });
    }

    async handleStart(msg) {
        const chatId = msg.chat.id;
        const welcomeMessage = `
🏦 *Selamat datang di Axioo Kas Bot!*

Bot ini membantu Anda mengelola kas kelas dengan mudah.

📋 *Perintah yang tersedia:*
/saldo - Cek saldo kas
/tambah [jumlah] [deskripsi] - Tambah pemasukan
/kurang [jumlah] [deskripsi] - Tambah pengeluaran
/iuran [nama] [jumlah] - Bayar iuran siswa
/riwayat - Lihat 10 transaksi terakhir
/siswa - Daftar semua siswa
/ai [perintah] - Gunakan AI untuk memproses perintah
/reset [opsi] - Reset saldo/siswa/semua
/laporan - Kelola laporan mingguan otomatis
/kelola - Kelola data siswa (tambah/edit/keluar)
/help - Bantuan lengkap

💡 *Contoh penggunaan:*
• \`/tambah 50000 Sumbangan dari alumni\`
• \`/kurang 15000 Beli pulpen dan kertas\`
• \`/iuran muzaki 5000\`
• \`/reset saldo\` - Reset saldo kas
• \`/ai kas 3000 muzaki\`

Atau kirim pesan langsung untuk diproses dengan AI!
        `;
        
        this.bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
    }

    async handleSaldo(msg) {
        const chatId = msg.chat.id;
        
        try {
            const balance = await Transaction.getBalance();
            const weeklyCollection = await Transaction.getWeeklyCollection();
            
            const message = `
💰 *Saldo Kas Kelas*

💵 Saldo saat ini: *Rp ${balance.balance.toLocaleString('id-ID')}*
📈 Total pemasukan: Rp ${balance.income.toLocaleString('id-ID')}
📉 Total pengeluaran: Rp ${balance.expense.toLocaleString('id-ID')}

📅 *Iuran Minggu Ini:*
💰 Terkumpul: Rp ${weeklyCollection.weekly_total.toLocaleString('id-ID')}
👥 Siswa yang lunas minggu ini: ${weeklyCollection.students_lunas} orang
            `;
            
            this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
            
        } catch (error) {
            console.error('Saldo error:', error);
            this.bot.sendMessage(chatId, '❌ Terjadi kesalahan saat mengambil data saldo');
        }
    }

    async handleTambah(msg, params) {
        const chatId = msg.chat.id;
        
        try {
            // Parse parameters: [jumlah] [deskripsi]
            const parts = params.split(' ');
            const amount = parseFloat(parts[0]);
            const description = parts.slice(1).join(' ');
            
            if (isNaN(amount) || !description) {
                this.bot.sendMessage(chatId, '❌ Format salah. Gunakan: /tambah [jumlah] [deskripsi]');
                return;
            }
            
            // Determine transaction type based on keywords
            let type = 'income';
            if (description.toLowerCase().includes('beli') || 
                description.toLowerCase().includes('bayar') ||
                description.toLowerCase().includes('keluar')) {
                type = 'expense';
            }
            
            const transaction = await Transaction.create({
                type: type,
                amount: amount,
                description: description,
                student_id: null,
                created_by: `telegram-${msg.from.username || msg.from.first_name}`
            });
            
            if (transaction) {
                const typeText = type === 'income' ? 'Pemasukan' : 'Pengeluaran';
                this.bot.sendMessage(chatId, 
                    `✅ ${typeText} berhasil ditambahkan!\n\n` +
                    `💰 Jumlah: Rp ${amount.toLocaleString('id-ID')}\n` +
                    `📝 Deskripsi: ${description}`
                );
            } else {
                this.bot.sendMessage(chatId, '❌ Gagal menambahkan transaksi');
            }
            
        } catch (error) {
            console.error('Tambah error:', error);
            this.bot.sendMessage(chatId, '❌ Terjadi kesalahan saat menambahkan transaksi');
        }
    }

    async handleKurang(msg, params) {
        const chatId = msg.chat.id;

        try {
            // Parse parameters: [jumlah] [deskripsi]
            const parts = params.split(' ');
            const amount = parseFloat(parts[0]);
            const description = parts.slice(1).join(' ');

            if (isNaN(amount) || !description) {
                this.bot.sendMessage(chatId, '❌ Format salah. Gunakan: /kurang [jumlah] [deskripsi]');
                return;
            }

            // Always create as expense transaction
            const transaction = await Transaction.create({
                type: 'expense',
                amount: amount,
                description: description,
                student_id: null,
                created_by: `telegram-${msg.from.username || msg.from.first_name}`
            });

            if (transaction) {
                this.bot.sendMessage(chatId,
                    `✅ Pengeluaran berhasil ditambahkan!\n\n` +
                    `💸 Jumlah: Rp ${amount.toLocaleString('id-ID')}\n` +
                    `📝 Deskripsi: ${description}\n` +
                    `📉 Saldo kas berkurang`
                );
            } else {
                this.bot.sendMessage(chatId, '❌ Gagal menambahkan pengeluaran');
            }

        } catch (error) {
            console.error('Kurang error:', error);
            this.bot.sendMessage(chatId, '❌ Terjadi kesalahan saat menambahkan pengeluaran');
        }
    }

    async handleIuran(msg, params) {
        const chatId = msg.chat.id;
        
        try {
            const parts = params.split(' ');

            if (parts[0] === 'status') {
                this.bot.sendMessage(chatId, '⏳ Menyiapkan status iuran mingguan...');

                const weeklyAmount = 3000;
                const reportDayName = await this.configurableReport.getReportingDayName();
                const weekRanges = await this.configurableReport.getMultipleWeekRanges(4, new Date(), 'future');
                const students = await Student.getAllActive(); // Assuming this function exists

                let message = `📊 *Status Iuran 4 Minggu Kedepan*\n`;
                message += `*Tutup buku setiap hari:* ${reportDayName}\n`;
                message += `💰 *Iuran:* Rp ${weeklyAmount.toLocaleString('id-ID')}/minggu\n\n`;

                message += `📅 *Periode Minggu:*\n`;
                weekRanges.forEach((range, index) => {
                    const start = `${range.startDate.getDate().toString().padStart(2, '0')}/${(range.startDate.getMonth() + 1).toString().padStart(2, '0')}`;
                    const end = `${range.endDate.getDate().toString().padStart(2, '0')}/${(range.endDate.getMonth() + 1).toString().padStart(2, '0')}`;
                    message += `Minggu ${index + 1}: ${start} - ${end}\n`;
                });
                message += `\n`;

                const studentStatuses = [];
                for (const student of students) {
                    let weekStatus = '';
                    let totalPaidAllWeeks = 0;
                    for (const range of weekRanges) {
                        const totalPaid = await Transaction.getStudentPaymentsForRange(student.id, range.startDate, range.endDate);
                        totalPaidAllWeeks += totalPaid;
                        if (totalPaid >= weeklyAmount) {
                            weekStatus += '✅';
                        } else if (totalPaid > 0) {
                            weekStatus += '❕';
                        } else {
                            weekStatus += '❌';
                        }
                    }
                    const amountText = totalPaidAllWeeks > 0 ? ` (Rp ${totalPaidAllWeeks.toLocaleString('id-ID')})` : '';
                    studentStatuses.push(`${weekStatus} ${student.name}${amountText}`);
                }

                message += studentStatuses.join('\n');

                message += `\n\n📋 *Keterangan:*\n`;
                message += `✅ = Lunas (Rp ${weeklyAmount.toLocaleString('id-ID')})\n`;
                message += `❕ = Sebagian Dibayar\n`;
                message += `❌ = Belum Bayar\n`;
                message += `\n💡 *Format:* Minggu 1-2-3-4`;

                this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
                return;
            }
            
            // Parse payment: [nama] [jumlah]
            const searchName = parts[0];
            const amount = parseFloat(parts[1]);
            
            if (!searchName || isNaN(amount)) {
                this.bot.sendMessage(chatId, '❌ Format salah. Gunakan: /iuran [nama] [jumlah] atau /iuran status');
                return;
            }
            
            // Find student
            const students = await Student.getByName(searchName);
            
            if (students.length === 0) {
                this.bot.sendMessage(chatId, `❌ Siswa dengan nama "${searchName}" tidak ditemukan`);
                return;
            }
            
            if (students.length > 1) {
                let message = `🔍 Ditemukan ${students.length} siswa:\n\n`;
                students.forEach((student, index) => {
                    message += `${index + 1}. ${student.name}\n`;
                });
                message += '\nGunakan nama yang lebih spesifik.';
                this.bot.sendMessage(chatId, message);
                return;
            }
            
            const student = students[0];
            const userId = `telegram-${msg.from.username || msg.from.first_name}`;

            // Check if this is a multi-week payment
            const paymentBreakdown = this.multiWeekPayment.getPaymentBreakdown(amount);

            if (paymentBreakdown.fullWeeks > 0) {
                // Multi-week payment
                this.bot.sendMessage(chatId, `⏳ Memproses pembayaran multi-minggu...\n💰 ${paymentBreakdown.breakdown}`);

                const result = await this.multiWeekPayment.processMultiWeekPayment(
                    student.id,
                    amount,
                    `Iuran mingguan - ${student.name}`,
                    userId
                );

                if (result.success) {
                    let response = `🎉 **Pembayaran Multi-Minggu Berhasil!**\n\n`;
                    response += `👤 **Siswa:** ${student.name}\n`;
                    response += `💰 **Total:** Rp ${amount.toLocaleString('id-ID')}\n\n`;
                    response += result.summary;

                    // Show future weeks status
                    const futureStatus = await this.multiWeekPayment.getStudentMultiWeekStatus(student.id, 6);
                    if (futureStatus.success) {
                        response += `\n${futureStatus.summary}`;
                    }

                    this.bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
                } else {
                    this.bot.sendMessage(chatId, `❌ Gagal memproses pembayaran multi-minggu: ${result.error}`);
                }
            } else {
                // Single week payment (traditional)
                const result = await this.multiWeekPayment.processSinglePayment(
                    student.id,
                    amount,
                    `Iuran mingguan - ${student.name}`,
                    userId
                );

                if (result.success) {
                    let response = `✅ **Iuran berhasil dibayar!**\n\n`;
                    response += `👤 **Siswa:** ${student.name}\n`;
                    response += `💰 **Jumlah:** Rp ${amount.toLocaleString('id-ID')}\n\n`;
                    response += result.summary;

                    // Show suggestion for advance payment if amount is small
                    if (amount < 3000) {
                        const needed = 3000 - amount;
                        response += `\n💡 **Tip:** Kurang Rp ${needed.toLocaleString('id-ID')} untuk lunas minggu ini`;
                        response += `\nAtau bayar Rp ${this.multiWeekPayment.calculateAdvancePayment(2).toLocaleString('id-ID')} untuk 2 minggu sekaligus!`;
                    } else if (amount === 3000) {
                        response += `\n💡 **Tip:** Bayar Rp ${this.multiWeekPayment.calculateAdvancePayment(4).toLocaleString('id-ID')} untuk 4 minggu sekaligus!`;
                    }

                    this.bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
                } else {
                    this.bot.sendMessage(chatId, `❌ Gagal menyimpan pembayaran: ${result.error}`);
                }
            }
            
        } catch (error) {
            console.error('Iuran error:', error);
            this.bot.sendMessage(chatId, '❌ Terjadi kesalahan saat memproses iuran');
        }
    }

    async handleRiwayat(msg) {
        const chatId = msg.chat.id;
        
        try {
            const transactions = await Transaction.getRecentTransactions(10);
            
            if (transactions.length === 0) {
                this.bot.sendMessage(chatId, '📝 Belum ada transaksi');
                return;
            }
            
            let message = '📋 *10 Transaksi Terakhir:*\n\n';
            
            transactions.forEach((tx, index) => {
                const date = new Date(tx.created_at).toLocaleDateString('id-ID');
                const type = tx.type === 'income' ? '📈' : tx.type === 'expense' ? '📉' : '💰';
                const studentName = tx.student_name ? ` (${tx.student_name})` : '';
                
                message += `${index + 1}. ${type} Rp ${tx.amount.toLocaleString('id-ID')}\n`;
                message += `   ${tx.description}${studentName}\n`;
                message += `   📅 ${date}\n\n`;
            });
            
            this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
            
        } catch (error) {
            console.error('Riwayat error:', error);
            this.bot.sendMessage(chatId, '❌ Terjadi kesalahan saat mengambil riwayat');
        }
    }

    async handleSiswa(msg) {
        const chatId = msg.chat.id;

        try {
            const students = await Student.getAll();

            if (students.length === 0) {
                this.bot.sendMessage(chatId, '👥 Belum ada data siswa');
                return;
            }

            // Get total payments for each student (all time, not reset)
            const { executeQuery } = require('./config/database');
            const studentsWithTotals = await Promise.all(students.map(async (student) => {
                const query = `
                    SELECT COALESCE(SUM(amount), 0) as total_paid
                    FROM transactions
                    WHERE student_id = ? AND type = 'iuran'
                `;
                const result = await executeQuery(query, [student.id]);
                const totalPaid = result.success ? parseFloat(result.data[0].total_paid) : 0;

                return {
                    ...student,
                    total_paid: totalPaid
                };
            }));

            let message = `👥 *Daftar Siswa (${students.length} orang):*\n\n`;

            studentsWithTotals.forEach((student, index) => {
                message += `${index + 1}. ${student.name}\n`;
                // Use simple dollar sign for maximum compatibility
                message += `   $ Total bayar: Rp ${student.total_paid.toLocaleString('id-ID')}\n\n`;
            });

            message += `📋 *Catatan:*\n`;
            message += `• Total bayar = Akumulasi seluruh pembayaran\n`;
            message += `• Data tidak direset setiap bulan\n`;
            message += `• Gunakan /iuran status untuk status bulanan`;

            this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

        } catch (error) {
            console.error('Siswa error:', error);
            this.bot.sendMessage(chatId, '❌ Terjadi kesalahan saat mengambil data siswa');
        }
    }

    async handleAI(msg, command) {
        await this.processAICommand(msg, command);
    }

    async handleTextMessage(msg) {
        // Process regular text messages with AI
        await this.processAICommand(msg, msg.text);
    }

    async processAICommand(msg, command) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        try {
            this.bot.sendMessage(chatId, '🤖 Memproses dengan AI...');

            // Check if command might be multi-student
            const isMultiStudent = this.detectMultiStudentCommand(command);

            if (isMultiStudent) {
                // Use Enhanced AI Service for multi-student commands
                const enhancedResult = await this.enhancedAI.processEnhancedCommand(command, chatId, userId);

                if (enhancedResult.success) {
                    this.bot.sendMessage(chatId, enhancedResult.response, { parse_mode: 'Markdown' });
                    return;
                } else {
                    // Fallback to standard AI if enhanced fails
                    console.log('Enhanced AI failed, falling back to standard AI');
                }
            }

            // Standard single-student AI processing
            const students = await Student.getAll();
            const aiResult = await this.mistral.processCommand(command, students);

            if (!aiResult.success) {
                this.bot.sendMessage(chatId, '❌ AI tidak dapat memproses perintah ini');
                return;
            }

            const { type, amount, student_id, student_name, description, confidence, reset_type } = aiResult.data;

            // Validate student_id - should not be an array for standard AI
            if (Array.isArray(student_id)) {
                this.bot.sendMessage(chatId, '❌ Perintah multi-siswa terdeteksi. Gunakan format yang lebih jelas atau coba lagi.');
                return;
            }

            // Handle reset commands
            if (type === 'reset') {
                const validResetTypes = ['saldo', 'siswa', 'semua'];
                const resetType = validResetTypes.includes(reset_type) ? reset_type : 'saldo';

                if (confidence < 0.8) {
                    let message = `🤔 AI mendeteksi perintah reset:\n\n`;
                    message += `📝 Perintah: "${command}"\n`;
                    message += `🔄 Jenis reset: ${resetType}\n`;
                    message += `🤖 Confidence: ${Math.round(confidence * 100)}%\n\n`;

                    // Explain what will be reset
                    switch (resetType) {
                        case 'saldo':
                            message += `📊 Yang akan direset: Semua transaksi (saldo kas = Rp 0)\n`;
                            break;
                        case 'siswa':
                            message += `👥 Yang akan direset: Hanya keuangan siswa (iuran = Rp 0)\n`;
                            break;
                        case 'semua':
                            message += `🔄 Yang akan direset: Semua data transaksi\n`;
                            break;
                    }

                    message += `\nApakah Anda ingin melakukan reset? Ketik \`/ya\` untuk konfirmasi atau \`/tidak\` untuk membatalkan.`;

                    this.bot.sendMessage(chatId, message);

                    // Set up confirmation for AI reset
                    this.setupConfirmationListener(chatId, resetType, msg.from.username || msg.from.first_name);
                    return;
                }

                // Execute reset directly if confidence is high
                await this.executeReset(chatId, resetType, msg.from.username || msg.from.first_name);
                return;
            }

            if (confidence < 0.7) {
                let message = `🤔 AI membutuhkan konfirmasi:\n\n`;
                message += `📝 Perintah: "${command}"\n`;
                message += `💡 Interpretasi AI:\n`;
                message += `   • Jenis: ${type}\n`;
                message += `   • Jumlah: Rp ${amount.toLocaleString('id-ID')}\n`;
                message += `   • Siswa: ${student_name || 'Tidak ada'}\n`;
                message += `   • Deskripsi: ${description}\n`;
                message += `   • Confidence: ${Math.round(confidence * 100)}%\n\n`;
                message += `Apakah interpretasi ini benar? Kirim "ya" untuk konfirmasi.`;

                this.bot.sendMessage(chatId, message);
                return;
            }
            
            // Auto-create transaction if confidence is high
            const transaction = await Transaction.create({
                type: type,
                amount: amount,
                description: description,
                student_id: student_id,
                created_by: `telegram-ai-${msg.from.username || msg.from.first_name}`
            });
            
            if (transaction) {
                const typeText = type === 'income' ? 'Pemasukan' : 
                                type === 'expense' ? 'Pengeluaran' : 'Iuran';
                
                let message = `✅ ${typeText} berhasil ditambahkan dengan AI!\n\n`;
                message += `💰 Jumlah: Rp ${amount.toLocaleString('id-ID')}\n`;
                message += `📝 Deskripsi: ${description}\n`;
                if (student_name) {
                    message += `👤 Siswa: ${student_name}\n`;
                }
                message += `🤖 AI Confidence: ${Math.round(confidence * 100)}%`;
                
                this.bot.sendMessage(chatId, message);
            } else {
                this.bot.sendMessage(chatId, '❌ Gagal menyimpan transaksi');
            }
            
        } catch (error) {
            console.error('AI processing error:', error);
            this.bot.sendMessage(chatId, '❌ Terjadi kesalahan saat memproses dengan AI');
        }
    }

    async handleHelp(msg) {
        const chatId = msg.chat.id;
        
        const helpMessage = `
📖 *Panduan Lengkap Axioo Kas Bot*

🔧 *Perintah Dasar:*
/start - Mulai menggunakan bot
/saldo - Cek saldo dan statistik kas
/help - Tampilkan panduan ini

💰 *Transaksi:*
/tambah [jumlah] [deskripsi] - Tambah pemasukan
/kurang [jumlah] [deskripsi] - Tambah pengeluaran
Contoh: \`/tambah 50000 Sumbangan alumni\`
Contoh: \`/kurang 15000 Beli pulpen\`

💳 *Iuran Multi-Minggu:*
/iuran [nama] [jumlah] - Bayar iuran siswa
/iuran status - Lihat status iuran mingguan
Contoh: \`/iuran muzaki 3000\` (1 minggu)
Contoh: \`/iuran nanda 9000\` (3 minggu sekaligus)
Contoh: \`/iuran rofikul 12000\` (4 minggu advance)

📊 *Informasi:*
/riwayat - 10 transaksi terakhir
/siswa - Daftar semua siswa

🔄 *Reset:*
/reset - Lihat menu reset
/reset saldo - Reset saldo kas (hapus semua transaksi)
/reset siswa - Reset keuangan siswa (hapus iuran)
/reset semua - Reset semua data
⚠️ Gunakan dengan hati-hati!

📊 *Laporan Mingguan:*
/laporan - Menu laporan mingguan otomatis
/laporan aktif - Aktifkan laporan untuk chat ini
/laporan test - Kirim laporan test sekarang

👥 *Kelola Siswa:*
/kelola - Menu kelola siswa
/kelola tambah - Tambah siswa baru
/kelola edit - Edit data siswa
/kelola keluar - Tandai siswa keluar
/kelola cari - Cari siswa

🤖 *AI Features:*
/ai [perintah] - Gunakan AI untuk memproses perintah
Atau kirim pesan langsung tanpa /ai

💡 *Contoh AI Commands:*
• "kas 3000 muzaki"
• "beli pulpen 15000"
• "terima uang 100000 dari wali kelas"
• "pengeluaran 25000 untuk snack"
• "reset saldo kas"
• "reset keuangan siswa"

Bot ini menggunakan Mistral AI untuk memahami perintah natural language!
        `;
        
        this.bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
    }

    // Method to send notification (can be called from web app)
    async handleResetMenu(msg) {
        const chatId = msg.chat.id;

        const resetMessage = `
🔄 *Menu Reset Keuangan*

Gunakan command berikut untuk reset:

1️⃣ *Reset Saldo Kas*
   \`/reset saldo\` - Menghapus semua transaksi
   💰 Saldo kas menjadi Rp 0
   ⚠️ Kas siswa juga ikut direset!

2️⃣ *Reset Keuangan Siswa*
   \`/reset siswa\` - Menghapus hanya iuran siswa
   👥 Total bayar siswa menjadi Rp 0

3️⃣ *Reset Semua Data*
   \`/reset semua\` - Menghapus semua transaksi
   🔄 Saldo kas dan keuangan siswa = Rp 0

⚠️ *PERINGATAN:* Reset akan menghapus data secara permanen!

🤖 *Contoh dengan AI:*
• \`/ai reset saldo kas\`
• \`/ai reset keuangan siswa\`
• \`/ai hapus semua data transaksi\`

💡 *Tips:* AI bisa memahami perintah natural seperti:
"reset kas kelas" atau "hapus iuran siswa"
        `;

        this.bot.sendMessage(chatId, resetMessage, { parse_mode: 'Markdown' });
    }

    async handleResetCommand(msg, option) {
        const chatId = msg.chat.id;
        const username = msg.from.username || msg.from.first_name;
        const optionLower = option.toLowerCase().trim();

        // Map various option formats to standard types
        let resetType = null;

        if (['saldo', 'kas', 'saldo kas', 'kas saldo'].includes(optionLower)) {
            resetType = 'saldo';
        } else if (['siswa', 'keuangan siswa', 'kas siswa', 'iuran', 'iuran siswa'].includes(optionLower)) {
            resetType = 'siswa';
        } else if (['semua', 'all', 'total', 'semuanya', 'semua data'].includes(optionLower)) {
            resetType = 'semua';
        } else {
            const errorMessage = `
❌ *Opsi reset tidak valid: "${option}"*

Gunakan salah satu opsi berikut:
• \`/reset saldo\` - Reset saldo kas
• \`/reset siswa\` - Reset keuangan siswa
• \`/reset semua\` - Reset semua data

Atau ketik \`/reset\` untuk melihat menu lengkap.
            `;

            this.bot.sendMessage(chatId, errorMessage, { parse_mode: 'Markdown' });
            return;
        }

        // Show confirmation message
        let confirmMessage = `
⚠️ *Konfirmasi Reset*

Anda akan melakukan: *${this.getResetTypeName(resetType)}*

${this.getResetDescription(resetType)}

Ketik \`/ya\` untuk konfirmasi atau \`/tidak\` untuk membatalkan.
        `;

        this.bot.sendMessage(chatId, confirmMessage, { parse_mode: 'Markdown' });

        // Set up confirmation listener
        this.setupConfirmationListener(chatId, resetType, username);
    }

    getResetTypeName(resetType) {
        switch (resetType) {
            case 'saldo': return 'Reset Saldo Kas';
            case 'siswa': return 'Reset Keuangan Siswa';
            case 'semua': return 'Reset Semua Data';
            default: return 'Reset';
        }
    }

    getResetDescription(resetType) {
        switch (resetType) {
            case 'saldo':
                return '💰 Semua transaksi akan dihapus\n📊 Saldo kas menjadi Rp 0\n👥 Kas siswa juga ikut direset (Rp 0)\n📝 Riwayat transaksi kosong\n\n⚠️ PERINGATAN: Reset saldo kas akan menghapus SEMUA data termasuk iuran siswa!';
            case 'siswa':
                return '👥 Transaksi iuran siswa akan dihapus\n💰 Total bayar semua siswa = Rp 0\n📊 Transaksi income/expense tetap ada\n💡 Saldo kas utama tidak berubah';
            case 'semua':
                return '🔄 Semua data transaksi akan dihapus\n💰 Saldo kas = Rp 0\n👥 Keuangan siswa = Rp 0\n📝 Database transaksi kosong total';
            default:
                return 'Data akan direset';
        }
    }

    async handleConfirmation(msg, isConfirmed) {
        const chatId = msg.chat.id;

        // Check if there's a pending confirmation for this chat
        if (!this.pendingConfirmations) {
            this.pendingConfirmations = new Map();
        }

        const pendingReset = this.pendingConfirmations.get(chatId);

        if (!pendingReset) {
            this.bot.sendMessage(chatId, '❓ Tidak ada konfirmasi yang menunggu. Gunakan `/reset [opsi]` untuk memulai reset.');
            return;
        }

        // Clear the pending confirmation
        this.pendingConfirmations.delete(chatId);

        if (isConfirmed) {
            await this.executeReset(chatId, pendingReset.resetType, pendingReset.username);
        } else {
            this.bot.sendMessage(chatId, '❌ Reset dibatalkan');
        }
    }

    setupConfirmationListener(chatId, resetType, username) {
        // Store pending confirmation
        if (!this.pendingConfirmations) {
            this.pendingConfirmations = new Map();
        }

        this.pendingConfirmations.set(chatId, {
            resetType: resetType,
            username: username,
            timestamp: Date.now()
        });

        // Auto remove pending confirmation after 60 seconds
        setTimeout(() => {
            if (this.pendingConfirmations && this.pendingConfirmations.has(chatId)) {
                const pending = this.pendingConfirmations.get(chatId);
                // Only remove if it's the same confirmation (check timestamp)
                if (pending && pending.timestamp === this.pendingConfirmations.get(chatId)?.timestamp) {
                    this.pendingConfirmations.delete(chatId);
                    this.bot.sendMessage(chatId, '⏰ Waktu konfirmasi habis. Reset dibatalkan.');
                }
            }
        }, 60000);
    }

    async executeReset(chatId, type, username = 'unknown') {
        try {
            this.bot.sendMessage(chatId, '⏳ Memproses reset...');

            const { executeQuery } = require('./config/database');
            let queries = [];
            let description = '';

            switch (type) {
                case 'saldo':
                    queries = ['DELETE FROM transactions'];
                    description = 'Reset saldo kas - Semua transaksi dihapus';
                    break;

                case 'siswa':
                    queries = ['DELETE FROM transactions WHERE type = "iuran"'];
                    description = 'Reset keuangan siswa - Transaksi iuran dihapus';
                    break;

                case 'semua':
                    queries = ['DELETE FROM transactions'];
                    description = 'Reset semua - Semua data transaksi dihapus';
                    break;

                default:
                    this.bot.sendMessage(chatId, '❌ Jenis reset tidak valid');
                    return;
            }

            // Execute reset queries
            for (const query of queries) {
                const result = await executeQuery(query);
                if (!result.success) {
                    throw new Error(`Reset gagal: ${result.error}`);
                }
            }

            // Add reset transaction record
            const resetTransaction = await Transaction.create({
                type: 'expense',
                amount: 0,
                description: description,
                student_id: null,
                created_by: `telegram-reset-${username}`
            });

            let successMessage = `✅ *Reset Berhasil!*\n\n`;

            switch (type) {
                case 'saldo':
                    successMessage += `💰 Saldo kas telah direset ke Rp 0\n`;
                    successMessage += `📝 Semua transaksi telah dihapus`;
                    break;

                case 'siswa':
                    successMessage += `👥 Keuangan siswa telah direset\n`;
                    successMessage += `💰 Total bayar semua siswa = Rp 0\n`;
                    successMessage += `📝 Transaksi iuran siswa telah dihapus`;
                    break;

                case 'semua':
                    successMessage += `🔄 Reset lengkap telah dilakukan\n`;
                    successMessage += `💰 Saldo kas = Rp 0\n`;
                    successMessage += `👥 Total bayar siswa = Rp 0\n`;
                    successMessage += `📝 Semua data transaksi telah dihapus`;
                    break;
            }

            successMessage += `\n\n⏰ Reset dilakukan pada: ${new Date().toLocaleString('id-ID')}`;

            this.bot.sendMessage(chatId, successMessage, { parse_mode: 'Markdown' });

        } catch (error) {
            console.error('Reset error:', error);
            this.bot.sendMessage(chatId, `❌ Reset gagal: ${error.message}`);
        }
    }

    // Helper function to escape Markdown special characters
    escapeMarkdown(text) {
        if (!text) return text;
        return text.toString()
            .replace(/\\/g, '\\\\')
            .replace(/\*/g, '\\*')
            .replace(/_/g, '\\_')
            .replace(/\[/g, '\\[')
            .replace(/\]/g, '\\]')
            .replace(/\(/g, '\\(')
            .replace(/\)/g, '\\)')
            .replace(/~/g, '\\~')
            .replace(/`/g, '\\`')
            .replace(/>/g, '\\>')
            .replace(/#/g, '\\#')
            .replace(/\+/g, '\\+')
            .replace(/-/g, '\\-')
            .replace(/=/g, '\\=')
            .replace(/\|/g, '\\|')
            .replace(/\{/g, '\\{')
            .replace(/\}/g, '\\}')
            .replace(/\./g, '\\.')
            .replace(/!/g, '\\!');
    }

    async handleLaporanMenu(msg) {
        const chatId = msg.chat.id;
        const config = this.weeklyReport.getConfig();
        const reportDayName = await this.configurableReport.getReportingDayName();

        const menuMessage = `📊 *Menu Laporan Mingguan*

Status saat ini: ${config.enabled ? '✅ Aktif' : '❌ Nonaktif'}
Target chat: ${config.targetChats.length > 0 ? config.targetChats.join(', ') : 'Belum diatur'}
Jadwal: ${this.escapeMarkdown(config.schedule)} (Cron format)
Hari Lapor: *${reportDayName}*

🎯 *Commands tersedia:*
• /laporan aktif - Aktifkan laporan mingguan
• /laporan nonaktif - Nonaktifkan laporan mingguan
• /laporan aturhari [hari] - Ubah hari pelaporan (e.g., rabu)
• /laporan test \\[format\\] - Kirim laporan test sekarang
• /laporan status - Lihat status konfigurasi
• /laporan jadwal \\[cron\\] - Ubah jadwal (contoh: "0 8 \\* \\* 1")
• /laporan format \\[text/excel/csv/image\\] - Ubah format laporan

📅 *Jadwal Default:*
• 0 8 \\* \\* 1 = Setiap Senin jam 08:00
• 0 17 \\* \\* 5 = Setiap Jumat jam 17:00
• 0 9 \\* \\* 0 = Setiap Minggu jam 09:00

🎨 *Format Laporan:*
• text - Laporan teks sederhana
• excel - File Excel dengan 3 sheet
• csv - 3 file CSV terpisah
• image - Gambar tabel pembayaran mingguan

💡 *Contoh penggunaan:*
• /laporan aturhari rabu
• /laporan jadwal 0 17 \\* \\* 5 - Ubah ke Jumat 17:00
• /laporan test excel - Test laporan Excel`;

        this.bot.sendMessage(chatId, menuMessage, { parse_mode: 'Markdown' });
    }

    async handleLaporanCommand(msg, command) {
        const chatId = msg.chat.id;
        const parts = command.toLowerCase().split(' ');
        const action = parts[0];

        try {
            switch (action) {
                case 'aktif':
                    this.weeklyReport.enable(chatId);
                    this.bot.sendMessage(chatId, '✅ Laporan mingguan diaktifkan untuk chat ini!\n\n📅 Laporan akan dikirim sesuai jadwal.');
                    break;

                case 'nonaktif':
                    this.weeklyReport.disable(chatId);
                    this.bot.sendMessage(chatId, '❌ Laporan mingguan dinonaktifkan untuk chat ini');
                    break;

                case 'aturhari':
                    if (parts.length < 2) {
                        this.bot.sendMessage(chatId, '❌ Format salah. Gunakan: /laporan aturhari [nama hari]\nContoh: /laporan aturhari rabu');
                        return;
                    }
                    const dayName = parts[1];
                    const result = await this.configurableReport.setReportingDay(dayName);
                    if (result.success) {
                        // Automatically update the weekly report schedule
                        await this.weeklyReport.updateSchedule();
                        const newConfig = this.weeklyReport.getConfig();
                        this.bot.sendMessage(chatId, `✅ Hari pelaporan berhasil diubah ke: *${result.day}*.\n\n🤖 Jadwal laporan otomatis telah diupdate ke:\n\`${newConfig.schedule}\``, { parse_mode: 'Markdown' });
                    } else {
                        this.bot.sendMessage(chatId, `❌ Gagal mengubah hari: ${result.message}`);
                    }
                    break;

                case 'test':
                    const format = parts[1] || null; // Optional format parameter
                    this.bot.sendMessage(chatId, `⏳ Membuat laporan test${format ? ` (${format})` : ''}...`);
                    const success = await this.weeklyReport.triggerManualReport(chatId, format);
                    if (!success) {
                        this.bot.sendMessage(chatId, '❌ Gagal membuat laporan test');
                    }
                    break;

                case 'status':
                    const config = this.weeklyReport.getConfig();
                    const reportDayName = await this.configurableReport.getReportingDayName();
                    let statusMsg = `📊 *Status Laporan Mingguan*\n\n`;
                    statusMsg += `Status: ${config.enabled ? '✅ Aktif' : '❌ Nonaktif'}\n`;
                    statusMsg += `Hari Lapor: *${reportDayName}*\n`;
                    statusMsg += `Target chats: ${config.targetChats.length}\n`;
                    statusMsg += `Jadwal: ${this.escapeMarkdown(config.schedule)}\n`;
                    statusMsg += `Format: ${config.reportFormat.toUpperCase()}\n`;
                    if (config.nextRun) {
                        statusMsg += `Laporan berikutnya: ${this.escapeMarkdown(config.nextRun.toString())}`;
                    }
                    this.bot.sendMessage(chatId, statusMsg, { parse_mode: 'Markdown' });
                    break;

                case 'jadwal':
                    if (parts.length < 6) {
                        this.bot.sendMessage(chatId, '❌ Format jadwal salah. Contoh: /laporan jadwal 0 8 \\* \\* 1');
                        return;
                    }
                    const newSchedule = parts.slice(1).join(' ');
                    this.weeklyReport.enable(chatId, newSchedule);
                    this.bot.sendMessage(chatId, `✅ Jadwal laporan diubah ke: ${this.escapeMarkdown(newSchedule)}`);
                    break;

                case 'format':
                    if (parts.length < 2) {
                        this.bot.sendMessage(chatId, '❌ Format tidak valid. Pilihan: text, excel, csv, image\nContoh: `/laporan format excel`');
                        return;
                    }
                    const newFormat = parts[1].toLowerCase();
                    const formatSet = this.weeklyReport.setReportFormat(newFormat);
                    if (formatSet) {
                        this.bot.sendMessage(chatId, `✅ Format laporan diubah ke: *${newFormat.toUpperCase()}*`, { parse_mode: 'Markdown' });
                    } else {
                        this.bot.sendMessage(chatId, '❌ Format tidak valid. Pilihan: text, excel, csv, image');
                    }
                    break;

                default:
                    this.bot.sendMessage(chatId, '❌ Command tidak dikenali. Ketik `/laporan` untuk melihat menu.');
            }
        } catch (error) {
            console.error('Laporan command error:', error);
            this.bot.sendMessage(chatId, '❌ Terjadi kesalahan saat memproses command laporan');
        }
    }

    async handleKelolaMenu(msg) {
        const chatId = msg.chat.id;

        try {
            const stats = await Student.getStatistics();

            const menuMessage = `
👥 *Menu Kelola Siswa*

📊 *Status Siswa Saat Ini:*
• Aktif: ${stats.active_students} siswa
• Nonaktif: ${stats.inactive_students} siswa
• Lulus: ${stats.graduated_students} siswa
• Total: ${stats.total_students} siswa

🎯 *Commands tersedia:*
• \`/kelola tambah [nama] | [kelas] | [phone] | [email]\` - Tambah siswa baru
• \`/kelola edit [nama] | [field] | [nilai_baru]\` - Edit data siswa
• \`/kelola keluar [nama] | [alasan]\` - Hapus siswa dari sistem
• \`/kelola aktif [nama] | [alasan]\` - Aktifkan kembali siswa
• \`/kelola cari [keyword]\` - Cari siswa
• \`/kelola nonaktif\` - Lihat siswa nonaktif
• \`/kelola riwayat [nama]\` - Lihat riwayat perubahan

💡 *Contoh penggunaan:*
• \`/kelola tambah Ahmad Fauzi | XI TKJ A | 081234567890 | ahmad@email.com\`
• \`/kelola edit Rofikul | phone | 081987654321\`
• \`/kelola keluar Yoga | Pindah sekolah\` ⚠️ *Hapus permanen*
• \`/kelola cari rofikul\`
            `;

            this.bot.sendMessage(chatId, menuMessage, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('Error in handleKelolaMenu:', error);
            this.bot.sendMessage(chatId, '❌ Terjadi kesalahan saat mengambil data siswa');
        }
    }

    async handleKelolaCommand(msg, command) {
        const chatId = msg.chat.id;
        const userId = msg.from.username || msg.from.first_name || 'Unknown';
        const parts = command.split(' ');
        const action = parts[0].toLowerCase();

        try {
            switch (action) {
                case 'tambah':
                    await this.handleTambahSiswa(chatId, command.substring(7), userId); // Remove "tambah "
                    break;

                case 'edit':
                    await this.handleEditSiswa(chatId, command.substring(5), userId); // Remove "edit "
                    break;

                case 'keluar':
                    await this.handleKeluarSiswa(chatId, command.substring(7), userId); // Remove "keluar "
                    break;

                case 'aktif':
                    await this.handleAktifkanSiswa(chatId, command.substring(6), userId); // Remove "aktif "
                    break;

                case 'cari':
                    await this.handleCariSiswa(chatId, command.substring(5)); // Remove "cari "
                    break;

                case 'nonaktif':
                    await this.handleLihatNonaktif(chatId);
                    break;

                case 'riwayat':
                    await this.handleRiwayatSiswa(chatId, command.substring(8)); // Remove "riwayat "
                    break;

                default:
                    this.bot.sendMessage(chatId, '❌ Command tidak dikenali. Ketik `/kelola` untuk melihat menu.');
            }
        } catch (error) {
            console.error('Error in handleKelolaCommand:', error);
            this.bot.sendMessage(chatId, '❌ Terjadi kesalahan saat memproses command kelola siswa');
        }
    }

    async handleTambahSiswa(chatId, params, userId) {
        try {
            const parts = params.split('|').map(p => p.trim());

            if (parts.length < 2) {
                this.bot.sendMessage(chatId, '❌ Format salah. Gunakan: `/kelola tambah [nama] | [kelas] | [phone] | [email]`\nContoh: `/kelola tambah Ahmad Fauzi | XI TKJ A | 081234567890 | ahmad@email.com`');
                return;
            }

            const [name, class_name, phone = '', email = ''] = parts;

            if (!name || !class_name) {
                this.bot.sendMessage(chatId, '❌ Nama dan kelas wajib diisi');
                return;
            }

            // Check if student already exists
            const existingStudents = await Student.getByName(name);
            if (existingStudents.length > 0) {
                this.bot.sendMessage(chatId, `❌ Siswa dengan nama "${name}" sudah ada`);
                return;
            }

            const studentData = { name, class_name, phone, email };
            const result = await Student.create(studentData, userId);

            if (result) {
                this.bot.sendMessage(chatId, `✅ Siswa berhasil ditambahkan!\n\n👤 **${name}**\n🏫 Kelas: ${class_name}\n📱 Phone: ${phone || '-'}\n📧 Email: ${email || '-'}`, { parse_mode: 'Markdown' });
            } else {
                this.bot.sendMessage(chatId, '❌ Gagal menambahkan siswa');
            }
        } catch (error) {
            console.error('Error adding student:', error);
            this.bot.sendMessage(chatId, '❌ Terjadi kesalahan saat menambahkan siswa');
        }
    }

    async handleEditSiswa(chatId, params, userId) {
        try {
            const parts = params.split('|').map(p => p.trim());

            if (parts.length < 3) {
                this.bot.sendMessage(chatId, '❌ Format salah. Gunakan: `/kelola edit [nama] | [field] | [nilai_baru]`\nField yang bisa diedit: name, class, phone, email\nContoh: `/kelola edit Rofikul | phone | 081987654321`');
                return;
            }

            const [searchName, field, newValue] = parts;

            // Find student
            const students = await Student.getByName(searchName);
            if (students.length === 0) {
                this.bot.sendMessage(chatId, `❌ Siswa dengan nama "${searchName}" tidak ditemukan`);
                return;
            }

            if (students.length > 1) {
                let message = `🔍 Ditemukan ${students.length} siswa dengan nama serupa:\n\n`;
                students.forEach((student, index) => {
                    message += `${index + 1}. ${student.name} (${student.class_name})\n`;
                });
                message += '\nGunakan nama lengkap yang lebih spesifik';
                this.bot.sendMessage(chatId, message);
                return;
            }

            const student = students[0];
            const validFields = { name: 'name', class: 'class_name', phone: 'phone', email: 'email' };
            const dbField = validFields[field.toLowerCase()];

            if (!dbField) {
                this.bot.sendMessage(chatId, '❌ Field tidak valid. Pilihan: name, class, phone, email');
                return;
            }

            // Prepare update data
            const updateData = {
                name: student.name,
                class_name: student.class_name,
                phone: student.phone,
                email: student.email
            };
            updateData[dbField] = newValue;

            const result = await Student.update(student.id, updateData, userId, `Edit ${field} via Telegram`);

            if (result.success) {
                this.bot.sendMessage(chatId, `✅ Data siswa berhasil diupdate!\n\n👤 **${updateData.name}**\n🏫 Kelas: ${updateData.class_name}\n📱 Phone: ${updateData.phone || '-'}\n📧 Email: ${updateData.email || '-'}\n\n📝 ${result.changes} field diubah`, { parse_mode: 'Markdown' });
            } else {
                this.bot.sendMessage(chatId, `❌ Gagal mengupdate data: ${result.error}`);
            }
        } catch (error) {
            console.error('Error editing student:', error);
            this.bot.sendMessage(chatId, '❌ Terjadi kesalahan saat mengedit data siswa');
        }
    }

    async handleKeluarSiswa(chatId, params, userId) {
        try {
            const parts = params.split('|').map(p => p.trim());
            const searchName = parts[0];
            const reason = parts[1] || 'Keluar dari kelas';

            if (!searchName) {
                this.bot.sendMessage(chatId, '❌ Format salah. Gunakan: `/kelola keluar [nama] | [alasan]`\nContoh: `/kelola keluar Yoga | Pindah sekolah`');
                return;
            }

            // Find student
            const students = await Student.getByName(searchName);
            if (students.length === 0) {
                this.bot.sendMessage(chatId, `❌ Siswa dengan nama "${searchName}" tidak ditemukan`);
                return;
            }

            if (students.length > 1) {
                let message = `🔍 Ditemukan ${students.length} siswa dengan nama serupa:\n\n`;
                students.forEach((student, index) => {
                    message += `${index + 1}. ${student.name} (${student.class_name}) - Status: ${student.status || 'active'}\n`;
                });
                message += '\nGunakan nama lengkap yang lebih spesifik';
                this.bot.sendMessage(chatId, message);
                return;
            }

            const student = students[0];

            if (student.status === 'inactive') {
                this.bot.sendMessage(chatId, `❌ Siswa "${student.name}" sudah dalam status nonaktif`);
                return;
            }

            // Hard delete student instead of marking as inactive
            const result = await Student.delete(student.id, userId, reason);

            if (result.success) {
                this.bot.sendMessage(chatId, `✅ Siswa berhasil dihapus dari sistem!\n\n👤 **${student.name}**\n🏫 Kelas: ${student.class_name}\n📅 Tanggal dihapus: ${new Date().toLocaleDateString('id-ID')}\n📝 Alasan: ${reason}\n\n⚠️ Data siswa telah dihapus permanen dari sistem.`, { parse_mode: 'Markdown' });
            } else {
                this.bot.sendMessage(chatId, `❌ Gagal menghapus siswa: ${result.error}`);
            }
        } catch (error) {
            console.error('Error marking student inactive:', error);
            this.bot.sendMessage(chatId, '❌ Terjadi kesalahan saat menandai siswa keluar');
        }
    }

    async handleAktifkanSiswa(chatId, params, userId) {
        try {
            const parts = params.split('|').map(p => p.trim());
            const searchName = parts[0];
            const reason = parts[1] || 'Kembali ke kelas';

            if (!searchName) {
                this.bot.sendMessage(chatId, '❌ Format salah. Gunakan: `/kelola aktif [nama] | [alasan]`\nContoh: `/kelola aktif Yoga | Kembali dari pindahan`');
                return;
            }

            // Find student (include inactive)
            const students = await Student.searchAdvanced({ keyword: searchName });
            const inactiveStudents = students.filter(s => s.status === 'inactive');

            if (inactiveStudents.length === 0) {
                this.bot.sendMessage(chatId, `❌ Tidak ditemukan siswa nonaktif dengan nama "${searchName}"`);
                return;
            }

            if (inactiveStudents.length > 1) {
                let message = `🔍 Ditemukan ${inactiveStudents.length} siswa nonaktif dengan nama serupa:\n\n`;
                inactiveStudents.forEach((student, index) => {
                    message += `${index + 1}. ${student.name} (${student.class_name}) - Keluar: ${student.exit_date}\n`;
                });
                message += '\nGunakan nama lengkap yang lebih spesifik';
                this.bot.sendMessage(chatId, message);
                return;
            }

            const student = inactiveStudents[0];
            const result = await Student.markAsActive(student.id, reason, userId);

            if (result.success) {
                this.bot.sendMessage(chatId, `✅ Siswa berhasil diaktifkan kembali!\n\n👤 **${student.name}**\n🏫 Kelas: ${student.class_name}\n📅 Tanggal aktif kembali: ${new Date().toLocaleDateString('id-ID')}\n📝 Alasan: ${reason}`, { parse_mode: 'Markdown' });
            } else {
                this.bot.sendMessage(chatId, `❌ Gagal mengaktifkan siswa: ${result.error}`);
            }
        } catch (error) {
            console.error('Error activating student:', error);
            this.bot.sendMessage(chatId, '❌ Terjadi kesalahan saat mengaktifkan siswa');
        }
    }

    async handleCariSiswa(chatId, keyword) {
        try {
            if (!keyword.trim()) {
                this.bot.sendMessage(chatId, '❌ Masukkan kata kunci pencarian. Contoh: `/kelola cari rofikul`');
                return;
            }

            const students = await Student.searchAdvanced({ keyword: keyword.trim() });

            if (students.length === 0) {
                this.bot.sendMessage(chatId, `❌ Tidak ditemukan siswa dengan kata kunci "${keyword}"`);
                return;
            }

            let message = `🔍 **Hasil Pencarian: "${keyword}"**\n\n`;
            message += `Ditemukan ${students.length} siswa:\n\n`;

            students.forEach((student, index) => {
                const status = student.status === 'active' ? '✅ Aktif' :
                             student.status === 'inactive' ? '❌ Nonaktif' :
                             student.status === 'graduated' ? '🎓 Lulus' : '✅ Aktif';

                message += `${index + 1}. **${student.name}**\n`;
                message += `   🏫 ${student.class_name}\n`;
                message += `   📱 ${student.phone || '-'}\n`;
                message += `   💰 Total bayar: Rp ${student.total_paid.toLocaleString('id-ID')}\n`;
                message += `   📊 Status: ${status}\n\n`;
            });

            this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('Error searching students:', error);
            this.bot.sendMessage(chatId, '❌ Terjadi kesalahan saat mencari siswa');
        }
    }

    async handleLihatNonaktif(chatId) {
        try {
            const inactiveStudents = await Student.getInactiveStudents();

            if (inactiveStudents.length === 0) {
                this.bot.sendMessage(chatId, '✅ Tidak ada siswa nonaktif');
                return;
            }

            let message = `❌ **Siswa Nonaktif (${inactiveStudents.length})**\n\n`;

            inactiveStudents.forEach((student, index) => {
                message += `${index + 1}. **${student.name}**\n`;
                message += `   🏫 ${student.class_name}\n`;
                message += `   📅 Keluar: ${student.exit_date ? new Date(student.exit_date).toLocaleDateString('id-ID') : '-'}\n`;
                message += `   📝 Alasan: ${student.exit_reason || '-'}\n`;
                message += `   💰 Total bayar: Rp ${student.total_paid.toLocaleString('id-ID')}\n\n`;
            });

            this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('Error getting inactive students:', error);
            this.bot.sendMessage(chatId, '❌ Terjadi kesalahan saat mengambil data siswa nonaktif');
        }
    }

    async handleRiwayatSiswa(chatId, searchName) {
        try {
            if (!searchName.trim()) {
                this.bot.sendMessage(chatId, '❌ Masukkan nama siswa. Contoh: `/kelola riwayat rofikul`');
                return;
            }

            // Find student
            const students = await Student.getByName(searchName.trim());
            if (students.length === 0) {
                this.bot.sendMessage(chatId, `❌ Siswa dengan nama "${searchName}" tidak ditemukan`);
                return;
            }

            if (students.length > 1) {
                let message = `🔍 Ditemukan ${students.length} siswa dengan nama serupa:\n\n`;
                students.forEach((student, index) => {
                    message += `${index + 1}. ${student.name} (${student.class_name})\n`;
                });
                message += '\nGunakan nama lengkap yang lebih spesifik';
                this.bot.sendMessage(chatId, message);
                return;
            }

            const student = students[0];
            const history = await Student.getChangeHistory(student.id, 10);

            if (history.length === 0) {
                this.bot.sendMessage(chatId, `📝 Tidak ada riwayat perubahan untuk siswa "${student.name}"`);
                return;
            }

            let message = `📝 **Riwayat Perubahan: ${student.name}**\n\n`;

            history.forEach((change, index) => {
                const date = new Date(change.created_at).toLocaleDateString('id-ID');
                const time = new Date(change.created_at).toLocaleTimeString('id-ID');

                message += `${index + 1}. **${change.change_type.toUpperCase()}**\n`;
                message += `   📅 ${date} ${time}\n`;
                message += `   👤 Oleh: ${change.changed_by}\n`;

                if (change.field_name) {
                    message += `   📝 Field: ${change.field_name}\n`;
                    message += `   ⬅️ Dari: ${change.old_value || '-'}\n`;
                    message += `   ➡️ Ke: ${change.new_value || '-'}\n`;
                }

                if (change.change_reason) {
                    message += `   💬 Alasan: ${change.change_reason}\n`;
                }

                message += '\n';
            });

            this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('Error getting student history:', error);
            this.bot.sendMessage(chatId, '❌ Terjadi kesalahan saat mengambil riwayat siswa');
        }
    }

    async sendNotification(chatId, message) {
        if (this.bot && chatId) {
            try {
                await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
                return true;
            } catch (error) {
                console.error('Send notification error:', error);
                return false;
            }
        }
        return false;
    }

    // Calculate weekly date ranges for a given month (Monday to Sunday)
    getWeeklyDateRanges(year, month) {
        const ranges = [];
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);

        // Find first Monday of the month or close to it
        let currentDate = new Date(firstDay);

        // If month doesn't start on Monday, find the first Monday
        while (currentDate.getDay() !== 1 && currentDate <= lastDay) {
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // If no Monday found in first week, start from first day
        if (currentDate > lastDay) {
            currentDate = new Date(firstDay);
        }

        let weekNum = 1;

        while (currentDate <= lastDay && weekNum <= 4) {
            const weekStart = new Date(currentDate);
            const weekEnd = new Date(currentDate);
            weekEnd.setDate(weekStart.getDate() + 6);

            // Don't go beyond month
            if (weekEnd > lastDay) {
                weekEnd.setTime(lastDay.getTime());
            }

            ranges.push({
                start: weekStart.getDate().toString().padStart(2, '0'),
                end: weekEnd.getDate().toString().padStart(2, '0')
            });

            // Move to next Monday
            currentDate.setDate(currentDate.getDate() + 7);
            weekNum++;
        }

        return ranges;
    }

    // Detect if command contains multiple students
    detectMultiStudentCommand(command) {
        const lowerCommand = command.toLowerCase();

        // Patterns that indicate multiple students
        const multiStudentPatterns = [
            /,/,  // Contains comma (danu, huda, nanda)
            /\s+dan\s+/,  // Contains "dan" (danu dan huda)
            /\s+&\s+/,    // Contains "&" (danu & huda)
            /\s+\+\s+/,   // Contains "+" (danu + huda)
        ];

        // Check for comma-separated names or multiple amounts
        const hasComma = multiStudentPatterns[0].test(lowerCommand);
        const hasMultipleAmounts = (lowerCommand.match(/\d+[k]?/g) || []).length > 1;
        const hasMultipleNames = this.countPotentialNames(lowerCommand) > 1;

        return hasComma || hasMultipleAmounts || hasMultipleNames;
    }

    // Count potential student names in command
    countPotentialNames(command) {
        const words = command.toLowerCase().split(/\s+/);
        const excludeWords = ['kas', 'bayar', 'iuran', 'dan', 'dengan', 'untuk', 'dari', 'ke', 'di', 'yang', 'adalah', 'ini', 'itu'];
        const nameWords = words.filter(word =>
            word.length > 2 &&
            !excludeWords.includes(word) &&
            !/^\d+[k]?$/.test(word) && // Not a number
            !/^rp$/i.test(word) // Not "rp"
        );

        return nameWords.length;
    }
}

// Export for use in other modules
module.exports = AxiooKasBot;

// Run bot if this file is executed directly
if (require.main === module) {
    new AxiooKasBot();
}
