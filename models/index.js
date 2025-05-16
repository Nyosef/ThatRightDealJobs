/**
 * Models Module
 * Exports all model functions
 */

const saleModel = require('./sale');
const propertyModel = require('./property');
const apiDataModel = require('./api-data');
const zipModel = require('./zip');

module.exports = {
  sale: saleModel,
  property: propertyModel,
  apiData: apiDataModel,
  zip: zipModel
};
