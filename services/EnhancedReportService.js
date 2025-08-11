const ExcelJS = require('exceljs');
const fs = require('fs').promises;
const path = require('path');
const Student = require('../models/Student');
const Transaction = require('../models/Transaction');
const { createCanvas, registerFont } = require('canvas');

class EnhancedReportService {
    constructor() {
        this.reportsDir = path.join(__dirname, '../reports');
        this.ensureReportsDir();

        // Emoji to canvas-compatible symbol mapping
        this.emojiMap = {
            '✅': '[V]',     // Checkmark
            '❌': '[X]',     // Cross mark
            '⚠️': '[!]',     // Warning
            '💰': 'Rp',      // Money bag
            '📊': 'DATA',    // Chart
            '👥': 'SISWA',   // People
            '🎯': 'TARGET',  // Target
            '📅': 'TGL',     // Calendar
            '📋': 'LIST',    // Clipboard
        };
    }

    // Convert emoji to canvas-compatible text
    convertEmojiForCanvas(text) {
        if (!text) return text;

        let result = text;
        for (const [emoji, replacement] of Object.entries(this.emojiMap)) {
            result = result.replace(new RegExp(emoji, 'g'), replacement);
        }
        return result;
    }

    async ensureReportsDir() {
        try {
            await fs.mkdir(this.reportsDir, { recursive: true });
        } catch (error) {
            console.error('Error creating reports directory:', error);
        }
    }

