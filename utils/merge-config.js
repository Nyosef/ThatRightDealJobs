/**
 * Merge Configuration Management
 * Handles configuration settings for the listing merge process
 */

const { db } = require('../index');

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  coordinate_tolerance_meters: 50,
  address_fuzzy_threshold: 0.8,
  price_conflict_threshold: 0.05,
  enable_fuzzy_matching: true,
  min_confidence_score: 0.7,
  max_coordinate_distance: 100,
  conflict_detection_enabled: true,
  quality_score_weights: {
    source_count: 0.3,
    confidence: 0.4,
    conflicts: 0.3
  }
};

/**
 * Get configuration value by key
 * @param {string} key - Configuration key
 * @returns {Promise<any>} Configuration value
 */
async function getConfig(key) {
  try {
    const supabase = db.getSupabaseClient();
    
    const { data, error } = await supabase
      .from('merge_config')
      .select('config_value, data_type')
      .eq('config_key', key)
      .maybeSingle();
    
    if (error) {
      console.warn(`Error getting config for ${key}, using default:`, error.message);
      return DEFAULT_CONFIG[key];
    }
    
    if (!data) {
      console.warn(`Config key ${key} not found, using default`);
      return DEFAULT_CONFIG[key];
    }
    
    // Parse value based on data type
    return parseConfigValue(data.config_value, data.data_type);
  } catch (error) {
    console.warn(`Error accessing config for ${key}, using default:`, error.message);
    return DEFAULT_CONFIG[key];
  }
}

/**
 * Get all configuration values
 * @returns {Promise<Object>} All configuration values
 */
async function getAllConfig() {
  try {
    const supabase = db.getSupabaseClient();
    
    const { data, error } = await supabase
      .from('merge_config')
      .select('config_key, config_value, data_type');
    
    if (error) {
      console.warn('Error getting all config, using defaults:', error.message);
      return DEFAULT_CONFIG;
    }
    
    const config = { ...DEFAULT_CONFIG };
    
    if (data) {
      data.forEach(row => {
        config[row.config_key] = parseConfigValue(row.config_value, row.data_type);
      });
    }
    
    return config;
  } catch (error) {
    console.warn('Error accessing config, using defaults:', error.message);
    return DEFAULT_CONFIG;
  }
}

/**
 * Set configuration value
 * @param {string} key - Configuration key
 * @param {any} value - Configuration value
 * @param {string} description - Optional description
 * @returns {Promise<boolean>} Success status
 */
async function setConfig(key, value, description = null) {
  try {
    const supabase = db.getSupabaseClient();
    
    const dataType = getDataType(value);
    const configValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    
    const updateData = {
      config_value: configValue,
      data_type: dataType,
      updated_at: new Date().toISOString()
    };
    
    if (description) {
      updateData.description = description;
    }
    
    const { error } = await supabase
      .from('merge_config')
      .upsert({
        config_key: key,
        ...updateData
      });
    
    if (error) {
      console.error(`Error setting config ${key}:`, error.message);
      return false;
    }
    
    console.log(`Config ${key} updated to: ${configValue}`);
    return true;
  } catch (error) {
    console.error(`Error setting config ${key}:`, error.message);
    return false;
  }
}

/**
 * Parse configuration value based on data type
 * @param {string} value - Raw configuration value
 * @param {string} dataType - Data type
 * @returns {any} Parsed value
 */
function parseConfigValue(value, dataType) {
  switch (dataType) {
    case 'number':
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    
    case 'boolean':
      return value.toLowerCase() === 'true';
    
    case 'json':
      try {
        return JSON.parse(value);
      } catch (error) {
        console.warn(`Error parsing JSON config value: ${value}`, error.message);
        return {};
      }
    
    case 'string':
    default:
      return value;
  }
}

/**
 * Determine data type of a value
 * @param {any} value - Value to check
 * @returns {string} Data type
 */
function getDataType(value) {
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'object') return 'json';
  return 'string';
}

/**
 * Validate configuration values
 * @param {Object} config - Configuration object
 * @returns {Object} Validation result with errors
 */
