const { MODELS, ensureDbConnection, closeDbConnection } = require('./_shared');
const { City, Shop, Product, Category } = MODELS;

(async () => {
  try {
    await ensureDbConnection();
    
    const city = await City.findOne({ slug: 'gwalior' }).lean();
    const categories = await Category.find().lean();
    const shops = await Shop.find({ cityId: city._id }).lean();
    const products = await Product.find().lean();
    
    console.log('\n═══════════════════════════════════════════');
    console.log('CATEGORIES IN DATABASE:');
    console.log('═══════════════════════════════════════════');
    categories.forEach(cat => {
      console.log(`  - "${cat.name}" (${cat._id})`);
    });

    console.log('\n═══════════════════════════════════════════');
    console.log('SHOPS BY CATEGORY:');
    console.log('═══════════════════════════════════════════');
    const byCategory = {};
    shops.forEach(shop => {
      if (!byCategory[shop.category]) byCategory[shop.category] = [];
      byCategory[shop.category].push(shop._id);
    });

    Object.entries(byCategory).forEach(([cat, ids]) => {
      const catDoc = categories.find(c => c.name.toLowerCase() === cat.toLowerCase());
      console.log(`  "${cat}" (${ids.length} shops) -> Category ID: ${catDoc ? catDoc._id : 'NOT FOUND'}`);
    });

    console.log('\n═══════════════════════════════════════════');
    console.log('PRODUCTS COUNT:');
    console.log('═══════════════════════════════════════════');
    console.log(`  Total Products: ${products.length}`);
    console.log(`  Total Shops: ${shops.length}`);
    console.log(`  Avg Products/Shop: ${Math.round(products.length / shops.length)}`);

    await closeDbConnection();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
