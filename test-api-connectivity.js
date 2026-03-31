#!/usr/bin/env node

/**
 * API Connectivity Test - Simulates what the User-app does
 */

const http = require('http');

const API_BASE_URL = 'http://172.20.10.5:5000';
const TIMEOUT = 10000; // 10 seconds

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

async function test(name, url) {
  try {
    console.log(`\n[TEST] ${name}`);
    console.log(`URL: ${url}`);
    const start = Date.now();
    const result = await fetchWithTimeout(url);
    const elapsed = Date.now() - start;
    console.log(`✓ Status: ${result.status} (${elapsed}ms)`);
    if (result.data && result.data.success !== undefined) {
      console.log(`✓ Success: ${result.data.success}`);
      console.log(`✓ Message: ${result.data.message}`);
    }
    return true;
  } catch (error) {
    console.error(`✗ FAILED: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║  User-App API Connectivity Diagnostics    ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log(`\nAPI Base URL: ${API_BASE_URL}`);
  console.log(`Timeout: ${TIMEOUT}ms\n`);

  const tests = [
    ['Health Check', `${API_BASE_URL}/api/health`],
    ['Get Cities', `${API_BASE_URL}/api/cities?limit=20&offset=0&_ts=${Date.now()}`],
    ['Get Categories', `${API_BASE_URL}/api/categories?limit=20&offset=0&_ts=${Date.now()}`],
    ['Get Public Coupons', `${API_BASE_URL}/api/coupons/public?limit=20&offset=0&_ts=${Date.now()}`],
  ];

  const results = [];
  for (const [name, url] of tests) {
    const passed = await test(name, url);
    results.push({ name, passed });
  }

  // Get city ID for shops test
  try {
    console.log(`\n[TEST] Get City ID for Shops Test`);
    const citiesResult = await fetchWithTimeout(`${API_BASE_URL}/api/cities`);
    if (citiesResult.data?.data?.cities?.[0]?._id) {
      const cityId = citiesResult.data.data.cities[0]._id;
      console.log(`✓ City ID: ${cityId}`);
      
      const shopsUrl = `${API_BASE_URL}/api/cities/${cityId}/shops?limit=100&offset=0&_ts=${Date.now()}`;
      const passed = await test(`Get Shops for City ${cityId}`, shopsUrl);
      results.push({ name: 'Get Shops for City', passed });
    }
  } catch (error) {
    console.error(`✗ Could not get city ID: ${error.message}`);
    results.push({ name: 'Get Shops for City', passed: false });
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║  TEST SUMMARY                             ║');
  console.log('╚════════════════════════════════════════════╝\n');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(r => {
    const icon = r.passed ? '✓' : '✗';
    console.log(`${icon} ${r.name}`);
  });
  
  console.log(`\n${passed}/${total} tests passed\n`);
  
  if (passed === total) {
    console.log('✓ All tests passed! App should be able to connect.');
    console.log('\n🔧 If app still shows "home unavailable":');
    console.log('   1. Restart the React Native app (Expo)');
    console.log('   2. Press "r" to reload in Expo');
    console.log('   3. Clear app cache: expo start --clear');
    console.log('   4. Check browser/emulator console for [API] logs\n');
  } else {
    console.log('✗ Some tests failed. Please check:');
    console.log('   1. Backend server is running on port 5000');
    console.log('   2. API URL is correct: ' + API_BASE_URL);
    console.log('   3. Network connectivity to 172.20.10.5');
    console.log('   4. CORS is configured in Backend/.env\n');
  }

  process.exit(passed === total ? 0 : 1);
}

runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
