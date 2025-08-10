const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class AAPanelSetup {
    constructor() {
        this.detectedConfig = null;
        this.originalConfig = null;
    }

    async detectEnvironment() {
        console.log('🔍 Mendeteksi environment aaPanel...\n');
        
        const indicators = {
            isAAPanel: false,
            mysqlSocket: null,
            mysqlPort: null,
            webRoot: null,
            phpVersion: null
        };

        // 1. Cek apakah ini aaPanel environment
        const aaPanelPaths = [
            '/www/server',
            '/www/wwwroot',
            '/www/server/mysql',
            '/www/server/panel'
        ];

        for (const aaPanelPath of aaPanelPaths) {
            if (fs.existsSync(aaPanelPath)) {
                indicators.isAAPanel = true;
                console.log(`✅ Terdeteksi aaPanel: ${aaPanelPath}`);
                break;
            }
        }

        // 2. Cek MySQL socket (umum di aaPanel)
        const socketPaths = [
            '/tmp/mysql.sock',
            '/var/lib/mysql/mysql.sock',
            '/www/server/mysql/mysql.sock',
            '/run/mysqld/mysqld.sock'
        ];

        for (const socketPath of socketPaths) {
            if (fs.existsSync(socketPath)) {
                indicators.mysqlSocket = socketPath;
                console.log(`✅ MySQL socket ditemukan: ${socketPath}`);
                break;
            }
        }

        // 3. Cek port MySQL alternatif
        const commonPorts = [3306, 3307, 3308];
        for (const port of commonPorts) {
            try {
                const testConfig = {
                    host: 'localhost',
                    port: port,
                    user: process.env.DB_USER || 'root',
                    password: process.env.DB_PASSWORD || '',
                    connectTimeout: 5000
                };

                const connection = await mysql.createConnection(testConfig);
                await connection.ping();
                await connection.end();
                
                indicators.mysqlPort = port;
                console.log(`✅ MySQL port aktif: ${port}`);
                break;
            } catch (error) {
                // Port tidak aktif, lanjut ke port berikutnya
            }
        }

        // 4. Deteksi web root
        const webRoots = [
            '/www/wwwroot',
            '/var/www/html',
            '/home/www'
        ];

        for (const webRoot of webRoots) {
            if (fs.existsSync(webRoot)) {
                indicators.webRoot = webRoot;
                console.log(`✅ Web root ditemukan: ${webRoot}`);
                break;
            }
        }

        return indicators;
    }

    async testDatabaseConnections() {
        console.log('\n🔧 Testing berbagai konfigurasi database...\n');
        
        const configs = [];
        
        // Config 1: Default dari .env
        configs.push({
            name: 'Default (.env)',
            config: {
                host: process.env.DB_HOST || 'localhost',
                user: process.env.DB_USER || 'root',
                password: process.env.DB_PASSWORD || '',
                database: process.env.DB_NAME || 'axioo_kas',
                port: 3306
            }
        });

        // Config 2: Localhost dengan socket
        if (this.detectedConfig?.mysqlSocket) {
            configs.push({
                name: 'Socket Connection',
                config: {
                    socketPath: this.detectedConfig.mysqlSocket,
                    user: process.env.DB_USER || 'root',
                    password: process.env.DB_PASSWORD || '',
                    database: process.env.DB_NAME || 'axioo_kas'
                }
            });
        }

        // Config 3: Port alternatif
        if (this.detectedConfig?.mysqlPort && this.detectedConfig.mysqlPort !== 3306) {
            configs.push({
                name: `Port ${this.detectedConfig.mysqlPort}`,
                config: {
                    host: 'localhost',
                    port: this.detectedConfig.mysqlPort,
                    user: process.env.DB_USER || 'root',
                    password: process.env.DB_PASSWORD || '',
                    database: process.env.DB_NAME || 'axioo_kas'
                }
            });
        }

        // Config 4: 127.0.0.1 instead of localhost
        configs.push({
            name: '127.0.0.1',
            config: {
                host: '127.0.0.1',
                user: process.env.DB_USER || 'root',
                password: process.env.DB_PASSWORD || '',
                database: process.env.DB_NAME || 'axioo_kas',
                port: 3306
            }
        });

        let workingConfig = null;

        for (const { name, config } of configs) {
            try {
                console.log(`🧪 Testing ${name}...`);
                
                const connection = await mysql.createConnection(config);
                await connection.ping();
                
                // Test database exists
                const [databases] = await connection.execute('SHOW DATABASES');
                const dbExists = databases.some(db => db.Database === config.database);
                
                if (dbExists) {
                    // Test tables exist
                    await connection.execute(`USE ${config.database}`);
                    const [tables] = await connection.execute('SHOW TABLES');
                    
                    console.log(`✅ ${name}: Berhasil terhubung`);
                    console.log(`   📊 Database: ${config.database} (${tables.length} tables)`);
                    
                    workingConfig = { name, config };
                } else {
                    console.log(`⚠️ ${name}: Terhubung tapi database '${config.database}' tidak ada`);
                }
                
                await connection.end();
                
                if (workingConfig) break;
                
            } catch (error) {
                console.log(`❌ ${name}: ${error.message}`);
            }
        }

        return workingConfig;
    }

    async createDatabaseAndTables(config) {
        console.log('\n🏗️ Membuat database dan tabel...\n');
        
        try {
            // Connect without database first
            const tempConfig = { ...config };
            delete tempConfig.database;
            
            const connection = await mysql.createConnection(tempConfig);
            
            // Create database if not exists
            const dbName = process.env.DB_NAME || 'axioo_kas';
            await connection.execute(`CREATE DATABASE IF NOT EXISTS ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
            console.log(`✅ Database '${dbName}' dibuat/sudah ada`);
            
            // Use the database
            await connection.execute(`USE ${dbName}`);
            
            // Create tables
            const createTables = [
                `CREATE TABLE IF NOT EXISTS students (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    class_name VARCHAR(100),
                    phone VARCHAR(20),
                    email VARCHAR(255),
                    status ENUM('active', 'inactive', 'graduated') DEFAULT 'active',
                    exit_date DATE NULL,
                    exit_reason TEXT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )`,
                
                `CREATE TABLE IF NOT EXISTS transactions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    student_id INT,
                    type ENUM('income', 'expense', 'iuran') NOT NULL,
                    amount DECIMAL(10,2) NOT NULL,
                    description TEXT,
                    week_number INT,
                    year INT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL
                )`,
                
                `CREATE TABLE IF NOT EXISTS student_changes (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    student_id INT,
                    change_type ENUM('create', 'update', 'delete', 'status_change') NOT NULL,
                    field_name VARCHAR(100),
                    old_value TEXT,
                    new_value TEXT,
                    changed_by VARCHAR(100),
                    change_reason TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
                )`
            ];
            
            for (const sql of createTables) {
                await connection.execute(sql);
            }
            
            console.log('✅ Semua tabel berhasil dibuat');
            
            // Check if we have any students
            const [students] = await connection.execute('SELECT COUNT(*) as count FROM students');
            const studentCount = students[0].count;
            
            console.log(`📊 Jumlah siswa saat ini: ${studentCount}`);
            
            if (studentCount === 0) {
                console.log('\n⚠️ Tidak ada data siswa. Menambahkan data contoh...');
                await this.addSampleData(connection);
            }
            
            await connection.end();
            return true;
            
        } catch (error) {
            console.error('❌ Error membuat database:', error.message);
            return false;
        }
    }

    async addSampleData(connection) {
        const sampleStudents = [
            { name: 'Ahmad Fauzi', class_name: 'XI TKJ A', phone: '081234567890', email: 'ahmad@email.com' },
            { name: 'Siti Nurhaliza', class_name: 'XI TKJ A', phone: '081234567891', email: 'siti@email.com' },
            { name: 'Budi Santoso', class_name: 'XI TKJ B', phone: '081234567892', email: 'budi@email.com' },
            { name: 'Dewi Sartika', class_name: 'XI TKJ B', phone: '081234567893', email: 'dewi@email.com' },
            { name: 'Rizki Pratama', class_name: 'XI TKJ A', phone: '081234567894', email: 'rizki@email.com' }
        ];

        for (const student of sampleStudents) {
            await connection.execute(
                'INSERT INTO students (name, class_name, phone, email, status) VALUES (?, ?, ?, ?, ?)',
                [student.name, student.class_name, student.phone, student.email, 'active']
            );
        }

        console.log(`✅ ${sampleStudents.length} siswa contoh berhasil ditambahkan`);
    }

    async updateDatabaseConfig(workingConfig) {
        console.log('\n⚙️ Memperbarui konfigurasi database...\n');
        
        try {
            // Backup original config
            const configPath = path.join(__dirname, 'config', 'database.js');
            const backupPath = path.join(__dirname, 'config', 'database.js.backup');
            
            if (fs.existsSync(configPath) && !fs.existsSync(backupPath)) {
                fs.copyFileSync(configPath, backupPath);
                console.log('✅ Backup konfigurasi lama dibuat');
            }

            // Create new config content
            const newConfig = this.generateDatabaseConfig(workingConfig.config);
            fs.writeFileSync(configPath, newConfig);
            
            console.log(`✅ Konfigurasi database diperbarui untuk ${workingConfig.name}`);
            
            // Update .env if needed
            await this.updateEnvFile(workingConfig.config);
            
            return true;
        } catch (error) {
            console.error('❌ Error memperbarui konfigurasi:', error.message);
            return false;
        }
    }

    generateDatabaseConfig(config) {
        const socketConfig = config.socketPath ? `socketPath: '${config.socketPath}',` : '';
        const hostConfig = config.host ? `host: '${config.host}',` : '';
        const portConfig = config.port ? `port: ${config.port},` : '';

        return `const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configuration - Auto-configured for aaPanel
const dbConfig = {
    ${hostConfig}
    ${portConfig}
    ${socketConfig}
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'axioo_kas',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000
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
`;
    }

    async updateEnvFile(config) {
        const envPath = path.join(__dirname, '.env');
        
        if (!fs.existsSync(envPath)) {
            console.log('⚠️ File .env tidak ditemukan, membuat yang baru...');
        }

        let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
        
        // Update database config in .env
        if (config.host) {
            envContent = this.updateEnvVar(envContent, 'DB_HOST', config.host);
        }
        if (config.port) {
            envContent = this.updateEnvVar(envContent, 'DB_PORT', config.port.toString());
        }

        fs.writeFileSync(envPath, envContent);
        console.log('✅ File .env diperbarui');
    }

    updateEnvVar(content, key, value) {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        const newLine = `${key}=${value}`;
        
        if (regex.test(content)) {
            return content.replace(regex, newLine);
        } else {
            return content + `\n${newLine}`;
        }
    }

    async run() {
        console.log('🚀 Axioo Kas - aaPanel Setup Tool\n');
        console.log('=================================\n');
        
        // Step 1: Detect environment
        this.detectedConfig = await this.detectEnvironment();
        
        // Step 2: Test database connections
        const workingConfig = await this.testDatabaseConnections();
        
        if (!workingConfig) {
            console.log('\n❌ Tidak dapat terhubung ke database dengan konfigurasi apapun');
            console.log('\n🔧 Solusi yang bisa dicoba:');
            console.log('1. Pastikan MySQL service berjalan');
            console.log('2. Periksa username dan password database');
            console.log('3. Periksa permission database user');
            console.log('4. Coba restart MySQL service');
            return false;
        }

        // Step 3: Create database and tables if needed
        const dbCreated = await this.createDatabaseAndTables(workingConfig.config);
        
        if (!dbCreated) {
            console.log('\n❌ Gagal membuat database dan tabel');
            return false;
        }

        // Step 4: Update configuration files
        const configUpdated = await this.updateDatabaseConfig(workingConfig);
        
        if (!configUpdated) {
            console.log('\n❌ Gagal memperbarui konfigurasi');
            return false;
        }

        console.log('\n🎉 Setup aaPanel berhasil!\n');
        console.log('📋 Ringkasan:');
        console.log(`   ✅ Database: Terhubung via ${workingConfig.name}`);
        console.log(`   ✅ Konfigurasi: Diperbarui otomatis`);
        console.log(`   ✅ Data: Siap digunakan`);
        
        console.log('\n🚀 Langkah selanjutnya:');
        console.log('1. Jalankan: node test-connection.js');
        console.log('2. Start bot: node telegram-bot.js');
        console.log('3. Test command: /siswa');
        
        return true;
    }
}

// Run if executed directly
if (require.main === module) {
    const setup = new AAPanelSetup();
    setup.run().catch(error => {
        console.error('Setup error:', error);
        process.exit(1);
    });
}

module.exports = AAPanelSetup;
