/**
 * Models Module
 * Exports all model functions
 */

const saleModel = require('./sale');
const propertyModel = require('./property');
const apiDataModel = require('./api-data');
const zipModel = require('./zip');
const propertyLinkModel = require('./property-link');
const rentcastListingModel = require('./rentcast-listing');
const rentcastListingAgentModel = require('./rentcast-listing-agent');
const rentcastListingOfficeModel = require('./rentcast-listing-office');
const rentcastBuilderModel = require('./rentcast-builder');
const rentcastListingHistoryModel = require('./rentcast-listing-history');

module.exports = {
  sale: saleModel,
  property: propertyModel,
  apiData: apiDataModel,
  zip: zipModel,
  propertyLink: propertyLinkModel,
  rentcastListing: rentcastListingModel,
  rentcastListingAgent: rentcastListingAgentModel,
  rentcastListingOffice: rentcastListingOfficeModel,
  rentcastBuilder: rentcastBuilderModel,
  rentcastListingHistory: rentcastListingHistoryModel
};
