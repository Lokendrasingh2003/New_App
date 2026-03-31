const mongoose = require('mongoose');
const Category = require('./models/Category');
const Shop = require('./models/Shop');
const City = require('./models/City');

(async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/cityconnect');
    console.log('\n=== DATABASE DEBUG ===\n');
    
    const cities = await City.find().lean();
    console.log('CITIES:', cities.length);
    cities.forEach(c => console.log(`  - ${c.name} (slug: ${c.slug})`));
    
    const categories = await Category.find().lean();
    console.log('\nCATEGORIES:', categories.length);
    categories.forEach(c => console.log(`  - ${c.name}`));
    
    const shops = await Shop.find().populate('cityId').lean();
    console.log('\nSHOPS:', shops.length);
    shops.forEach(s => {
      const cityName = s.cityId?.name || 'undefined';
      console.log(`  - ${s.shopName} (Category: ${s.category}, CityId: ${s.cityId}, City: ${cityName})`);
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
