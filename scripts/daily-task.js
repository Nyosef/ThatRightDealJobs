/**
 * Daily task script that makes a simple API call
 * This script fetches data from a public API and logs the results
 */

// Load environment variables from .env file
require('dotenv').config();

async function fetchDailyData() {
  try {
    console.log('Starting daily API fetch task...');
    
    // Check if ATTOM API key is configured
    if (!process.env.ATTOM_API_KEY) {
      console.warn('Warning: ATTOM API key is not configured. Using public API for demonstration.');
    } else {
      // Mask the API key for security when logging
      const maskedKey = process.env.ATTOM_API_KEY.substring(0, 4) + '...' + 
                        process.env.ATTOM_API_KEY.substring(process.env.ATTOM_API_KEY.length - 4);
      console.log(`Using ATTOM API key: ${maskedKey}`);
    }
    
    // For demonstration, still using JSONPlaceholder since we don't want to make actual ATTOM API calls
    // In a real application, you would use the ATTOM API with the key
    const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
    
    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Log the results
    console.log('Successfully fetched data:');
    console.log(JSON.stringify(data, null, 2));
    
    // You could do more with this data, like:
    // - Save it to a database
    // - Send notifications
    // - Generate reports
    
    console.log('Daily task completed successfully!');
    return data;
  } catch (error) {
    console.error('Error in daily task:', error.message);
    process.exit(1);
  }
}

// Execute the function
fetchDailyData();
