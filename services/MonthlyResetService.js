const { executeQuery } = require('../config/database');
const cron = require('node-cron');

class MonthlyResetService {
    constructor() {
        this.isSchedulerRunning = false;
        this.cronJob = null;
        this.weeklyAmount = 3000;
    }

    // Start monthly reset scheduler
    startScheduler() {
        if (this.isSchedulerRunning) {
            console.log('⚠️  Monthly reset scheduler already running');
            return;
        }

        // Schedule untuk setiap tanggal 1 jam 00:01 WIB
        // Format: detik menit jam tanggal bulan hari_dalam_minggu
        this.cronJob = cron.schedule('1 0 1 * *', async () => {
            await this.performMonthlyReset();
        }, {
            scheduled: true,
            timezone: "Asia/Jakarta"
        });

        this.isSchedulerRunning = true;
        console.log('📅 Monthly reset scheduler started (Every 1st day of month at 00:01 WIB)');
    }

    stopScheduler() {
        if (this.cronJob) {
            this.cronJob.stop();
            this.isSchedulerRunning = false;
            console.log('🛑 Monthly reset scheduler stopped');
        }
    }

    // Perform monthly reset
    async performMonthlyReset() {
        try {
            console.log('🔄 Starting monthly reset...');
            
            const currentDate = new Date();
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;
            
            console.log(`📅 Resetting for new month: ${month}/${year}`);
            
            // 1. Archive previous month data (optional - for historical records)
            await this.archivePreviousMonth(year, month - 1);
            
            // 2. Reset monthly payment tracking (but keep total payments)
            // Note: We don't reset the transactions table, only the monthly tracking
            
            console.log('✅ Monthly reset completed successfully');
            
            // Send notification if telegram bot is available
            await this.sendResetNotification(year, month);
            
        } catch (error) {
            console.error('❌ Error during monthly reset:', error);
        }
    }

    // Archive previous month data
    async archivePreviousMonth(year, month) {
        try {
            // Create archive table if not exists
            const createArchiveQuery = `
                CREATE TABLE IF NOT EXISTS monthly_payment_archive (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    student_id INT,
                    year INT,
                    month INT,
                    total_paid DECIMAL(15,2),
                    weeks_paid INT,
                    payment_percentage DECIMAL(5,2),
                    status VARCHAR(50),
                    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (student_id) REFERENCES students(id)
                )
            `;
            
            await executeQuery(createArchiveQuery);
            
            // Archive previous month data
            const archiveQuery = `
                INSERT INTO monthly_payment_archive 
                (student_id, year, month, total_paid, weeks_paid, payment_percentage, status)
                SELECT 
                    s.id,
                    ?,
                    ?,
                    COALESCE(SUM(t.amount), 0) as total_paid,
                    FLOOR(COALESCE(SUM(t.amount), 0) / ?) as weeks_paid,
                    ROUND((FLOOR(COALESCE(SUM(t.amount), 0) / ?) / 4) * 100, 2) as payment_percentage,
                    CASE 
                        WHEN FLOOR(COALESCE(SUM(t.amount), 0) / ?) >= 4 THEN 'LUNAS'
                        WHEN FLOOR(COALESCE(SUM(t.amount), 0) / ?) > 0 THEN 'SEBAGIAN'
                        ELSE 'BELUM BAYAR'
                    END as status
                FROM students s
                LEFT JOIN transactions t ON s.id = t.student_id 
                    AND t.type = 'iuran' 
                    AND YEAR(t.created_at) = ? 
                    AND MONTH(t.created_at) = ?
                GROUP BY s.id
            `;
            
            const result = await executeQuery(archiveQuery, [
                year, month, 
                this.weeklyAmount, this.weeklyAmount, this.weeklyAmount, this.weeklyAmount,
                year, month
            ]);
            
            if (result.success) {
                console.log(`📦 Archived ${result.data.affectedRows} student records for ${month}/${year}`);
            }
            
        } catch (error) {
            console.error('Error archiving previous month:', error);
        }
    }