    // Generate report data for a given date range
    async generateReportData(startDate, endDate) {
        try {
            console.log(`Generating report for ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);

            // Get all active students
            const students = await Student.getAllActive();
            if (!students) {
                throw new Error("Failed to get active students.");
            }

            // Get all transactions for the date range
            const { executeQuery } = require('../config/database');
            const rangeTransactionsQuery = `
                SELECT t.*, s.name as student_name
                FROM transactions t
                LEFT JOIN students s ON t.student_id = s.id
                WHERE DATE(t.created_at) >= ? AND DATE(t.created_at) <= ?
                ORDER BY t.created_at DESC
            `;
            const transactionsResult = await executeQuery(rangeTransactionsQuery, [
                startDate.toISOString().split('T')[0],
                endDate.toISOString().split('T')[0]
            ]);
            const transactions = transactionsResult.success ? transactionsResult.data : [];

            // Calculate weeks in the date range
            const ConfigurableReportService = require('./ConfigurableReportService');
            // Calculate num of weeks, ensuring it's at least 1
            const numWeeks = Math.max(1, Math.ceil(moment(endDate).diff(moment(startDate), 'days') / 7));
            const weeksInRange = await ConfigurableReportService.getWeekRanges(endDate, numWeeks);

            // Process student payment data with weekly breakdown
            const studentsWithWeeklyData = await this.processStudentWeeklyPayments(students, transactions, weeksInRange);

            // Calculate summary statistics with weekly payment info
            const totalExpectedIuran = studentsWithWeeklyData.reduce((sum, s) => sum + s.totalExpected, 0);
            const totalActualIuran = studentsWithWeeklyData.reduce((sum, s) => sum + s.totalPaid, 0);
            const studentsFullyPaid = studentsWithWeeklyData.filter(s => s.status === 'LUNAS').length;
            const studentsPartiallyPaid = studentsWithWeeklyData.filter(s => s.status === 'SEBAGIAN').length;

            const summary = {
                totalStudents: students.length,
                totalTransactions: transactions.length,
                totalIncome: transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0),
                totalExpense: transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0),
                totalIuran: transactions.filter(t => t.type === 'iuran').reduce((sum, t) => sum + parseFloat(t.amount), 0),
                studentsWithPayments: studentsWithWeeklyData.filter(s => s.totalPaid > 0).length,
                period: `${startDate.toLocaleDateString('id-ID')} - ${endDate.toLocaleDateString('id-ID')}`,
                weeksInRange: weeksInRange.length,
                totalExpectedIuran,
                totalActualIuran,
                studentsFullyPaid,
                studentsPartiallyPaid,
                studentsNotPaid: students.length - studentsFullyPaid - studentsPartiallyPaid,
                paymentCompletionRate: students.length > 0 ? Math.round((studentsFullyPaid / students.length) * 100) : 0
            };

            summary.balance = summary.totalIncome + summary.totalIuran - summary.totalExpense;

            return {
                summary,
                students: studentsWithWeeklyData,
                transactions,
                weeksInRange,
                period: {
                    start: startDate,
                    end: endDate,
                }
            };
        } catch (error) {
            console.error('Error generating report data:', error);
            throw error;
        }
    }

    // Generate Excel report
    async generateExcelReport(startDate, endDate) {
        try {
            const data = await this.generateReportData(startDate, endDate);
            const workbook = new ExcelJS.Workbook();
            
            workbook.creator = 'Axioo Kas Bot';
            workbook.lastModifiedBy = 'Axioo Kas Bot';
            workbook.created = new Date();
            workbook.modified = new Date();

            const summarySheet = workbook.addWorksheet('Ringkasan');
            await this.createSummarySheet(summarySheet, data);

            const studentsSheet = workbook.addWorksheet('Data Siswa');
            await this.createStudentsSheet(studentsSheet, data);

            const transactionsSheet = workbook.addWorksheet('Transaksi');
            await this.createTransactionsSheet(transactionsSheet, data);

            const filename = `laporan-kas-${moment(startDate).format('YYYY-MM-DD')}-sd-${moment(endDate).format('YYYY-MM-DD')}.xlsx`;
            const filepath = path.join(this.reportsDir, filename);
            
            await workbook.xlsx.writeFile(filepath);
            console.log(`Excel report saved: ${filepath}`);
            
            return { success: true, filepath, filename, data };
        } catch (error) {
            console.error('Error generating Excel report:', error);
            return { success: false, error: error.message };
        }
    }

    // Create summary sheet
    async createSummarySheet(sheet, data) {
        // Title
        sheet.mergeCells('A1:D1');
        sheet.getCell('A1').value = 'LAPORAN KAS KELAS - RINGKASAN';
        sheet.getCell('A1').font = { bold: true, size: 16 };
        sheet.getCell('A1').alignment = { horizontal: 'center' };

        // Period
        sheet.mergeCells('A2:D2');
        sheet.getCell('A2').value = `Periode: ${data.summary.period}`;
        sheet.getCell('A2').font = { bold: true };
        sheet.getCell('A2').alignment = { horizontal: 'center' };

        // Summary data with weekly payment info
        const summaryData = [
            ['', '', '', ''],
            ['RINGKASAN KEUANGAN', '', '', ''],
            ['Total Pemasukan', `Rp ${data.summary.totalIncome.toLocaleString('id-ID')}`, '', ''],
            ['Total Iuran Siswa', `Rp ${data.summary.totalIuran.toLocaleString('id-ID')}`, '', ''],
            ['Total Pengeluaran', `Rp ${data.summary.totalExpense.toLocaleString('id-ID')}`, '', ''],
            ['Saldo Akhir', `Rp ${data.summary.balance.toLocaleString('id-ID')}`, '', ''],
            ['', '', '', ''],
            ['STATISTIK PEMBAYARAN MINGGUAN', '', '', ''],
            ['Total Minggu dalam Periode', data.summary.weeksInRange, '', ''],
            ['Iuran per Minggu', 'Rp 3.000', '', ''],
            ['Target Iuran Total', `Rp ${data.summary.totalExpectedIuran.toLocaleString('id-ID')}`, '', ''],
            ['Iuran Terkumpul', `Rp ${data.summary.totalActualIuran.toLocaleString('id-ID')}`, '', ''],
            ['', '', '', ''],
            ['STATISTIK SISWA', '', '', ''],
            ['Total Siswa', data.summary.totalStudents, '', ''],
            ['Siswa Lunas (100%)', data.summary.studentsFullyPaid, '', ''],
            ['Siswa Sebagian Bayar', data.summary.studentsPartiallyPaid, '', ''],
            ['Siswa Belum Bayar', data.summary.studentsNotPaid, '', ''],
            ['Tingkat Kelengkapan', `${data.summary.paymentCompletionRate}%`, '', ''],
            ['', '', '', ''],
            ['STATISTIK TRANSAKSI', '', '', ''],
            ['Total Transaksi', data.summary.totalTransactions, '', '']
        ];

        summaryData.forEach((row, index) => {
            const rowNum = index + 4;
            row.forEach((cell, colIndex) => {
                const cellRef = String.fromCharCode(65 + colIndex) + rowNum;
                sheet.getCell(cellRef).value = cell;
                
                // Style headers - check if cell is string before using includes
                if (typeof cell === 'string' && (cell.includes('RINGKASAN') || cell.includes('STATISTIK') || cell.includes('PEMBAYARAN MINGGUAN'))) {
                    sheet.getCell(cellRef).font = { bold: true };
                    sheet.getCell(cellRef).fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFE6E6FA' }
                    };
                }
            });
        });

        // Auto-fit columns
        sheet.columns.forEach(column => {
            column.width = 20;
        });
    }

    // Create students sheet with weekly payment tracking
    async createStudentsSheet(sheet, data) {
        const { students, weeksInRange, summary } = data;

        // Title
        sheet.getCell('A1').value = `LAPORAN PEMBAYARAN KAS MINGGUAN - ${summary.period}`;
        sheet.getCell('A1').font = { bold: true, size: 14 };
        sheet.mergeCells('A1', `${String.fromCharCode(65 + 4 + weeksInRange.length)}1`);

        // Info
        sheet.getCell('A2').value = `Iuran per minggu: Rp 3.000 | Total minggu: ${weeksInRange.length} | Target per siswa: Rp ${(weeksInRange.length * 3000).toLocaleString('id-ID')}`;
        sheet.getCell('A2').font = { italic: true };
        sheet.mergeCells('A2', `${String.fromCharCode(65 + 4 + weeksInRange.length)}2`);

        // Headers
        const headers = ['No', 'Nama Siswa', 'Kelas'];

        // Add week headers with date ranges
        weeksInRange.forEach(week => {
            const dayName = this.dayNames[week.endDate.getDay()].substring(0, 3);
            const dateStr = `${dayName} ${week.endDate.getDate()}/${week.endDate.getMonth() + 1}`;
            headers.push(dateStr);
        });

        headers.push('Total Bayar', 'Status', 'Persentase');

        // Set headers in row 4
        headers.forEach((header, index) => {
            const cell = sheet.getCell(4, index + 1);
            cell.value = header;
            cell.font = { bold: true };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4472C4' }
            };
            cell.font.color = { argb: 'FFFFFFFF' };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });

        // Data rows
        students.forEach((student, index) => {
            const row = sheet.getRow(index + 5);
            const rowData = [
                index + 1,
                student.name,
                student.class_name || 'X TKJ A'
            ];

            // Add weekly payment status
            student.weeklyPayments.forEach(weekPayment => {
                rowData.push(weekPayment.status);
            });

            // Add totals
            rowData.push(
                `Rp ${student.totalPaid.toLocaleString('id-ID')}`,
                student.status,
                `${student.paymentPercentage}%`
            );

            row.values = rowData;

            // Format weekly payment cells with multi-week support
            student.weeklyPayments.forEach((weekPayment, weekIndex) => {
                const weekCell = row.getCell(4 + weekIndex);
                weekCell.alignment = { horizontal: 'center', vertical: 'middle' };
                weekCell.font = { size: 12 };

                if (weekPayment.isPaid) {
                    weekCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF90EE90' } }; // Green
                } else if (weekPayment.isPartial) {
                    weekCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFA500' } }; // Orange for partial
                } else {
                    weekCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6B6B' } }; // Red
                }
            });

            // Format status cell
            const statusCell = row.getCell(headers.length - 1);
            if (student.status === 'LUNAS') {
                statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF90EE90' } };
            } else if (student.status === 'SEBAGIAN') {
                statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFA500' } };
            } else {
                statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC0CB' } };
            }
        });

        // Auto-fit columns
        sheet.columns.forEach((column, index) => {
            if (index === 1) { // Name column
                column.width = 25;
            } else if (index >= 3 && index < 3 + weeksInRange.length) { // Week columns
                column.width = 12;
            } else {
                column.width = 15;
            }
        });

        // Add summary at the bottom
        const summaryStartRow = students.length + 7;
        sheet.getCell(summaryStartRow, 1).value = 'RINGKASAN:';
        sheet.getCell(summaryStartRow, 1).font = { bold: true };

        sheet.getCell(summaryStartRow + 1, 1).value = `Siswa Lunas: ${summary.studentsFullyPaid}`;
        sheet.getCell(summaryStartRow + 2, 1).value = `Siswa Sebagian: ${summary.studentsPartiallyPaid}`;
        sheet.getCell(summaryStartRow + 3, 1).value = `Siswa Belum Bayar: ${summary.studentsNotPaid}`;
        sheet.getCell(summaryStartRow + 4, 1).value = `Tingkat Kelengkapan: ${summary.paymentCompletionRate}%`;
    }

    // Create transactions sheet
    async createTransactionsSheet(sheet, data) {
        // Headers
        const headers = ['No', 'Tanggal', 'Jenis', 'Jumlah', 'Deskripsi', 'Nama Siswa'];
        headers.forEach((header, index) => {
            const cell = sheet.getCell(1, index + 1);
            cell.value = header;
            cell.font = { bold: true };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF70AD47' }
            };
            cell.font.color = { argb: 'FFFFFFFF' };
        });

        // Data rows
        data.transactions.forEach((transaction, index) => {
            const row = sheet.getRow(index + 2);
            row.values = [
                index + 1,
                new Date(transaction.created_at).toLocaleDateString('id-ID'),
                transaction.type === 'income' ? 'Pemasukan' : 
                transaction.type === 'expense' ? 'Pengeluaran' : 'Iuran',
                `Rp ${parseFloat(transaction.amount).toLocaleString('id-ID')}`,
                transaction.description,
                transaction.student_name || '-'
            ];

            // Color coding by type
            const typeCell = row.getCell(3);
            if (transaction.type === 'income') {
                typeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF90EE90' } };
            } else if (transaction.type === 'expense') {
                typeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC0CB' } };
            } else {
                typeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFADD8E6' } };
            }
        });

        // Auto-fit columns
        sheet.columns.forEach(column => {
            column.width = 15;
        });
        sheet.getColumn(5).width = 30; // Description column wider
        sheet.getColumn(6).width = 20; // Student name column wider
    }

    // Generate CSV report
    async generateCSVReport(startDate, endDate) {
        try {
            const data = await this.generateReportData(startDate, endDate);

            // Generate CSV content for students with weekly breakdown
            const studentsCSV = this.generateStudentsCSV(data.students, data.weeksInRange);
            const transactionsCSV = this.generateTransactionsCSV(data.transactions);
            const summaryCSV = this.generateSummaryCSV(data.summary);

            // Save CSV files
            const baseFilename = `laporan-kas-${moment(startDate).format('YYYY-MM-DD')}-sd-${moment(endDate).format('YYYY-MM-DD')}`;
            
            const studentsFile = path.join(this.reportsDir, `${baseFilename}-siswa.csv`);
            const transactionsFile = path.join(this.reportsDir, `${baseFilename}-transaksi.csv`);
            const summaryFile = path.join(this.reportsDir, `${baseFilename}-ringkasan.csv`);

            await fs.writeFile(studentsFile, studentsCSV, 'utf8');
            await fs.writeFile(transactionsFile, transactionsCSV, 'utf8');
            await fs.writeFile(summaryFile, summaryCSV, 'utf8');

            console.log(`CSV reports saved: ${baseFilename}-*.csv`);

            return {
                success: true,
                files: [studentsFile, transactionsFile, summaryFile],
                data
            };
        } catch (error) {
            console.error('Error generating CSV report:', error);
            return { success: false, error: error.message };
        }
    }

    generateStudentsCSV(students, weeksInRange = []) {
        // Build headers with weekly breakdown
        let headers = ['No', 'Nama Siswa', 'Kelas'];

        // Add week headers with date ranges
        weeksInRange.forEach(week => {
            const dayName = this.dayNames[week.endDate.getDay()].substring(0, 3);
            const dateStr = `${dayName} ${week.endDate.getDate()}/${week.endDate.getMonth() + 1}`;
            headers.push(dateStr);
        });

        headers.push('Total Bayar', 'Status', 'Persentase');

        const headerRow = headers.map(h => `"${h}"`).join(',');

        const rows = students.map((student, index) => {
            const rowData = [
                index + 1,
                `"${student.name}"`,
                `"${student.class_name || 'X TKJ A'}"`
            ];

            // Add weekly payment status
            if (student.weeklyPayments && student.weeklyPayments.length > 0) {
                student.weeklyPayments.forEach(weekPayment => {
                    rowData.push(`"${weekPayment.status}"`);
                });
            } else {
                // Fallback for old format
                weeksInRange.forEach(() => {
                    rowData.push('"[X]"');
                });
            }

            // Add totals
            const status = student.status || (student.total_paid >= 3000 ? 'Lunas' :
                         student.total_paid > 0 ? 'Belum Lunas' : 'Belum Bayar');
            const percentage = student.paymentPercentage || 0;

            rowData.push(
                `"Rp ${(student.totalPaid || student.total_paid || 0).toLocaleString('id-ID')}"`,
                `"${status}"`,
                `"${percentage}%"`
            );

            return rowData.join(',');
        });

        return [headerRow, ...rows].join('\n');
    }

    generateTransactionsCSV(transactions) {
        const headers = ['No,Tanggal,Jenis,Jumlah,Deskripsi,Nama Siswa'];
        const rows = transactions.map((transaction, index) => {
            const type = transaction.type === 'income' ? 'Pemasukan' : 
                        transaction.type === 'expense' ? 'Pengeluaran' : 'Iuran';
            const date = new Date(transaction.created_at).toLocaleDateString('id-ID');
            return `${index + 1},"${date}","${type}",${transaction.amount},"${transaction.description}","${transaction.student_name || '-'}"`;
        });
        return [headers, ...rows].join('\n');
    }

    generateSummaryCSV(summary) {
        const data = [
            ['Keterangan,Nilai'],
            [`"Periode","${summary.period}"`],
            [`"Total Pemasukan",${summary.totalIncome}`],
            [`"Total Iuran",${summary.totalIuran}`],
            [`"Total Pengeluaran",${summary.totalExpense}`],
            [`"Saldo Akhir",${summary.balance}`],
            [`"Total Siswa",${summary.totalStudents}`],
            [`"Siswa yang Sudah Bayar",${summary.studentsWithPayments}`],
            [`"Total Transaksi",${summary.totalTransactions}`]
        ];
        return data.join('\n');
    }

    // Clean up old reports
    async cleanupOldReports(daysOld = 30) {
        try {
            const files = await fs.readdir(this.reportsDir);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);

            for (const file of files) {
                const filepath = path.join(this.reportsDir, file);
                const stats = await fs.stat(filepath);
                
                if (stats.mtime < cutoffDate) {
                    await fs.unlink(filepath);
                    console.log(`Deleted old report: ${file}`);
                }
            }
        } catch (error) {
            console.error('Error cleaning up old reports:', error);
        }
    }

    // Get weeks in a month for weekly payment tracking
    getWeeksInMonth(year, month) {
        const weeks = [];
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);

        // Find the first Monday of the month (or the first day if it's not Monday)
        let currentWeekStart = new Date(firstDay);
        const dayOfWeek = firstDay.getDay();
        const daysToMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7;

        if (daysToMonday > 0 && daysToMonday < 7) {
            currentWeekStart.setDate(firstDay.getDate() + daysToMonday);
        }

        let weekNumber = 1;
        while (currentWeekStart <= lastDay) {
            const weekEnd = new Date(currentWeekStart);
            weekEnd.setDate(currentWeekStart.getDate() + 6);

            // Don't go beyond the month
            if (weekEnd > lastDay) {
                weekEnd.setTime(lastDay.getTime());
            }

            // Format tanggal untuk label yang lebih informatif
            const startDate = currentWeekStart.getDate();
            const endDate = weekEnd.getDate();
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
                              'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
            const monthName = monthNames[month - 1];

            // Create labels with date ranges
            const dateRange = startDate === endDate ?
                `${startDate} ${monthName}` :
                `${startDate}-${endDate} ${monthName}`;

            weeks.push({
                number: weekNumber,
                start: new Date(currentWeekStart),
                end: new Date(weekEnd),
                label: `Minggu ${weekNumber}`,
                labelWithDate: `Minggu ${weekNumber} (${dateRange})`,
                shortLabel: `M${weekNumber}`,
                dateRange: dateRange,
                startDate: startDate,
                endDate: endDate,
                monthName: monthName
            });

            // Move to next week
            currentWeekStart.setDate(currentWeekStart.getDate() + 7);
            weekNumber++;
        }

        return weeks;
    }

    // Process student weekly payment data with Multi-Week Payment support (FIXED)
    async processStudentWeeklyPayments(students, transactions, weeksInMonth, year, month) {
        const weeklyPaymentAmount = 3000; // Rp 3.000 per minggu

        return students.map(student => {
            // Get student's iuran transactions for this month
            const studentTransactions = transactions.filter(t =>
                t.student_id === student.id && t.type === 'iuran'
            );

            // Calculate total amount paid by student
            const totalStudentPaid = studentTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);

            // Calculate how many weeks this payment covers
            const fullWeeksPaid = Math.floor(totalStudentPaid / weeklyPaymentAmount);
            const remainder = totalStudentPaid % weeklyPaymentAmount;

            // Process each week with corrected logic
            const weeklyPayments = weeksInMonth.map(week => {
                let status = '[X]'; // Default: not paid
                let paid = 0;
                let isPaid = false;
                let isPartial = false;

                // Simple cumulative logic: if student has paid enough for this week number
                if (week.number <= fullWeeksPaid) {
                    status = '[V]'; // Fully paid
                    paid = weeklyPaymentAmount;
                    isPaid = true;
                } else if (week.number === fullWeeksPaid + 1 && remainder > 0) {
                    status = '[!]'; // Partially paid
                    paid = remainder;
                    isPartial = true;
                }

                return {
                    week: week.number,
                    label: week.label,
                    expected: weeklyPaymentAmount,
                    paid: paid,
                    isPaid: isPaid,
                    isPartial: isPartial,
                    status: status,
                    transactions: studentTransactions // Include all transactions for reference
                };
            });

            // Calculate totals
            const totalExpected = weeksInMonth.length * weeklyPaymentAmount;
            const paidWeeks = weeklyPayments.filter(w => w.isPaid).length;
            const partialWeeks = weeklyPayments.filter(w => w.isPartial).length;
            const paymentPercentage = Math.round((paidWeeks / weeksInMonth.length) * 100);

            // Enhanced status calculation
            let status;
            if (paymentPercentage === 100) {
                status = 'LUNAS';
            } else if (paidWeeks > 0 || partialWeeks > 0) {
                status = 'SEBAGIAN';
            } else {
                status = 'BELUM BAYAR';
            }

            return {
                ...student,
                weeklyPayments,
                totalExpected,
                totalPaid: totalStudentPaid,
                paidWeeks,
                partialWeeks,
                totalWeeks: weeksInMonth.length,
                paymentPercentage,
                status,
                fullWeeksPaid,
                remainder
            };
        });
    }

    // Generate image report of weekly payment table
    async generateImageReport(startDate, endDate) {
        try {
            console.log(`Generating image report for ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);

            // Get data
            const data = await this.generateReportData(startDate, endDate);

            // Create canvas
            const canvas = this.createPaymentTableCanvas(data);

            // Save image
            const filename = `laporan-kas-${moment(startDate).format('YYYY-MM-DD')}-sd-${moment(endDate).format('YYYY-MM-DD')}.png`;
            const filepath = path.join(this.reportsDir, filename);

            const buffer = canvas.toBuffer('image/png');
            await fs.writeFile(filepath, buffer);

            console.log(`Image report saved: ${filepath}`);

            return {
                success: true,
                filename,
                filepath,
                buffer
            };
        } catch (error) {
            console.error('Error generating image report:', error);
            return { success: false, error: error.message };
        }
    }

