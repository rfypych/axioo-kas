const ExcelJS = require('exceljs');
const fs = require('fs').promises;
const path = require('path');
const Student = require('../models/Student');
const Transaction = require('../models/Transaction');
const { createCanvas, registerFont } = require('canvas');
const DateHelperService = require('./DateHelperService');
const appSettings = require('../config/app-settings.json');

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

    // Generate routine report data based on the configured start date
    async generateRoutineReportData() {
        try {
            const routineStartDate = appSettings.routineStartDate;
            const today = new Date();

            const periods = DateHelperService.getRoutinePeriods(routineStartDate, today);
            if (periods.length === 0) {
                // Return a default structure if no periods are found, to avoid crashes
                console.warn("No routine periods found. Check the routineStartDate in config.");
                return {
                    summary: { period: 'No data' },
                    students: [],
                    transactions: [],
                    routinePeriods: []
                };
            }

            const reportStartDate = periods[0].startDate;
            const reportEndDate = today;

            console.log(`Generating routine report from ${reportStartDate.toLocaleDateString()} to ${reportEndDate.toLocaleDateString()}`);

            const students = await Student.getAll();
            // This method doesn't exist yet, I will add it in step 6
            const allTransactions = await Transaction.getTransactionsBetween(reportStartDate, reportEndDate);

            const studentsWithRoutineData = await this.processStudentRoutinePayments(students, allTransactions, periods);

            // Calculate summary statistics
            const totalExpectedIuran = studentsWithRoutineData.reduce((sum, s) => sum + s.totalExpected, 0);
            const totalActualIuran = studentsWithRoutineData.reduce((sum, s) => sum + s.totalPaid, 0);
            const studentsFullyPaid = studentsWithRoutineData.filter(s => s.status === 'LUNAS').length;
            const studentsPartiallyPaid = studentsWithRoutineData.filter(s => s.status === 'SEBAGIAN').length;

            const summary = {
                totalStudents: students.length,
                totalTransactions: allTransactions.length,
                totalIncome: allTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0),
                totalExpense: allTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0),
                totalIuran: allTransactions.filter(t => t.type === 'iuran').reduce((sum, t) => sum + parseFloat(t.amount), 0),
                studentsWithPayments: studentsWithRoutineData.filter(s => s.totalPaid > 0).length,
                period: `${reportStartDate.toLocaleDateString('id-ID')} - ${reportEndDate.toLocaleDateString('id-ID')}`,

                // Routine payment statistics
                routinePeriodsCount: periods.length,
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
                students: studentsWithRoutineData,
                transactions: allTransactions,
                routinePeriods: periods,
                period: {
                    start: reportStartDate,
                    end: reportEndDate,
                }
            };

        } catch (error) {
            console.error('Error generating routine report data:', error);
            throw error;
        }
    }

    // Generate Excel report
    async generateExcelReport() {
        try {
            const data = await this.generateRoutineReportData();
            if (!data.routinePeriods || data.routinePeriods.length === 0) {
                return { success: false, error: 'No routine periods to generate report for.' };
            }
            const workbook = new ExcelJS.Workbook();
            
            // Set workbook properties
            workbook.creator = 'Axioo Kas Bot';
            workbook.lastModifiedBy = 'Axioo Kas Bot';
            workbook.created = new Date();
            workbook.modified = new Date();

            // 1. Summary Sheet
            const summarySheet = workbook.addWorksheet('Ringkasan');
            await this.createSummarySheet(summarySheet, data);

            // 2. Students Sheet
            const studentsSheet = workbook.addWorksheet('Data Siswa');
            await this.createStudentsSheet(studentsSheet, data);

            // 3. Transactions Sheet
            const transactionsSheet = workbook.addWorksheet('Transaksi');
            await this.createTransactionsSheet(transactionsSheet, data);

            // Save file
            const today = new Date();
            const filename = `laporan-kas-${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}.xlsx`;
            const filepath = path.join(this.reportsDir, filename);
            
            await workbook.xlsx.writeFile(filepath);
            console.log(`Excel report saved: ${filepath}`);
            
            return {
                success: true,
                filepath,
                filename,
                data
            };
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

        // Summary data with routine payment info
        const summaryData = [
            ['', '', '', ''],
            ['RINGKASAN KEUANGAN', '', '', ''],
            ['Total Pemasukan', `Rp ${data.summary.totalIncome.toLocaleString('id-ID')}`, '', ''],
            ['Total Iuran Siswa', `Rp ${data.summary.totalIuran.toLocaleString('id-ID')}`, '', ''],
            ['Total Pengeluaran', `Rp ${data.summary.totalExpense.toLocaleString('id-ID')}`, '', ''],
            ['Saldo Akhir', `Rp ${data.summary.balance.toLocaleString('id-ID')}`, '', ''],
            ['', '', '', ''],
            ['STATISTIK PEMBAYARAN RUTIN', '', '', ''],
            ['Total Periode', data.summary.routinePeriodsCount, '', ''],
            ['Iuran per Periode', 'Rp 3.000', '', ''],
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

    // Create students sheet with routine payment tracking
    async createStudentsSheet(sheet, data) {
        const { students, routinePeriods, summary } = data;

        // Title
        sheet.getCell('A1').value = `LAPORAN PEMBAYARAN KAS RUTIN - ${summary.period}`;
        sheet.getCell('A1').font = { bold: true, size: 14 };
        sheet.mergeCells('A1', `${String.fromCharCode(65 + 4 + routinePeriods.length)}1`);

        // Info
        sheet.getCell('A2').value = `Iuran per periode: Rp 3.000 | Total periode: ${routinePeriods.length} | Target per siswa: Rp ${(routinePeriods.length * 3000).toLocaleString('id-ID')}`;
        sheet.getCell('A2').font = { italic: true };
        sheet.mergeCells('A2', `${String.fromCharCode(65 + 4 + routinePeriods.length)}2`);

        // Headers
        const headers = ['No', 'Nama Siswa', 'Kelas'];

        // Add period headers with date ranges
        routinePeriods.forEach(period => {
            const startDate = period.startDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
            const endDate = period.endDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
            headers.push(`${period.periodLabel} (${startDate} - ${endDate})`);
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
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        });

        // Data rows
        students.forEach((student, index) => {
            const row = sheet.getRow(index + 5);
            const rowData = [
                index + 1,
                student.name,
                student.class_name || 'X TKJ A'
            ];

            // Add routine payment status
            student.routinePayments.forEach(payment => {
                rowData.push(payment.status);
            });

            // Add totals
            rowData.push(
                `Rp ${student.totalPaid.toLocaleString('id-ID')}`,
                student.status,
                `${student.paymentPercentage}%`
            );

            row.values = rowData;

            // Format routine payment cells
            student.routinePayments.forEach((payment, periodIndex) => {
                const periodCell = row.getCell(4 + periodIndex);
                periodCell.alignment = { horizontal: 'center', vertical: 'middle' };
                periodCell.font = { size: 12 };

                if (payment.isPaid) {
                    periodCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF90EE90' } }; // Green
                } else if (payment.isPartial) {
                    periodCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFA500' } }; // Orange for partial
                } else {
                    periodCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6B6B' } }; // Red
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
            } else if (index >= 3 && index < 3 + routinePeriods.length) { // Period columns
                column.width = 18;
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
    async generateCSVReport() {
        try {
            const data = await this.generateRoutineReportData();
            if (!data.routinePeriods || data.routinePeriods.length === 0) {
                return { success: false, error: 'No routine periods to generate report for.' };
            }

            // Generate CSV content for students with weekly breakdown
            const studentsCSV = this.generateStudentsCSV(data.students, data.routinePeriods);
            const transactionsCSV = this.generateTransactionsCSV(data.transactions);
            const summaryCSV = this.generateSummaryCSV(data.summary);

            // Save CSV files
            const today = new Date();
            const baseFilename = `laporan-kas-${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
            
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

    generateStudentsCSV(students, routinePeriods = []) {
        // Build headers with routine period breakdown
        let headers = ['No', 'Nama Siswa', 'Kelas'];

        // Add period headers with date ranges
        routinePeriods.forEach(period => {
            const startDate = period.startDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
            const endDate = period.endDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
            headers.push(`${period.periodLabel} (${startDate} - ${endDate})`);
        });

        headers.push('Total Bayar', 'Status', 'Persentase');

        const headerRow = headers.map(h => `"${h}"`).join(',');

        const rows = students.map((student, index) => {
            const rowData = [
                index + 1,
                `"${student.name}"`,
                `"${student.class_name || 'X TKJ A'}"`
            ];

            // Add routine payment status
            if (student.routinePayments && student.routinePayments.length > 0) {
                student.routinePayments.forEach(payment => {
                    rowData.push(`"${payment.status}"`);
                });
            } else {
                // Fallback if no payment data
                routinePeriods.forEach(() => {
                    rowData.push('"[X]"');
                });
            }

            // Add totals
            const status = student.status || 'BELUM BAYAR';
            const percentage = student.paymentPercentage || 0;

            rowData.push(
                `"Rp ${(student.totalPaid || 0).toLocaleString('id-ID')}"`,
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

    // Process student payments against the dynamic routine periods
    async processStudentRoutinePayments(students, allTransactions, periods) {
        const weeklyPaymentAmount = 3000; // Rp 3.000 per period

        return students.map(student => {
            const studentTransactions = allTransactions.filter(t =>
                t.student_id === student.id && t.type === 'iuran'
            );

            const totalStudentPaid = studentTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);

            const routinePayments = periods.map(period => {
                const transactionsInPeriod = studentTransactions.filter(t => {
                    const txDate = new Date(t.created_at);
                    return txDate >= period.startDate && txDate <= period.endDate;
                });

                const paidInPeriod = transactionsInPeriod.reduce((sum, t) => sum + parseFloat(t.amount), 0);

                let status = '[X]';
                let isPaid = false;
                let isPartial = false;

                if (paidInPeriod >= weeklyPaymentAmount) {
                    status = '[V]';
                    isPaid = true;
                } else if (paidInPeriod > 0) {
                    status = '[!]';
                    isPartial = true;
                }

                return {
                    periodLabel: period.periodLabel,
                    expected: weeklyPaymentAmount,
                    paid: paidInPeriod,
                    isPaid,
                    isPartial,
                    status,
                    transactions: transactionsInPeriod
                };
            });

            const totalExpected = periods.length * weeklyPaymentAmount;
            const paidPeriods = routinePayments.filter(p => p.isPaid).length;
            const partialPeriods = routinePayments.filter(p => p.isPartial).length;
            const paymentPercentage = periods.length > 0 ? Math.round((paidPeriods / periods.length) * 100) : 0;

            let status;
            if (paymentPercentage === 100) {
                status = 'LUNAS';
            } else if (paidPeriods > 0 || partialPeriods > 0) {
                status = 'SEBAGIAN';
            } else {
                status = 'BELUM BAYAR';
            }

            return {
                ...student,
                routinePayments,
                totalExpected,
                totalPaid: totalStudentPaid,
                paidPeriods,
                partialPeriods,
                totalPeriods: periods.length,
                paymentPercentage,
                status,
            };
        });
    }

    // Generate image report of weekly payment table
    async generateImageReport() {
        try {
            console.log(`Generating image report...`);

            // Get data
            const data = await this.generateRoutineReportData();
            if (!data.routinePeriods || data.routinePeriods.length === 0) {
                return { success: false, error: 'No routine periods to generate report for.' };
            }

            // Create canvas
            const canvas = this.createPaymentTableCanvas(data);

            // Save image
            const today = new Date();
            const filename = `laporan-kas-${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}.png`;
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
        const { students, routinePeriods, summary } = data;

        // Optimized canvas dimensions for ALL students display
        const cellWidth = 90; // Slightly reduced for more compact layout
        const cellHeight = 30; // Reduced for compactness when showing all students
        const nameColumnWidth = 160; // Reduced for space efficiency
        const headerHeight = 80; // Increased for multi-line headers
        const titleHeight = 100; // Increased for better spacing
        const periodColumnWidth = 110; // Slightly reduced for space efficiency

        // Calculate total width more precisely
        const baseColumns = 3; // No, Name, Class
        const summaryColumns = 3; // Total, Status, %
        const totalColumns = baseColumns + routinePeriods.length + summaryColumns;

        const canvasWidth = nameColumnWidth + cellWidth + // No + Name columns
                           (routinePeriods.length * periodColumnWidth) + // Period columns
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
        ctx.fillText(`LAPORAN PEMBAYARAN KAS RUTIN`, canvasWidth / 2, 35);

        ctx.font = '14px Arial';
        ctx.fillStyle = '#7f8c8d';
        ctx.fillText(`${summary.period} | Iuran: Rp 3.000/periode`, canvasWidth / 2, 60);

        // Add summary info
        ctx.font = '12px Arial';
        ctx.fillText(`Total Siswa: ${students.length} | Target: Rp ${(routinePeriods.length * 3000 * students.length).toLocaleString('id-ID')}`, canvasWidth / 2, 80);

        // Headers with improved layout
        const headers = ['No', 'Nama Siswa', 'Kelas'];
        routinePeriods.forEach(period => headers.push(period.periodLabel)); // Use short labels for headers
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
            else if (index >= 3 && index < 3 + routinePeriods.length) colWidth = periodColumnWidth; // Periods
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

            // Header text with date info for period columns
            if (index >= 3 && index < 3 + routinePeriods.length) {
                const periodIndex = index - 3;
                const period = routinePeriods[periodIndex];
                const startDate = period.startDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
                const endDate = period.endDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });

                ctx.font = 'bold 11px Arial';
                ctx.fillText(period.periodLabel, currentX + colWidth / 2, headerY + 20);

                ctx.font = '10px Arial';
                ctx.fillText(`(${startDate} - ${endDate})`, currentX + colWidth / 2, headerY + 35);

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

            // Add routine payment status
            student.routinePayments.forEach(payment => {
                rowData.push(payment.status);
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
                else if (colIndex >= 3 && colIndex < 3 + routinePeriods.length) colWidth = periodColumnWidth; // Periods
                else colWidth = cellWidth; // Summary columns

                // Cell border
                ctx.strokeStyle = '#dee2e6';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(currentX, rowY, colWidth, cellHeight);

                // Cell text with compact formatting for all students
                ctx.fillStyle = '#2c3e50';
                ctx.font = colIndex === 1 ? '9px Arial' : '10px Arial'; // Smaller font for compactness
                ctx.textAlign = colIndex === 1 ? 'left' : 'center';

                // Special styling for status cells
                if (colIndex >= 3 && colIndex < 3 + routinePeriods.length) {
                    // routine payment status with background color
                    const periodIndex = colIndex - 3;
                    const payment = student.routinePayments[periodIndex];
                    const isPaid = payment.isPaid;
                    const isPartial = payment.isPartial;

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
