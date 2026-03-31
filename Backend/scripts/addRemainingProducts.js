const { MODELS, ensureDbConnection, closeDbConnection } = require('./_shared');
const { Shop, Product, City, Category } = MODELS;

const PRODUCTS_BY_CATEGORY = {
  'Grocery': [
    { name: 'Rice (1kg)', price: 60 },
    { name: 'Wheat Flour (1kg)', price: 45 },
    { name: 'Dal (1kg)', price: 120 },
    { name: 'Oil (1L)', price: 200 },
    { name: 'Sugar (1kg)', price: 55 },
    { name: 'Salt (1kg)', price: 25 },
    { name: 'Tea (250g)', price: 150 },
    { name: 'Coffee (100g)', price: 180 },
    { name: 'Milk (1L)', price: 70 },
    { name: 'Butter (200g)', price: 280 },
  ],
  'Groceries': [
    { name: 'Rice (1kg)', price: 60 },
    { name: 'Wheat Flour (1kg)', price: 45 },
    { name: 'Dal (1kg)', price: 120 },
    { name: 'Oil (1L)', price: 200 },
    { name: 'Sugar (1kg)', price: 55 },
    { name: 'Salt (1kg)', price: 25 },
    { name: 'Tea (250g)', price: 150 },
    { name: 'Coffee (100g)', price: 180 },
    { name: 'Milk (1L)', price: 70 },
    { name: 'Butter (200g)', price: 280 },
  ],
  'Medical': [
    { name: 'Paracetamol 500mg', price: 45 },
    { name: 'Ibuprofen 400mg', price: 60 },
    { name: 'Amoxicillin 500mg', price: 120 },
    { name: 'Metformin 500mg', price: 85 },
    { name: 'Vitamin C Tablets', price: 150 },
    { name: 'First Aid Kit', price: 450 },
    { name: 'Antiseptic Lotion', price: 85 },
    { name: 'Bandages Pack', price: 65 },
    { name: 'Thermometer Digital', price: 250 },
    { name: 'Blood Pressure Monitor', price: 1500 },
  ],
};

const getCategoryIdForShop = (shopCategory, categoryMap) => {
  // Try exact match first
  if (categoryMap[shopCategory]) return categoryMap[shopCategory];
  
  // Try mapping shortcuts
  if (shopCategory === 'Grocery') return categoryMap['Grocery Shops'];
  if (shopCategory === 'Groceries') return categoryMap['Grocery Shops'];
  if (shopCategory === 'Medical') return categoryMap['Medical Shops'];
  
  return null;
};

(async () => {
  try {
    console.log('\n📦 Adding products to shops with unmatched categories...\n');
    await ensureDbConnection();
    
    const city = await City.findOne({ slug: 'gwalior' }).lean();
    const shops = await Shop.find({ cityId: city._id }).lean();
    const categories = await Category.find().lean();
    
    // Create a map of category names to IDs
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.name] = cat._id;
    });
    
    let productsAdded = 0;
    let shopsWithProducts = 0;

    for (const shop of shops) {
      const existingProducts = await Product.countDocuments({ shopId: shop._id });
      
      if (existingProducts >= 10) {
        continue; // Skip if shop already has 10+ products
      }

      const productsToAdd = 10 - existingProducts;
      const categoryProducts = PRODUCTS_BY_CATEGORY[shop.category] || PRODUCTS_BY_CATEGORY['Grocery'];
      const categoryId = getCategoryIdForShop(shop.category, categoryMap);
      
      if (!categoryId) {
        console.log(`⚠️ Could not find category for shop: ${shop.shopName} (${shop.category})`);
        continue;
      }

      for (let i = 0; i < productsToAdd; i++) {
        const product = categoryProducts[i % categoryProducts.length];
        const productSlug = `${shop.slug}-prod-${existingProducts + i + 1}`;
        const basePrice = product.price;
        const discountPercent = Math.floor(Math.random() * 15);

        await Product.create({
          shopId: shop._id,
          shopName: shop.shopName,
          categoryId: categoryId,
          categoryName: shop.category,
          name: product.name,
          slug: productSlug,
          description: `${product.name} available at ${shop.shopName}`,
          basePrice: basePrice,
          baseMrp: basePrice,
          images: [`https://picsum.photos/seed/${productSlug}/400/400`],
          variants: [{
            id: `var-${i}`,
            label: 'Default',
            price: basePrice,
            mrp: basePrice,
            inStock: true,
            stockQty: 50 + Math.floor(Math.random() * 100),
            lockedQty: 0,
          }],
          discount: {
            type: discountPercent > 0 ? 'PERCENT' : null,
            value: discountPercent,
            validTill: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
          inStock: true,
          stockQty: 50 + Math.floor(Math.random() * 100),
          active: true,
          rating: Math.floor(Math.random() * 5) + 1,
          reviewCount: Math.floor(Math.random() * 20),
        });
        productsAdded++;
      }
      
      shopsWithProducts++;
      console.log(`✅ Added ${productsToAdd} products to: ${shop.shopName}`);
    }

    console.log('\n✅ ═════════════════════════════════════════');
    console.log('✅ PRODUCTS ADDED TO REMAINING SHOPS');
    console.log('✅ ═════════════════════════════════════════');
    console.log(`✅ Shops Updated: ${shopsWithProducts}`);
    console.log(`✅ Products Added: ${productsAdded}`);
    console.log('✅ ═════════════════════════════════════════\n');

    await closeDbConnection();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();
