const DEFAULT_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head']);

const sampleValueByName = (name) => {
  const key = String(name || '').toLowerCase();
  if (key.includes('id')) return 'sample-id';
  if (key.includes('phone')) return '9999999990';
  if (key.includes('email')) return 'test@example.com';
  if (key.includes('otp')) return '123456';
  if (key.includes('slug')) return 'sample-slug';
  if (key.includes('code')) return 'SAMPLE01';
  return 'sample';
};

const buildPath = (pathTemplate) =>
  pathTemplate.replace(/\{([^}]+)\}/g, (_match, name) => encodeURIComponent(sampleValueByName(name)));

const buildBody = (path, method) => {
  const p = path.toLowerCase();
  const m = method.toLowerCase();

  if (p.includes('/auth/send-otp')) return { phone: '9999999990' };
  if (p.includes('/auth/verify-otp')) return { phone: '9999999990', otp: '123456' };
  if (p.includes('/auth/refresh-token')) return { refreshToken: 'sample-refresh-token' };

  if (p.includes('/admin/cities') && m === 'post') {
    return { name: 'Sample City', slug: 'sample-city', state: 'Sample State', latitude: 0, longitude: 0, deliveryAvailable: true };
  }
  if (p.includes('/admin/cities') && (m === 'put' || m === 'patch')) {
    return { name: 'Sample City Updated', slug: 'sample-city-updated', state: 'Sample State', latitude: 0, longitude: 0, deliveryAvailable: true, isActive: true };
  }

  if (p.includes('/admin/categories') && m === 'post') {
    return {
      name: 'Sample Category',
      slug: 'sample-category',
      description: 'Sample category',
      image: 'https://placehold.co/600x400/png',
      icon: 'https://placehold.co/64x64/png',
      displayOrder: 1,
      subcategories: [{ id: 'sub-1', name: 'Sample Sub', slug: 'sample-sub', isActive: true }],
    };
  }

  if (p.includes('/admin/coupons') && (m === 'post' || m === 'put')) {
    return {
      code: 'SAMPLE10',
      discountType: 'FLAT',
      discountValue: 10,
      maxDiscount: 100,
      minOrderValue: 100,
      maxUsageLimit: 1000,
      maxUsagePerUser: 1,
      validFrom: new Date().toISOString(),
      validTill: new Date(Date.now() + 86400000).toISOString(),
      applicableCity: null,
      applicableShops: [],
      applicableCategories: [],
      isActive: true,
    };
  }

  if (p.includes('/admin/commission/default')) return { percentage: 10 };
  if (p.includes('/admin/commission/override')) return { shopId: 'sample-id', percentage: 10 };

  if (p.includes('/admin/orders') && p.includes('force-cancel')) return { reason: 'Health check' };
  if (p.includes('/admin/refunds') && p.endsWith('/api/admin/refunds')) return { orderId: 'sample-id', reason: 'Health check' };
  if (p.includes('/admin/refunds') && p.includes('/fail')) return { reason: 'Health check fail' };
  if (p.includes('/admin/refunds') && p.includes('/process')) return { notes: 'Health check process' };
  if (p.includes('/admin/refunds') && p.includes('/complete')) return { transactionRef: `health-${Date.now()}` };

  if (p.includes('/admin/payouts') && p.includes('/reject')) return { reason: 'Health check reject' };
  if (p.includes('/admin/payouts') && p.includes('/complete')) return { transactionRef: `health-${Date.now()}` };

  if (p.includes('/admin/payments') && p.includes('/verify')) return { verificationCode: '123456' };

  if (p.includes('/admin/subscription-plans') && (m === 'put' || m === 'post')) {
    return {
      name: 'BASIC',
      slug: 'basic',
      description: 'Basic plan',
      pricing: { monthlyPrice: 99, yearlyPrice: 999, freePeriodMonths: 1 },
      features: [{ id: 'f1', name: 'Feature 1', icon: null, description: null }],
      limits: { maxProducts: 100, maxOffers: 10, maxImages: 5, storageGb: 1 },
      benefits: { priorityListing: false, analyticsAccess: true, apiAccess: false, dedicatedSupport: false },
      displayOrder: 1,
      isActive: true,
    };
  }
  if (p.includes('/admin/subscription-plans') && p.includes('toggle-active')) return { isActive: true };

  if (p.includes('/admin/config') && m === 'put') return { value: 'true' };

  return {};
};

const isHealthyStatus = (status) => {
  if (status >= 200 && status < 300) return true;
  if (status === 400 || status === 401 || status === 403 || status === 404 || status === 405 || status === 409 || status === 422) return true;
  return false;
};

const run = async () => {
  const baseUrl = DEFAULT_BASE_URL.replace(/\/$/, '');
  const docsResponse = await fetch(`${baseUrl}/api-docs.json`);

  if (!docsResponse.ok) {
    console.error(`Failed to load swagger docs: HTTP ${docsResponse.status}`);
    process.exit(1);
  }

  const docs = await docsResponse.json();
  const paths = docs?.paths || {};

  const internalKey = process.env.INTERNAL_ADMIN_KEY || process.env.VITE_INTERNAL_ADMIN_KEY || '';
  const bearerToken = process.env.TEST_BEARER_TOKEN || '';

  const results = [];

  for (const [pathTemplate, ops] of Object.entries(paths)) {
    const entries = Object.entries(ops || {}).filter(([method]) => HTTP_METHODS.has(String(method).toLowerCase()));

    for (const [method] of entries) {
      const finalPath = buildPath(pathTemplate);
      const url = `${baseUrl}${finalPath}`;
      const upperMethod = method.toUpperCase();

      const headers = { Accept: 'application/json' };
      if (internalKey) headers['x-internal-key'] = internalKey;
      if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`;

      const req = { method: upperMethod, headers };
      if (upperMethod === 'POST' || upperMethod === 'PUT' || upperMethod === 'PATCH') {
        headers['Content-Type'] = 'application/json';
        req.body = JSON.stringify(buildBody(pathTemplate, upperMethod));
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      req.signal = controller.signal;

      try {
        const response = await fetch(url, req);
        clearTimeout(timeout);
        const status = response.status;
        results.push({ method: upperMethod, path: pathTemplate, url: finalPath, status, healthy: isHealthyStatus(status) });
      } catch (error) {
        clearTimeout(timeout);
        results.push({
          method: upperMethod,
          path: pathTemplate,
          url: finalPath,
          status: 'ERR',
          healthy: false,
          error: error?.name === 'AbortError' ? 'timeout' : String(error?.message || error),
        });
      }
    }
  }

  const total = results.length;
  const healthy = results.filter((r) => r.healthy).length;
  const unhealthy = results.filter((r) => !r.healthy).length;

  console.log(`API Health Sweep @ ${baseUrl}`);
  console.log(`Total endpoints checked: ${total}`);
  console.log(`Healthy/reachable: ${healthy}`);
  console.log(`Unhealthy: ${unhealthy}`);

  console.log('\nDetailed Results:');
  for (const result of results) {
    const statusText = String(result.status).padEnd(4, ' ');
    const healthText = result.healthy ? 'OK ' : 'BAD';
    const err = result.error ? ` | ${result.error}` : '';
    console.log(`[${healthText}] ${statusText} ${result.method.padEnd(6, ' ')} ${result.url}${err}`);
  }

  if (unhealthy > 0) {
    process.exitCode = 2;
  }
};

run().catch((error) => {
  console.error('Health sweep failed:', error?.message || error);
  process.exit(1);
});
