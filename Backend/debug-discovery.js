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
    console.log('DEBUGGING SHOP DISCOVERY');
    console.log('═══════════════════════════════════════════\n');
    
    categories.forEach((category) => {
      const categoryName = String(category.name || '').trim();
      const categorySlug = toCategoryId(categoryName);
      
      console.log(`\nCategory: "${categoryName}"`);
      console.log(`  Generated slug: "${categorySlug}"`);
      
      // Check what would be passed to discoverShops
      const passedCategoryId = categorySlug;
      const normalizedPassedId = normalizeCategory(passedCategoryId);
      console.log(`  Passed categoryId would be: "${passedCategoryId}"`);
      console.log(`  Normalized passed ID: "${normalizedPassedId}"`);
      
      // Simulate mapApiShop
      const shopsInCategory = shops.filter(s => s.category === categoryName);
      const mappedShops = shopsInCategory.map(shop => ({
        ...shop,
        mappedCategoryId: normalizeCategory(shop.category || 'general'),
      }));
      
      // Simulate the filter in discoverShops
      const expected = normalizeCategory(passedCategoryId);
      console.log(`  Filter expected: "${expected}"`);
      
      const filtered = mappedShops.filter(
        shop => normalizeCategory(shop.mappedCategoryId) === expected
      );
      
      console.log(`  Shops found: ${filtered.length}`);
      
      if (filtered.length === 0 && shopsInCategory.length > 0) {
        console.log(`  ⚠️ MISMATCH! Shop category: "${shopsInCategory[0].category}"`);
        console.log(`     normalizeCategory(shop.category): "${normalizeCategory(shopsInCategory[0].category)}"`);
      }
    });
    
    await closeDbConnection();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
