const express = require('express');
const router = express.Router();

// Import controllers
const DashboardController = require('../controllers/DashboardController');
const TransactionController = require('../controllers/TransactionController');
const StudentController = require('../controllers/StudentController');

// Middleware untuk autentikasi
function requireAuth(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Middleware untuk admin
function requireAdmin(req, res, next) {
    if (req.session.user && req.session.user.role === 'admin') {
        next();
    } else {
        res.status(403).render('error', {
            title: 'Forbidden',
            message: 'Akses ditolak. Hanya admin yang dapat mengakses halaman ini.',
            error: 'Forbidden'
        });
    }
}

// Home route - redirect to dashboard
router.get('/', (req, res) => {
    if (req.session.user) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/login');
    }
});

// Auth routes
router.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    
    res.render('login', {
        title: 'Login - Axioo Kas',
        error: req.session.flash?.message || null
    });
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    // Simple authentication (in production, use proper password hashing)
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        req.session.user = {
            id: 1,
            username: username,
            role: 'admin'
        };
        
        res.redirect('/dashboard');
    } else {
        req.session.flash = {
            type: 'error',
            message: 'Username atau password salah'
        };
        res.redirect('/login');
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/login');
    });
});

// Dashboard routes
router.get('/dashboard', requireAuth, DashboardController.index);
router.get('/api/stats', requireAuth, DashboardController.getStats);
router.get('/api/chart-data', requireAuth, DashboardController.getChartData);
router.post('/api/quick-action', requireAuth, DashboardController.quickAction);

// Transaction routes
router.get('/transactions', requireAuth, TransactionController.index);
router.get('/transactions/create', requireAuth, TransactionController.create);
router.post('/transactions', requireAuth, TransactionController.store);
router.get('/transactions/:id/edit', requireAuth, TransactionController.edit);
router.put('/transactions/:id', requireAuth, TransactionController.update);
router.delete('/transactions/:id', requireAuth, TransactionController.delete);

// AI Command processing
router.post('/api/ai-command', requireAuth, TransactionController.processAICommand);

// Student routes
router.get('/students', requireAuth, StudentController.index);
router.get('/students/create', requireAuth, StudentController.create);
router.post('/students', requireAuth, StudentController.store);
router.get('/students/:id', requireAuth, StudentController.show);
router.get('/students/:id/edit', requireAuth, StudentController.edit);
router.put('/students/:id', requireAuth, StudentController.update);
router.delete('/students/:id', requireAuth, StudentController.delete);

// Weekly payments
router.get('/weekly-payments', requireAuth, StudentController.weeklyPayments);
router.post('/api/pay-weekly', requireAuth, StudentController.payWeekly);

// API routes
router.get('/api/students', requireAuth, StudentController.getStudentAPI);

// Reports route
router.get('/reports', requireAuth, (req, res) => {
    res.render('reports', {
        title: 'Laporan - Axioo Kas',
        user: req.session.user || null
    });
});

// Admin routes
router.get('/admin', requireAdmin, (req, res) => {
    res.render('admin', {
        title: 'Admin Panel - Axioo Kas',
        user: req.session.user
    });
});

// Test route for development
router.get('/test', (req, res) => {
    res.json({
        message: 'Axioo Kas API is running',
        timestamp: new Date().toISOString(),
        session: req.session.user || null
    });
});

// 404 handler
router.use('*', (req, res) => {
    res.status(404).render('error', {
        title: '404 - Halaman Tidak Ditemukan',
        message: 'Halaman yang Anda cari tidak ditemukan',
        error: 'Not Found'
    });
});

module.exports = router;
