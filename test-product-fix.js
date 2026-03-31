#!/usr/bin/env node

/**
 * Test Product Fetching After Fix - Verify products show up in shop
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
  console.log('║  Simulate Frontend Product Fetching After Fix                  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // Get city
    const citiesResult = await fetchWithTimeout(`${API_BASE_URL}/api/cities`);
    const gwaliorCity = citiesResult.data?.data?.cities?.find(c => c.cityName?.toLowerCase().includes('gwalior'));
    const cityId = (gwaliorCity || citiesResult.data.data.cities[0])._id;

    // Get a shop
    const shopsResult = await fetchWithTimeout(`${API_BASE_URL}/api/cities/${cityId}/shops?limit=1`);
    const shop = shopsResult.data.data.shops[0];
    console.log(`Testing shop: ${shop.shopName} (ID: ${shop.id})\n`);

    // STEP 1: Get shop details (what getMockShopById does)
    console.log('[STEP 1] Fetching shop details...');
    const shopDetailsResult = await fetchWithTimeout(`${API_BASE_URL}/api/shops/${shop.id}`);
    const shopDetail = shopDetailsResult.data.data.shop;
    console.log(`✓ Shop: ${shopDetail.shopName}`);
    console.log(`  Category: ${shopDetail.category}\n`);

    // STEP 2: Get all products from shop (to determine subcategories)
    console.log('[STEP 2] Fetching all products to determine subcategories...');
    const allProductsResult = await fetchWithTimeout(`${API_BASE_URL}/api/products/shops/${shop.id}?limit=100`);
    const products = allProductsResult.data.data.products;
    console.log(`✓ Found ${products.length} products`);

    // Collect unique subcategories (like getShopSubcategories does)
    const uniqueSubcategories = new Map();
    products.forEach(product => {
      const subcategory = product.subcategory?.trim() || null;
      if (!subcategory) {
        // Treat null subcategory as 'all-products'
        if (!uniqueSubcategories.has('all-products')) {
          uniqueSubcategories.set('all-products', { id: 'all-products', name: 'All Products' });
        }
      } else {
        const slug = String(subcategory)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        if (!uniqueSubcategories.has(slug)) {
          uniqueSubcategories.set(slug, { id: slug, name: subcategory });
        }
      }
    });

    console.log(`✓ Subcategories found: ${[...uniqueSubcategories.values()].map(s => s.name).join(', ')}\n`);

    // STEP 3: For each subcategory, test if products are returned
    console.log('[STEP 3] Testing product filtering for each subcategory...');
    for (const subcategory of uniqueSubcategories.values()) {
      console.log(`\n  Subcategory: ${subcategory.name} (ID: ${subcategory.id})`);

      let matchedCount = 0;
      for (const shortProduct of products.slice(0, 5)) {
        // Fetch full product detail
        const detailResult = await fetchWithTimeout(`${API_BASE_URL}/api/products/${shortProduct.id}`);
        const detail = detailResult.data.data.product;

        // Apply same filtering logic as mockProducts.ts
        const detailSubcategoryId = detail.subcategory
          ? String(detail.subcategory)
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '')
          : 'all-products';

        if (detailSubcategoryId === subcategory.id) {
          matchedCount++;
          console.log(`    ✓ ${detail.name} → matches`);
        } else {
          console.log(`    ✗ ${detail.name} → ${detailSubcategoryId} (doesn't match ${subcategory.id})`);
        }
      }

      console.log(`  Result: ${matchedCount} products would display in this category`);
    }

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  TEST COMPLETE                                               ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log('✅ If products matched above, the fix should work!');
    console.log('   Rebuild the React Native app and test "Visit Shop" again.\n');

  } catch (error) {
    console.error(`✗ Fatal error: ${error.message}`);
    process.exit(1);
  }
}

runTests();
