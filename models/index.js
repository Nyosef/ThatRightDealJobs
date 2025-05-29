/**
 * Models Module
 * Exports all model functions
 */

const apiData = require('./api-data');
const property = require('./property');
const propertyLink = require('./property-link');
const redfinListing = require('./redfin-listing');
const rentcastBuilder = require('./rentcast-builder');
const rentcastListing = require('./rentcast-listing');
const rentcastListingAgent = require('./rentcast-listing-agent');
const rentcastListingHistory = require('./rentcast-listing-history');
const rentcastListingOffice = require('./rentcast-listing-office');
const sale = require('./sale');
const zip = require('./zip');
const zipMedians = require('./zip-medians');
const zillowListing = require('./zillow-listing');

module.exports = {
  apiData,
  property,
  propertyLink,
  redfinListing,
  rentcastBuilder,
  rentcastListing,
  rentcastListingAgent,
  rentcastListingHistory,
  rentcastListingOffice,
  sale,
  zip,
  zipMedians,
  zillowListing
};
