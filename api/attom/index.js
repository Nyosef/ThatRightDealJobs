/**
 * ATTOM API Module
 * Exports all ATTOM API functions
 */

const AttomApiClient = require('./client');
const saleApi = require('./sale');

module.exports = {
  AttomApiClient,
  ...saleApi
};
