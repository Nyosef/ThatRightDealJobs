#!/usr/bin/env node

/**
 * Merge Listings Task
 * Main script to merge property listings from Zillow, Redfin, and Realtor sources
 * 
 * Usage:
 *   node scripts/merge-listings-task.js [options]
 *   
 * Options:
 *   --zip=16146          Process only listings for specific zip code
 *   --stats              Show statistics only (no processing)
 *   --conflicts          Show conflict analysis
 *   --init-config        Initialize configuration with defaults
 *   --dry-run           Show what would be processed without making changes
 *   --help              Show this help message
 */

require('dotenv').config();

const mergedListing = require('../models/merged-listing');
const mergeConfig = require('../utils/merge-config');

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    zipCode: null,
    showStats: false,
    showConflicts: false,
    initConfig: false,
    dryRun: false,
    help: false
  };
  
  args.forEach(arg => {
    if (arg.startsWith('--zip=')) {
      options.zipCode = arg.split('=')[1];
    } else if (arg === '--stats') {
      options.showStats = true;
    } else if (arg === '--conflicts') {
      options.showConflicts = true;
    } else if (arg === '--init-config') {
      options.initConfig = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--help') {
      options.help = true;
    }
  });
  
  return options;
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
Merge Listings Task - Merge property data from multiple sources

Usage:
  node scripts/merge-listings-task.js [options]

Options:
  --zip=16146          Process only listings for specific zip code
  --stats              Show statistics only (no processing)
  --conflicts          Show conflict analysis
  --init-config        Initialize configuration with defaults
  --dry-run           Show what would be processed without making changes
  --help              Show this help message

Examples:
  # Merge all listings
  node scripts/merge-listings-task.js

  # Merge listings for specific zip code
  node scripts/merge-listings-task.js --zip=16146

  # Show recent statistics
  node scripts/merge-listings-task.js --stats

  # Show conflict analysis
  node scripts/merge-listings-task.js --conflicts

  # Initialize configuration
  node scripts/merge-listings-task.js --init-config

Environment Variables:
  MERGE_COORDINATE_TOLERANCE_METERS    Distance tolerance for coordinate matching (default: 50)
  MERGE_ADDRESS_FUZZY_THRESHOLD        Fuzzy matching threshold (default: 0.8)
  MERGE_PRICE_CONFLICT_THRESHOLD       Price conflict threshold (default: 0.05)
  MERGE_ENABLE_FUZZY_MATCHING          Enable fuzzy matching (default: true)
  MERGE_MIN_CONFIDENCE_SCORE           Minimum confidence score (default: 0.7)
  MERGE_MAX_COORDINATE_DISTANCE        Maximum coordinate distance (default: 100)
  MERGE_CONFLICT_DETECTION_ENABLED     Enable conflict detection (default: true)
