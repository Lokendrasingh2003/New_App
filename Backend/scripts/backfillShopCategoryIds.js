const { ensureDbConnection, closeDbConnection, MODELS } = require('./_shared');

const { Shop, Category } = MODELS;

const normalize = (value) => String(value || '').trim().toLowerCase();

const toId = (value) => (value ? String(value) : '');

const run = async () => {
  const apply = process.argv.includes('--apply');

  await ensureDbConnection();

  const categories = await Category.find({}, { _id: 1, name: 1 }).lean();
  const categoryByName = new Map();
  for (const category of categories) {
    const key = normalize(category.name);
    if (key && !categoryByName.has(key)) {
      categoryByName.set(key, category);
    }
  }

  const shops = await Shop.find(
    {
      $or: [{ categoryId: null }, { categoryId: { $exists: false } }],
      category: { $exists: true, $ne: null },
    },
    { _id: 1, shopName: 1, category: 1, categoryId: 1 }
  ).lean();

  let matched = 0;
  let unmatched = 0;
  const updates = [];

  for (const shop of shops) {
    const key = normalize(shop.category);
    const category = categoryByName.get(key);

    if (!category) {
      unmatched += 1;
      continue;
    }

    matched += 1;
    updates.push({
      shopId: shop._id,
      shopName: shop.shopName,
      previousCategoryName: shop.category,
      resolvedCategoryId: category._id,
      resolvedCategoryName: category.name,
    });
  }

  if (apply && updates.length > 0) {
    const bulkOps = updates.map((item) => ({
      updateOne: {
        filter: { _id: item.shopId },
        update: { $set: { categoryId: item.resolvedCategoryId } },
      },
    }));

    await Shop.bulkWrite(bulkOps);
  }

  console.log('--- Backfill Shop Category IDs ---');
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY-RUN'}`);
  console.log(`Shops scanned: ${shops.length}`);
  console.log(`Matched by category name: ${matched}`);
  console.log(`Unmatched: ${unmatched}`);
  console.log(`Updated: ${apply ? updates.length : 0}`);

  if (unmatched > 0) {
    const unresolved = shops
      .filter((shop) => !categoryByName.has(normalize(shop.category)))
      .slice(0, 20)
      .map((shop) => ({ id: toId(shop._id), shopName: shop.shopName, category: shop.category }));

    console.log('Sample unresolved shops (max 20):');
    console.log(JSON.stringify(unresolved, null, 2));
  }

  if (updates.length > 0) {
    console.log('Sample resolved mappings (max 20):');
    console.log(
      JSON.stringify(
        updates.slice(0, 20).map((item) => ({
          shopId: toId(item.shopId),
          shopName: item.shopName,
          categoryName: item.previousCategoryName,
          categoryId: toId(item.resolvedCategoryId),
        })),
        null,
        2
      )
    );
  }
};

run()
  .catch((error) => {
    console.error('Backfill failed:', error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDbConnection();
  });
