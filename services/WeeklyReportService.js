const cron = require('node-cron');
const Student = require('../models/Student');
const Transaction = require('../models/Transaction');
const EnhancedReportService = require('./EnhancedReportService');
const ConfigurableReportService = require('./ConfigurableReportService');

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

    // Update the cron schedule based on the configured reporting day
    async updateSchedule() {
        const config = await ConfigurableReportService.getConfig();
        const { reportingDay, reportingHour, reportingMinute } = config;

        // Format: minute hour day-of-month month day-of-week
        const newSchedule = `${reportingMinute} ${reportingHour} * * ${reportingDay}`;

        if (this.schedule !== newSchedule) {
            console.log(`Updating report schedule from "${this.schedule}" to "${newSchedule}"`);
            this.schedule = newSchedule;
            // Restart the scheduler with the new schedule
            if (this.isEnabled) {
                this.startScheduler();
            }
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
        const { startDate, endDate } = await ConfigurableReportService.getWeekDateRange();

        // Get data
        const balance = await Transaction.getBalance();
        const weeklyCollection = await Transaction.getCollectionForRange(startDate, endDate);
        const weeklyPayments = await Student.getPaymentStatusForRange(startDate, endDate);
        
        // Calculate statistics
        const lunasCount = weeklyPayments.filter(s => s.status === 'paid').length;
        const bayarTapiBelumlunasCount = weeklyPayments.filter(s => s.status === 'pending' && s.weekly_paid > 0).length;
        const belumBayarCount = weeklyPayments.filter(s => s.weekly_paid === 0).length;
        const totalStudents = weeklyPayments.length;

        // Generate report
        let report = `📊 *LAPORAN MINGGUAN KAS KELAS*\n`;
        report += `📅 Periode: ${this.formatDate(startDate)} - ${this.formatDate(endDate)}\n\n`;

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
        if (totalStudents > 0) {
            const progressPercentage = Math.round((lunasCount / totalStudents) * 100);
            const progressBar = this.generateProgressBar(progressPercentage);
            report += `📈 *PROGRESS MINGGU INI*\n`;
            report += `${progressBar} ${progressPercentage}%\n\n`;
        }

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

    // Send file-based reports (Excel/CSV/Image)
    async sendFileReport(chatId, format) {
        try {
            const { startDate, endDate } = await ConfigurableReportService.getWeekDateRange();
            const periodStr = `${startDate.toLocaleDateString('id-ID')} - ${endDate.toLocaleDateString('id-ID')}`;

            this.bot.sendMessage(chatId, `⏳ Membuat laporan ${format.toUpperCase()} untuk periode ${periodStr}...`);

            if (format === 'excel') {
                const result = await this.enhancedReport.generateExcelReport(startDate, endDate);
                if (result.success) {
                    await this.bot.sendDocument(chatId, result.filepath, {
                        caption: `📊 *Laporan Kas Mingguan*\n\n` +
                                 `📁 Format: Excel (XLSX)\n` +
                                 `📅 Periode: ${periodStr}`,
                        parse_mode: 'Markdown'
                    });
                } else {
                    this.bot.sendMessage(chatId, `❌ Gagal membuat laporan Excel: ${result.error}`);
                }
            } else if (format === 'csv') {
                const result = await this.enhancedReport.generateCSVReport(startDate, endDate);
                if (result.success) {
                    this.bot.sendMessage(chatId, `📊 *Laporan Kas Mingguan - CSV*\n\n📅 Periode: ${periodStr}`, { parse_mode: 'Markdown' });
                    for (const filepath of result.files) {
                        await this.bot.sendDocument(chatId, filepath);
                    }
                } else {
                    this.bot.sendMessage(chatId, `❌ Gagal membuat laporan CSV: ${result.error}`);
                }
            } else if (format === 'image' || format === 'gambar') {
                const result = await this.enhancedReport.generateImageReport(startDate, endDate);
                if (result.success) {
                    await this.bot.sendPhoto(chatId, result.buffer, {
                        caption: `📊 *Laporan Pembayaran Kas Mingguan*\n\n` +
                                 `📅 Periode: ${periodStr}`,
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
