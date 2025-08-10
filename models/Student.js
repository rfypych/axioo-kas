const { executeQuery } = require('../config/database');

class Student {
    static async getAll(includeInactive = false) {
        try {
            let query;
            if (includeInactive) {
                query = 'SELECT * FROM students ORDER BY name ASC';
            } else {
                // Robust query that handles missing status column
                query = `SELECT * FROM students 
                        WHERE (status = 'active' OR status IS NULL OR status = '') 
                        ORDER BY name ASC`;
            }
            
            const result = await executeQuery(query);
            
            if (!result.success) {
                console.error('Student.getAll error:', result.error);
                
                // Fallback query without status filter
                if (result.error.includes('Unknown column')) {
                    console.log('Falling back to query without status filter...');
                    const fallbackResult = await executeQuery('SELECT * FROM students ORDER BY name ASC');
                    return fallbackResult.success ? fallbackResult.data : [];
                }
                return [];
            }
            
            // Add payment calculations
            const studentsWithPayments = await Promise.all(
                result.data.map(async (student) => {
                    const paymentResult = await executeQuery(
                        'SELECT COALESCE(SUM(amount), 0) as total_paid, COUNT(*) as payment_count FROM transactions WHERE student_id = ? AND type = "iuran"',
                        [student.id]
                    );
                    
                    const totalPaid = paymentResult.success ? parseFloat(paymentResult.data[0].total_paid) : 0;
                    const paymentCount = paymentResult.success ? parseInt(paymentResult.data[0].payment_count) : 0;
                    
                    return {
                        ...student,
                        total_paid: totalPaid,
                        payment_count: paymentCount,
                        status: student.status || 'active' // Default to active if null
                    };
                })
            );
            
            return studentsWithPayments;
            
        } catch (error) {
            console.error('Student.getAll exception:', error);
            return [];
        }
    }

    static async getById(id) {
        try {
            const result = await executeQuery('SELECT * FROM students WHERE id = ?', [id]);
            return result.success && result.data.length > 0 ? result.data[0] : null;
        } catch (error) {
            console.error('Student.getById error:', error);
            return null;
        }
    }

    static async searchByKeyword(keyword) {
        try {
            const result = await executeQuery(
                'SELECT * FROM students WHERE name LIKE ? OR class_name LIKE ? ORDER BY name ASC',
                [`%${keyword}%`, `%${keyword}%`]
            );
            return result.success ? result.data : [];
        } catch (error) {
            console.error('Student.searchByKeyword error:', error);
            return [];
        }
    }

    static async getStatistics() {
        try {
            const totalResult = await executeQuery('SELECT COUNT(*) as total FROM students');
            const activeResult = await executeQuery(
                'SELECT COUNT(*) as active FROM students WHERE (status = "active" OR status IS NULL OR status = "")'
            );
            
            // Fallback if status column doesn't exist
            let activeCount = 0;
            if (activeResult.success) {
                activeCount = activeResult.data[0].active;
            } else if (totalResult.success) {
                activeCount = totalResult.data[0].total; // Assume all active if no status column
            }
            
            return {
                total: totalResult.success ? totalResult.data[0].total : 0,
                active: activeCount,
                inactive: totalResult.success ? (totalResult.data[0].total - activeCount) : 0
            };
        } catch (error) {
            console.error('Student.getStatistics error:', error);
            return { total: 0, active: 0, inactive: 0 };
        }
    }

    static async create(studentData) {
        try {
            const { name, class_name, phone, email } = studentData;
            const result = await executeQuery(
                'INSERT INTO students (name, class_name, phone, email, status) VALUES (?, ?, ?, ?, ?)',
                [name, class_name, phone, email, 'active']
            );
            return result.success ? { id: result.data.insertId, ...studentData } : null;
        } catch (error) {
            console.error('Student.create error:', error);
            return null;
        }
    }

    static async update(id, studentData) {
        try {
            const { name, class_name, phone, email, status } = studentData;
            const result = await executeQuery(
                'UPDATE students SET name = ?, class_name = ?, phone = ?, email = ?, status = ? WHERE id = ?',
                [name, class_name, phone, email, status || 'active', id]
            );
            return result.success;
        } catch (error) {
            console.error('Student.update error:', error);
            return false;
        }
    }

    static async delete(id) {
        try {
            const result = await executeQuery('DELETE FROM students WHERE id = ?', [id]);
            return result.success;
        } catch (error) {
            console.error('Student.delete error:', error);
            return false;
        }
    }

    static async getAllActive() {
        try {
            const query = `
                SELECT id, name FROM students
                WHERE (status = 'active' OR status IS NULL OR status = '')
                ORDER BY name ASC
            `;
            const result = await executeQuery(query);
            return result.success ? result.data : [];
        } catch (error) {
            console.error('Student.getAllActive error:', error);
            return [];
        }
    }

    static async getPaymentStatusForRange(startDate, endDate) {
        try {
            const weeklyAmount = 3000; // This should be a global config
            const startDateISO = new Date(startDate).toISOString().slice(0, 19).replace('T', ' ');
            const endDateISO = new Date(endDate).toISOString().slice(0, 19).replace('T', ' ');

            const query = `
                SELECT
                    s.id,
                    s.name,
                    COALESCE(SUM(t.amount), 0) as weekly_paid
                FROM students s
                LEFT JOIN transactions t ON s.id = t.student_id
                    AND t.type = 'iuran'
                    AND t.created_at BETWEEN ? AND ?
                WHERE
                    (s.status = 'active' OR s.status IS NULL OR s.status = '')
                GROUP BY s.id, s.name
                ORDER BY s.name ASC
            `;

            const result = await executeQuery(query, [startDateISO, endDateISO]);

            if (result.success) {
                return result.data.map(student => ({
                    ...student,
                    weekly_paid: parseFloat(student.weekly_paid),
                    status: parseFloat(student.weekly_paid) >= weeklyAmount ? 'paid' : 'pending'
                }));
            }
            return [];
        } catch (error) {
            console.error('Error in getPaymentStatusForRange:', error);
            return [];
        }
    }
}

module.exports = Student;