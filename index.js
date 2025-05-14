/**
 * Main entry point for the ThatRightDeal application
 */

// Load environment variables from .env file
require('dotenv').config();

// Import Supabase utilities
const supabaseUtils = require('./utils/supabase');

// Log startup information
console.log('Starting ThatRightDeal application...');

// Example function that uses environment variables
function getConfigInfo() {
  // Create a safe config object that doesn't expose sensitive information
  const config = {
    attomApiConfigured: !!process.env.ATTOM_API_KEY,
    supabaseConfigured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_KEY)
  };

  return config;
}

// Display configuration information
const config = getConfigInfo();
console.log('Application configuration:');
console.log(JSON.stringify(config, null, 2));

// Test Supabase connection
async function testSupabaseConnection() {
  if (config.supabaseConfigured) {
    try {
      console.log('Testing Supabase connection...');
      const connectionResult = await supabaseUtils.testConnection();
      console.log(`Supabase connection status: ${connectionResult.connected ? 'SUCCESS' : 'FAILED'}`);
      console.log(`Supabase message: ${connectionResult.message}`);
    } catch (error) {
      console.error('Error testing Supabase connection:', error.message);
    }
  } else {
    console.log('Warning: Supabase is not configured. Database features will not work properly.');
  }
}

// Main application logic
async function main() {
  // Test database connection
  await testSupabaseConnection();
  
  console.log('Application started successfully!');
}

// Start the application
main().catch(error => {
  console.error('Application startup error:', error);
  process.exit(1);
});

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

// Export configuration and database utilities for use in other modules
module.exports = {
  getConfigInfo,
  db: supabaseUtils
};
