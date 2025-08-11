const cron = require('node-cron');
const Student = require('../models/Student');
const Transaction = require('../models/Transaction');
const EnhancedReportService = require('./EnhancedReportService');
const ConfigurableReportService = require('./ConfigurableReportService');
const moment = require('moment');

class WeeklyReportService {
    constructor(bot) {
        this.bot = bot;
        this.isEnabled = false;
        this.targetChats = [];
        this.schedule = '0 8 * * 1'; // Default, will be updated
        this.task = null;
        this.enhancedReport = new EnhancedReportService();
        this.reportFormat = 'text';
    }

    async enable(targetChatId, schedule = null) {
        this.isEnabled = true;
        if (!this.targetChats.includes(targetChatId)) {
            this.targetChats.push(targetChatId);
        }
        
        if (schedule) {
            this.schedule = schedule;
            this.startScheduler();
        } else {
            await this.updateSchedule();
        }
        return true;
    }

    disable(targetChatId = null) {
        if (targetChatId) {
            this.targetChats = this.targetChats.filter(id => id !== targetChatId);
            if (this.targetChats.length === 0) {
                this.isEnabled = false;
                this.stopScheduler();
            }
        } else {
            this.isEnabled = false;
            this.targetChats = [];
            this.stopScheduler();
        }
        return true;
    }

    startScheduler() {
        if (this.task) {
            this.task.stop();
        }
        this.task = cron.schedule(this.schedule, async () => {
            console.log('🕐 Running weekly report...');
            await this.sendWeeklyReport();
        }, { scheduled: true, timezone: "Asia/Jakarta" });
        console.log(`📅 Weekly report scheduler started: ${this.schedule}`);
    }

    stopScheduler() {
        if (this.task) {
            this.task.stop();
            this.task = null;
            console.log('⏹️ Weekly report scheduler stopped');
        }
    }

    async updateSchedule() {
        const config = await ConfigurableReportService.getConfig();
        const { reportingDay, reportingHour, reportingMinute } = config;
        const newSchedule = `${reportingMinute} ${reportingHour} * * ${reportingDay}`;

        if (this.schedule !== newSchedule) {
            console.log(`Updating report schedule from "${this.schedule}" to "${newSchedule}"`);
            this.schedule = newSchedule;
            if (this.isEnabled) {
                this.startScheduler();
            }
        }
    }

    async sendWeeklyReport() {
        try {
            const report = await this.generateWeeklyReport();
            for (const chatId of this.targetChats) {
                await this.bot.sendMessage(chatId, report, { parse_mode: 'Markdown' });
            }
        } catch (error) {
            console.error('❌ Error generating weekly report:', error);
        }
    }

    async generateWeeklyReport() {
        const weeklyAmount = 3000;
        const [currentWeek] = await ConfigurableReportService.getWeekRanges(new Date(), 1);
        const { startDate, endDate } = currentWeek;

        const balance = await Transaction.getBalance();
        const weeklyCollection = await Transaction.getCollectionForRange(startDate, endDate);
        const weeklyPayments = await Student.getPaymentStatusForRange(startDate, endDate);
        
        const lunasCount = weeklyPayments.filter(s => s.status === 'paid').length;
        const belumLunasCount = weeklyPayments.filter(s => s.status === 'pending').length;
        const belumBayarCount = weeklyPayments.length - lunasCount - belumLunasCount;
        const totalStudents = weeklyPayments.length;

        let report = `📊 *LAPORAN MINGGUAN KAS KELAS*\n`;
        report += `📅 Periode: ${this.formatDate(startDate)} - ${this.formatDate(endDate)}\n\n`;
        report += `💰 *RINGKASAN KEUANGAN*\n`;
        report += `   - Saldo Saat Ini: Rp ${balance.balance.toLocaleString('id-ID')}\n\n`;
        report += `📅 *IURAN MINGGU INI*\n`;
        report += `   - Terkumpul: Rp ${weeklyCollection.weekly_total.toLocaleString('id-ID')}\n`;
        report += `   - Siswa Lunas: ${weeklyCollection.students_lunas} dari ${totalStudents} siswa\n\n`;
        report += `📊 *STATUS PEMBAYARAN SISWA*\n`;
        report += `   - ✅ Lunas (≥ Rp ${weeklyAmount}): ${lunasCount} siswa\n`;
        report += `   - ❕ Sebagian: ${belumLunasCount} siswa\n`;
        report += `   - ❌ Belum Bayar: ${belumBayarCount} siswa\n\n`;

        if (totalStudents > 0) {
            const progressPercentage = Math.round((lunasCount / totalStudents) * 100);
            report += `📈 *Progress: ${this.generateProgressBar(progressPercentage)} ${progressPercentage}%*\n\n`;
        }

        const paidStudents = weeklyPayments.filter(s => s.weekly_paid > 0);
        if (paidStudents.length > 0) {
            report += `👥 *DETAIL SISWA SUDAH BAYAR*\n`;
            paidStudents.forEach(s => {
                const emoji = s.status === 'paid' ? '✅' : '❕';
                report += `${emoji} ${s.name}: Rp ${s.weekly_paid.toLocaleString('id-ID')}\n`;
            });
        }

        return report;
    }

