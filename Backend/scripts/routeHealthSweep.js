const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const ROUTES_DIR = path.resolve(__dirname, '..', 'routes');
const INDEX_FILE = path.join(ROUTES_DIR, 'index.js');
const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];

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

const buildPath = (template) => template.replace(/\{([^}]+)\}|:([A-Za-z0-9_]+)/g, (_m, a, b) => encodeURIComponent(sampleValueByName(a || b)));

const normalizePath = (basePath, routePath) => {
  const b = String(basePath || '').trim();
  const r = String(routePath || '').trim();
  const merged = `${b}/${r}`.replace(/\/+/g, '/').replace(/\/$/, '');
  return merged.startsWith('/') ? merged : `/${merged}`;
};

const read = (filePath) => fs.readFileSync(filePath, 'utf8');

const parseRequireMap = (content) => {
  const map = new Map();
  const regex = /const\s+(\w+)\s*=\s*require\(\s*['"](\.\/.+?)['"]\s*\);/g;
  let m;
  while ((m = regex.exec(content))) {
    map.set(m[1], m[2]);
  }
  return map;
};

const parseDirectRoutes = (content) => {
  const routes = [];
  const direct = /router\.(get|post|put|patch|delete|options|head)\(\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = direct.exec(content))) {
    routes.push({ method: m[1].toUpperCase(), path: m[2] });
  }

  const chained = /router\.route\(\s*['"]([^'"]+)['"]\s*\)([\s\S]*?);/g;
  while ((m = chained.exec(content))) {
    const routePath = m[1];
    const chainBody = m[2];
    for (const method of METHODS) {
      const re = new RegExp(`\\.${method}\\(`, 'g');
      if (re.test(chainBody)) {
        routes.push({ method: method.toUpperCase(), path: routePath });
      }
    }
  }

  return routes;
};

const parseMountedRouters = (indexContent) => {
  const mounts = [];
  const useRegex = /router\.use\(\s*['"]([^'"]+)['"]\s*,\s*(\w+)\s*\)/g;
  let m;
  while ((m = useRegex.exec(indexContent))) {
    mounts.push({ basePath: m[1], variable: m[2] });
  }
  return mounts;
};

const bodyFor = (method, fullPath) => {
  const m = method.toUpperCase();
  const p = String(fullPath || '').toLowerCase();

  if (!(m === 'POST' || m === 'PUT' || m === 'PATCH')) return undefined;

  if (p.includes('/api/auth/send-otp')) return { phone: '9999999990' };
  if (p.includes('/api/auth/verify-otp')) return { phone: '9999999990', otp: '123456' };
  if (p.includes('/api/auth/refresh-token')) return { refreshToken: 'sample-refresh-token' };

  if (p.includes('/api/admin/cities') && m === 'POST') {
    return { name: 'Sample City', slug: 'sample-city', state: 'Sample State', latitude: 0, longitude: 0, deliveryAvailable: true };
  }
  if (p.includes('/api/admin/cities') && (m === 'PUT' || m === 'PATCH')) {
    return { name: 'Sample City Updated', slug: 'sample-city-updated', state: 'Sample State', latitude: 0, longitude: 0, deliveryAvailable: true, isActive: true };
  }

  if (p.includes('/api/admin/categories') && m === 'POST') {
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

  if (p.includes('/api/admin/coupons') && (m === 'POST' || m === 'PUT')) {
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

  if (p.includes('/api/admin/commission/default')) return { percentage: 10 };
  if (p.includes('/api/admin/commission/override')) return { shopId: 'sample-id', percentage: 10 };

  if (p.includes('/force-cancel')) return { reason: 'Health check' };
  if (p.endsWith('/api/admin/refunds')) return { orderId: 'sample-id', reason: 'Health check' };
  if (p.includes('/api/admin/refunds') && p.includes('/fail')) return { reason: 'Health check fail' };
  if (p.includes('/api/admin/refunds') && p.includes('/process')) return { notes: 'Health check process' };
  if (p.includes('/api/admin/refunds') && p.includes('/complete')) return { transactionRef: `health-${Date.now()}` };

  if (p.includes('/api/admin/payouts') && p.includes('/reject')) return { reason: 'Health check reject' };
  if (p.includes('/api/admin/payouts') && p.includes('/complete')) return { transactionRef: `health-${Date.now()}` };

  if (p.includes('/api/admin/payments') && p.includes('/verify')) return { verificationCode: '123456' };
  if (p.includes('/api/admin/subscription-plans') && (m === 'PUT' || m === 'POST')) {
    return {
      name: 'BASIC', slug: 'basic', description: 'Basic plan',
      pricing: { monthlyPrice: 99, yearlyPrice: 999, freePeriodMonths: 1 },
      features: [{ id: 'f1', name: 'Feature 1', icon: null, description: null }],
      limits: { maxProducts: 100, maxOffers: 10, maxImages: 5, storageGb: 1 },
      benefits: { priorityListing: false, analyticsAccess: true, apiAccess: false, dedicatedSupport: false },
      displayOrder: 1, isActive: true,
    };
  }
  if (p.includes('/api/admin/subscription-plans') && p.includes('toggle-active')) return { isActive: true };
  if (p.includes('/api/admin/config') && m === 'PUT') return { value: 'true' };

  return {};
};

const isHealthyStatus = (status) => {
  if (status >= 200 && status < 300) return true;
  if ([400, 401, 403, 404, 405, 409, 422].includes(status)) return true;
  return false;
};

const collectEndpoints = () => {
  const indexContent = read(INDEX_FILE);
  const requireMap = parseRequireMap(indexContent);
  const mounts = parseMountedRouters(indexContent);
  const directIndexRoutes = parseDirectRoutes(indexContent).map((r) => ({ ...r, path: normalizePath('/api', r.path) }));

  const endpoints = [...directIndexRoutes];

  for (const mount of mounts) {
    const rel = requireMap.get(mount.variable);
    if (!rel) continue;
    const routeFile = path.resolve(ROUTES_DIR, `${rel.replace('./', '')}.js`);
    if (!fs.existsSync(routeFile)) continue;

    const content = read(routeFile);
    const routes = parseDirectRoutes(content);

    for (const route of routes) {
      endpoints.push({
        method: route.method,
        path: normalizePath(`/api${mount.basePath}`, route.path),
      });
    }
  }

  endpoints.push({ method: 'GET', path: '/health' });

  const seen = new Set();
  return endpoints.filter((ep) => {
    const key = `${ep.method} ${ep.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const run = async () => {
  const base = BASE_URL.replace(/\/$/, '');
  const endpoints = collectEndpoints();
  const internalKey = process.env.INTERNAL_ADMIN_KEY || process.env.VITE_INTERNAL_ADMIN_KEY || '';
  const bearerToken = process.env.TEST_BEARER_TOKEN || '';

  const results = [];

  for (const ep of endpoints) {
    const finalPath = buildPath(ep.path);
    const url = `${base}${finalPath}`;
    const headers = { Accept: 'application/json' };
    if (internalKey) headers['x-internal-key'] = internalKey;
    if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`;

    const req = { method: ep.method, headers };
    const body = bodyFor(ep.method, ep.path);
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      req.body = JSON.stringify(body);
    }

    const controller = new AbortController();
    req.signal = controller.signal;
    const t = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, req);
      clearTimeout(t);
      results.push({ method: ep.method, path: ep.path, url: finalPath, status: response.status, healthy: isHealthyStatus(response.status) });
    } catch (error) {
      clearTimeout(t);
      results.push({ method: ep.method, path: ep.path, url: finalPath, status: 'ERR', healthy: false, error: error?.name === 'AbortError' ? 'timeout' : String(error?.message || error) });
    }
  }

  const total = results.length;
  const healthy = results.filter((r) => r.healthy).length;
  const unhealthy = total - healthy;

  console.log(`Route Health Sweep @ ${base}`);
  console.log(`Total routes checked: ${total}`);
  console.log(`Healthy/reachable: ${healthy}`);
  console.log(`Unhealthy: ${unhealthy}`);

  console.log('\nDetailed Results:');
  for (const r of results) {
    const s = String(r.status).padEnd(4, ' ');
    const h = r.healthy ? 'OK ' : 'BAD';
    const e = r.error ? ` | ${r.error}` : '';
    console.log(`[${h}] ${s} ${r.method.padEnd(6, ' ')} ${r.url}${e}`);
  }

  if (unhealthy > 0) process.exitCode = 2;
};

run().catch((error) => {
  console.error('Route health sweep failed:', error?.message || error);
  process.exit(1);
});
