const { executeQuery } = require('../config/database');

class Transaction {
    static async getAll(limit = 50, offset = 0) {
        const query = `
            SELECT t.*, s.name as student_name
            FROM transactions t
            LEFT JOIN students s ON t.student_id = s.id
            ORDER BY t.created_at DESC
            LIMIT ? OFFSET ?
        `;
        
        const result = await executeQuery(query, [limit, offset]);
        return result.success ? result.data : [];
    }

    static async getById(id) {
        const query = `
            SELECT t.*, s.name as student_name
            FROM transactions t
            LEFT JOIN students s ON t.student_id = s.id
            WHERE t.id = ?
        `;
        
        const result = await executeQuery(query, [id]);
        return result.success && result.data.length > 0 ? result.data[0] : null;
    }

    static async create(transactionData) {
        const { type, amount, description, student_id, created_by } = transactionData;
        const query = `
            INSERT INTO transactions (type, amount, description, student_id, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        `;
        
        const result = await executeQuery(query, [type, amount, description, student_id, created_by]);
        return result.success ? { id: result.data.insertId, ...transactionData } : null;
    }

    static async update(id, transactionData) {
        const { type, amount, description, student_id } = transactionData;
        const query = `
            UPDATE transactions 
            SET type = ?, amount = ?, description = ?, student_id = ?, updated_at = NOW()
            WHERE id = ?
        `;
        
        const result = await executeQuery(query, [type, amount, description, student_id, id]);
        return result.success;
    }

    static async delete(id) {
        const query = 'DELETE FROM transactions WHERE id = ?';
        const result = await executeQuery(query, [id]);
        return result.success;
    }

    static async getByType(type, limit = 50) {
        const query = `
            SELECT t.*, s.name as student_name
            FROM transactions t
            LEFT JOIN students s ON t.student_id = s.id
            WHERE t.type = ?
            ORDER BY t.created_at DESC
            LIMIT ?
        `;
        
        const result = await executeQuery(query, [type, limit]);
        return result.success ? result.data : [];
    }

    static async getByStudent(studentId, limit = 50) {
        const query = `
            SELECT t.*, s.name as student_name
            FROM transactions t
            JOIN students s ON t.student_id = s.id
            WHERE t.student_id = ?
            ORDER BY t.created_at DESC
            LIMIT ?
        `;
        
        const result = await executeQuery(query, [studentId, limit]);
        return result.success ? result.data : [];
    }

    static async getBalance() {
        const query = `
            SELECT
                COALESCE(SUM(CASE WHEN type IN ('income', 'iuran') THEN amount ELSE 0 END), 0) as total_income,
                COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense
            FROM transactions
        `;

        const result = await executeQuery(query);
        if (result.success && result.data.length > 0) {
            const data = result.data[0];
            return {
                income: parseFloat(data.total_income) || 0,
                expense: parseFloat(data.total_expense) || 0,
                balance: (parseFloat(data.total_income) || 0) - (parseFloat(data.total_expense) || 0)
            };
        }
        return { income: 0, expense: 0, balance: 0 };
    }

    static async getMonthlyStats(year = null, month = null) {
        const currentYear = year || new Date().getFullYear();
        const currentMonth = month || new Date().getMonth() + 1;
        
        const query = `
            SELECT 
                type,
                COUNT(*) as count,
                COALESCE(SUM(amount), 0) as total
            FROM transactions
            WHERE YEAR(created_at) = ? AND MONTH(created_at) = ?
            GROUP BY type
        `;
        
        const result = await executeQuery(query, [currentYear, currentMonth]);
        return result.success ? result.data : [];
    }

    static async getDailyStats(days = 7) {
        const query = `
            SELECT 
                DATE(created_at) as date,
                type,
                COUNT(*) as count,
                COALESCE(SUM(amount), 0) as total
            FROM transactions
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY DATE(created_at), type
            ORDER BY date DESC
        `;
        
        const result = await executeQuery(query, [days]);
        return result.success ? result.data : [];
    }

    static async getRecentTransactions(limit = 10) {
        // Use string interpolation for LIMIT since it doesn't support parameter binding
        const query = `
            SELECT t.*, s.name as student_name
            FROM transactions t
            LEFT JOIN students s ON t.student_id = s.id
            ORDER BY t.created_at DESC
            LIMIT ${parseInt(limit)}
        `;

        const result = await executeQuery(query);
        return result.success ? result.data : [];
    }

    static async searchTransactions(keyword, type = null, dateFrom = null, dateTo = null) {
        let query = `
            SELECT t.*, s.name as student_name
            FROM transactions t
            LEFT JOIN students s ON t.student_id = s.id
            WHERE (t.description LIKE ? OR s.name LIKE ?)
        `;
        
        const params = [`%${keyword}%`, `%${keyword}%`];
        
        if (type) {
            query += ' AND t.type = ?';
            params.push(type);
        }
        
        if (dateFrom) {
            query += ' AND DATE(t.created_at) >= ?';
            params.push(dateFrom);
        }
        
        if (dateTo) {
            query += ' AND DATE(t.created_at) <= ?';
            params.push(dateTo);
        }
        
        query += ' ORDER BY t.created_at DESC LIMIT 100';
        
        const result = await executeQuery(query, params);
        return result.success ? result.data : [];
    }

    static async getTotalCount() {
        const query = 'SELECT COUNT(*) as total FROM transactions';
        const result = await executeQuery(query);
        return result.success ? result.data[0].total : 0;
    }

    static async getWeeklyCollection() {
        try {
            // Get weekly total first
            const totalQuery = `
                SELECT COALESCE(SUM(amount), 0) as weekly_total
                FROM transactions
                WHERE type = 'iuran'
                AND YEARWEEK(created_at, 1) = YEARWEEK(NOW(), 1)
                AND student_id IS NOT NULL
            `;

            const totalResult = await executeQuery(totalQuery);
            const weeklyTotal = totalResult.success ? parseFloat(totalResult.data[0].weekly_total) || 0 : 0;

            // Get count of students who are fully paid this week (>= 3000)
            const lunasQuery = `
                SELECT COUNT(*) as students_lunas
                FROM (
                    SELECT student_id
                    FROM transactions
                    WHERE type = 'iuran'
                    AND YEARWEEK(created_at, 1) = YEARWEEK(NOW(), 1)
                    AND student_id IS NOT NULL
                    GROUP BY student_id
                    HAVING SUM(amount) >= 3000
                ) as lunas_students
            `;

            const lunasResult = await executeQuery(lunasQuery);
            const studentsLunas = lunasResult.success ? parseInt(lunasResult.data[0].students_lunas) || 0 : 0;

            return {
                weekly_total: weeklyTotal,
                students_lunas: studentsLunas
            };

        } catch (error) {
            console.error('Error in getWeeklyCollection:', error);
            return { weekly_total: 0, students_lunas: 0 };
        }
    }
}

module.exports = Transaction;
