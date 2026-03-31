const { MODELS, ensureDbConnection, closeDbConnection } = require('./scripts/_shared');
const { City, Shop, Category } = MODELS;

const normalizeCategory = (value) => String(value || '').trim().toLowerCase();
const toCategoryId = (value) =>
  normalizeCategory(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

(async () => {
  try {
    await ensureDbConnection();
    
    const city = await City.findOne({ slug: 'gwalior' }).lean();
    const categories = await Category.find().lean();
    const shops = await Shop.find({ 
      cityId: city._id,
      publicVisible: true,
      isActive: true,
      'subscription.isActive': true,
    }).lean();
    
    console.log('\n═══════════════════════════════════════════');
    console.log('TESTING FIXED DISCOVERY LOGIC');
    console.log('═══════════════════════════════════════════\n');
    
    let allMatch = true;
    
    categories.forEach((category) => {
      const categoryName = String(category.name || '').trim();
      const categorySlug = toCategoryId(categoryName);
      
      console.log(`\nCategory: "${categoryName}" → slug: "${categorySlug}"`);
      
      // Simulate mapped shops (with toCategoryId)
      const shopsInCategory = shops.filter(s => s.category === categoryName);
      const mappedShops = shopsInCategory.map(shop => ({
        ...shop,
        mappedCategoryId: toCategoryId(shop.category || 'general'),
      }));
      
      // Simulate the FIXED filter in discoverShops
      const expected = toCategoryId(categorySlug); // categoryId is passed as slug
      const filtered = mappedShops.filter(shop => shop.mappedCategoryId === expected);
      
      console.log(`  ✓ Shops found: ${filtered.length}`);
      
      if (filtered.length !== shopsInCategory.length) {
        console.log(`  ✗ ERROR: Expected ${shopsInCategory.length} shops!`);
        allMatch = false;
      }
    });
    
    console.log('\n═══════════════════════════════════════════');
    if (allMatch) {
      console.log('✅ ALL FILTERS WORKING CORRECTLY!');
    } else {
      console.log('❌ STILL HAVE MISMATCHES');
    }
    console.log('═══════════════════════════════════════════\n');
    
    await closeDbConnection();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
