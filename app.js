const express = require('express');
const session = require('express-session');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

// Import database and test connection
const { testConnection } = require('./config/database');

// Import routes
const routes = require('./routes');

// Import services
const MonthlyResetService = require('./services/MonthlyResetService');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3007;

// Middleware setup
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'axioo-kas-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Flash messages middleware
app.use((req, res, next) => {
    res.locals.flash = req.session.flash || null;
    delete req.session.flash;
    next();
});

// Global template variables
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.appName = 'Axioo Kas';
    res.locals.currentYear = new Date().getFullYear();
    next();
});

// Method override for PUT and DELETE requests
app.use((req, res, next) => {
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
        const method = req.body._method;
        delete req.body._method;
        req.method = method.toUpperCase();
    }
    next();
});

// Routes
app.use('/', routes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Application error:', err);
    
    res.status(err.status || 500);
    
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
        res.json({
            success: false,
            message: 'Terjadi kesalahan server',
            error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
        });
    } else {
        res.render('error', {
            title: 'Error',
            message: 'Terjadi kesalahan server',
            error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
        });
    }
});

// Start server
async function startServer() {
    try {
        console.log('🚀 Starting Axioo Kas server...');

        // Test database connection
        console.log('🔍 Testing database connection...');
        try {
            const dbConnected = await testConnection();
            if (dbConnected) {
                console.log('✅ Database connected successfully');
            } else {
                console.log('⚠️ Database connection failed, but continuing...');
            }
        } catch (error) {
            console.log('⚠️ Database test failed, but continuing...', error.message);
        }
        
        // Start HTTP server
        app.listen(PORT, () => {
            console.log('🚀 Axioo Kas Web App started successfully!');
            console.log(`📱 Web App: http://localhost:${PORT}`);
            console.log(`👤 Admin Panel: http://localhost:${PORT}/admin`);
            console.log(`🔑 Login: admin / admin123`);
            console.log('');
            console.log('📋 Available endpoints:');
            console.log('   • Dashboard: /dashboard');
            console.log('   • Transactions: /transactions');
            console.log('   • Students: /students');
            console.log('   • Weekly Payments: /weekly-payments');
            console.log('   • Reports: /reports');
            console.log('   • API: /api/*');
            console.log('');

            // Start monthly reset scheduler
            try {
                const monthlyResetService = new MonthlyResetService();
                monthlyResetService.startScheduler();
                console.log('📅 Monthly reset scheduler started');
            } catch (error) {
                console.log('⚠️ Failed to start monthly reset scheduler:', error.message);
            }

            if (process.env.ENABLE_TELEGRAM_BOT === 'true') {
                console.log('🤖 To start Telegram bot, run: node telegram-bot.js');
            }

            console.log('✅ Ready to serve requests!');
        });
        
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down Axioo Kas Web App...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down Axioo Kas Web App...');
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start the application
startServer();

module.exports = app;
