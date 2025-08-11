const Student = require('../models/Student');
const Transaction = require('../models/Transaction');
const { getDbStats } = require('../config/database');

class DashboardController {
    static async index(req, res) {
        try {
            // Get dashboard statistics with error handling
            const balance = await Transaction.getBalance().catch(err => {
                console.error('Error getting balance:', err);
                return { income: 0, expense: 0, balance: 0 };
            });

            const recentTransactions = await Transaction.getRecentTransactions(5).catch(err => {
                console.error('Error getting recent transactions:', err);
                return [];
            });

            const weeklyCollection = await Transaction.getWeeklyCollection().catch(err => {
                console.error('Error getting weekly collection:', err);
                return { weekly_total: 0, students_paid: 0 };
            });

            const classStats = await Student.getClassStats().catch(err => {
                console.error('Error getting class stats:', err);
                return { total_students: 0, paid_students: 0, avg_payment: 0 };
            });

            const dbStats = await getDbStats().catch(err => {
                console.error('Error getting db stats:', err);
                return { students: 0, transactions: 0, income: 0, expenses: 0 };
            });
            
            // Get monthly stats for current month
            const monthlyStats = await Transaction.getMonthlyStats();
            
            // Process monthly stats for chart
            const monthlyData = {
                income: 0,
                expense: 0,
                iuran: 0
            };
            
            monthlyStats.forEach(stat => {
                if (stat.type === 'income') monthlyData.income = stat.total;
                if (stat.type === 'expense') monthlyData.expense = stat.total;
                if (stat.type === 'iuran') monthlyData.iuran = stat.total;
            });
            
            // Get weekly payment status
            const weeklyPayments = await Student.getWeeklyPaymentStatus().catch(err => {
                console.error('Error getting weekly payments:', err);
                return [];
            });
            const paidStudents = weeklyPayments.filter(s => s.status === 'paid').length;
            const totalStudents = weeklyPayments.length;
            
            const dashboardData = {
                balance: balance,
                recentTransactions: recentTransactions,
                weeklyCollection: weeklyCollection,
                classStats: classStats || { total_students: 0, paid_students: 0, avg_payment: 0 },
                dbStats: dbStats || { students: 0, transactions: 0, income: 0, expenses: 0 },
                monthlyData: monthlyData,
                weeklyProgress: {
                    paid: paidStudents,
                    total: totalStudents,
                    percentage: totalStudents > 0 ? Math.round((paidStudents / totalStudents) * 100) : 0
                }
            };
            
            res.render('dashboard', { 
                title: 'Dashboard - Axioo Kas',
                data: dashboardData,
                user: req.session.user || null
            });
            
        } catch (error) {
            console.error('Dashboard error:', error);
            res.status(500).render('error', { 
                title: 'Error',
                message: 'Terjadi kesalahan saat memuat dashboard',
                error: error.message
            });
        }
    }

    static async getStats(req, res) {
        try {
            const balance = await Transaction.getBalance();
            const weeklyCollection = await Transaction.getWeeklyCollection();
            const classStats = await Student.getClassStats();
            const dbStats = await getDbStats();
            
            res.json({
                success: true,
                data: {
                    balance,
                    weeklyCollection,
                    classStats,
                    dbStats
                }
            });
            
        } catch (error) {
            console.error('Stats API error:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal mengambil statistik',
                error: error.message
            });
        }
    }

    static async getChartData(req, res) {
        try {
            const { period = 'weekly' } = req.query;
            let chartData = [];
            
            if (period === 'weekly') {
                chartData = await Transaction.getDailyStats(7);
            } else if (period === 'monthly') {
                chartData = await Transaction.getMonthlyStats();
            }
            
            // Process data for chart
            const processedData = {
                labels: [],
                income: [],
                expense: [],
                iuran: []
            };
            
            if (period === 'weekly') {
                // Group by date
                const dateGroups = {};
                chartData.forEach(item => {
                    if (!dateGroups[item.date]) {
                        dateGroups[item.date] = { income: 0, expense: 0, iuran: 0 };
                    }
                    dateGroups[item.date][item.type] = item.total;
                });
                
                Object.keys(dateGroups).forEach(date => {
                    processedData.labels.push(new Date(date).toLocaleDateString('id-ID'));
                    processedData.income.push(dateGroups[date].income || 0);
                    processedData.expense.push(dateGroups[date].expense || 0);
                    processedData.iuran.push(dateGroups[date].iuran || 0);
                });
            }
            
            res.json({
                success: true,
                data: processedData
            });
            
        } catch (error) {
            console.error('Chart data error:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal mengambil data chart',
                error: error.message
            });
        }
    }

    static async quickAction(req, res) {
        try {
            const { action, amount, description, student_id } = req.body;
            
            if (!action || !amount) {
                return res.status(400).json({
                    success: false,
                    message: 'Action dan amount harus diisi'
                });
            }
            
            let transactionType = 'income';
            let transactionDesc = description || 'Quick action';
            
            switch (action) {
                case 'income':
                    transactionType = 'income';
                    transactionDesc = description || 'Pemasukan cepat';
                    break;
                case 'expense':
                    transactionType = 'expense';
                    transactionDesc = description || 'Pengeluaran cepat';
                    break;
                case 'iuran':
                    transactionType = 'iuran';
                    transactionDesc = description || 'Iuran kas';
                    break;
                default:
                    return res.status(400).json({
                        success: false,
                        message: 'Action tidak valid'
                    });
            }
            
            const transaction = await Transaction.create({
                type: transactionType,
                amount: parseFloat(amount),
                description: transactionDesc,
                student_id: student_id || null,
                created_by: req.session.user?.username || 'system'
            });
            
            if (transaction) {
                res.json({
                    success: true,
                    message: 'Transaksi berhasil ditambahkan',
                    data: transaction
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Gagal menambahkan transaksi'
                });
            }
            
        } catch (error) {
            console.error('Quick action error:', error);
            res.status(500).json({
                success: false,
                message: 'Terjadi kesalahan saat memproses quick action',
                error: error.message
            });
        }
    }
}

module.exports = DashboardController;
