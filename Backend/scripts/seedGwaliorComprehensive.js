const { hashPassword } = require('../utils/password');
const { MODELS, ensureDbConnection, closeDbConnection, slugify } = require('./_shared');

const {
  City,
  Category,
  User,
  Shopkeeper,
  Shop,
  Product,
} = MODELS;

// Gwalior city details
const GWALIOR_CITY = {
  name: 'Gwalior',
  state: 'Madhya Pradesh',
  latitude: 26.2183,
  longitude: 78.1629,
};

// 5 Categories
const CATEGORIES = [
  {
    name: 'Grocery',
    description: 'Fresh groceries and daily essentials',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Medical Shops',
    description: 'Medicines and medical supplies',
    image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde0b?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Clothes Shops',
    description: 'Clothing and fashion items',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Utensils Shops',
    description: 'Kitchen utensils and cookware',
    image: 'https://images.unsplash.com/photo-1578500494198-246f612d03b3?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Seeds Shops',
    description: 'Agricultural seeds and garden supplies',
    image: 'https://images.unsplash.com/photo-1591493814367-4aeddcbaacc0?auto=format&fit=crop&w=1200&q=80',
  },
];

// Sample products for each category
const PRODUCTS_BY_CATEGORY = {
  Grocery: [
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
  'Medical Shops': [
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
  'Clothes Shops': [
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
  ],
  'Utensils Shops': [
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
  ],
  'Seeds Shops': [
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
  ],
};

const SHOP_NAMES_BY_CATEGORY = {
  Grocery: [
    'Fresh Mart', 'Daily Essentials', 'Green Groceries', 'Super Bazaar', 'Quality Stores',
    'Local Fresh', 'Farmers Market', 'Organic Store', 'Best Buy Grocery', 'Quick Shop',
  ],
  'Medical Shops': [
    'Health Plus', 'Pharmacy One', 'Medical Care', 'Wellness Pharmacy', 'Life Safe',
    'Care Clinic', 'Doctor\'s Choice', 'Medical Store', 'Healthy Life', 'Med Point',
  ],
  'Clothes Shops': [
    'Fashion Hub', 'Style Zone', 'Trendy Wear', 'Boutique Elite', 'Casual Corner',
    'Dress Gallery', 'Fashion Forward', 'Style Studio', 'Apparel House', 'Attire Store',
  ],
  'Utensils Shops': [
    'Kitchen Master', 'Cookware Palace', 'Utensils Plus', 'Home Essentials', 'Steel House',
    'Kitchen Hub', 'Culinary Store', 'Cookery Shop', 'Kitchen World', 'Vessel House',
  ],
  'Seeds Shops': [
    'Seed Corner', 'Agriculture Supply', 'Farmers Friend', 'Grow Green', 'Seeds Hub',
    'Natural Seeds', 'Garden World', 'Farm Supply', 'Harvest Store', 'Green Field',
  ],
};

const seedGwaliorData = async () => {
  try {
    console.log('\n🌱 Starting Gwalior comprehensive data seeding...\n');

    // Get or verify Gwalior city exists
    let city = await City.findOne({ slug: 'gwalior' }).lean();
    if (!city) {
      console.log('Creating Gwalior city...');
      const cityDoc = await City.create({
        name: GWALIOR_CITY.name,
        slug: slugify(GWALIOR_CITY.name),
        state: GWALIOR_CITY.state,
        latitude: GWALIOR_CITY.latitude,
        longitude: GWALIOR_CITY.longitude,
        isActive: true,
        deliveryAvailable: true,
        description: `${GWALIOR_CITY.name} service city`,
        populationEstimate: 1500000,
        publishedAt: new Date(),
      });
      city = cityDoc.toObject ? cityDoc.toObject() : cityDoc;
      console.log(`✅ City created: ${city.name}`);
    } else {
      console.log(`✅ City already exists: ${city.name}`);
    }

    // Create categories
    let categoryDocs = [];
    console.log('\n📂 Creating categories...');
    for (const cat of CATEGORIES) {
      let categoryDoc = await Category.findOne({ slug: slugify(cat.name) }).lean();
      if (!categoryDoc) {
        categoryDoc = await Category.create({
          name: cat.name,
          slug: slugify(cat.name),
          description: cat.description,
          image: cat.image,
          icon: null,
          subcategories: [],
          isActive: true,
          status: 'PUBLISHED',
          publishedAt: new Date(),
          displayOrder: CATEGORIES.indexOf(cat) + 1,
        });
        console.log(`  ✅ Category created: ${cat.name}`);
      } else {
        console.log(`  ✓ Category exists: ${cat.name}`);
      }
      categoryDocs.push(categoryDoc);
    }

    // Create shops and products
    console.log('\n🏪 Creating shops and products...\n');
    let totalShops = 0;
    let totalProducts = 0;
    let phoneCounter = 9990001000;

    for (let catIndex = 0; catIndex < CATEGORIES.length; catIndex++) {
      const category = CATEGORIES[catIndex];
      const categorySlug = slugify(category.name);
      const shopNamesForCategory = SHOP_NAMES_BY_CATEGORY[category.name] || [];
      const productsForCategory = PRODUCTS_BY_CATEGORY[category.name] || [];

      console.log(`\n📦 ${category.name} Category:`);

      for (let shopIndex = 0; shopIndex < 10; shopIndex++) {
        const shopName = `${shopNamesForCategory[shopIndex % shopNamesForCategory.length]} #${shopIndex + 1}`;
        const shopSlug = `${categorySlug}-${shopIndex + 1}`;
        const phone = String(phoneCounter).slice(-10); // Get last 10 digits
        phoneCounter++;

        // Check if shop exists
        let shop = await Shop.findOne({ slug: shopSlug, cityId: city._id }).lean();
        
        if (!shop) {
          // Create shopkeeper 
          const password = await hashPassword('Shop@123');
          const shopkeeper = await Shopkeeper.create({
            phone,
            password,
            email: `shopkeeper-${categorySlug}-${shopIndex + 1}@cityconnect.local`,
            personalInfo: {
              name: shopName,
              address: `${city.name} - ${category.name} Market`,
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

          shop = await Shop.create({
            ownerId: String(shopkeeper._id),
            cityId: city._id,
            shopName,
            slug: shopSlug,
            publicUrl: `/shops/${shopSlug}`,
            imageUrl: `https://picsum.photos/seed/shop-${categorySlug}-${shopIndex}/420/240`,
            description: `${shopName} - Best ${category.name.toLowerCase()} in ${city.name}`,
            category: category.name,
            phone,
            email: `shop-${categorySlug}-${shopIndex + 1}@cityconnect.local`,
            addressLine1: `${category.name} Market Street, ${city.name}`,
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
            publishedAt: new Date(),
          });

          totalShops++;
          console.log(`  📍 ${shopIndex + 1}. ${shopName}`);
        }

        // Create products for this shop
        for (let prodIndex = 0; prodIndex < 10; prodIndex++) {
          const product = productsForCategory[prodIndex % productsForCategory.length];
          const productSlug = `${shopSlug}-prod-${prodIndex + 1}`;

          // Check if product exists
          const existingProduct = await Product.findOne({ slug: productSlug }).lean();
          
          if (!existingProduct) {
            const basePrice = product.price;
            const discountPercent = Math.floor(Math.random() * 20);
            const discountedPrice = Math.floor(basePrice * (1 - discountPercent / 100));
            
            await Product.create({
              shopId: shop._id,
              shopName: shopName,
              categoryId: categoryDocs[catIndex]._id,
              categoryName: category.name,
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
            totalProducts++;
          }
        }
      }
    }

    console.log('\n\n✅ ═══════════════════════════════════════════');
    console.log('✅ 🌱 SEEDING COMPLETE 🌱');
    console.log('✅ ═══════════════════════════════════════════');
    console.log(`✅ City: ${city.name}`);
    console.log(`✅ Categories: ${CATEGORIES.length}`);
    console.log(`✅ Total Shops: ${totalShops}`);
    console.log(`✅ Total Products: ${totalProducts}`);
    console.log('✅ ═══════════════════════════════════════════\n');

  } catch (error) {
    console.error('Error seeding data:', error);
    throw error;
  }
};

const main = async () => {
  try {
    await ensureDbConnection();
    await seedGwaliorData();
  } finally {
    await closeDbConnection();
  }
};

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
