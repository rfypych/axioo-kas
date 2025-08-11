const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configuration - Fixed for aaPanel compatibility
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'axioo_kas',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
    timezone: '+00:00'
    // Removed acquireTimeout and timeout - these are invalid for mysql2
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
}

// Execute query with error handling
async function executeQuery(query, params = []) {
    try {
        const [results] = await pool.execute(query, params);
        return { success: true, data: results };
    } catch (error) {
        console.error('Database query error:', error.message);
        console.error('Query:', query);
        console.error('Params:', params);
        return { success: false, error: error.message };
    }
}

// Get database statistics
async function getDbStats() {
    try {
        const queries = [
            'SELECT COUNT(*) as total_students FROM students',
            'SELECT COUNT(*) as total_transactions FROM transactions',
            'SELECT COALESCE(SUM(amount), 0) as total_balance FROM transactions WHERE type IN ("income", "iuran")',
            'SELECT COALESCE(SUM(amount), 0) as total_expenses FROM transactions WHERE type = "expense"'
        ];

        const results = await Promise.all(
            queries.map(query => executeQuery(query))
        );

        return {
            students: results[0].success ? results[0].data[0].total_students : 0,
            transactions: results[1].success ? results[1].data[0].total_transactions : 0,
            income: results[2].success ? (parseFloat(results[2].data[0].total_balance) || 0) : 0,
            expenses: results[3].success ? (parseFloat(results[3].data[0].total_expenses) || 0) : 0
        };
    } catch (error) {
        console.error('Error getting database stats:', error);
        return {
            students: 0,
            transactions: 0,
            income: 0,
            expenses: 0
        };
    }
}

module.exports = {
    pool,
    testConnection,
    executeQuery,
    getDbStats
};
