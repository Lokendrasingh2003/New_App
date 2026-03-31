const { hashPassword } = require('../utils/password');
const { MODELS, ensureDbConnection, closeDbConnection, slugify } = require('./_shared');

const {
  City,
  Category,
  Shopkeeper,
  Shop,
  Product,
} = MODELS;

// Gwalior city details
const GWALIOR_CITY = {
  name: 'Gwalior',
  latitude: 26.2183,
  longitude: 78.1629,
};

// Missing categories to populate
const CATEGORIES_TO_ADD = [
  {
    categoryName: 'Groceries',
    displayName: 'Grocery',
    shopNames: [
      'Fresh Mart', 'Daily Essentials', 'Green Groceries', 'Super Bazaar', 'Quality Stores',
      'Local Fresh', 'Farmers Market', 'Organic Store', 'Best Buy Grocery', 'Quick Shop',
    ],
    products: [
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
  },
  {
    categoryName: 'Medical',
    displayName: 'Medical',
    shopNames: [
      'Health Plus', 'Pharmacy One', 'Medical Care', 'Wellness Pharmacy', 'Life Safe',
      'Care Clinic', 'Doctor\'s Choice', 'Medical Store', 'Healthy Life', 'Med Point',
    ],
    products: [
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
  },
];

const addMissingShops = async () => {
  try {
    console.log('\n📦 Starting to add missing shops for categories...\n');

    // Get Gwalior city
    const city = await City.findOne({ slug: 'gwalior' }).lean();
    if (!city) {
      console.error('❌ Gwalior city not found!');
      return;
    }
    console.log(`✅ Found city: ${city.name}\n`);

    let totalShopsAdded = 0;
    let totalProductsAdded = 0;
    let phoneCounter = 9950001000;

    for (const catConfig of CATEGORIES_TO_ADD) {
      const categoryName = catConfig.categoryName;
      const categorySlug = slugify(categoryName);
      
      console.log(`\n🏪 Processing category: ${categoryName}`);

      // Get or find the category
      let category = await Category.findOne({ name: categoryName }).lean();
      if (!category) {
        console.log(`  ⚠️ Category "${categoryName}" not found, skipping...`);
        continue;
      }
      console.log(`  ✅ Found category: ${categoryName}`);

      // Add 10 shops for this category
      for (let shopIndex = 0; shopIndex < 10; shopIndex++) {
        const shopName = `${catConfig.shopNames[shopIndex % catConfig.shopNames.length]} #${shopIndex + 1}`;
        const shopSlug = `${categorySlug}-${shopIndex + 1}`;
        const phone = String(phoneCounter).slice(-10);
        phoneCounter++;

        // Check if shop already exists
        const existingShop = await Shop.findOne({ slug: shopSlug, cityId: city._id }).lean();
        if (existingShop) {
          console.log(`  ⏭️ Shop already exists: ${shopName}`);
          continue;
        }

        // Create shopkeeper
        const password = await hashPassword('Shop@123');
        const shopkeeper = await Shopkeeper.create({
          phone,
          password,
          email: `shopkeeper-${categorySlug}-${shopIndex + 1}@cityconnect.local`,
          personalInfo: {
            name: shopName,
            address: `${city.name} - ${categoryName} Market`,
            city: city.name,
            pincode: '474001',
          },
          businessInfo: {
            businessName: shopName,
            registrationType: 'PROPRIETOR',
            registrationNumber: `REG-GWL-${categorySlug.toUpperCase()}-${shopIndex + 1}`,
          },
          status: 'ACTIVE',
        });

        // Create shop
        const latitude = GWALIOR_CITY.latitude + (Math.random() * 0.05 - 0.025);
        const longitude = GWALIOR_CITY.longitude + (Math.random() * 0.05 - 0.025);

        const shop = await Shop.create({
          ownerId: String(shopkeeper._id),
          cityId: city._id,
          shopName,
          slug: shopSlug,
          publicUrl: `/shops/${shopSlug}`,
          imageUrl: `https://picsum.photos/seed/shop-${categorySlug}-${shopIndex}/420/240`,
          description: `${shopName} - Best ${categoryName.toLowerCase()} in ${city.name}`,
          category: categoryName,
          phone,
          email: `shop-${categorySlug}-${shopIndex + 1}@cityconnect.local`,
          addressLine1: `${categoryName} Market Street, ${city.name}`,
          area: 'City Center',
          pincode: '474001',
          latitude,
          longitude,
          location: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          businessHours: {
            open: '09:00',
            close: '21:00',
            closedDays: [''],
          },
          delivery: {
            payer: 'CUSTOMER',
            chargeAmount: 40,
            serviceRadiusKm: 5,
            availableAreas: [city.name],
          },
          verification: {
            gstNumber: null,
            status: 'APPROVED',
            approvedAt: new Date(),
          },
          subscription: {
            plan: 'BASIC',
            startDate: new Date(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
            isActive: true,
          },
          isActive: true,
          status: 'APPROVED',
        });

        totalShopsAdded++;
        console.log(`  ✅ Created shop #${shopIndex + 1}: ${shopName}`);

        // Add products for this shop
        for (let prodIndex = 0; prodIndex < 10; prodIndex++) {
          const product = catConfig.products[prodIndex % catConfig.products.length];
          const productSlug = `${shopSlug}-prod-${prodIndex + 1}`;

          const basePrice = product.price;
          const discountPercent = Math.floor(Math.random() * 20);

          await Product.create({
            shopId: shop._id,
            shopName: shopName,
            categoryId: category._id,
            categoryName: categoryName,
            name: product.name,
            slug: productSlug,
            description: `${product.name} available at ${shopName} in ${city.name}`,
            basePrice: basePrice,
            baseMrp: basePrice,
            images: [`https://picsum.photos/seed/${productSlug}/400/400`],
            variants: [{
              id: `var-${prodIndex}`,
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
          totalProductsAdded++;
        }
      }
    }

    console.log('\n\n✅ ═══════════════════════════════════════════');
    console.log('✅ ADDING MISSING SHOPS - COMPLETE');
    console.log('✅ ═══════════════════════════════════════════');
    console.log(`✅ Shops Added: ${totalShopsAdded}`);
    console.log(`✅ Products Added: ${totalProductsAdded}`);
    console.log('✅ ═══════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
};

const main = async () => {
  try {
    await ensureDbConnection();
    await addMissingShops();
  } finally {
    await closeDbConnection();
  }
};

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
