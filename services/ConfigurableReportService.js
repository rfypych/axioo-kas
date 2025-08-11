const fs = require('fs/promises');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../config/report_config.json');

class ConfigurableReportService {
    constructor() {
        this.config = null;
        this.dayMap = {
            'minggu': 0, 'senin': 1, 'selasa': 2, 'rabu': 3,
            'kamis': 4, 'jumat': 5, 'sabtu': 6
        };
        this.dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    }

    async _loadConfig() {
        try {
            const data = await fs.readFile(CONFIG_PATH, 'utf-8');
            this.config = JSON.parse(data);
        } catch (error) {
            console.error('Error loading report config, using defaults:', error);
            this.config = { reportingDay: 3, reportingHour: 8, reportingMinute: 0, startDate: moment().format('YYYY-MM-DD') };
            await this._saveConfig();
        }
        return this.config;
    }

    async _saveConfig() {
        if (!this.config) return;
        await fs.writeFile(CONFIG_PATH, JSON.stringify(this.config, null, 2), 'utf-8');
    }

    async getConfig() {
        if (!this.config) await this._loadConfig();
        return this.config;
    }

    async setReportingDay(day) {
        await this.getConfig();
        let dayNumber = -1;
        if (typeof day === 'string') {
            dayNumber = this.dayMap[day.toLowerCase()];
        } else if (typeof day === 'number' && day >= 0 && day <= 6) {
            dayNumber = day;
        }

        if (dayNumber !== -1) {
            this.config.reportingDay = dayNumber;
            await this._saveConfig();
            return { success: true, day: this.dayNames[dayNumber] };
        }
        return { success: false, message: 'Invalid day.' };
    }

    async setStartDate(dateString) {
        await this.getConfig();
        const parts = dateString.split('/');
        if (parts.length !== 3) return { success: false, message: 'Invalid date format. Use DD/MM/YYYY.' };

        const date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        if (!isNaN(date.getTime())) {
            this.config.startDate = date.toISOString().split('T')[0];
            await this._saveConfig();
            return { success: true, date: this.config.startDate };
        }
        return { success: false, message: 'Invalid date.' };
    }

    async getWeekRanges(refDate = new Date(), numWeeks = 4) {
        const config = await this.getConfig();
        const { startDate: configStartDate, reportingDay } = config;

        const epoch = new Date(configStartDate);
        epoch.setHours(0, 0, 0, 0);

        let ref = new Date(refDate);
        ref.setHours(0, 0, 0, 0);

        let dayOfWeek = ref.getDay();
        let daysUntilReportingDay = (reportingDay - dayOfWeek + 7) % 7;
        let currentWeekEndDate = new Date(ref);
        currentWeekEndDate.setDate(ref.getDate() + daysUntilReportingDay);

        if (currentWeekEndDate < epoch) {
            let epochDayOfWeek = epoch.getDay();
            let daysToAdd = (reportingDay - epochDayOfWeek + 7) % 7;
            currentWeekEndDate = new Date(epoch);
            currentWeekEndDate.setDate(epoch.getDate() + daysToAdd);
        }

        const ranges = [];
        for (let i = 0; i < numWeeks; i++) {
            const weekEnd = new Date(currentWeekEndDate);
            weekEnd.setDate(currentWeekEndDate.getDate() + (i * 7));

            const weekStart = new Date(weekEnd);
            weekStart.setDate(weekEnd.getDate() - 6);

            const diffTime = Math.abs(weekEnd - epoch);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            const weekNumber = Math.floor(diffDays / 7) + 1;

            ranges.push({
                weekNumber,
                startDate: weekStart,
                endDate: weekEnd
            });
        }

        return ranges;
    }
}

module.exports = new ConfigurableReportService();
