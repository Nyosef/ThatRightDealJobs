/**
 * Sale Model
 * Handles sale data processing and storage
 */

const { db } = require('../index');

/**
 * Find a sale by sale_id
 * @param {number} saleId - Sale ID (bigint)
 * @returns {Promise<Object|null>} Sale record or null if not found
 */
async function findBySaleId(saleId) {
  const supabase = db.getSupabaseClient();
  
  // Ensure saleId is a number
  const numericSaleId = typeof saleId === 'string' ? parseInt(saleId) : saleId;
  
  if (isNaN(numericSaleId)) {
    throw new Error(`Invalid sale_id: ${saleId} is not a valid number`);
  }
  
  const { data, error } = await supabase
    .from('sale_fact')
    .select('*')
    .eq('sale_id', numericSaleId)
    .maybeSingle();
    
  if (error) throw new Error(`Error finding sale: ${error.message}`);
  return data;
}

/**
 * Insert a new sale record
 * @param {Object} saleData - Sale data
 * @returns {Promise<Object>} Inserted sale record
 */
async function insert(saleData) {
  return db.insertRecord('sale_fact', saleData);
}

/**
 * Update an existing sale record
 * @param {number} saleId - Sale ID (bigint)
 * @param {Object} saleData - Updated sale data
 * @returns {Promise<Object>} Updated sale record
 */
async function update(saleId, saleData) {
  // Ensure saleId is a number
  const numericSaleId = typeof saleId === 'string' ? parseInt(saleId) : saleId;
  
  if (isNaN(numericSaleId)) {
    throw new Error(`Invalid sale_id: ${saleId} is not a valid number`);
  }
  
  return db.updateRecords('sale_fact', { sale_id: numericSaleId }, saleData);
}

/**
 * Process ATTOM API sale data and insert or update records
 * @param {Object} apiData - ATTOM API response
 * @param {string} zipCode - Zip code being processed
 * @returns {Promise<Object>} Processing results
 */
async function processAndUpsertFromAttom(apiData, zipCode) {
  const result = {
    inserted: 0,
    updated: 0,
    unchanged: 0,
    errors: 0,
    skipped: 0
  };
  
  // Extract sales from API response
  const sales = extractSalesFromAttomResponse(apiData);
  
  console.log(`Processing ${sales.length} sales for zip code ${zipCode}`);
  
  for (const sale of sales) {
    try {
      // Transform API data to our schema
      const saleData = transformAttomSaleData(sale, zipCode);
      
      // Debug logging removed as requested
      
      // Skip if no attom_id
      if (!saleData.attom_id) {
        console.warn('Sale missing attom_id, skipping');
        result.skipped++;
        continue;
      }
      
      // Check if the property exists in the database
      // This is necessary because of the foreign key constraint
      const supabase = db.getSupabaseClient();
      const { data: propertyExists, error: propertyCheckError } = await supabase
        .from('property')
        .select('attom_id')
        .eq('attom_id', saleData.attom_id)
        .maybeSingle();
      
      if (propertyCheckError) {
        console.error(`Error checking if property exists: ${propertyCheckError.message}`);
        result.errors++;
        continue;
      }
      
      if (!propertyExists) {
        console.warn(`Property with attom_id ${saleData.attom_id} does not exist. Skipping sale.`);
        result.skipped++;
        continue;
      }
      
      // Check if sale exists
      const existingSale = await findBySaleId(saleData.sale_id);
      
      if (existingSale) {
        // Check if essential data has changed
        if (hasSaleDataChanged(existingSale, saleData)) {
          console.log(`Updating sale with sale_id: ${saleData.sale_id} - data has changed`);
          await update(existingSale.sale_id, saleData);
          result.updated++;
        } else {
          // Record is unchanged
          result.unchanged++;
        }
      } else {
        // Insert new sale
        console.log(`Inserting new sale with sale_id: ${saleData.sale_id}, attom_id: ${saleData.attom_id}`);
        await insert(saleData);
        result.inserted++;
      }
    } catch (error) {
      console.error(`Error processing sale:`, error.message);
      console.error('Error details:', error);
      result.errors++;
    }
  }
  
  return result;
}

// Helper functions
function extractSalesFromAttomResponse(apiData) {
  // Extract sales from the API response structure
  // The actual structure will depend on the ATTOM API response format
  return apiData.property || [];
}

