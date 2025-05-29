/**
 * Redfin API Module
 * Exports all Redfin API functions
 */

const RedfinApiClient = require('./client');
const listingsApi = require('./listings');

module.exports = {
  RedfinApiClient,
  ...listingsApi
};
