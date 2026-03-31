// Quick test to verify home config structure
const categories = [
  { _id: '1', name: 'Groceries' },
  { _id: '2', name: 'Fruits & Vegetables' }
];

const shops = [
  { id: 'shop1', shopName: 'Gwalior Fresh Mart', category: 'Groceries' }
];

const normalize = (value) => String(value || '').trim().toLowerCase();

const categoryShopBlocks = categories
  .map((category) => {
    const categoryName = String(category.name || '').trim();
    const matchedShops = shops
      .filter((shop) => normalize(shop.category || '') === normalize(categoryName))
      .slice(0, 10);

    if (matchedShops.length === 0) {
      console.log(`  ✗ ${categoryName}: No matching shops`);
      return null;
    }

    console.log(`  ✓ ${categoryName}: ${matchedShops.length} shop(s)`);
    return {
      id: `block-${category._id}`,
      type: 'featured_shops',
      title: categoryName,
      data: matchedShops.map((shop) => ({
        id: String(shop.id),
        name: String(shop.shopName),
        rating: 0,
        eta: '20 mins',
        imageUrl: 'https://via.placeholder.com/170x110',
        timing: 'Open daily',
      })),
    };
  })
  .filter((block) => Boolean(block));

console.log('\n=== HOME CONFIG BLOCKS ===');
console.log(`Total blocks: ${categoryShopBlocks.length}`);
categoryShopBlocks.forEach((block, i) => {
  console.log(`  ${i + 1}. ${block.title}: ${block.data.length} shops`);
});
