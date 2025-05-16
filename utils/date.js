/**
 * Date Utility Functions
 */

/**
 * Format a date as YYYY/MM/DD for ATTOM API
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}/${month}/${day}`;
}

/**
 * Get a date that is a specified number of months before the given date
 * @param {Date} date - Reference date
 * @param {number} months - Number of months to go back
 * @returns {Date} Date that is the specified number of months before the reference date
 */
function getDateMonthsAgo(date, months = 1) {
  const result = new Date(date);
  result.setMonth(result.getMonth() - months);
  return result;
}

module.exports = {
  formatDate,
  getDateMonthsAgo
};
