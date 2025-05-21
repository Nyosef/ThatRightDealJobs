/**
 * RentCast API Module
 * Exports all RentCast API functions
 */

const RentCastApiClient = require('./client');
const listingsApi = require('./listings');

module.exports = {
  RentCastApiClient,
  ...listingsApi
};
