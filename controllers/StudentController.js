const Student = require('../models/Student');
const Transaction = require('../models/Transaction');

class StudentController {
    static async index(req, res) {
        try {
            const search = req.query.search || '';
            let students = [];
            
            if (search) {
                students = await Student.searchByKeyword(search);
            } else {
                students = await Student.getAll();
            }
            
            res.render('students', {
                title: 'Data Siswa - Axioo Kas',
                students: students,
                search: search,
                user: req.session.user || null
            });
            
        } catch (error) {
            console.error('Student index error:', error);
            res.status(500).render('error', {
                title: 'Error',
                message: 'Terjadi kesalahan saat memuat data siswa',
                error: error.message
            });
        }
    }

    static async create(req, res) {
        res.render('student-form', {
            title: 'Tambah Siswa - Axioo Kas',
            student: null,
            action: 'create',
            user: req.session.user || null
        });
    }

    static async store(req, res) {
        try {
            const { name, class_name, phone, email } = req.body;
            
            // Validation
            if (!name || !class_name) {
                return res.status(400).json({
                    success: false,
                    message: 'Nama dan kelas harus diisi'
                });
            }
            
            const student = await Student.create({
                name: name.trim(),
                class_name: class_name.trim(),
                phone: phone?.trim() || null,
                email: email?.trim() || null
            });
            
            if (student) {
                if (req.headers.accept && req.headers.accept.includes('application/json')) {
                    res.json({
                        success: true,
                        message: 'Siswa berhasil ditambahkan',
                        data: student
                    });
                } else {
                    req.session.flash = {
                        type: 'success',
                        message: 'Siswa berhasil ditambahkan'
                    };
                    res.redirect('/students');
                }
            } else {
                if (req.headers.accept && req.headers.accept.includes('application/json')) {
                    res.status(500).json({
                        success: false,
                        message: 'Gagal menambahkan siswa'
                    });
                } else {
                    req.session.flash = {
                        type: 'error',
                        message: 'Gagal menambahkan siswa'
                    };
                    res.redirect('/students/create');
                }
            }
            
        } catch (error) {
            console.error('Student store error:', error);
            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                res.status(500).json({
                    success: false,
                    message: 'Terjadi kesalahan saat menyimpan siswa',
                    error: error.message
                });
            } else {
                req.session.flash = {
                    type: 'error',
                    message: 'Terjadi kesalahan saat menyimpan siswa'
                };
                res.redirect('/students/create');
            }
        }
    }

    static async show(req, res) {
        try {
            const { id } = req.params;
            const student = await Student.getById(id);
            
            if (!student) {
                req.session.flash = {
                    type: 'error',
                    message: 'Siswa tidak ditemukan'
                };
                return res.redirect('/students');
            }
            
            const paymentHistory = await Student.getPaymentHistory(id);
            const totalPaid = await Student.getTotalPaid(id);
            
            res.render('student-detail', {
                title: `Detail ${student.name} - Axioo Kas`,
                student: student,
                paymentHistory: paymentHistory,
                totalPaid: totalPaid,
                user: req.session.user || null
            });
            
        } catch (error) {
            console.error('Student show error:', error);
            res.status(500).render('error', {
                title: 'Error',
                message: 'Terjadi kesalahan saat memuat detail siswa',
                error: error.message
            });
        }
    }

    static async edit(req, res) {
        try {
            const { id } = req.params;
            const student = await Student.getById(id);
            
            if (!student) {
                req.session.flash = {
                    type: 'error',
                    message: 'Siswa tidak ditemukan'
                };
                return res.redirect('/students');
            }
            
            res.render('student-form', {
                title: `Edit ${student.name} - Axioo Kas`,
                student: student,
                action: 'edit',
                user: req.session.user || null
            });
            
        } catch (error) {
            console.error('Student edit error:', error);
            res.status(500).render('error', {
                title: 'Error',
                message: 'Terjadi kesalahan saat memuat form edit',
                error: error.message
            });
        }
    }

    static async update(req, res) {
        try {
            const { id } = req.params;
            const { name, class_name, phone, email } = req.body;
            
            const success = await Student.update(id, {
                name: name.trim(),
                class_name: class_name.trim(),
                phone: phone?.trim() || null,
                email: email?.trim() || null
            });
            
            if (success) {
                req.session.flash = {
                    type: 'success',
                    message: 'Data siswa berhasil diupdate'
                };
            } else {
                req.session.flash = {
                    type: 'error',
                    message: 'Gagal mengupdate data siswa'
                };
            }
            
            res.redirect('/students');
            
        } catch (error) {
            console.error('Student update error:', error);
            req.session.flash = {
                type: 'error',
                message: 'Terjadi kesalahan saat mengupdate data siswa'
            };
            res.redirect('/students');
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;
            const success = await Student.delete(id);
            
            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                res.json({
                    success: success,
                    message: success ? 'Siswa berhasil dihapus' : 'Gagal menghapus siswa'
                });
            } else {
                req.session.flash = {
                    type: success ? 'success' : 'error',
                    message: success ? 'Siswa berhasil dihapus' : 'Gagal menghapus siswa'
                };
                res.redirect('/students');
            }
            
        } catch (error) {
            console.error('Student delete error:', error);
            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                res.status(500).json({
                    success: false,
                    message: 'Terjadi kesalahan saat menghapus siswa',
                    error: error.message
                });
            } else {
                req.session.flash = {
                    type: 'error',
                    message: 'Terjadi kesalahan saat menghapus siswa'
                };
                res.redirect('/students');
            }
        }
    }

    static async weeklyPayments(req, res) {
        try {
            const weeklyPayments = await Student.getWeeklyPaymentStatus();
            const weeklyCollection = await Transaction.getWeeklyCollection();
            
            res.render('weekly-payments', {
                title: 'Iuran Mingguan - Axioo Kas',
                weeklyPayments: weeklyPayments,
                weeklyCollection: weeklyCollection,
                user: req.session.user || null
            });
            
        } catch (error) {
            console.error('Weekly payments error:', error);
            res.status(500).render('error', {
                title: 'Error',
                message: 'Terjadi kesalahan saat memuat data iuran mingguan',
                error: error.message
            });
        }
    }

    static async payWeekly(req, res) {
        try {
            const { student_id, amount } = req.body;
            
            if (!student_id || !amount) {
                return res.status(400).json({
                    success: false,
                    message: 'Student ID dan amount harus diisi'
                });
            }
            
            const student = await Student.getById(student_id);
            if (!student) {
                return res.status(404).json({
                    success: false,
                    message: 'Siswa tidak ditemukan'
                });
            }
            
            const transaction = await Transaction.create({
                type: 'iuran',
                amount: parseFloat(amount),
                description: `Iuran mingguan - ${student.name}`,
                student_id: student_id,
                created_by: req.session.user?.username || 'system'
            });
            
            if (transaction) {
                res.json({
                    success: true,
                    message: `Iuran ${student.name} berhasil dibayar`,
                    data: transaction
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Gagal menyimpan pembayaran iuran'
                });
            }
            
        } catch (error) {
            console.error('Pay weekly error:', error);
            res.status(500).json({
                success: false,
                message: 'Terjadi kesalahan saat memproses pembayaran',
                error: error.message
            });
        }
    }

    static async getStudentAPI(req, res) {
        try {
            const { search } = req.query;
            let students = [];
            
            if (search) {
                students = await Student.searchByKeyword(search);
            } else {
                students = await Student.getAll();
            }
            
            res.json({
                success: true,
                data: students
            });
            
        } catch (error) {
            console.error('Student API error:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal mengambil data siswa',
                error: error.message
            });
        }
    }
}

module.exports = StudentController;
