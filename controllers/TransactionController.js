const Transaction = require('../models/Transaction');
const Student = require('../models/Student');
const MistralAI = require('../config/mistral');

class TransactionController {
    static async index(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 20;
            const offset = (page - 1) * limit;
            const type = req.query.type || '';
            const search = req.query.search || '';
            
            let transactions = [];
            let totalCount = 0;
            
            if (search) {
                transactions = await Transaction.searchTransactions(search, type || null);
                totalCount = transactions.length;
            } else if (type) {
                transactions = await Transaction.getByType(type, limit);
                totalCount = await Transaction.getTotalCount();
            } else {
                transactions = await Transaction.getAll(limit, offset);
                totalCount = await Transaction.getTotalCount();
            }
            
            const totalPages = Math.ceil(totalCount / limit);
            
            res.render('transactions', {
                title: 'Transaksi - Axioo Kas',
                transactions: transactions,
                pagination: {
                    current: page,
                    total: totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                },
                filters: { type, search },
                user: req.session.user || null
            });
            
        } catch (error) {
            console.error('Transaction index error:', error);
            res.status(500).render('error', {
                title: 'Error',
                message: 'Terjadi kesalahan saat memuat transaksi',
                error: error.message
            });
        }
    }

    static async create(req, res) {
        try {
            const students = await Student.getAll();
            
            res.render('transaction-form', {
                title: 'Tambah Transaksi - Axioo Kas',
                transaction: null,
                students: students,
                action: 'create',
                user: req.session.user || null
            });
            
        } catch (error) {
            console.error('Transaction create form error:', error);
            res.status(500).render('error', {
                title: 'Error',
                message: 'Terjadi kesalahan saat memuat form',
                error: error.message
            });
        }
    }

    static async store(req, res) {
        try {
            const { type, amount, description, student_id } = req.body;
            
            // Validation
            if (!type || !amount || !description) {
                return res.status(400).json({
                    success: false,
                    message: 'Type, amount, dan description harus diisi'
                });
            }
            
            if (!['income', 'expense', 'iuran'].includes(type)) {
                return res.status(400).json({
                    success: false,
                    message: 'Type transaksi tidak valid'
                });
            }
            
            const transaction = await Transaction.create({
                type: type,
                amount: parseFloat(amount),
                description: description,
                student_id: student_id || null,
                created_by: req.session.user?.username || 'system'
            });
            
            if (transaction) {
                if (req.headers.accept && req.headers.accept.includes('application/json')) {
                    res.json({
                        success: true,
                        message: 'Transaksi berhasil ditambahkan',
                        data: transaction
                    });
                } else {
                    req.session.flash = {
                        type: 'success',
                        message: 'Transaksi berhasil ditambahkan'
                    };
                    res.redirect('/transactions');
                }
            } else {
                if (req.headers.accept && req.headers.accept.includes('application/json')) {
                    res.status(500).json({
                        success: false,
                        message: 'Gagal menambahkan transaksi'
                    });
                } else {
                    req.session.flash = {
                        type: 'error',
                        message: 'Gagal menambahkan transaksi'
                    };
                    res.redirect('/transactions/create');
                }
            }
            
        } catch (error) {
            console.error('Transaction store error:', error);
            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                res.status(500).json({
                    success: false,
                    message: 'Terjadi kesalahan saat menyimpan transaksi',
                    error: error.message
                });
            } else {
                req.session.flash = {
                    type: 'error',
                    message: 'Terjadi kesalahan saat menyimpan transaksi'
                };
                res.redirect('/transactions/create');
            }
        }
    }

    static async edit(req, res) {
        try {
            const { id } = req.params;
            const transaction = await Transaction.getById(id);
            const students = await Student.getAll();
            
            if (!transaction) {
                req.session.flash = {
                    type: 'error',
                    message: 'Transaksi tidak ditemukan'
                };
                return res.redirect('/transactions');
            }
            
            res.render('transaction-form', {
                title: 'Edit Transaksi - Axioo Kas',
                transaction: transaction,
                students: students,
                action: 'edit',
                user: req.session.user || null
            });
            
        } catch (error) {
            console.error('Transaction edit error:', error);
            res.status(500).render('error', {
                title: 'Error',
                message: 'Terjadi kesalahan saat memuat transaksi',
                error: error.message
            });
        }
    }

    static async update(req, res) {
        try {
            const { id } = req.params;
            const { type, amount, description, student_id } = req.body;
            
            const success = await Transaction.update(id, {
                type: type,
                amount: parseFloat(amount),
                description: description,
                student_id: student_id || null
            });
            
            if (success) {
                req.session.flash = {
                    type: 'success',
                    message: 'Transaksi berhasil diupdate'
                };
            } else {
                req.session.flash = {
                    type: 'error',
                    message: 'Gagal mengupdate transaksi'
                };
            }
            
            res.redirect('/transactions');
            
        } catch (error) {
            console.error('Transaction update error:', error);
            req.session.flash = {
                type: 'error',
                message: 'Terjadi kesalahan saat mengupdate transaksi'
            };
            res.redirect('/transactions');
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;
            const success = await Transaction.delete(id);
            
            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                res.json({
                    success: success,
                    message: success ? 'Transaksi berhasil dihapus' : 'Gagal menghapus transaksi'
                });
            } else {
                req.session.flash = {
                    type: success ? 'success' : 'error',
                    message: success ? 'Transaksi berhasil dihapus' : 'Gagal menghapus transaksi'
                };
                res.redirect('/transactions');
            }
            
        } catch (error) {
            console.error('Transaction delete error:', error);
            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                res.status(500).json({
                    success: false,
                    message: 'Terjadi kesalahan saat menghapus transaksi',
                    error: error.message
                });
            } else {
                req.session.flash = {
                    type: 'error',
                    message: 'Terjadi kesalahan saat menghapus transaksi'
                };
                res.redirect('/transactions');
            }
        }
    }

    static async processAICommand(req, res) {
        try {
            const { command } = req.body;
            
            if (!command) {
                return res.status(400).json({
                    success: false,
                    message: 'Command tidak boleh kosong'
                });
            }
            
            // Get students list for AI processing
            const students = await Student.getAll();
            
            // Process command with Mistral AI
            const mistral = new MistralAI();
            const aiResult = await mistral.processCommand(command, students);
            
            if (!aiResult.success) {
                return res.status(500).json({
                    success: false,
                    message: 'Gagal memproses command dengan AI',
                    error: aiResult.error
                });
            }
            
            const { type, amount, student_id, student_name, description, confidence } = aiResult.data;
            
            // If confidence is low, return suggestions
            if (confidence < 0.7) {
                return res.json({
                    success: true,
                    suggestion: true,
                    message: 'AI membutuhkan konfirmasi',
                    data: aiResult.data,
                    students: students.filter(s => 
                        s.name.toLowerCase().includes(student_name?.toLowerCase() || '')
                    ).slice(0, 5)
                });
            }
            
            // Auto-create transaction if confidence is high
            const transaction = await Transaction.create({
                type: type,
                amount: amount,
                description: description,
                student_id: student_id,
                created_by: req.session.user?.username || 'ai-system'
            });
            
            if (transaction) {
                res.json({
                    success: true,
                    message: `Transaksi ${type} berhasil ditambahkan`,
                    data: {
                        transaction: transaction,
                        ai_confidence: confidence,
                        student_name: student_name
                    }
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Gagal menyimpan transaksi'
                });
            }
            
        } catch (error) {
            console.error('AI Command processing error:', error);
            res.status(500).json({
                success: false,
                message: 'Terjadi kesalahan saat memproses command AI',
                error: error.message
            });
        }
    }
}

module.exports = TransactionController;
