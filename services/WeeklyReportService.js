const cron = require('node-cron');
const Student = require('../models/Student');
const Transaction = require('../models/Transaction');
const EnhancedReportService = require('./EnhancedReportService');

class WeeklyReportService {
    constructor(bot) {
        this.bot = bot;
        this.isEnabled = false;
        this.targetChats = []; // Array of chat IDs to send reports to
        this.schedule = '0 8 * * 1'; // Every Monday at 8:00 AM (default)
        this.task = null;
        this.enhancedReport = new EnhancedReportService();
        this.reportFormat = 'text'; // 'text', 'excel', 'csv', 'image'
    }

    // Enable weekly reports
    enable(targetChatId, schedule = '0 8 * * 1') {
        this.isEnabled = true;
        this.schedule = schedule;
        
        // Add target chat if not already exists
        if (!this.targetChats.includes(targetChatId)) {
            this.targetChats.push(targetChatId);
        }
        
        this.startScheduler();
        return true;
    }

    // Disable weekly reports
    disable(targetChatId = null) {
        if (targetChatId) {
            // Remove specific chat
            this.targetChats = this.targetChats.filter(id => id !== targetChatId);
            if (this.targetChats.length === 0) {
                this.isEnabled = false;
                this.stopScheduler();
            }
        } else {
            // Disable completely
            this.isEnabled = false;
            this.targetChats = [];
            this.stopScheduler();
        }
        return true;
    }

    // Start the cron scheduler
    startScheduler() {
        if (this.task) {
            this.task.stop();
        }

        this.task = cron.schedule(this.schedule, async () => {
            console.log('🕐 Running weekly report...');
            await this.sendWeeklyReport();
        }, {
            scheduled: false,
            timezone: "Asia/Jakarta"
        });

        this.task.start();
        console.log(`📅 Weekly report scheduler started: ${this.schedule}`);
    }

    // Stop the scheduler
    stopScheduler() {
        if (this.task) {
            this.task.stop();
            this.task = null;
            console.log('⏹️ Weekly report scheduler stopped');
        }
    }

    // Generate and send weekly report
    async sendWeeklyReport() {
        try {
            const report = await this.generateWeeklyReport();
            
            for (const chatId of this.targetChats) {
                try {
                    await this.bot.sendMessage(chatId, report, { parse_mode: 'Markdown' });
                    console.log(`✅ Weekly report sent to chat ${chatId}`);
                } catch (error) {
                    console.error(`❌ Failed to send report to chat ${chatId}:`, error.message);
                }
            }
        } catch (error) {
            console.error('❌ Error generating weekly report:', error);
        }
    }