function transformAttomSaleData(sale, zipCode) {
  // Transform ATTOM API sale data to our schema
  // This mapping will need to be adjusted based on the actual ATTOM API response structure
  
  // Generate a numeric sale_id (bigint)
  // Use the obPropId if available, or a timestamp-based ID
  let saleId;
  if (sale.identifier?.obPropId && !isNaN(parseInt(sale.identifier.obPropId))) {
    // If obPropId is a valid number, use it
    saleId = parseInt(sale.identifier.obPropId);
  } else if (sale.identifier?.attomId && !isNaN(parseInt(sale.identifier.attomId))) {
    // If attomId is a valid number, use it
    saleId = parseInt(sale.identifier.attomId);
  } else {
    // Otherwise use a timestamp (current time in milliseconds)
    saleId = Date.now();
  }
  
  // Ensure attom_id is a number (int8) to match the database schema
  let attomId;
  if (sale.identifier?.attomId && !isNaN(parseInt(sale.identifier.attomId))) {
    attomId = parseInt(sale.identifier.attomId);
  } else {
    // Generate a unique numeric ID if attomId is not available or not a number
    attomId = Date.now();
    console.warn(`Sale missing valid attomId, generating: ${attomId}`);
  }
  
  return {
    sale_id: saleId,
    attom_id: attomId,
    zip5: zipCode,
    rec_date: sale.sale?.saleTransDate,
    sale_amt: sale.sale?.saleAmt,
    trans_type: sale.sale?.saleTransType,
    trans_date: sale.sale?.saleTransDate,
    sale_meta: {
      rawData: sale
    },
    imported_at: new Date().toISOString()
  };
}

/**
 * Helper function to compare floating point values with a small epsilon
 * to account for precision differences
 * @param {number|string} a - First value
 * @param {number|string} b - Second value
 * @returns {boolean} True if values are equal within epsilon
 */
function floatsAreEqual(a, b) {
  // If either value is null/undefined, convert to empty string for comparison
  if (a == null) a = '';
  if (b == null) b = '';
  
  // If both are empty strings, they're equal
  if (a === '' && b === '') return true;
  
  // Try to parse as floats
  const floatA = parseFloat(a);
  const floatB = parseFloat(b);
  
  // If either can't be parsed as a float, do string comparison
  if (isNaN(floatA) || isNaN(floatB)) {
    return String(a) === String(b);
  }
  
  // For floating point comparison, use a small epsilon
  const epsilon = 0.0000001;
  return Math.abs(floatA - floatB) < epsilon;
}

function hasSaleDataChanged(existingSale, newSaleData) {
  // Compare only essential fields that matter for business logic
  // Ignore sale_meta which can contain timestamps and other metadata that changes
  // but doesn't represent a meaningful change to the sale data
  
  // Text fields - use simple string comparison
  const existingTransType = existingSale.trans_type || '';
  const newTransType = newSaleData.trans_type || '';
  
  const existingTransDate = existingSale.trans_date || '';
  const newTransDate = newSaleData.trans_date || '';
  
  // Use float comparison for numeric fields
  const transTypeChanged = existingTransType !== newTransType;
  const transDateChanged = existingTransDate !== newTransDate;
  
  // Use float comparison for sale amount
  const saleAmtChanged = !floatsAreEqual(existingSale.sale_amt, newSaleData.sale_amt);
  
  // Check if any essential fields have changed
  const hasChanged = (
    saleAmtChanged ||
    transTypeChanged ||
    transDateChanged
  );
  
  if (hasChanged) {
    console.log(`Sale data changed for sale_id ${existingSale.sale_id}:`);
    if (saleAmtChanged) {
      console.log(`  - Sale amount changed: ${existingSale.sale_amt} -> ${newSaleData.sale_amt}`);
    }
    if (transTypeChanged) {
      console.log(`  - Transaction type changed: ${existingTransType} -> ${newTransType}`);
    }
    if (transDateChanged) {
      console.log(`  - Transaction date changed: ${existingTransDate} -> ${newTransDate}`);
    }
  }
  
  return hasChanged;
}

module.exports = {
  findBySaleId,
  insert,
  update,
  processAndUpsertFromAttom
};