    // Create canvas with payment table - Optimized for readability with emoji support
    createPaymentTableCanvas(data) {
        const { students, weeksInRange, summary } = data;

        // Optimized canvas dimensions for ALL students display
        const cellWidth = 90; // Slightly reduced for more compact layout
        const cellHeight = 30; // Reduced for compactness when showing all students
        const nameColumnWidth = 160; // Reduced for space efficiency
        const headerHeight = 80; // Increased for multi-line headers
        const titleHeight = 100; // Increased for better spacing
        const weekColumnWidth = 110; // Slightly reduced for space efficiency

        // Calculate total width more precisely
        const baseColumns = 3; // No, Name, Class
        const summaryColumns = 3; // Total, Status, %
        const totalColumns = baseColumns + weeksInRange.length + summaryColumns;

        const canvasWidth = nameColumnWidth + cellWidth + // No + Name columns
                           (weeksInRange.length * weekColumnWidth) + // Week columns
                           (summaryColumns * cellWidth); // Summary columns

        // Calculate height for ALL students + minimal space for summary
        const canvasHeight = titleHeight + headerHeight + (students.length * cellHeight) + 120; // All students + minimal padding

        const canvas = createCanvas(canvasWidth, canvasHeight);
        const ctx = canvas.getContext('2d');

        // Background with subtle gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
        gradient.addColorStop(0, '#f8f9fa');
        gradient.addColorStop(1, '#ffffff');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Title section with better styling
        ctx.fillStyle = '#2c3e50';
        ctx.font = 'bold 22px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`LAPORAN PEMBAYARAN KAS MINGGUAN`, canvasWidth / 2, 35);

        ctx.font = '14px Arial';
        ctx.fillStyle = '#7f8c8d';
        ctx.fillText(`${summary.period} | Iuran: Rp 3.000/minggu`, canvasWidth / 2, 60);

        // Add summary info
        ctx.font = '12px Arial';
        ctx.fillText(`Total Siswa: ${students.length} | Target: Rp ${(weeksInRange.length * 3000 * students.length).toLocaleString('id-ID')}`, canvasWidth / 2, 80);

        // Headers with improved layout
        const headers = ['No', 'Nama Siswa', 'Kelas'];
        weeksInRange.forEach(week => {
            const dayName = this.dayNames[week.endDate.getDay()].substring(0, 3);
            const dateStr = `${dayName} ${week.endDate.getDate()}/${week.endDate.getMonth() + 1}`;
            headers.push(dateStr);
        });
        headers.push('Total', 'Status', '%');

        let currentX = 0;
        const headerY = titleHeight;

        // Draw header background with gradient
        const headerGradient = ctx.createLinearGradient(0, headerY, 0, headerY + headerHeight);
        headerGradient.addColorStop(0, '#3498db');
        headerGradient.addColorStop(1, '#2980b9');
        ctx.fillStyle = headerGradient;
        ctx.fillRect(0, headerY, canvasWidth, headerHeight);

        // Draw header borders
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, headerY, canvasWidth, headerHeight);

