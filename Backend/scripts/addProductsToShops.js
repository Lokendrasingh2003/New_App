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
    { name: 'Eggs (Dozen)', price: 120 },
    { name: 'Bread (500g)', price: 40 },
    { name: 'Biscuits Pack', price: 60 },
    { name: 'Juice (1L)', price: 95 },
    { name: 'Spices Mix', price: 150 },
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
    { name: 'Cough Syrup', price: 120 },
    { name: 'Multivitamin Tablets', price: 200 },
    { name: 'Pain Relief Gel', price: 75 },
    { name: 'Sanitizer Bottle', price: 100 },
    { name: 'Face Mask (50pc)', price: 150 },
  ],
  'Clothes': [
    { name: 'Cotton T-Shirt', price: 399 },
    { name: 'Denim Jeans', price: 1299 },
    { name: 'Formal Shirt', price: 799 },
    { name: 'Sports Shorts', price: 599 },
    { name: 'Saree Cotton', price: 899 },
    { name: 'Kurta Kurti', price: 699 },
    { name: 'Socks Pack', price: 199 },
    { name: 'Summer Dress', price: 1099 },
    { name: 'Jacket', price: 2499 },
    { name: 'Shoes Casual', price: 1799 },
    { name: 'Sweater', price: 1299 },
    { name: 'Leggings', price: 499 },
    { name: 'Dupatta', price: 599 },
    { name: 'Belt', price: 299 },
    { name: 'Cap', price: 199 },
  ],
  'Utensils': [
    { name: 'Stainless Steel Pot', price: 450 },
    { name: 'Non-Stick Frying Pan', price: 599 },
    { name: 'Pressure Cooker 5L', price: 1299 },
    { name: 'Mixing Bowls Set', price: 349 },
    { name: 'Spoon Set', price: 199 },
    { name: 'Kitchen Knife Set', price: 699 },
    { name: 'Cutting Board', price: 299 },
    { name: 'Colander Strainer', price: 249 },
    { name: 'Measuring Cups', price: 199 },
    { name: 'Tiffin Box Stainless Steel', price: 399 },
    { name: 'Glass Bowls Set', price: 349 },
    { name: 'Ladle', price: 149 },
    { name: 'Spatula', price: 99 },
    { name: 'Whisk', price: 89 },
    { name: 'Rolling Pin', price: 129 },
  ],
  'Seeds': [
    { name: 'Tomato Seeds', price: 45 },
    { name: 'Chilli Seeds', price: 55 },
    { name: 'Onion Seeds', price: 50 },
    { name: 'Spinach Seeds', price: 35 },
    { name: 'Carrot Seeds', price: 40 },
    { name: 'Cucumber Seeds', price: 60 },
    { name: 'Wheat Seeds (5kg)', price: 250 },
    { name: 'Rice Seeds (5kg)', price: 300 },
    { name: 'Fertilizer Packet', price: 150 },
    { name: 'Pesticide Spray', price: 180 },
    { name: 'Bean Seeds', price: 45 },
    { name: 'Pumpkin Seeds', price: 80 },
    { name: 'Flower Seeds', price: 65 },
    { name: 'Garlic Bulbs', price: 120 },
    { name: 'Ginger Rhizome Pack', price: 180 },
  ],
};

const getProductsForCategory = (categoryName) => {
  const normalized = categoryName.toLowerCase();
  if (normalized.includes('medical')) return PRODUCTS_BY_CATEGORY['Medical'];
  if (normalized.includes('clothes')) return PRODUCTS_BY_CATEGORY['Clothes'];
  if (normalized.includes('utensils')) return PRODUCTS_BY_CATEGORY['Utensils'];
  if (normalized.includes('seeds') || normalized.includes('seed')) return PRODUCTS_BY_CATEGORY['Seeds'];
  return PRODUCTS_BY_CATEGORY['Grocery']; // Default to grocery
};

(async () => {
  try {
    console.log('\n📦 Starting to add products to shops...\n');
    await ensureDbConnection();
    
    const city = await City.findOne({ slug: 'gwalior' }).lean();
    const shops = await Shop.find({ cityId: city._id }).lean();
    const categories = await Category.find().lean();
    
    // Create a map of category names to IDs
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.name.toLowerCase()] = cat._id;
    });
    
    let productsAdded = 0;
    let shopsUpdated = 0;

    for (const shop of shops) {
      const existingProducts = await Product.countDocuments({ shopId: shop._id });
      
      if (existingProducts >= 15) {
        continue; // Skip if shop already has 15+ products
      }

      const productsToAdd = 15 - existingProducts;
      const categoryProducts = getProductsForCategory(shop.category);
      const categoryId = categoryMap[shop.category.toLowerCase()];
      
      if (!categoryId) {
        console.log(`⚠️ Category not found for shop: ${shop.shopName} (${shop.category})`);
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
      
      shopsUpdated++;
      if (shopsUpdated % 10 === 0) {
        console.log(`✅ ${shopsUpdated} shops updated with products...`);
      }
    }

    console.log('\n✅ ═════════════════════════════════════════');
    console.log('✅ PRODUCTS ADDED SUCCESSFULLY');
    console.log('✅ ═════════════════════════════════════════');
    console.log(`✅ Shops Updated: ${shopsUpdated}`);
    console.log(`✅ Products Added: ${productsAdded}`);
    console.log('✅ ═════════════════════════════════════════\n');

    await closeDbConnection();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();
