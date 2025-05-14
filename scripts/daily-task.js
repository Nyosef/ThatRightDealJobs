/**
 * Daily task script that makes a simple API call
 * This script fetches data from a public API and logs the results
 */

async function fetchDailyData() {
  try {
    console.log('Starting daily API fetch task...');
    
    // Fetch data from JSONPlaceholder (a free testing API)
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
