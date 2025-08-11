const cron = require('node-cron');
const Student = require('../models/Student');
const Transaction = require('../models/Transaction');
const EnhancedReportService = require('./EnhancedReportService');
const DateHelperService = require('./DateHelperService');
const appSettings = require('../config/app-settings.json');

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
    enable(targetChatId, newSchedule = null) {
        this.isEnabled = true;

        // Only update the schedule if a new one is provided.
        if (newSchedule) {
            this.schedule = newSchedule;
        }
        
        // Add target chat if not already exists
        if (!this.targetChats.includes(targetChatId)) {
            this.targetChats.push(targetChatId);
        }
        
        // Restart the scheduler only if the schedule has changed or it wasn't running.
        if (newSchedule || !this.task) {
            this.startScheduler();
        }
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

    // Generate and send routine text report
    async sendWeeklyReport() {
        try {
            const report = await this.generateRoutineTextReport();
            if (!report) {
                console.log('Skipping routine report, no active period found.');
                return;
            }
            
            for (const chatId of this.targetChats) {
                try {
                    await this.bot.sendMessage(chatId, report, { parse_mode: 'Markdown' });
                    console.log(`✅ Routine text report sent to chat ${chatId}`);
                } catch (error) {
                    console.error(`❌ Failed to send report to chat ${chatId}:`, error.message);
                }
            }
        } catch (error) {
            console.error('❌ Error generating routine text report:', error);
        }
    }

    // Generate routine text report content for the latest period
    async generateRoutineTextReport() {
        const routineStartDate = appSettings.routineStartDate;
        const today = new Date();
        const periods = DateHelperService.getRoutinePeriods(routineStartDate, today);

        if (periods.length === 0) {
            return null; // No periods to report on
        }

        const latestPeriod = periods[periods.length - 1];
        const { startDate, endDate } = latestPeriod;

        // Get data for the specific period
        const balance = await Transaction.getBalance(); // Overall balance is fine
        // Assumes getCollectionForPeriod will be created in Step 6
        const periodCollection = await Transaction.getCollectionForPeriod(startDate, endDate);
        // Assumes getStatusForPeriod will be created or adapted in Step 6
        const periodPayments = await Student.getStatusForPeriod(startDate, endDate);
        
        const totalStudents = await Student.getAll().then(s => s.length);
        const lunasCount = periodPayments.filter(s => s.status === 'paid').length;
        const bayarTapiBelumlunasCount = periodPayments.filter(s => s.status === 'partial').length;
        const belumBayarCount = totalStudents - lunasCount - bayarTapiBelumlunasCount;

        // Generate report
        let report = `📊 *LAPORAN RUTIN KAS KELAS*\n`;
        report += `📅 Periode: *${this.formatDate(startDate)} - ${this.formatDate(endDate)}*\n\n`;

        // Summary
        report += `💰 *RINGKASAN KEUANGAN (KESELURUHAN)*\n`;
        report += `💵 Saldo saat ini: Rp ${balance.balance.toLocaleString('id-ID')}\n\n`;

        // Period collection
        report += `📅 *IURAN PERIODE INI*\n`;
        report += `💰 Terkumpul: Rp ${periodCollection.total.toLocaleString('id-ID')}\n`;
        report += `👥 Siswa lunas: ${periodCollection.lunasCount} dari ${totalStudents} siswa\n\n`;

        // Status breakdown
        report += `📊 *STATUS PEMBAYARAN PERIODE INI*\n`;
        report += `✅ Lunas (≥ Rp 3.000): ${lunasCount} siswa\n`;
        report += `❕ Bayar tapi belum lunas: ${bayarTapiBelumlunasCount} siswa\n`;
        report += `❌ Belum bayar: ${belumBayarCount} siswa\n\n`;

        // Progress bar
        const progressPercentage = totalStudents > 0 ? Math.round((lunasCount / totalStudents) * 100) : 0;
        const progressBar = this.generateProgressBar(progressPercentage);
        report += `📈 *PROGRESS PERIODE INI*\n`;
        report += `${progressBar} ${progressPercentage}%\n\n`;

        // Detailed student list (only those who paid in this period)
        const paidStudents = periodPayments.filter(s => s.paidInPeriod > 0);
        if (paidStudents.length > 0) {
            report += `👥 *SISWA YANG SUDAH BAYAR DI PERIODE INI*\n`;
            paidStudents.forEach(student => {
                const emoji = student.status === 'paid' ? '✅' : '❕';
                report += `${emoji} ${student.name}: Rp ${student.paidInPeriod.toLocaleString('id-ID')}\n`;
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
                const report = await this.generateRoutineTextReport();
                if (report) {
                    await this.bot.sendMessage(chatId, report, { parse_mode: 'Markdown' });
                } else {
                    await this.bot.sendMessage(chatId, "Tidak ada periode laporan rutin untuk ditampilkan.");
                }
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
            this.bot.sendMessage(chatId, `⏳ Membuat laporan ${format.toUpperCase()}...`);

            if (format === 'excel') {
                const result = await this.enhancedReport.generateExcelReport();
                if (result.success) {
                    await this.bot.sendDocument(chatId, result.filepath, {
                        caption: `📊 *Laporan Kas Rutin*\n\n` +
                                 `📁 Format: Excel (XLSX)\n` +
                                 `📅 Periode: ${result.data.summary.period}`,
                        parse_mode: 'Markdown'
                    });
                } else {
                    this.bot.sendMessage(chatId, `❌ Gagal membuat laporan Excel: ${result.error}`);
                }
            } else if (format === 'csv') {
                const result = await this.enhancedReport.generateCSVReport();
                if (result.success) {
                    this.bot.sendMessage(chatId, `📊 *Laporan Kas Rutin*\n\n📁 Format: CSV (3 file terpisah)`, { parse_mode: 'Markdown' });
                    for (const filepath of result.files) {
                        const filename = require('path').basename(filepath);
                        await this.bot.sendDocument(chatId, filepath, { caption: `📄 ${filename}` });
                    }
                } else {
                    this.bot.sendMessage(chatId, `❌ Gagal membuat laporan CSV: ${result.error}`);
                }
            } else if (format === 'image' || format === 'gambar') {
                const result = await this.enhancedReport.generateImageReport();
                if (result.success) {
                    await this.bot.sendPhoto(chatId, result.buffer, {
                        caption: `📊 *Laporan Pembayaran Kas Rutin*\n\n` +
                                 `🖼️ Format: Gambar Tabel\n` +
                                 `📅 Periode: ${result.data.summary.period}`,
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
