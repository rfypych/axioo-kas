const AAPanelDiagnostic = require('./diagnose-aapanel');
const StudentTestAAPanel = require('./test-siswa-aapanel');
const AAPanelSetup = require('./aapanel-setup');
require('dotenv').config();

class AAPanelTestRunner {
    constructor() {
        this.results = {
            diagnostic: null,
            studentTest: null,
            setupRan: false
        };
    }

    async runFullTest() {
        console.log('🚀 Axioo Kas - aaPanel Full Test Suite\n');
        console.log('=====================================\n');

        // Step 1: Run diagnostic
        await this.runDiagnostic();
        
        // Step 2: Run student-specific tests
        await this.runStudentTests();
        
        // Step 3: Show recommendations
        this.showRecommendations();
    }

    async runDiagnostic() {
        console.log('🔍 PHASE 1: Running Diagnostic...\n');
        
        try {
            const diagnostic = new AAPanelDiagnostic();
            await diagnostic.runDiagnostic();
            
            this.results.diagnostic = {
                issues: diagnostic.issues,
                solutions: diagnostic.solutions,
                hasIssues: diagnostic.issues.length > 0
            };
            
        } catch (error) {
            console.error('❌ Diagnostic failed:', error.message);
            this.results.diagnostic = {
                error: error.message,
                hasIssues: true
            };
        }
        
        console.log('\n' + '='.repeat(50) + '\n');
    }

    async runStudentTests() {
        console.log('👥 PHASE 2: Running Student Tests...\n');
        
        try {
            const studentTest = new StudentTestAAPanel();
            await studentTest.runAllTests();
            
            this.results.studentTest = {
                testResults: studentTest.testResults,
                passed: studentTest.testResults.filter(r => r.status === 'PASS').length,
                failed: studentTest.testResults.filter(r => r.status === 'FAIL').length,
                errors: studentTest.testResults.filter(r => r.status === 'ERROR').length,
                warnings: studentTest.testResults.filter(r => r.status === 'WARN').length
            };
            
        } catch (error) {
            console.error('❌ Student tests failed:', error.message);
            this.results.studentTest = {
                error: error.message,
                failed: 1
            };
        }
        
        console.log('\n' + '='.repeat(50) + '\n');
    }

