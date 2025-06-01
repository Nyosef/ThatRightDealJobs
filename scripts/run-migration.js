/**
 * Database Migration Runner
 * Executes the bedroom-specific median columns migration
 */

const fs = require('fs');
const path = require('path');
const { db } = require('../index');

async function runMigration() {
  console.log('Starting database migration for bedroom-specific median columns...');
  console.log('='.repeat(70));
  
  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'migrate_zip_medians_by_bedrooms.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Migration SQL loaded successfully');
    console.log('Executing migration...');
    
    // Get Supabase client
    const supabase = db.getSupabaseClient();
    
    // Execute the migration SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('Migration failed:', error);
      throw error;
    }
    
    console.log('✅ Migration executed successfully!');
    console.log('='.repeat(70));
    console.log('Database schema has been updated with bedroom-specific median columns:');
    console.log('- Removed old median columns');
    console.log('- Added new columns for 2br, 3br, 4br, 5br, and 6+br properties');
    console.log('- Each bedroom category has columns for:');
    console.log('  * median_zestimate_[bedroom]br');
    console.log('  * median_last_sold_price_[bedroom]br');
    console.log('  * median_market_rent_[bedroom]br');
    console.log('  * median_bedrooms_[bedroom]br');
    console.log('  * median_bathrooms_[bedroom]br');
    console.log('  * median_sqft_[bedroom]br');
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('Migration failed with error:', error.message);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    await runMigration();
    console.log('\nMigration completed successfully!');
    console.log('You can now run the bedroom median calculations script.');
    process.exit(0);
  } catch (error) {
    console.error('\nMigration failed:', error.message);
    process.exit(1);
  }
}

// Run if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = { runMigration };
