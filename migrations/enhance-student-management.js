const { executeQuery } = require('../config/database');

async function enhanceStudentManagement() {
    console.log('🔧 Enhancing student management system...');
    
    try {
        // 1. Add status and exit_date columns to students table
        console.log('📝 Adding status and exit_date columns...');
        
        const addStatusColumn = `
            ALTER TABLE students 
            ADD COLUMN IF NOT EXISTS status ENUM('active', 'inactive', 'graduated') DEFAULT 'active'
        `;
        
        const addExitDateColumn = `
            ALTER TABLE students 
            ADD COLUMN IF NOT EXISTS exit_date DATE NULL
        `;
        
        const addExitReasonColumn = `
            ALTER TABLE students 
            ADD COLUMN IF NOT EXISTS exit_reason VARCHAR(255) NULL
        `;
        
        await executeQuery(addStatusColumn);
        await executeQuery(addExitDateColumn);
        await executeQuery(addExitReasonColumn);
        
        console.log('✅ Student table enhanced');
        
        // 2. Create student_changes table for audit trail
        console.log('📝 Creating student_changes table...');
        
        const studentChangesTable = `
            CREATE TABLE IF NOT EXISTS student_changes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                change_type ENUM('create', 'update', 'status_change', 'delete') NOT NULL,
                field_name VARCHAR(100) NULL,
                old_value TEXT NULL,
                new_value TEXT NULL,
                changed_by VARCHAR(100) NOT NULL,
                change_reason VARCHAR(255) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                INDEX idx_student_id (student_id),
                INDEX idx_change_type (change_type),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;
        
        await executeQuery(studentChangesTable);
        console.log('✅ Student changes table created');
        
        // 3. Update existing students to have 'active' status
        console.log('📝 Updating existing students status...');
        
        const updateExistingStudents = `
            UPDATE students 
            SET status = 'active' 
            WHERE status IS NULL
        `;
        
        await executeQuery(updateExistingStudents);
        console.log('✅ Existing students updated to active status');
        
        // 4. Add indexes for better performance
        console.log('📝 Adding performance indexes...');
        
        const addStatusIndex = `
            ALTER TABLE students 
            ADD INDEX IF NOT EXISTS idx_status (status)
        `;
        
        await executeQuery(addStatusIndex);
        console.log('✅ Performance indexes added');
        
        console.log('🎉 Student management enhancement completed!');
        
        return { success: true };
        
    } catch (error) {
        console.error('❌ Error enhancing student management:', error);
        return { success: false, error: error.message };
    }
}

// Run migration if executed directly
if (require.main === module) {
    enhanceStudentManagement().then(result => {
        if (result.success) {
            console.log('✅ Migration completed successfully');
            process.exit(0);
        } else {
            console.error('❌ Migration failed:', result.error);
            process.exit(1);
        }
    });
}

module.exports = { enhanceStudentManagement };
