/**
 * Main entry point for the ThatRightDeal application
 */

// Load environment variables from .env file
require('dotenv').config();

// Log startup information
console.log('Starting ThatRightDeal application...');

// Example function that uses environment variables
function getConfigInfo() {
  // Create a safe config object that doesn't expose sensitive information
  const config = {
    attomApiConfigured: !!process.env.ATTOM_API_KEY
  };

  return config;
}

// Display configuration information
const config = getConfigInfo();
console.log('Application configuration:');
console.log(JSON.stringify(config, null, 2));

// Main application logic would go here
console.log('Application started successfully!');

// Example of how to access the ATTOM API key
if (process.env.ATTOM_API_KEY) {
  console.log('ATTOM API key is configured.');
  // Mask the API key for security when logging
  const maskedKey = process.env.ATTOM_API_KEY.substring(0, 4) + '...' + 
                    process.env.ATTOM_API_KEY.substring(process.env.ATTOM_API_KEY.length - 4);
  console.log(`ATTOM API key: ${maskedKey}`);
} else {
  console.log('Warning: ATTOM API key is not configured. Property data features will not work properly.');
}

// Export configuration for use in other modules
module.exports = {
  getConfigInfo
};
