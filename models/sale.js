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
      
      // Debug the first sale
      if (result.inserted === 0 && result.updated === 0 && result.errors === 0 && result.skipped === 0) {
        console.log('First sale data:', JSON.stringify(saleData, null, 2));
        console.log('Original sale data structure:', JSON.stringify(sale, null, 2));
      }
      
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
        // Check if data has changed
        if (hasSaleDataChanged(existingSale, saleData)) {
          await update(existingSale.sale_id, saleData);
          result.updated++;
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

function hasSaleDataChanged(existingSale, newSaleData) {
  // Compare relevant fields
  return (
    existingSale.sale_amt !== newSaleData.sale_amt ||
    existingSale.trans_type !== newSaleData.trans_type ||
    existingSale.trans_date !== newSaleData.trans_date ||
    JSON.stringify(existingSale.sale_meta) !== JSON.stringify(newSaleData.sale_meta)
  );
}

module.exports = {
  findBySaleId,
  insert,
  update,
  processAndUpsertFromAttom
};
