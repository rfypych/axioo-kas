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

    // Load configuration from JSON file
    async loadConfig() {
        try {
            const data = await fs.readFile(CONFIG_PATH, 'utf-8');
            this.config = JSON.parse(data);
            console.log('Report configuration loaded:', this.config);
        } catch (error) {
            // If file doesn't exist, create a default one
            if (error.code === 'ENOENT') {
                console.log('Report config not found, creating default.');
                this.config = { reportingDay: 3, reportingHour: 8, reportingMinute: 0 };
                await this.saveConfig();
            } else {
                console.error('Error loading report config:', error);
                // Default fallback
                this.config = { reportingDay: 3, reportingHour: 8, reportingMinute: 0 };
            }
        }
        return this.config;
    }

    // Save configuration to JSON file
    async saveConfig() {
        if (!this.config) {
            console.error('Cannot save null config.');
            return;
        }
        try {
            await fs.writeFile(CONFIG_PATH, JSON.stringify(this.config, null, 2), 'utf-8');
            console.log('Report configuration saved:', this.config);
        } catch (error) {
            console.error('Error saving report config:', error);
        }
    }

    // Get the current configuration
    async getConfig() {
        if (!this.config) {
            await this.loadConfig();
        }
        return this.config;
    }

    // Get the name of the reporting day
    async getReportingDayName() {
        const config = await this.getConfig();
        return this.dayNames[config.reportingDay] || 'Unknown';
    }

    // Set the reporting day (accepts name or number)
    async setReportingDay(day) {
        await this.loadConfig();
        let dayNumber = -1;

        if (typeof day === 'string') {
            dayNumber = this.dayMap[day.toLowerCase()];
        } else if (typeof day === 'number' && day >= 0 && day <= 6) {
            dayNumber = day;
        }

        if (dayNumber !== -1) {
            this.config.reportingDay = dayNumber;
            await this.saveConfig();
            return { success: true, day: this.dayNames[dayNumber] };
        } else {
            return { success: false, message: 'Invalid day. Use a number (0-6) or name (e.g., "rabu").' };
        }
    }

    // Set the reporting time
    async setReportingTime(hour, minute) {
        await this.loadConfig();
        if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
            this.config.reportingHour = hour;
            this.config.reportingMinute = minute;
            await this.saveConfig();
            return { success: true, hour, minute };
        } else {
            return { success: false, message: 'Invalid time.' };
        }
    }

    /**
     * Calculates the start and end date of the reporting week for a given reference date.
     * The "week" ends on the configured reporting day.
     * @param {Date} refDate The reference date to calculate the week for.
     * @returns {{startDate: Date, endDate: Date}} The start and end dates of the week.
     */
    async getWeekDateRange(refDate = new Date()) {
        const config = await this.getConfig();
        const reportingDay = config.reportingDay;

        let endDate = new Date(refDate);
        endDate.setHours(23, 59, 59, 999); // Set to end of the day

        const refDay = refDate.getDay(); // 0 = Sunday, ..., 6 = Saturday

        // Calculate how many days to go back to find the last reporting day
        const daysAgo = (refDay - reportingDay + 7) % 7;
        endDate.setDate(endDate.getDate() - daysAgo);

        let startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 6);
        startDate.setHours(0, 0, 0, 0); // Set to start of the day

        return { startDate, endDate };
    }

    /**
     * Generates an array of date ranges for a number of weeks, past or future.
     * @param {number} numWeeks The number of weeks to generate ranges for.
     * @param {Date} refDate The starting reference date.
     * @param {string} direction 'past' or 'future'.
     * @returns {Array<{week: number, startDate: Date, endDate: Date}>}
     */
    async getMultipleWeekRanges(numWeeks = 4, refDate = new Date(), direction = 'past') {
        const ranges = [];
        let currentRefDate = new Date(refDate);

        if (direction === 'future') {
            for (let i = 0; i < numWeeks; i++) {
                const { startDate, endDate } = await this.getWeekDateRange(currentRefDate);
                ranges.push({ week: i, startDate, endDate });
                // Set the reference date for the next iteration to be one day after the current week's end
                currentRefDate = new Date(endDate);
                currentRefDate.setDate(currentRefDate.getDate() + 1);
            }
            return ranges;
        }

        // 'past' direction logic
        const pastRanges = [];
        // Start from the week containing the refDate and go backwards
        for (let i = 0; i < numWeeks; i++) {
            const { startDate, endDate } = await this.getWeekDateRange(currentRefDate);
            pastRanges.push({ week: i, startDate, endDate });
            // Set the reference date for the next iteration to be one day before the current week's start
            currentRefDate = new Date(startDate);
            currentRefDate.setDate(currentRefDate.getDate() - 1);
        }
        return pastRanges.reverse(); // reverse to get chronological order
    }
}

module.exports = new ConfigurableReportService();
