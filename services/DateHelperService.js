class DateHelperService {
    /**
     * Calculates all 7-day routine periods from a start date until a given end date.
     * @param {string} routineStartDateStr - The starting date in 'YYYY-MM-DD' format.
     * @param {Date} today - The date to calculate periods up to.
     * @returns {Array<Object>} An array of period objects, each with { startDate, endDate, periodLabel }.
     */
    static getRoutinePeriods(routineStartDateStr, today) {
        const periods = [];
        if (!routineStartDateStr) {
            return periods;
        }

        const startDate = new Date(routineStartDateStr + 'T00:00:00');
        if (isNaN(startDate.getTime())) {
            console.error("Invalid routineStartDate:", routineStartDateStr);
            return periods;
        }

        let currentPeriodStart = startDate;
        let periodIndex = 1;

        while (currentPeriodStart <= today) {
            const currentPeriodEnd = new Date(currentPeriodStart);
            currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 6);

            periods.push({
                startDate: new Date(currentPeriodStart),
                endDate: currentPeriodEnd,
                periodLabel: `Minggu ${periodIndex}`
            });

            // Move to the start of the next 7-day period
            currentPeriodStart.setDate(currentPeriodStart.getDate() + 7);
            periodIndex++;
        }

        return periods;
    }
}

module.exports = DateHelperService;