`);
}

/**
 * Show recent merge statistics
 */
async function showStatistics() {
  try {
    console.log('📊 Recent Merge Statistics\n');
    
    // Get last 7 days of statistics
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const stats = await mergedListing.getMergeStatistics(startDate, endDate);
    
    if (stats.length === 0) {
      console.log('No merge statistics found for the last 7 days.');
      return;
    }
    
    console.log('Date       | Processed | Merged | Exact | Fuzzy | Coord | Conflicts | Time(s)');
    console.log('-----------|-----------|--------|-------|-------|-------|-----------|--------');
    
    stats.forEach(stat => {
      const date = stat.run_date;
      const processed = stat.total_processed.toString().padStart(9);
      const merged = stat.total_merged.toString().padStart(6);
      const exact = stat.exact_matches.toString().padStart(5);
      const fuzzy = stat.fuzzy_matches.toString().padStart(5);
      const coord = stat.coordinate_matches.toString().padStart(5);
      const conflicts = stat.conflicts_detected.toString().padStart(9);
      const time = stat.processing_time_seconds.toString().padStart(7);
      
      console.log(`${date} |${processed} |${merged} |${exact} |${fuzzy} |${coord} |${conflicts} |${time}`);
    });
    
    // Summary
    const totals = stats.reduce((acc, stat) => ({
      processed: acc.processed + stat.total_processed,
      merged: acc.merged + stat.total_merged,
      conflicts: acc.conflicts + stat.conflicts_detected,
      time: acc.time + stat.processing_time_seconds
    }), { processed: 0, merged: 0, conflicts: 0, time: 0 });
    
    console.log('\n📈 Summary (Last 7 days):');
    console.log(`Total Processed: ${totals.processed.toLocaleString()}`);
    console.log(`Total Merged: ${totals.merged.toLocaleString()}`);
    console.log(`Total Conflicts: ${totals.conflicts.toLocaleString()}`);
    console.log(`Total Processing Time: ${totals.time} seconds`);
    console.log(`Average Merge Rate: ${totals.processed > 0 ? ((totals.merged / totals.processed) * 100).toFixed(1) : 0}%`);
    
  } catch (error) {
    console.error('❌ Error showing statistics:', error.message);
    process.exit(1);
  }
}

/**
 * Show conflict analysis
 */
async function showConflictAnalysis(zipCode = null) {
  try {
    console.log(`🔍 Conflict Analysis${zipCode ? ` for zip code ${zipCode}` : ''}\n`);
    
    const summary = await mergedListing.getConflictSummary(zipCode);
    
    console.log('📊 Overview:');
    console.log(`Total Listings: ${summary.total_listings.toLocaleString()}`);
    console.log(`Listings with Conflicts: ${summary.listings_with_conflicts.toLocaleString()} (${summary.total_listings > 0 ? ((summary.listings_with_conflicts / summary.total_listings) * 100).toFixed(1) : 0}%)`);
    console.log(`Price Conflicts: ${summary.price_conflicts.toLocaleString()}`);
    console.log(`Size Conflicts: ${summary.size_conflicts.toLocaleString()}`);
    console.log(`Average Conflicts per Listing: ${summary.avg_conflicts_per_listing.toFixed(2)}`);
    
    console.log('\n🏷️ Conflict Types:');
    const sortedConflicts = Object.entries(summary.conflict_types)
      .sort(([,a], [,b]) => b - a);
    
    if (sortedConflicts.length === 0) {
      console.log('No conflicts detected.');
    } else {
      sortedConflicts.forEach(([field, count]) => {
        const percentage = summary.total_listings > 0 ? ((count / summary.total_listings) * 100).toFixed(1) : 0;
        console.log(`  ${field}: ${count} (${percentage}%)`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error showing conflict analysis:', error.message);
    process.exit(1);
  }
}

/**
 * Initialize configuration
 */
async function initializeConfiguration() {
  try {
    console.log('🔧 Initializing merge configuration...\n');
    
    const success = await mergeConfig.initializeConfig();
    
    if (success) {
      console.log('✅ Configuration initialized successfully');
      
      // Show current configuration
      const config = await mergeConfig.getAllConfig();
      console.log('\n📋 Current Configuration:');
      Object.entries(config).forEach(([key, value]) => {
        console.log(`  ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
      });
    } else {
      console.log('❌ Failed to initialize configuration');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error initializing configuration:', error.message);
    process.exit(1);
  }
}

/**
 * Show what would be processed in dry run mode
 */