        // Draw header text with better formatting
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';

        headers.forEach((header, index) => {
            let colWidth;
            if (index === 0) colWidth = cellWidth; // No
            else if (index === 1) colWidth = nameColumnWidth; // Name
            else if (index === 2) colWidth = cellWidth; // Class
            else if (index >= 3 && index < 3 + weeksInMonth.length) colWidth = weekColumnWidth; // Weeks
            else colWidth = cellWidth; // Summary columns

            // Draw column separators
            if (index > 0) {
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(currentX, headerY);
                ctx.lineTo(currentX, headerY + headerHeight);
                ctx.stroke();
            }

            // Header text with date info for week columns
            if (index >= 3 && index < 3 + weeksInRange.length) {
                const weekIndex = index - 3;
                const week = weeksInRange[weekIndex];

                ctx.font = 'bold 11px Arial';
                ctx.fillText(headers[index], currentX + colWidth / 2, headerY + 20);

                ctx.font = '9px Arial';
                ctx.fillText(`(Minggu ${week.weekNumber})`, currentX + colWidth / 2, headerY + 35);

                ctx.font = '9px Arial';
                ctx.fillText('Rp 3.000', currentX + colWidth / 2, headerY + 50);
            } else {
                ctx.font = 'bold 12px Arial';
                if (header.length > 8) {
                    // Split long headers
                    const words = header.split(' ');
                    if (words.length > 1) {
                        ctx.fillText(words[0], currentX + colWidth / 2, headerY + 25);
                        ctx.fillText(words.slice(1).join(' '), currentX + colWidth / 2, headerY + 45);
                    } else {
                        ctx.fillText(header, currentX + colWidth / 2, headerY + 35);
                    }
                } else {
                    ctx.fillText(header, currentX + colWidth / 2, headerY + 35);
                }
            }

            currentX += colWidth;
        });

