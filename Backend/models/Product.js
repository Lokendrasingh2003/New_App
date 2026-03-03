const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    mrp: { type: Number, required: true, min: 0 },
    inStock: { type: Boolean, default: true },
    stockQty: { type: Number, default: 0, min: 0 },
    lockedQty: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const discountSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['PERCENT', 'FLAT'], default: null },
    value: { type: Number, default: 0, min: 0 },
    validTill: { type: Date, default: null },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
      index: true,
    },
    shopName: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, default: null, trim: true },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    categoryName: { type: String, required: true, trim: true },
    subcategoryName: { type: String, default: null, trim: true },
    images: { type: [String], default: [] },
    variants: { type: [variantSchema], default: [] },
    basePrice: { type: Number, default: 0, min: 0 },
    baseMrp: { type: Number, default: 0, min: 0 },
    inStock: { type: Boolean, default: false, index: true },
    stockQty: { type: Number, default: 0, min: 0 },
    active: { type: Boolean, default: true, index: true },
    discount: { type: discountSchema, default: () => ({}) },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

productSchema.index({ shopId: 1, slug: 1 }, { unique: true });
productSchema.index({ shopId: 1, active: 1, inStock: 1 });
productSchema.index({ categoryId: 1, active: 1 });
productSchema.index({ shopId: 1, active: 1, categoryId: 1 });
productSchema.index({ active: 1, inStock: 1 });
productSchema.index({ active: 1, inStock: 1, categoryId: 1 });
productSchema.index({ name: 'text', description: 'text' });

productSchema.pre('validate', function syncProductDerivedFields(next) {
  const variants = Array.isArray(this.variants) ? this.variants : [];

  if (variants.length === 0) {
    this.basePrice = 0;
    this.baseMrp = 0;
    this.stockQty = 0;
    this.inStock = false;
    return next();
  }

  const prices = variants.map((variant) => Number(variant.price || 0));
  const mrps = variants.map((variant) => Number(variant.mrp || 0));

  this.basePrice = Math.min(...prices);
  this.baseMrp = Math.min(...mrps);

  this.stockQty = variants.reduce((sum, variant) => {
    return sum + Math.max(0, Number(variant.stockQty || 0));
  }, 0);

  this.inStock = variants.some((variant) => {
    const availableQty = Math.max(0, Number(variant.stockQty || 0) - Number(variant.lockedQty || 0));
    return Boolean(variant.inStock) && availableQty > 0;
  });

  next();
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
