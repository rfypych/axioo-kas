const { executeQuery } = require('../config/database');
const Transaction = require('../models/Transaction');

class MultiWeekPaymentService {
    constructor() {
        this.weeklyAmount = 3000; // Standard weekly payment amount
    }

    // Process multi-week payment
    async processMultiWeekPayment(studentId, amount, description, createdBy = 'system') {
        try {
            console.log(`Processing multi-week payment: Student ${studentId}, Amount ${amount}`);
            
            // Calculate how many weeks this payment covers
            const weeksCount = Math.floor(amount / this.weeklyAmount);
            const remainder = amount % this.weeklyAmount;
            
            if (weeksCount === 0) {
                // Less than one week, treat as partial payment
                return await this.processSinglePayment(studentId, amount, description, createdBy);
            }
            
            // Get current week info
            const currentWeekInfo = this.getCurrentWeekInfo();
            
            // Process payment for multiple weeks
            const results = [];
            let totalProcessed = 0;
            
            // Process full weeks
            for (let i = 0; i < weeksCount; i++) {
                const weekInfo = this.getWeekInfo(currentWeekInfo.year, currentWeekInfo.week + i);
                const weekDescription = `${description} - Minggu ${weekInfo.week}/${weekInfo.year}`;
                
                const result = await Transaction.create({
                    type: 'iuran',
                    amount: this.weeklyAmount,
                    description: weekDescription,
                    student_id: studentId,
                    created_by: createdBy
                });
                
                if (result) {
                    results.push({
                        week: weekInfo.week,
                        year: weekInfo.year,
                        amount: this.weeklyAmount,
                        transaction_id: result.id
                    });
                    totalProcessed += this.weeklyAmount;
                }
            }
            
            // Process remainder if any
            if (remainder > 0) {
                const nextWeekInfo = this.getWeekInfo(currentWeekInfo.year, currentWeekInfo.week + weeksCount);
                const remainderDescription = `${description} - Minggu ${nextWeekInfo.week}/${nextWeekInfo.year} (Partial: Rp ${remainder.toLocaleString('id-ID')})`;
                
                const remainderResult = await Transaction.create({
                    type: 'iuran',
                    amount: remainder,
                    description: remainderDescription,
                    student_id: studentId,
                    created_by: createdBy
                });
                
                if (remainderResult) {
                    results.push({
                        week: nextWeekInfo.week,
                        year: nextWeekInfo.year,
                        amount: remainder,
                        transaction_id: remainderResult.id,
                        partial: true
                    });
                    totalProcessed += remainder;
                }
            }
            
            return {
                success: true,
                totalAmount: amount,
                totalProcessed: totalProcessed,
                weeksCount: weeksCount,
                remainder: remainder,
                transactions: results,
                summary: this.generatePaymentSummary(results, amount)
            };
            
        } catch (error) {
            console.error('Multi-week payment processing error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Process single week payment
    async processSinglePayment(studentId, amount, description, createdBy = 'system') {
        try {
            const result = await Transaction.create({
                type: 'iuran',
                amount: amount,
                description: description,
                student_id: studentId,
                created_by: createdBy
            });
            
            if (result) {
                const currentWeek = this.getCurrentWeekInfo();
                return {
                    success: true,
                    totalAmount: amount,
                    totalProcessed: amount,
                    weeksCount: 0,
                    remainder: amount,
                    transactions: [{
                        week: currentWeek.week,
                        year: currentWeek.year,
                        amount: amount,
                        transaction_id: result.id,
                        partial: amount < this.weeklyAmount
                    }],
                    summary: `Pembayaran sebagian Rp ${amount.toLocaleString('id-ID')} untuk minggu ${currentWeek.week}/${currentWeek.year}`
                };
            }
            
            return { success: false, error: 'Failed to create transaction' };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Get current week information
    getCurrentWeekInfo() {
        const now = new Date();
        const year = now.getFullYear();
        const week = this.getWeekNumber(now);
        
        return { year, week };
    }

    // Get week information for specific week
    getWeekInfo(year, week) {
        // Handle year overflow
        const weeksInYear = this.getWeeksInYear(year);
        
        if (week > weeksInYear) {
            return this.getWeekInfo(year + 1, week - weeksInYear);
        }
        
        return { year, week };
    }

    // Get week number of the year
    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    // Get number of weeks in a year
    getWeeksInYear(year) {
        const dec31 = new Date(year, 11, 31);
        const week = this.getWeekNumber(dec31);
        return week === 1 ? 52 : week;
    }

    // Generate payment summary
    generatePaymentSummary(transactions, totalAmount) {
        let summary = `💰 Pembayaran Rp ${totalAmount.toLocaleString('id-ID')} berhasil diproses!\n\n`;
        
        const fullWeeks = transactions.filter(t => !t.partial && t.amount === this.weeklyAmount);
        const partialWeeks = transactions.filter(t => t.partial || t.amount < this.weeklyAmount);
        
        if (fullWeeks.length > 0) {
            summary += `✅ *Lunas untuk ${fullWeeks.length} minggu:*\n`;
            fullWeeks.forEach(t => {
                summary += `   • Minggu ${t.week}/${t.year}: Rp ${t.amount.toLocaleString('id-ID')}\n`;
            });
            summary += '\n';
        }
        
        if (partialWeeks.length > 0) {
            summary += `❕ *Pembayaran sebagian:*\n`;
            partialWeeks.forEach(t => {
                const status = t.amount >= this.weeklyAmount ? 'Lunas' : `Kurang Rp ${(this.weeklyAmount - t.amount).toLocaleString('id-ID')}`;
                summary += `   • Minggu ${t.week}/${t.year}: Rp ${t.amount.toLocaleString('id-ID')} (${status})\n`;
            });
        }
        
        return summary;
    }

    // Get student payment status with multi-week view
    async getStudentMultiWeekStatus(studentId, weeksAhead = 4) {
        try {
            const currentWeek = this.getCurrentWeekInfo();
            const weeks = [];
            
            // Generate weeks to check
            for (let i = 0; i < weeksAhead; i++) {
                const weekInfo = this.getWeekInfo(currentWeek.year, currentWeek.week + i);
                weeks.push(weekInfo);
            }
            
            // Get payments for these weeks
            const payments = [];
            for (const week of weeks) {
                const weekPayments = await this.getWeekPayments(studentId, week.year, week.week);
                payments.push({
                    ...week,
                    payments: weekPayments,
                    totalPaid: weekPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0),
                    status: this.getWeekStatus(weekPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0))
                });
            }
            
            return {
                success: true,
                studentId: studentId,
                weeks: payments,
                summary: this.generateMultiWeekSummary(payments)
            };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Get payments for specific week
    async getWeekPayments(studentId, year, week) {
        try {
            // Calculate week start and end dates
            const weekStart = this.getWeekStartDate(year, week);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            
            const query = `
                SELECT * FROM transactions 
                WHERE student_id = ? 
                AND type = 'iuran' 
                AND DATE(created_at) >= ? 
                AND DATE(created_at) <= ?
                ORDER BY created_at ASC
            `;
            
            const result = await executeQuery(query, [
                studentId,
                weekStart.toISOString().split('T')[0],
                weekEnd.toISOString().split('T')[0]
            ]);
            
            return result.success ? result.data : [];
            
        } catch (error) {
            console.error('Error getting week payments:', error);
            return [];
        }
    }

    // Get week start date
    getWeekStartDate(year, week) {
        const jan1 = new Date(year, 0, 1);
        const daysToAdd = (week - 1) * 7;
        const weekStart = new Date(jan1);
        weekStart.setDate(jan1.getDate() + daysToAdd);
        
        // Adjust to Monday
        const dayOfWeek = weekStart.getDay();
        const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        weekStart.setDate(weekStart.getDate() + daysToMonday);
        
        return weekStart;
    }

    // Get week status based on amount paid
    getWeekStatus(totalPaid) {
        if (totalPaid >= this.weeklyAmount) {
            return 'lunas';
        } else if (totalPaid > 0) {
            return 'sebagian';
        } else {
            return 'belum_bayar';
        }
    }

    // Generate multi-week summary
    generateMultiWeekSummary(weeks) {
        const lunas = weeks.filter(w => w.status === 'lunas').length;
        const sebagian = weeks.filter(w => w.status === 'sebagian').length;
        const belumBayar = weeks.filter(w => w.status === 'belum_bayar').length;
        
        let summary = `📊 *Status ${weeks.length} Minggu Ke Depan:*\n`;
        summary += `✅ Lunas: ${lunas} minggu\n`;
        summary += `❕ Sebagian: ${sebagian} minggu\n`;
        summary += `❌ Belum bayar: ${belumBayar} minggu\n\n`;
        
        summary += `📅 *Detail per minggu:*\n`;
        weeks.forEach(week => {
            const emoji = week.status === 'lunas' ? '✅' : 
                         week.status === 'sebagian' ? '❕' : '❌';
            const amount = week.totalPaid > 0 ? ` (Rp ${week.totalPaid.toLocaleString('id-ID')})` : '';
            summary += `${emoji} Minggu ${week.week}/${week.year}${amount}\n`;
        });
        
        return summary;
    }

    // Calculate advance payment suggestion
    calculateAdvancePayment(weeksAhead) {
        return weeksAhead * this.weeklyAmount;
    }

    // Get payment breakdown for amount
    getPaymentBreakdown(amount) {
        const weeks = Math.floor(amount / this.weeklyAmount);
        const remainder = amount % this.weeklyAmount;
        
        return {
            fullWeeks: weeks,
            remainder: remainder,
            totalWeeks: remainder > 0 ? weeks + 1 : weeks,
            breakdown: `${weeks} minggu penuh${remainder > 0 ? ` + Rp ${remainder.toLocaleString('id-ID')} (minggu ke-${weeks + 1})` : ''}`
        };
    }
}

module.exports = MultiWeekPaymentService;