    // Send reset notification
    async sendResetNotification(year, month) {
        try {
            // Try to send telegram notification if bot is available
            const TelegramBot = require('../telegram-bot');
            if (TelegramBot && TelegramBot.bot) {
                const message = `
🔄 *RESET BULANAN OTOMATIS*

📅 *Bulan Baru:* ${month}/${year}
🔄 *Status:* Sistem telah direset untuk bulan baru
💰 *Iuran Mingguan:* Rp ${this.weeklyAmount.toLocaleString('id-ID')} per minggu

📊 *Yang Direset:*
• Status pembayaran mingguan siswa
• Progress pembayaran bulanan
• Laporan mingguan

📋 *Yang Tetap:*
• Total pembayaran siswa (akumulatif)
• Saldo kas kelas
• Data siswa dan transaksi

🌐 *Dashboard:* http://localhost:3008
                `;
                
                // Send to admin chat if configured
                const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
                if (adminChatId) {
                    await TelegramBot.bot.sendMessage(adminChatId, message, { parse_mode: 'Markdown' });
                }
            }
        } catch (error) {
            console.log('Note: Could not send telegram notification (bot may not be running)');
        }
    }

    // Get current month payment status for a student
    async getCurrentMonthStatus(studentId) {
        try {
            const currentDate = new Date();
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;
            
            // Get current month transactions
            const query = `
                SELECT COALESCE(SUM(amount), 0) as total_paid
                FROM transactions 
                WHERE student_id = ? 
                AND type = 'iuran'
                AND YEAR(created_at) = ? 
                AND MONTH(created_at) = ?
            `;
            
            const result = await executeQuery(query, [studentId, year, month]);
            
            if (result.success && result.data.length > 0) {
                const totalPaid = parseFloat(result.data[0].total_paid);
                const weeksPaid = Math.floor(totalPaid / this.weeklyAmount);
                const remainder = totalPaid % this.weeklyAmount;
                
                return {
                    totalPaid,
                    weeksPaid,
                    remainder,
                    status: weeksPaid >= 4 ? 'LUNAS' : weeksPaid > 0 ? 'SEBAGIAN' : 'BELUM BAYAR'
                };
            }
            
            return {
                totalPaid: 0,
                weeksPaid: 0,
                remainder: 0,
                status: 'BELUM BAYAR'
            };
            
        } catch (error) {
            console.error('Error getting current month status:', error);
            return null;
        }
    }

    // Get all students current month status
    async getAllStudentsCurrentMonthStatus() {
        try {
            const currentDate = new Date();
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;
            
            const query = `
                SELECT 
                    s.id,
                    s.name,
                    COALESCE(SUM(t.amount), 0) as monthly_paid,
                    FLOOR(COALESCE(SUM(t.amount), 0) / ?) as weeks_paid,
                    (COALESCE(SUM(t.amount), 0) % ?) as remainder
                FROM students s
                LEFT JOIN transactions t ON s.id = t.student_id 
                    AND t.type = 'iuran' 
                    AND YEAR(t.created_at) = ? 
                    AND MONTH(t.created_at) = ?
                GROUP BY s.id, s.name
                ORDER BY s.name
            `;
            
            const result = await executeQuery(query, [this.weeklyAmount, this.weeklyAmount, year, month]);
            
            if (result.success) {
                return result.data.map(student => ({
                    ...student,
                    monthly_paid: parseFloat(student.monthly_paid),
                    weeks_paid: parseInt(student.weeks_paid),
                    remainder: parseFloat(student.remainder),
                    status: student.weeks_paid >= 4 ? 'LUNAS' : student.weeks_paid > 0 ? 'SEBAGIAN' : 'BELUM BAYAR'
                }));
            }
            
            return [];
            
        } catch (error) {
            console.error('Error getting all students current month status:', error);
            return [];
        }
    }

    // Manual reset (for testing or admin action)
    async manualReset() {
        console.log('🔧 Manual monthly reset triggered');
        await this.performMonthlyReset();
    }
}

module.exports = MonthlyResetService;
