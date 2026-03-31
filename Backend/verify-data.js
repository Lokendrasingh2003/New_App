const { MODELS, ensureDbConnection, closeDbConnection } = require('./scripts/_shared');
const { Category, Shop, Product, City } = MODELS;

(async () => {
  try {
    await ensureDbConnection();
    
    const city = await City.findOne({ slug: 'gwalior' }).lean();
    const categories = await Category.find().lean();
    const shops = await Shop.find({ cityId: city._id }).lean();
    const products = await Product.find().lean();
    
    console.log('\n✅ ═══════════════════════════════════════════');
    console.log('✅ DATABASE SUMMARY');
    console.log('✅ ═══════════════════════════════════════════');
    console.log('✅ City:', city.name);
    console.log('✅ Total Categories:', categories.length);
    console.log('✅ Total Shops in Gwalior:', shops.length);
    console.log('✅ Total Products:', products.length);
    console.log('✅ ═══════════════════════════════════════════\n');
    
    // Show breakdown by category
    console.log('CATEGORIES BREAKDOWN:');
    for (const cat of categories) {
      const catShops = shops.filter(s => s.category === cat.name);
      console.log('  ' + cat.name + ': ' + catShops.length + ' shops');
    }
    
    await closeDbConnection();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
