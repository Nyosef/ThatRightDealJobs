/**
 * Supabase client utility for database operations
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with environment variables
function initSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration is missing. Please set SUPABASE_URL and SUPABASE_KEY in your .env file.');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// Get a singleton instance of the Supabase client
let supabaseInstance = null;
function getSupabaseClient() {
  if (!supabaseInstance) {
    supabaseInstance = initSupabase();
  }
  return supabaseInstance;
}

/**
 * Example database operations
 */

// Insert a record into a table
async function insertRecord(tableName, data) {
  const supabase = getSupabaseClient();
  
  try {
    // First check if the table exists
    const { error: checkError } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    // If table doesn't exist, handle it
    if (checkError && checkError.code === '42P01') {
      console.log(`Table '${tableName}' does not exist.`);
      throw new Error(`Table '${tableName}' does not exist. Please run the appropriate SQL script to create it.`);
    }
    
    // Insert the data
    const { data: result, error } = await supabase
      .from(tableName)
      .insert(data);
    
    if (error) {
      throw new Error(error.message);
    }
    
    // Fetch the inserted record
    let queryBuilder = supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    // Use appropriate order by clause based on table
    if (tableName === 'api_data') {
      // For api_data table, we don't have a created_at column
      queryBuilder = queryBuilder.order('id', { ascending: false });
    } else {
      // For other tables that have created_at
      queryBuilder = queryBuilder.order('created_at', { ascending: false });
    }
    
    const { data: insertedData, error: selectError } = await queryBuilder;
    
    if (selectError) {
      console.log('Warning: Data was inserted but could not be retrieved:', selectError.message);
      return [{ message: 'Data inserted successfully but could not be retrieved' }];
    }
    
    return insertedData;
  } catch (error) {
    throw new Error(`Error inserting into ${tableName}: ${error.message}`);
  }
}

// Query records from a table
async function queryRecords(tableName, query = {}) {
  const supabase = getSupabaseClient();
  
  let queryBuilder = supabase.from(tableName).select('*');
  
  // Apply filters if provided
  if (query.filters) {
    for (const [column, value] of Object.entries(query.filters)) {
      queryBuilder = queryBuilder.eq(column, value);
    }
  }
  
  // Apply limit if provided
  if (query.limit) {
    queryBuilder = queryBuilder.limit(query.limit);
  }
  
  const { data, error } = await queryBuilder;
  
  if (error) {
    throw new Error(`Error querying ${tableName}: ${error.message}`);
  }
  
  return data;
}

// Update records in a table
async function updateRecords(tableName, filters, updates) {
  const supabase = getSupabaseClient();
  
  let queryBuilder = supabase.from(tableName).update(updates);
  
  // Apply filters
  for (const [column, value] of Object.entries(filters)) {
    queryBuilder = queryBuilder.eq(column, value);
  }
  
  const { data, error } = await queryBuilder.select();
  
  if (error) {
    throw new Error(`Error updating ${tableName}: ${error.message}`);
  }
  
  return data;
}

// Delete records from a table
async function deleteRecords(tableName, filters) {
  const supabase = getSupabaseClient();
  
  let queryBuilder = supabase.from(tableName).delete();
  
  // Apply filters
  for (const [column, value] of Object.entries(filters)) {
    queryBuilder = queryBuilder.eq(column, value);
  }
  
  const { data, error } = await queryBuilder.select();
  
  if (error) {
    throw new Error(`Error deleting from ${tableName}: ${error.message}`);
  }
  
  return data;
}

// Test the Supabase connection
async function testConnection() {
  try {
    // Just check if we can initialize the client
    getSupabaseClient();
    
    return {
      connected: true,
      message: 'Successfully connected to Supabase database.'
    };
  } catch (error) {
    return {
      connected: false,
      message: `Connection error: ${error.message}`
    };
  }
}

module.exports = {
  getSupabaseClient,
  testConnection,
  insertRecord,
  queryRecords,
  updateRecords,
  deleteRecords
};