        // Draw students data (ALL students as requested)
        students.forEach((student, rowIndex) => {
            const rowY = titleHeight + headerHeight + (rowIndex * cellHeight);
            currentX = 0;

            // Alternate row colors with better contrast
            ctx.fillStyle = rowIndex % 2 === 0 ? '#f8f9fa' : '#ffffff';
            ctx.fillRect(0, rowY, canvasWidth, cellHeight);

            // Row data
            const rowData = [
                (rowIndex + 1).toString(),
                student.name.length > 20 ? student.name.substring(0, 17) + '...' : student.name, // Truncate long names
                student.class_name || 'X TKJ A'
            ];

            // Add weekly status
            student.weeklyPayments.forEach(weekPayment => {
                rowData.push(weekPayment.status);
            });

            rowData.push(
                `Rp ${Math.round((student.totalPaid || 0) / 1000)}k`,
                student.status,
                `${student.paymentPercentage || 0}%`
            );

            // Draw cells with improved layout
            rowData.forEach((cellData, colIndex) => {
                let colWidth;
                if (colIndex === 0) colWidth = cellWidth; // No
                else if (colIndex === 1) colWidth = nameColumnWidth; // Name
                else if (colIndex === 2) colWidth = cellWidth; // Class
                else if (colIndex >= 3 && colIndex < 3 + weeksInRange.length) colWidth = weekColumnWidth; // Weeks
                else colWidth = cellWidth; // Summary columns

                // Cell border
                ctx.strokeStyle = '#dee2e6';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(currentX, rowY, colWidth, cellHeight);

                // Cell text with compact formatting for all students
                ctx.fillStyle = '#2c3e50';
                ctx.font = colIndex === 1 ? '9px Arial' : '10px Arial'; // Smaller font for compactness
                ctx.textAlign = colIndex === 1 ? 'left' : 'center';

                // Special styling for status cells with multi-week support
                if (colIndex >= 3 && colIndex < 3 + weeksInRange.length) {
                    // Weekly payment status with background color
                    const weekIndex = colIndex - 3;
                    const weekPayment = student.weeklyPayments[weekIndex];
                    const isPaid = weekPayment.isPaid;
                    const isPartial = weekPayment.isPartial;

                    // Background color for status with better contrast
                    if (isPaid) {
                        ctx.fillStyle = '#d4edda'; // Green for paid
                    } else if (isPartial) {
                        ctx.fillStyle = '#fff3cd'; // Orange for partial
                    } else {
                        ctx.fillStyle = '#f8d7da'; // Red for unpaid
                    }
                    ctx.fillRect(currentX + 2, rowY + 2, colWidth - 4, cellHeight - 4);

                    // Text color and size (compact for all students)
                    if (isPaid) {
                        ctx.fillStyle = '#155724'; // Dark green
                    } else if (isPartial) {
                        ctx.fillStyle = '#856404'; // Dark orange
                    } else {
                        ctx.fillStyle = '#721c24'; // Dark red
                    }
                    ctx.font = 'bold 12px Arial';
                } else if (colIndex === rowData.length - 2) {
                    // Status column with improved styling
                    const status = student.status;
                    if (status === 'LUNAS') {
                        ctx.fillStyle = '#d4edda';
                        ctx.fillRect(currentX + 2, rowY + 2, colWidth - 4, cellHeight - 4);
                        ctx.fillStyle = '#155724';
                    } else if (status === 'SEBAGIAN') {
                        ctx.fillStyle = '#fff3cd';
                        ctx.fillRect(currentX + 2, rowY + 2, colWidth - 4, cellHeight - 4);
                        ctx.fillStyle = '#856404';
                    } else {
                        ctx.fillStyle = '#f8d7da';
                        ctx.fillRect(currentX + 2, rowY + 2, colWidth - 4, cellHeight - 4);
                        ctx.fillStyle = '#721c24';
                    }
                    ctx.font = 'bold 9px Arial';
                }

                // Draw text with better positioning
                const textX = colIndex === 1 ? currentX + 8 : currentX + colWidth / 2;
                const textY = rowY + cellHeight / 2 + 4;

                ctx.fillText(cellData, textX, textY);

                currentX += colWidth;
            });
        });

