/**
 * Zillow API Module
 * Exports all Zillow API functions
 */

const ZillowApiClient = require('./client');
const listingsApi = require('./listings');

module.exports = {
  ZillowApiClient,
  ...listingsApi
};
