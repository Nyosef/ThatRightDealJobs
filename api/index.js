/**
 * API Module
 * Exports all API functions
 */

const attomApi = require('./attom');
const rentCastApi = require('./rentCast');
const zillowApi = require('./zillow');
const redfinApi = require('./redfin');
const realtorApi = require('./realtor');

module.exports = {
  attom: attomApi,
  rentCast: rentCastApi,
  zillow: zillowApi,
  redfin: redfinApi,
  realtor: realtorApi
};
