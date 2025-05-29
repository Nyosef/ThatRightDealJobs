/**
 * API Module
 * Exports all API functions
 */

const attomApi = require('./attom');
const rentCastApi = require('./rentCast');
const zillowApi = require('./zillow');
const redfinApi = require('./redfin');

module.exports = {
  attom: attomApi,
  rentCast: rentCastApi,
  zillow: zillowApi,
  redfin: redfinApi
};
