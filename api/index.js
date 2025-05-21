/**
 * API Module
 * Exports all API functions
 */

const attomApi = require('./attom');
const rentCastApi = require('./rentCast');

module.exports = {
  attom: attomApi,
  rentCast: rentCastApi
};