    formatDate(date) {
        return moment(date).format('D/M/YYYY');
    }

    generateProgressBar(percentage, length = 10) {
        const filled = Math.round((percentage / 100) * length);
        return '█'.repeat(filled) + '░'.repeat(length - filled);
    }

    getConfig() {
        return {
            enabled: this.isEnabled,
            schedule: this.schedule,
            targetChats: this.targetChats,
            reportFormat: this.reportFormat,
            nextRun: this.task ? this.task.nextDates().toString() : null
        };
    }

    setReportFormat(format) {
        const validFormats = ['text', 'excel', 'csv', 'image', 'gambar'];
        if (validFormats.includes(format)) {
            this.reportFormat = format;
            return true;
        }
        return false;
    }

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

    async sendFileReport(chatId, format) {
        try {
            const [currentWeek] = await ConfigurableReportService.getWeekRanges(new Date(), 1);
            const { startDate, endDate } = currentWeek;
            const periodStr = `${this.formatDate(startDate)} - ${this.formatDate(endDate)}`;

            this.bot.sendMessage(chatId, `⏳ Membuat laporan ${format.toUpperCase()} untuk periode ${periodStr}...`);

            let result;
            if (format === 'excel') {
                result = await this.enhancedReport.generateExcelReport(startDate, endDate);
                if (result.success) {
                    await this.bot.sendDocument(chatId, result.filepath, { caption: `📊 Laporan Kas Mingguan\nPeriode: ${periodStr}`, parse_mode: 'Markdown' });
                }
            } else if (format === 'csv') {
                result = await this.enhancedReport.generateCSVReport(startDate, endDate);
                if (result.success) {
                    this.bot.sendMessage(chatId, `📊 Laporan Kas Mingguan - CSV\nPeriode: ${periodStr}`, { parse_mode: 'Markdown' });
                    for (const filepath of result.files) {
                        await this.bot.sendDocument(chatId, filepath);
                    }
                }
            } else if (format === 'image' || format === 'gambar') {
                result = await this.enhancedReport.generateImageReport(startDate, endDate);
                if (result.success) {
                    await this.bot.sendPhoto(chatId, result.buffer, { caption: `📊 Laporan Pembayaran Kas Mingguan\nPeriode: ${periodStr}`, parse_mode: 'Markdown' });
                }
            }

            if (!result || !result.success) {
                 this.bot.sendMessage(chatId, `❌ Gagal membuat laporan ${format.toUpperCase()}: ${result.error}`);
            }
        } catch (error) {
            console.error('Error sending file report:', error);
            this.bot.sendMessage(chatId, `❌ Terjadi kesalahan: ${error.message}`);
        }
    }
}

module.exports = WeeklyReportService;