    // Generate weekly report content
    async generateWeeklyReport() {
        const now = new Date();
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay() + 1)); // Monday
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); // Sunday

        // Get data
        const balance = await Transaction.getBalance();
        const weeklyCollection = await Transaction.getWeeklyCollection();
        const weeklyPayments = await Student.getWeeklyPaymentStatus();
        
        // Calculate statistics
        const lunasCount = weeklyPayments.filter(s => s.status === 'paid').length;
        const bayarTapiBelumlunasCount = weeklyPayments.filter(s => s.status === 'pending' && s.weekly_paid > 0).length;
        const belumBayarCount = weeklyPayments.filter(s => s.weekly_paid === 0).length;
        const totalStudents = weeklyPayments.length;

        // Generate report
        let report = `📊 *LAPORAN MINGGUAN KAS KELAS*\n`;
        report += `📅 Periode: ${this.formatDate(weekStart)} - ${this.formatDate(weekEnd)}\n\n`;

        // Summary
        report += `💰 *RINGKASAN KEUANGAN*\n`;
        report += `💵 Saldo saat ini: Rp ${balance.balance.toLocaleString('id-ID')}\n`;
        report += `📈 Total pemasukan: Rp ${balance.income.toLocaleString('id-ID')}\n`;
        report += `📉 Total pengeluaran: Rp ${balance.expense.toLocaleString('id-ID')}\n\n`;

        // Weekly collection
        report += `📅 *IURAN MINGGU INI*\n`;
        report += `💰 Terkumpul: Rp ${weeklyCollection.weekly_total.toLocaleString('id-ID')}\n`;
        report += `👥 Siswa lunas: ${weeklyCollection.students_lunas} dari ${totalStudents} siswa\n\n`;

        // Status breakdown
        report += `📊 *STATUS PEMBAYARAN*\n`;
        report += `✅ Lunas (≥ Rp 3.000): ${lunasCount} siswa\n`;
        report += `❕ Bayar tapi belum lunas: ${bayarTapiBelumlunasCount} siswa\n`;
        report += `❌ Belum bayar: ${belumBayarCount} siswa\n\n`;

        // Progress bar
        const progressPercentage = Math.round((lunasCount / totalStudents) * 100);
        const progressBar = this.generateProgressBar(progressPercentage);
        report += `📈 *PROGRESS MINGGU INI*\n`;
        report += `${progressBar} ${progressPercentage}%\n\n`;

        // Detailed student list (only those who paid)
        const paidStudents = weeklyPayments.filter(s => s.weekly_paid > 0);
        if (paidStudents.length > 0) {
            report += `👥 *SISWA YANG SUDAH BAYAR*\n`;
            paidStudents.forEach(student => {
                const emoji = student.status === 'paid' ? '✅' : '❕';
                report += `${emoji} ${student.name}: Rp ${student.weekly_paid.toLocaleString('id-ID')}\n`;
            });
            report += `\n`;
        }

        // Footer
        report += `🤖 _Laporan otomatis dari Axioo Kas Bot_\n`;
        report += `⏰ Dibuat pada: ${new Date().toLocaleString('id-ID')}`;

        return report;
    }

    // Helper: Format date
    formatDate(date) {
        return date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    // Helper: Generate progress bar
    generateProgressBar(percentage, length = 10) {
        const filled = Math.round((percentage / 100) * length);
        const empty = length - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
    }

    // Get current configuration
    getConfig() {
        return {
            enabled: this.isEnabled,
            schedule: this.schedule,
            targetChats: this.targetChats,
            reportFormat: this.reportFormat,
            nextRun: this.task ? this.getNextRunTime() : null
        };
    }

    // Calculate next run time based on cron schedule
    getNextRunTime() {
        if (!this.task || !this.schedule) return null;

        try {
            // Parse cron schedule to calculate next run
            // For now, return a simple message indicating the schedule
            const now = new Date();
            const scheduleInfo = this.parseCronSchedule(this.schedule);

            if (scheduleInfo) {
                return scheduleInfo;
            }

            return `Scheduled: ${this.schedule}`;
        } catch (error) {
            console.error('Error calculating next run time:', error);
            return `Scheduled: ${this.schedule}`;
        }
    }

    // Parse cron schedule to human readable format
    parseCronSchedule(schedule) {
        const parts = schedule.split(' ');
        if (parts.length !== 5) return null;

        const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

        // Handle common patterns
        if (schedule === '0 8 * * 1') {
            return 'Setiap Senin jam 08:00';
        }
        if (schedule === '0 8 * * *') {
            return 'Setiap hari jam 08:00';
        }
        if (schedule.startsWith('0 ') && hour !== '*') {
            return `Setiap hari jam ${hour.padStart(2, '0')}:00`;
        }

        return `Cron: ${schedule}`;
    }

    // Set report format
    setReportFormat(format) {
        const validFormats = ['text', 'excel', 'csv', 'image', 'gambar'];
        if (validFormats.includes(format)) {
            this.reportFormat = format;
            return true;
        }
        return false;
    }

    // Manual trigger for testing
    async triggerManualReport(chatId, format = null) {
        try {
            const reportFormat = format || this.reportFormat;

            if (reportFormat === 'text') {
                const report = await this.generateWeeklyReport();
                await this.bot.sendMessage(chatId, report, { parse_mode: 'Markdown' });
            } else {
                await this.sendFileReport(chatId, reportFormat);
            }
            return true;
        } catch (error) {
            console.error('Error sending manual report:', error);
            return false;
        }
    }

    // Send file-based reports (Excel/CSV)
    async sendFileReport(chatId, format) {
        try {
            const now = new Date();
            let year = now.getFullYear();
            let month = now.getMonth() + 1;

            // Auto-rotate to previous month if we're in first week of new month
            if (now.getDate() <= 7) {
                const prevMonth = new Date(year, month - 2, 1); // Go to previous month
                year = prevMonth.getFullYear();
                month = prevMonth.getMonth() + 1;

                this.bot.sendMessage(chatId, `📅 Auto-detecting: Generating report for previous month (${month}/${year}) since we're in early ${now.getMonth() + 1}/${now.getFullYear()}`);
            }

            this.bot.sendMessage(chatId, `⏳ Membuat laporan ${format.toUpperCase()} untuk bulan ${month}/${year}...`);

            if (format === 'excel') {
                const result = await this.enhancedReport.generateExcelReport(year, month);

                if (result.success) {
                    // Send Excel file
                    await this.bot.sendDocument(chatId, result.filepath, {
                        caption: `📊 *Laporan Kas Kelas - ${month}/${year}*\n\n` +
                                `📁 Format: Excel (XLSX)\n` +
                                `📅 Periode: ${result.data.summary.period}\n` +
                                `💰 Saldo: Rp ${result.data.summary.balance.toLocaleString('id-ID')}\n` +
                                `👥 Siswa: ${result.data.summary.studentsWithPayments}/${result.data.summary.totalStudents} sudah bayar`,
                        parse_mode: 'Markdown'
                    });
                } else {
                    this.bot.sendMessage(chatId, `❌ Gagal membuat laporan Excel: ${result.error}`);
                }
            } else if (format === 'csv') {
                const result = await this.enhancedReport.generateCSVReport(year, month);

                if (result.success) {
                    // Send CSV files
                    this.bot.sendMessage(chatId, `📊 *Laporan Kas Kelas - ${month}/${year}*\n\n📁 Format: CSV (3 file terpisah)`, { parse_mode: 'Markdown' });

                    for (const filepath of result.files) {
                        const filename = require('path').basename(filepath);
                        await this.bot.sendDocument(chatId, filepath, {
                            caption: `📄 ${filename}`
                        });
                    }
                } else {
                    this.bot.sendMessage(chatId, `❌ Gagal membuat laporan CSV: ${result.error}`);
                }
            } else if (format === 'image' || format === 'gambar') {
                const result = await this.enhancedReport.generateImageReport(year, month);

                if (result.success) {
                    // Send image file
                    await this.bot.sendPhoto(chatId, result.buffer, {
                        caption: `📊 *Laporan Pembayaran Kas Mingguan - ${month}/${year}*\n\n` +
                                `🖼️ Format: Gambar Tabel\n` +
                                `📅 Periode: ${month}/${year}\n` +
                                `💰 Iuran: Rp 3.000/minggu\n` +
                                `📋 Tabel lengkap dengan status pembayaran per minggu`,
                        parse_mode: 'Markdown'
                    });
                } else {
                    this.bot.sendMessage(chatId, `❌ Gagal membuat laporan gambar: ${result.error}`);
                }
            }
        } catch (error) {
            console.error('Error sending file report:', error);
            this.bot.sendMessage(chatId, `❌ Terjadi kesalahan saat membuat laporan: ${error.message}`);
        }
    }
}

module.exports = WeeklyReportService;