    showRecommendations() {
        console.log('💡 RECOMMENDATIONS & NEXT STEPS\n');
        console.log('===============================\n');

        const hasIssues = this.results.diagnostic?.hasIssues || 
                         this.results.studentTest?.failed > 0 || 
                         this.results.studentTest?.errors > 0;

        if (!hasIssues) {
            console.log('🎉 EXCELLENT! No issues found.\n');
            console.log('✅ Your aaPanel setup is working correctly');
            console.log('✅ Database connection is stable');
            console.log('✅ Student data is accessible');
            console.log('✅ Bot should work properly\n');
            
            console.log('🚀 Ready to use:');
            console.log('   node telegram-bot.js');
            console.log('   Then test: /siswa\n');
            return;
        }

        console.log('🔧 ISSUES DETECTED - Auto-fix available!\n');

        // Categorize issues
        const criticalIssues = [];
        const warnings = [];
        const suggestions = [];

        if (this.results.diagnostic?.issues) {
            this.results.diagnostic.issues.forEach(issue => {
                if (issue.includes('connection') || issue.includes('table') || issue.includes('database')) {
                    criticalIssues.push(issue);
                } else {
                    warnings.push(issue);
                }
            });
        }

        if (this.results.studentTest?.testResults) {
            this.results.studentTest.testResults.forEach(result => {
                if (result.status === 'FAIL' || result.status === 'ERROR') {
                    criticalIssues.push(`${result.test}: ${result.error || 'Failed'}`);
                } else if (result.status === 'WARN') {
                    warnings.push(`${result.test}: ${result.message || 'Warning'}`);
                }
            });
        }

        // Show critical issues
        if (criticalIssues.length > 0) {
            console.log('🚨 CRITICAL ISSUES:');
            criticalIssues.forEach((issue, index) => {
                console.log(`   ${index + 1}. ${issue}`);
            });
            console.log('');
        }

        // Show warnings
        if (warnings.length > 0) {
            console.log('⚠️ WARNINGS:');
            warnings.forEach((warning, index) => {
                console.log(`   ${index + 1}. ${warning}`);
            });
            console.log('');
        }

        // Provide solutions
        console.log('🔧 RECOMMENDED ACTIONS:\n');

        if (criticalIssues.length > 0) {
            console.log('1️⃣ RUN AUTO-FIX (Recommended):');
            console.log('   node aapanel-setup.js');
            console.log('   This will automatically detect and fix most aaPanel issues\n');
            
            console.log('2️⃣ MANUAL VERIFICATION:');
            console.log('   - Check MySQL service: systemctl status mysql');
            console.log('   - Verify database credentials in .env');
            console.log('   - Check database permissions in aaPanel\n');
        }

        if (warnings.some(w => w.includes('No students') || w.includes('No data'))) {
            console.log('3️⃣ ADD SAMPLE DATA:');
            console.log('   node test-siswa-aapanel.js --add-sample');
            console.log('   This will add sample students for testing\n');
        }

        console.log('4️⃣ VERIFY AFTER FIXES:');
        console.log('   node run-aapanel-tests.js');
        console.log('   Run this script again to verify fixes\n');

        console.log('5️⃣ START BOT:');
        console.log('   node telegram-bot.js');
        console.log('   Test with: /siswa\n');

        // Show specific aaPanel tips
        console.log('💡 aaPanel SPECIFIC TIPS:');
        console.log('   - Use 127.0.0.1 instead of localhost');
        console.log('   - Check MySQL socket path: /tmp/mysql.sock');
        console.log('   - Verify database user has full permissions');
        console.log('   - Ensure MySQL service is running');
        console.log('   - Check firewall settings for port 3306\n');
    }

    async runAutoFix() {
        console.log('🔧 Running Auto-Fix...\n');
        
        try {
            const setup = new AAPanelSetup();
            const success = await setup.run();
            
            if (success) {
                console.log('\n✅ Auto-fix completed successfully!');
                console.log('\n🧪 Running verification tests...\n');
                
                // Run tests again to verify
                await this.runFullTest();
            } else {
                console.log('\n❌ Auto-fix encountered issues');
                console.log('Manual intervention may be required');
            }
            
        } catch (error) {
            console.error('❌ Auto-fix failed:', error.message);
        }
    }

    async addSampleData() {
        console.log('➕ Adding Sample Data...\n');
        
        try {
            const studentTest = new StudentTestAAPanel();
            await studentTest.addSampleData();
            
            console.log('\n🧪 Running verification tests...\n');
            await this.runStudentTests();
            
        } catch (error) {
            console.error('❌ Failed to add sample data:', error.message);
        }
    }

    showHelp() {
        console.log('🚀 Axioo Kas - aaPanel Test Runner\n');
        console.log('Usage: node run-aapanel-tests.js [options]\n');
        console.log('Options:');
        console.log('  (no args)    Run full diagnostic and student tests');
        console.log('  --fix        Run auto-fix then verify');
        console.log('  --sample     Add sample data then test');
        console.log('  --help       Show this help message\n');
        console.log('Examples:');
        console.log('  node run-aapanel-tests.js           # Full test');
        console.log('  node run-aapanel-tests.js --fix     # Auto-fix issues');
        console.log('  node run-aapanel-tests.js --sample  # Add sample data\n');
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const runner = new AAPanelTestRunner();
    
    if (args.includes('--help') || args.includes('-h')) {
        runner.showHelp();
        return;
    }
    
    if (args.includes('--fix') || args.includes('-f')) {
        await runner.runAutoFix();
        return;
    }
    
    if (args.includes('--sample') || args.includes('-s')) {
        await runner.addSampleData();
        return;
    }
    
    // Default: run full test
    await runner.runFullTest();
}

// Run if executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('Test runner error:', error);
        process.exit(1);
    });
}

module.exports = AAPanelTestRunner;