function validateConfig(config) {
  const errors = [];
  
  // Validate coordinate tolerance
  if (config.coordinate_tolerance_meters <= 0 || config.coordinate_tolerance_meters > 1000) {
    errors.push('coordinate_tolerance_meters must be between 0 and 1000');
  }
  
  // Validate fuzzy threshold
  if (config.address_fuzzy_threshold < 0 || config.address_fuzzy_threshold > 1) {
    errors.push('address_fuzzy_threshold must be between 0.0 and 1.0');
  }
  
  // Validate price conflict threshold
  if (config.price_conflict_threshold < 0 || config.price_conflict_threshold > 1) {
    errors.push('price_conflict_threshold must be between 0.0 and 1.0');
  }
  
  // Validate confidence score
  if (config.min_confidence_score < 0 || config.min_confidence_score > 1) {
    errors.push('min_confidence_score must be between 0.0 and 1.0');
  }
  
  // Validate quality score weights
  if (config.quality_score_weights) {
    const weights = config.quality_score_weights;
    const total = (weights.source_count || 0) + (weights.confidence || 0) + (weights.conflicts || 0);
    if (Math.abs(total - 1.0) > 0.01) {
      errors.push('quality_score_weights must sum to 1.0');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get configuration with environment variable overrides
 * Environment variables take precedence over database config
 * @returns {Promise<Object>} Configuration with overrides
 */
async function getConfigWithOverrides() {
  const config = await getAllConfig();
  
  // Override with environment variables if present
  if (process.env.MERGE_COORDINATE_TOLERANCE_METERS) {
    config.coordinate_tolerance_meters = parseFloat(process.env.MERGE_COORDINATE_TOLERANCE_METERS);
  }
  
  if (process.env.MERGE_ADDRESS_FUZZY_THRESHOLD) {
    config.address_fuzzy_threshold = parseFloat(process.env.MERGE_ADDRESS_FUZZY_THRESHOLD);
  }
  
  if (process.env.MERGE_PRICE_CONFLICT_THRESHOLD) {
    config.price_conflict_threshold = parseFloat(process.env.MERGE_PRICE_CONFLICT_THRESHOLD);
  }
  
  if (process.env.MERGE_ENABLE_FUZZY_MATCHING) {
    config.enable_fuzzy_matching = process.env.MERGE_ENABLE_FUZZY_MATCHING.toLowerCase() === 'true';
  }
  
  if (process.env.MERGE_MIN_CONFIDENCE_SCORE) {
    config.min_confidence_score = parseFloat(process.env.MERGE_MIN_CONFIDENCE_SCORE);
  }
  
  if (process.env.MERGE_MAX_COORDINATE_DISTANCE) {
    config.max_coordinate_distance = parseFloat(process.env.MERGE_MAX_COORDINATE_DISTANCE);
  }
  
  if (process.env.MERGE_CONFLICT_DETECTION_ENABLED) {
    config.conflict_detection_enabled = process.env.MERGE_CONFLICT_DETECTION_ENABLED.toLowerCase() === 'true';
  }
  
  // Validate final configuration
  const validation = validateConfig(config);
  if (!validation.valid) {
    console.warn('Configuration validation errors:', validation.errors);
  }
  
  return config;
}

/**
 * Initialize configuration table with defaults
 * @returns {Promise<boolean>} Success status
 */
async function initializeConfig() {
  try {
    console.log('Initializing merge configuration...');
    
    for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
      const description = getConfigDescription(key);
      await setConfig(key, value, description);
    }
    
    console.log('Merge configuration initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing configuration:', error.message);
    return false;
  }
}

/**
 * Get description for configuration key
 * @param {string} key - Configuration key
 * @returns {string} Description
 */
function getConfigDescription(key) {
  const descriptions = {
    coordinate_tolerance_meters: 'Maximum distance in meters for coordinate-based matching',
    address_fuzzy_threshold: 'Minimum similarity score for fuzzy address matching (0.0-1.0)',
    price_conflict_threshold: 'Percentage difference threshold for price conflict detection (0.05 = 5%)',
    enable_fuzzy_matching: 'Enable fuzzy address matching',
    min_confidence_score: 'Minimum confidence score for accepting matches',
    max_coordinate_distance: 'Maximum coordinate distance in meters to consider for matching',
    conflict_detection_enabled: 'Enable conflict detection and logging',
    quality_score_weights: 'Weights for quality score calculation'
  };
  
  return descriptions[key] || 'Configuration setting';
}

module.exports = {
  getConfig,
  getAllConfig,
  setConfig,
  getConfigWithOverrides,
  initializeConfig,
  validateConfig,
  DEFAULT_CONFIG
};
