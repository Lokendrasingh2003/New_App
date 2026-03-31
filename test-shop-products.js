#!/usr/bin/env node

/**
 * Test Shop Products API - Debug why products aren't showing
 */

const http = require('http');

const API_BASE_URL = 'http://172.20.10.5:5000';
const TIMEOUT = 10000;

async function fetchWithTimeout(url, options = {}, timeout = TIMEOUT) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Request timeout after ${timeout}ms`));
    }, timeout);

    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? require('https') : http;
    
    const req = protocol.request(url, { ...options, timeout }, (res) => {
      clearTimeout(timeoutId);
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data, raw: true });
        }
      });
    });

    req.on('error', (err) => {
      clearTimeout(timeoutId);
      reject(err);
    });

    req.on('timeout', () => {
      clearTimeout(timeoutId);
      req.destroy();
      reject(new Error('Socket timeout'));
    });

    req.end();
  });
}

async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Shop Products API Diagnostics - Debug "Visit Shop" Issue      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Get cities
    console.log('[STEP 1] Fetching cities...');
    const citiesResult = await fetchWithTimeout(`${API_BASE_URL}/api/cities`);
    
    if (!citiesResult.data?.data?.cities || citiesResult.data.data.cities.length === 0) {
      console.error('✗ No cities found');
      process.exit(1);
    }
    
    const gwaliorCity = citiesResult.data.data.cities.find(c => c.cityName?.toLowerCase().includes('gwalior'));
    const cityId = (gwaliorCity || citiesResult.data.data.cities[0])._id;
    console.log(`✓ Found city ID: ${cityId}\n`);

    // Step 2: Get shops for the city
    console.log('[STEP 2] Fetching shops for city...');
    const shopsResult = await fetchWithTimeout(`${API_BASE_URL}/api/cities/${cityId}/shops?limit=10&offset=0`);
    
    if (!shopsResult.data?.data?.shops || shopsResult.data.data.shops.length === 0) {
      console.error('✗ No shops found for this city');
      process.exit(1);
    }
    
    const shops = shopsResult.data.data.shops;
    console.log(`✓ Found ${shops.length} shops`);
    
    // Debug: Print raw shop response to see what fields are present
    if (shops.length > 0) {
      console.log(`\nRaw first shop object:`, JSON.stringify(shops[0], null, 2));
    }
    
    // Test each shop
    for (const shop of shops.slice(0, 3)) {
      const shopId = shop._id || shop.id;
      console.log(`\n[SHOP TEST] ${shop.shopName} (ID: ${shopId})`);
      console.log(`  Category: ${shop.category}`);
      console.log(`  Active: ${shop.publicVisible}, Subscription: ${shop.subscription?.isActive}`);
      
      try {
        // Test the products API
        const productsUrl = `${API_BASE_URL}/api/products/shops/${shopId}?limit=100&offset=0`;
        console.log(`  Fetching products from: ${productsUrl}`);
        
        const productsResult = await fetchWithTimeout(productsUrl);
        
        if (productsResult.status !== 200) {
          console.log(`  ✗ HTTP ${productsResult.status}`);
          console.log(`    Error: ${productsResult.data?.message || 'Unknown error'}`);
          continue;
        }
        
        const products = productsResult.data?.data?.products || [];
        const pagination = productsResult.data?.data?.pagination || {};
        
        console.log(`  ✓ Status: 200`);
        console.log(`  ✓ Products: ${products.length}`);
        console.log(`  ✓ Total: ${pagination.total || 0}`);
        
        if (products.length === 0) {
          console.log(`  ⚠ No products found for this shop!`);
        } else {
          // Show first product details
          const firstProduct = products[0];
          console.log(`  📦 First product:`);
          console.log(`     Name: ${firstProduct.name}`);
          console.log(`     Price: ${firstProduct.basePrice}`);
          console.log(`     MRP: ${firstProduct.baseMrp}`);
          console.log(`     In Stock: ${firstProduct.inStock}`);
          console.log(`     Images: ${firstProduct.images?.length || 0}`);
          console.log(`     Variants: ${firstProduct.variants?.length || 0}`);
        }
      } catch (error) {
        console.log(`  ✗ Error: ${error.message}`);
      }
    }

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ANALYSIS COMPLETE                                           ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    
    console.log('📋 Troubleshooting Guide:');
    console.log('  1. If HTTP 404: Shop exists but is missing eligibility filters');
    console.log('  2. If HTTP 200 but 0 products: Products exist but not linked to shop');
    console.log('  3. If HTTP 200 with products: Issue is on the frontend side\n');

  } catch (error) {
    console.error(`✗ Fatal error: ${error.message}`);
    process.exit(1);
  }
}

runTests();