        // Footer removed as requested - no text about student count

        // Enhanced summary box with reduced spacing
        const summaryY = titleHeight + headerHeight + (students.length * cellHeight) + 10;
        const summaryHeight = 90;
        const summaryWidth = 400;

        if (summaryY + summaryHeight < canvasHeight - 10) {
            // Summary background with border
            ctx.fillStyle = '#f8f9fa';
            ctx.fillRect(20, summaryY, summaryWidth, summaryHeight);
            ctx.strokeStyle = '#dee2e6';
            ctx.lineWidth = 2;
            ctx.strokeRect(20, summaryY, summaryWidth, summaryHeight);

            ctx.fillStyle = '#2c3e50';
            ctx.font = 'bold 13px Arial';
            ctx.textAlign = 'left';
            ctx.fillText('DATA RINGKASAN PEMBAYARAN:', 30, summaryY + 20);

            ctx.font = '11px Arial';
            const lunasCount = summary.studentsFullyPaid || 0;
            const sebagianCount = summary.studentsPartiallyPaid || 0;
            const belumCount = summary.studentsNotPaid || 0;
            const totalExpected = summary.totalExpectedIuran || 0;
            const totalCollected = summary.totalActualIuran || 0;

            ctx.fillText(`[V] Siswa Lunas: ${lunasCount} siswa`, 30, summaryY + 38);
            ctx.fillText(`[!] Siswa Sebagian: ${sebagianCount} siswa`, 30, summaryY + 52);
            ctx.fillText(`[X] Belum Bayar: ${belumCount} siswa`, 30, summaryY + 66);

            ctx.fillText(`Rp Terkumpul: Rp ${totalCollected.toLocaleString('id-ID')}`, 220, summaryY + 38);
            ctx.fillText(`TARGET: Rp ${totalExpected.toLocaleString('id-ID')}`, 220, summaryY + 52);

            const percentage = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
            ctx.fillText(`PROGRESS: ${percentage}%`, 220, summaryY + 66);
        }

        return canvas;
    }
}

module.exports = EnhancedReportService;