async function showDryRun(zipCode = null) {
  try {
    console.log(`🔍 Dry Run - Analyzing what would be processed${zipCode ? ` for zip code ${zipCode}` : ''}...\n`);
    
    const sourceListings = await mergedListing.getAllSourceListings(zipCode);
    
    console.log('📊 Source Data Summary:');
    console.log(`Zillow Listings: ${sourceListings.zillow.length.toLocaleString()}`);
    console.log(`Redfin Listings: ${sourceListings.redfin.length.toLocaleString()}`);
    console.log(`Realtor Listings: ${sourceListings.realtor.length.toLocaleString()}`);
    console.log(`Total Source Listings: ${(sourceListings.zillow.length + sourceListings.redfin.length + sourceListings.realtor.length).toLocaleString()}`);
    
    // Estimate unique addresses
    const allAddresses = new Set();
    sourceListings.zillow.forEach(l => allAddresses.add(l.address?.toLowerCase().trim()));
    sourceListings.redfin.forEach(l => allAddresses.add(l.address?.toLowerCase().trim()));
    sourceListings.realtor.forEach(l => allAddresses.add(l.street?.toLowerCase().trim()));
    
    console.log(`Estimated Unique Addresses: ${allAddresses.size.toLocaleString()}`);
    
    // Show configuration that would be used
    const config = await mergeConfig.getConfigWithOverrides();
    console.log('\n⚙️ Configuration to be used:');
    console.log(`Coordinate Tolerance: ${config.coordinate_tolerance_meters}m`);
    console.log(`Fuzzy Matching: ${config.enable_fuzzy_matching ? 'Enabled' : 'Disabled'}`);
    console.log(`Fuzzy Threshold: ${config.address_fuzzy_threshold}`);
    console.log(`Price Conflict Threshold: ${(config.price_conflict_threshold * 100).toFixed(1)}%`);
    console.log(`Min Confidence Score: ${config.min_confidence_score}`);
    console.log(`Conflict Detection: ${config.conflict_detection_enabled ? 'Enabled' : 'Disabled'}`);
    
    console.log('\n✅ Dry run completed. Use without --dry-run to execute the merge.');
    
  } catch (error) {
    console.error('❌ Error in dry run:', error.message);
    process.exit(1);
  }
}

/**
 * Main execution function
 */
async function main() {
  const options = parseArgs();
  
  if (options.help) {
    showHelp();
    return;
  }
  
  console.log('🏠 ThatRightDeal - Merge Listings Task');
  console.log('=====================================\n');
  
  try {
    if (options.initConfig) {
      await initializeConfiguration();
      return;
    }
    
    if (options.showStats) {
      await showStatistics();
      return;
    }
    
    if (options.showConflicts) {
      await showConflictAnalysis(options.zipCode);
      return;
    }
    
    if (options.dryRun) {
      await showDryRun(options.zipCode);
      return;
    }
    
    // Main merge process
    console.log(`🚀 Starting merge process${options.zipCode ? ` for zip code ${options.zipCode}` : ' for all listings'}...`);
    console.log(`⏰ Started at: ${new Date().toLocaleString()}\n`);
    
    const results = await mergedListing.processAllListings(options.zipCode);
    
    console.log('\n✅ Merge process completed successfully!');
    console.log('=====================================');
    console.log(`📊 Results Summary:`);
    console.log(`   Total Processed: ${results.total_processed.toLocaleString()}`);
    console.log(`   Total Merged: ${results.total_merged.toLocaleString()}`);
    console.log(`   Exact Matches: ${results.exact_matches.toLocaleString()}`);
    console.log(`   Fuzzy Matches: ${results.fuzzy_matches.toLocaleString()}`);
    console.log(`   Coordinate Matches: ${results.coordinate_matches.toLocaleString()}`);
    console.log(`   No Matches: ${results.no_matches.toLocaleString()}`);
    console.log(`   Conflicts Detected: ${results.conflicts_detected.toLocaleString()}`);
    console.log(`   Errors: ${results.errors.toLocaleString()}`);
    console.log(`   Processing Time: ${results.processing_time_seconds} seconds`);
    
    if (results.total_processed > 0) {
      const mergeRate = ((results.total_merged / results.total_processed) * 100).toFixed(1);
      console.log(`   Merge Success Rate: ${mergeRate}%`);
    }
    
    console.log(`\n⏰ Completed at: ${new Date().toLocaleString()}`);
    
    // Show recommendations if there are issues
    if (results.errors > 0) {
      console.log(`\n⚠️  Warning: ${results.errors} errors occurred during processing.`);
      console.log('   Check the logs above for details.');
    }
    
    if (results.no_matches > results.total_merged) {
      console.log('\n💡 Tip: High number of unmatched listings detected.');
      console.log('   Consider adjusting fuzzy matching thresholds or coordinate tolerance.');
      console.log('   Run with --conflicts to analyze matching issues.');
    }
    
    if (results.conflicts_detected > 0) {
      console.log(`\n🔍 Info: ${results.conflicts_detected} data conflicts were detected and resolved.`);
      console.log('   Run with --conflicts to see detailed conflict analysis.');
    }
    
  } catch (error) {
    console.error('\n❌ Error during merge process:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the main function
if (require.main === module) {
  main();
}

module.exports = { main, parseArgs, showHelp };
