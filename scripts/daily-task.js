/**
 * Daily task script that makes a simple API call and stores the results in Supabase
 * This script fetches data from a public API and logs the results
 */

// Load environment variables from .env file
require('dotenv').config();

// Import the database utilities
const { db } = require('../index');

/**
 * Fetch data from the _test_connection table to verify Supabase connection
 */
async function testSupabaseConnection() {
  try {
    console.log('\n--- Testing Supabase Connection ---');
    
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
      console.log('Supabase is not configured. Skipping connection test.');
      return;
    }
    
    console.log('Attempting to fetch data from _test_connection table...');
    
    const supabase = db.getSupabaseClient();
    const { data, error } = await supabase.from('_test_connection').select('*');
    
    if (error) {
      if (error.code === '42P01') {
        console.log('The _test_connection table does not exist. This is expected if you haven\'t created it yet.');
        console.log('Creating _test_connection table for testing purposes...');
        
        // Create the test table
        const { error: createError } = await supabase.rpc('create_test_connection_table');
        
        if (createError) {
          console.log('Could not create test table using RPC. Attempting direct SQL...');
          // If RPC doesn't exist, try to create the table directly
          const { error: sqlError } = await supabase.from('_test_connection').insert([
            { test_id: 1, message: 'Test connection successful', created_at: new Date().toISOString() }
          ]);
          
          if (sqlError && sqlError.code === '42P01') {
            console.log('Could not create table. You may need to create it manually in the Supabase dashboard.');
            console.log('SQL to create table: CREATE TABLE _test_connection (test_id SERIAL PRIMARY KEY, message TEXT, created_at TIMESTAMPTZ);');
          } else if (sqlError) {
            console.log('Error creating test data:', sqlError.message);
          } else {
            console.log('Test table created successfully!');
          }
        } else {
          console.log('Test table created successfully using RPC!');
        }
        
        // Try to fetch again
        const { data: newData, error: newError } = await supabase.from('_test_connection').select('*');
        
        if (newError) {
          console.log('Still could not fetch data after table creation:', newError.message);
        } else {
          console.log('Successfully fetched data from newly created _test_connection table:');
          console.log(JSON.stringify(newData, null, 2));
        }
      } else {
        console.log('Error fetching from _test_connection:', error.message);
      }
    } else {
      console.log('Successfully fetched data from _test_connection table:');
      console.log(JSON.stringify(data, null, 2));
    }
    
    console.log('--- End of Supabase Connection Test ---\n');
  } catch (error) {
    console.error('Error in Supabase connection test:', error.message);
  }
}

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
    
    // Check if Supabase is configured
    if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
      try {
        console.log('Storing data in Supabase...');
        
        // Format the data for the api_data table with a JSON data column
        const apiDataRecord = {
          data: {
            ...data,
            fetched_at: new Date().toISOString()
          }
        };
        
        // Store the data in api_data table
        console.log('Inserting into api_data table...');
        const apiResult = await db.insertRecord('api_data', apiDataRecord);
        console.log('Data successfully stored in api_data table:');
        console.log(JSON.stringify(apiResult, null, 2));
        
        // Also store the data in _test_connection table
        console.log('Inserting into _test_connection table...');
        const testConnectionRecord = {
          message: 'API data stored successfully',
          created_at: new Date().toISOString(),
          data: data // Store the API response as JSON
        };
        
        const testResult = await db.insertRecord('_test_connection', testConnectionRecord);
        console.log('Data successfully stored in _test_connection table:');
        console.log(JSON.stringify(testResult, null, 2));
        
        // Query recent records from api_data
        console.log('Retrieving recent records from api_data table...');
        const recentApiRecords = await db.queryRecords('api_data', { limit: 5 });
        console.log(`Found ${recentApiRecords.length} recent records in api_data:`);
        console.log(JSON.stringify(recentApiRecords, null, 2));
        
        // Query recent records from _test_connection
        console.log('Retrieving recent records from _test_connection table...');
        const recentTestRecords = await db.queryRecords('_test_connection', { limit: 5 });
        console.log(`Found ${recentTestRecords.length} recent records in _test_connection:`);
        console.log(JSON.stringify(recentTestRecords, null, 2));
      } catch (dbError) {
        console.error('Error storing data in Supabase:', dbError.message);
        
        // Check for RLS policy error
        if (dbError.message.includes('row-level security policy')) {
          console.log('\n--- ROW LEVEL SECURITY ERROR ---');
          console.log('This error occurs because Supabase tables have Row Level Security (RLS) enabled by default.');
          console.log('To fix this, you need to either:');
          console.log('1. Disable RLS for the api_data table (for development only):');
          console.log('   - Go to your Supabase dashboard');
          console.log('   - Navigate to Database > Tables > api_data');
          console.log('   - Click on "Row Level Security" and turn it OFF');
          console.log('\n2. OR Create an RLS policy that allows inserts:');
          console.log('   - Go to your Supabase dashboard');
          console.log('   - Navigate to Database > Tables > api_data');
          console.log('   - Click on "Policies" and add a new policy');
          console.log('   - Create a policy with the following SQL:');
          console.log('     CREATE POLICY "Allow all operations for authenticated users" ON api_data');
          console.log('     FOR ALL USING (auth.role() = \'authenticated\');\n');
        }
        
        console.log('Continuing with task despite database error...');
      }
    } else {
      console.log('Supabase is not configured. Skipping database operations.');
    }
    
    console.log('Daily task completed successfully!');
    return data;
  } catch (error) {
    console.error('Error in daily task:', error.message);
    process.exit(1);
  }
}

// Execute the functions
async function runDailyTasks() {
  // First test the Supabase connection
  await testSupabaseConnection();
  
  // Then run the regular daily data fetch
  await fetchDailyData();
}

runDailyTasks().catch(error => {
  console.error('Error in daily tasks:', error);
  process.exit(1);
});
